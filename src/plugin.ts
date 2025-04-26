import { Plugin, normalizePath, Notice } from "obsidian";
import { createAnthropic, type AnthropicProvider } from "@ai-sdk/anthropic";
import type { LanguageModelV1 } from "ai";
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { generateText, streamText, type ToolSet } from "ai";
import { createTeamManagerAgent } from "./llm/agents";
import {
  DEFAULT_SETTINGS,
  LOCAL_STORAGE_API_KEY,
  MetaSettingTab,
  type EphemeralKeyEntry,
} from "./settings";
import { META_SIDEBAR_VIEW_TYPE, MetaSidebarView, activateSidebarView } from "./sidebar";
import { transformAnthropicRequest } from "./llm/utils/transformAnthropicRequest";
import { ChunkProcessor } from "./llm/chunk-processor";
import { registerPluginInstance } from "./hooks/state";
import type { VaultAdapter, BundlerOptions, BundleResult, WASMBundler } from "./bundler/bundler";
import { createAdvancedPlugin, createSamplePlugin } from "./bundler/bundler-runtime-test";

// ---------------------------------------------------------------------------
// Ephemeral API-key bootstrap helpers
// ---------------------------------------------------------------------------

/** Type-guard that the stored value matches {@link EphemeralKeyEntry}. */
function isEphemeralKeyEntry(value: unknown): value is EphemeralKeyEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    "provider" in value &&
    "key" in value &&
    typeof (value as any).provider === "string" &&
    typeof (value as any).key === "string"
  );
}

/**
 * Attempt to resolve an API key for the given provider URL.
 * – Checks localStorage. If the stored entry belongs to *this* provider, reuse it.
 * – Otherwise fetches a new key from the `/key/generate` endpoint **in the
 *   background**, then caches it alongside the provider identifier.
 *
 * Returns the key immediately if available, *undefined* otherwise.  A pending
 * network request is stored in `inFlightKeyPromise` so concurrent calls never
 * issue duplicate fetches.
 */
function createKeyResolver() {
  let inFlightKeyPromise: Promise<void> | null = null;

  async function fetchAndStoreKey(baseUrl: string): Promise<void> {
    const endpoint = "https://cf-llm-oprah-bff.txn.workers.dev/key/generate";
    const resp = await fetch(endpoint, { headers: { "Content-Type": "application/json" } });
    if (!resp.ok) throw new Error(`Failed to fetch API key: ${resp.statusText}`);
    const data = (await resp.json()) as { key?: string };
    if (data.key) {
      const entry: EphemeralKeyEntry = { provider: baseUrl, key: data.key };
      localStorage.setItem(LOCAL_STORAGE_API_KEY, JSON.stringify(entry));
    }
  }

  return async function resolveKey(baseUrl: string): Promise<string | undefined> {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_API_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isEphemeralKeyEntry(parsed) && parsed.provider === baseUrl) {
          return parsed.key;
        }
      }

      // No valid key – kick off background fetch once.
      if (!inFlightKeyPromise) {
        inFlightKeyPromise = fetchAndStoreKey(baseUrl).finally(() => {
          inFlightKeyPromise = null;
        });
      }

      // Do *not* await, user UI continues loading.
      return undefined;
    } catch (err) {
      console.error("Error resolving API key", err);
      return undefined;
    }
  };
}

// Single instance shared across the plugin.
const resolveEphemeralKey = createKeyResolver();

// ---------------------------------------------------------------------------

export class MetaPlugin extends Plugin {
  settings: typeof DEFAULT_SETTINGS;
  api: {
    models: {
      list: () => Promise<{ data: { id: string }[] }>;
    };
  };
  provider: OpenAIProvider | AnthropicProvider;
  llm: LanguageModelV1;
  agent: ReturnType<typeof createTeamManagerAgent>;
  // State management for processors and subscribers
  private processorsMap: Map<string, ChunkProcessor> = new Map();
  private subscribersMap: Map<string, Set<() => void>> = new Map();
  // Current conversation identifier
  private currentConversationId: string = "";
  // bundler instance for plugin bundling
  private bundler: WASMBundler | undefined;

  async ensureDataDir(subDir = "") {
    const path = require("path");
    const adapter = this.app.vault.adapter;
    const dataDir = normalizePath(
      path.join(this.app.plugins?.getPluginFolder(), this.manifest.id, "d")
    );

    if (!(await adapter.exists(dataDir))) {
      await adapter.mkdir(dataDir);
    }

    if (subDir) {
      const subDirPath = normalizePath(path.join(dataDir, subDir));
      if (!(await adapter.exists(subDirPath))) {
        await adapter.mkdir(subDirPath);
      }
      return subDirPath;
    }

    return dataDir;
  }

  /** Generate a new conversation ID based on timestamp */
  private generateConversationId(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
  }

  /** Begin a new conversation and ensure its directory exists */
  public async startNewConversation() {
    this.currentConversationId = this.generateConversationId();
    const adapter = this.app.vault.adapter;
    const path = require("path");
    // Ensure root conversations folder
    const conversationRoot = await this.ensureDataDir("conversations");
    // Ensure this conversation's subfolder
    const convDir = normalizePath(path.join(conversationRoot, this.currentConversationId));
    if (!(await adapter.exists(convDir))) {
      await adapter.mkdir(convDir);
    }
    // Persist active conversation ID to disk
    await this.savePluginData("activeConversation.json", {
      conversationId: this.currentConversationId,
    });
  }

  /** Restore the last active conversation ID or start a new one */
  public async restoreActiveConversation() {
    const adapter = this.app.vault.adapter;
    const path = require("path");
    const dataDir = await this.ensureDataDir();
    const filePath = path.join(dataDir, "activeConversation.json");
    if (await adapter.exists(filePath)) {
      const raw = await adapter.read(filePath);
      const parsed = JSON.parse(raw);
      this.currentConversationId = parsed.conversationId;
    } else {
      await this.startNewConversation();
    }
  }

  /**
   * Save arbitrary data to the plugin's data directory.
   */
  async savePluginData(fileName: string, data: any) {
    const adapter = this.app.vault.adapter;
    const path = require("path");
    const dataDir = await this.ensureDataDir();
    const filePath = path.join(dataDir, fileName);
    await adapter.write(filePath, JSON.stringify(data));
    return {
      path: filePath,
    };
  }

  /** Build a sanitized filename for conversation persistence */
  private getConversationFileName(agentId: string, threadId: string): string {
    const safeAgent = agentId.replace(/[^a-zA-Z0-9]/g, "_");
    const safeThread = threadId.replace(/[^a-zA-Z0-9]/g, "_");
    return `${safeAgent}__${safeThread}.json`;
  }

  /** Persist the current conversation for an agent/thread */
  public async saveConversation(agentId: string, threadId: string) {
    const adapter = this.app.vault.adapter;
    const path = require("path");
    // Ensure conversations root and this conversation's folder exist
    const conversationRoot = await this.ensureDataDir("conversations");
    const convDir = normalizePath(path.join(conversationRoot, this.currentConversationId));
    if (!(await adapter.exists(convDir))) {
      await adapter.mkdir(convDir);
    }
    const fileName = this.getConversationFileName(agentId, threadId);
    const filePath = path.join(convDir, fileName);
    const proc = this.getProcessor(agentId, threadId);
    const data = { messages: proc.getMessages(), chunks: proc.getChunks() };
    await adapter.write(filePath, JSON.stringify(data));
  }

  /** Load a persisted conversation for an agent/thread */
  public async loadConversation(agentId: string, threadId: string) {
    const adapter = this.app.vault.adapter;
    const path = require("path");
    // Look under the current conversation's folder
    const conversationRoot = await this.ensureDataDir("conversations");
    const convDir = normalizePath(path.join(conversationRoot, this.currentConversationId));
    if (!(await adapter.exists(convDir))) {
      return;
    }
    const fileName = this.getConversationFileName(agentId, threadId);
    const filePath = path.join(convDir, fileName);
    if (!(await adapter.exists(filePath))) {
      return;
    }
    const raw = await adapter.read(filePath);
    const state = JSON.parse(raw);
    const proc = this.getProcessor(agentId, threadId);
    proc.loadState(state);
    this.notifySubscribers(agentId, threadId);
  }

  /**
   * Handle changes to the LLM configuration. Whenever the LLM settings change
   * we need to re-instantiate a few things with the updated information.
   */
  async handleApiSettingsUpdate() {
    // If we're using Anthropic, we need a different way to fetch models since
    // ai sdk doesn't provide that. Otherwise, everything should be the same.
    const baseUrl = this.settings.baseUrl;
    const defaultBaseUrl = DEFAULT_SETTINGS.baseUrl;

    // Ensure we have an API key for the default provider. We try to reuse a
    // cached key synchronously; if none exists we trigger background fetch and
    // *exit early*.  When the key eventually arrives, `ensureApiKeyBackground`
    // re-invokes this method.
    if (baseUrl === defaultBaseUrl && !this.settings.apiKey) {
      const cachedKey = await resolveEphemeralKey(baseUrl);
      if (cachedKey) {
        this.settings.apiKey = cachedKey;
        await this.saveData(this.settings);
      } else {
        this.ensureApiKeyBackground();
        return; // Cannot proceed without credentials.
      }
    }

    // @todo Not the most robust check...
    const isAnthropic = () => baseUrl.includes("anthropic");

    this.api = {
      models: {
        list: async () => {
          const response = await fetch(`${this.settings.baseUrl}/models`, {
            headers: {
              "Content-Type": "application/json",
              ...(isAnthropic()
                ? {
                    "anthropic-version": "2023-06-01",
                    "x-api-key": this.settings.apiKey,
                    "anthropic-dangerous-direct-browser-access": "true",
                  }
                : {
                    Authorization: `Bearer ${this.settings.apiKey}`,
                  }),
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.statusText}`);
          }

          const data = await response.json();

          return { data: data.data };
        },
      },
    };

    this.provider = isAnthropic()
      ? createAnthropic({
          apiKey: this.settings.apiKey,
          baseURL: this.settings.baseUrl,
          headers: {
            "anthropic-dangerous-direct-browser-access": "true",
          },
          fetch: Object.assign(
            (url: string, options: RequestInit) => {
              const transformedOptions = options ? transformAnthropicRequest(options) : options;
              return fetch(url, transformedOptions);
            },
            {
              preconnect: fetch.preconnect,
            }
          ),
        })
      : createOpenAI({
          apiKey: this.settings.apiKey,
          baseURL: this.settings.baseUrl,
        });

    if (this.settings.model && this.llm?.modelId !== this.settings.model) {
      this.llm = this.provider(this.settings.model);
    }

    this.agent = createTeamManagerAgent({
      llm: this.llm,
      settings: {
        maxSteps: this.settings.maxSteps,
        maxRetries: this.settings.maxRetries,
        maxTokens: this.settings.maxTokens,
      },
      obsidianPaths: {
        vaultPath: this.app.vault.adapter.getBasePath(),
        configPath: this.app.vault.configDir,
        themesPath: this.app.customCss?.getThemeFolder(),
        snippetsPath: this.app.customCss?.getSnippetsFolder(),
        pluginsPath: this.app.plugins?.getPluginFolder(),
      },
    });
  }

  /** Sets the data-theme attribute on the body based on Obsidian's theme, This is necessary because we use a prefix. */
  private setThemeAttribute() {
    if (document.body.classList.contains("theme-dark")) {
      document.body.classList.add("meta-theme-dark");
      document.body.classList.remove("theme-light");
    } else {
      document.body.classList.remove("meta-theme-dark");
      document.body.classList.add("theme-light");
    }
  }

  /**
   * Initialize bundler
   */
  async initializeEsbuild() {
    if (!this.bundler) {
      const { createBundler } = await import("./bundler/bundler");
      this.bundler = createBundler(
        this.app.vault.adapter as unknown as VaultAdapter,
        normalizePath,
        this
      );
    }
    await this.bundler!.initialize();
  }

  /**
   * Bundle a plugin project from source files
   */
  public async bundlePlugin(
    entryPointPath: string,
    options: BundlerOptions = { sourcemap: false }
  ): Promise<BundleResult> {
    await this.initializeEsbuild();
    return this.bundler!.bundle(entryPointPath, options);
  }

  /**
   * Generate text using the configured language model
   * This method allows other plugins created by meta plugin to use LLM functionality
   */
  public async generateText<TTools extends ToolSet = {}, TInput = unknown, TOutput = unknown>(
    options: Omit<Parameters<typeof generateText<TTools, TInput, TOutput>>[0], "model">
  ) {
    if (!this.llm) {
      throw new Error("Language model not initialized");
    }

    return generateText<TTools, TInput, TOutput>({
      model: this.llm,
      ...options,
    });
  }

  /**
   * Stream text using the configured language model
   * This method allows other plugins created by meta plugin to use streaming LLM functionality
   */
  public streamText<TTools extends ToolSet = {}, TInput = unknown, TOutput = unknown>(
    options: Omit<Parameters<typeof streamText<TTools, TInput, TOutput>>[0], "model">
  ) {
    if (!this.llm) {
      throw new Error("Language model not initialized");
    }

    return streamText<TTools, TInput, TOutput>({
      model: this.llm,
      ...options,
    });
  }

  async onload() {
    // Register the plugin instance for state delegation
    registerPluginInstance(this);
    await this.loadSettings();

    // Kick off non-blocking API-key resolution if needed.
    this.ensureApiKeyBackground();

    // Set initial theme attribute and register listener for changes
    this.setThemeAttribute();
    this.registerEvent(this.app.workspace.on("css-change", this.setThemeAttribute));

    await this.handleApiSettingsUpdate();

    // Restore last active conversation (or create new)
    await this.restoreActiveConversation();

    // Register the sidebar view
    this.registerView(META_SIDEBAR_VIEW_TYPE, (leaf) => new MetaSidebarView(leaf, this));

    // This creates an icon in the left ribbon.
    const ribbonIconEl = this.addRibbonIcon("brain", "Meta Plugin", (evt: MouseEvent) => {
      // Called when the user clicks the icon.
      activateSidebarView(this);
    });

    // Add command to open the sidebar view
    this.addCommand({
      id: "open-meta-sidebar",
      name: "Open Meta Plugin Chat",
      callback: async () => {
        await activateSidebarView(this);
      },
    });

    // Add a command to test the bundler functionality
    this.addCommand({
      id: "test-bundler-sample-plugin",
      name: "Test Bundler: Create Sample Plugin",
      callback: async () => {
        try {
          const result = await createSamplePlugin(this, normalizePath);
          if (result.success) {
            new Notice(`Sample Plugin bundled successfully at: ${result.outputPath}`, 5000);
          } else {
            new Notice(`Sample Plugin bundling failed: ${result.error}`, 5000);
          }
        } catch (error) {
          console.error("Error testing bundler (Sample Plugin):", error);
          new Notice("Error testing bundler (Sample Plugin). Check console for details.", 5000);
        }
      },
    });

    // Add a command to test the bundler with the advanced plugin
    this.addCommand({
      id: "test-bundler-advanced-plugin",
      name: "Test Bundler: Create Advanced Plugin",
      callback: async () => {
        try {
          const result = await createAdvancedPlugin(this, normalizePath);
          if (result.success) {
            new Notice(`Advanced Plugin bundled successfully at: ${result.outputPath}`, 5000);
          } else {
            new Notice(`Advanced Plugin bundling failed: ${result.error}`, 5000);
          }
        } catch (error) {
          console.error("Error testing bundler (Advanced Plugin):", error);
          new Notice("Error testing bundler (Advanced Plugin). Check console for details.", 5000);
        }
      },
    });

    const settingsTab = new MetaSettingTab(this.app, this);
    this.addSettingTab(settingsTab);
  }

  onunload() {
    // Shutdown bundler if it was initialized
    if (this.bundler) {
      this.bundler.stop();
      this.bundler = undefined;
    }

    // Detach any leaves with our view type
    this.app.workspace.detachLeavesOfType(META_SIDEBAR_VIEW_TYPE);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    await this.handleApiSettingsUpdate();
  }

  async refreshModelList(): Promise<string[]> {
    const models = (await this.api.models.list()).data.map((model) => model.id);
    this.settings.availableModels = models;
    if (!this.settings.model || !models.includes(this.settings.model)) {
      this.settings.model = models[0];
    }
    await this.saveSettings();
    return models;
  }

  private createKey(agentId: string, threadId: string): string {
    return `${agentId}:${threadId}`;
  }

  public getProcessorsMap(): Map<string, ChunkProcessor> {
    return this.processorsMap;
  }

  public getSubscribers(agentId: string, threadId: string = "default"): Set<() => void> {
    const key = this.createKey(agentId, threadId);
    if (!this.subscribersMap.has(key)) {
      this.subscribersMap.set(key, new Set());
    }
    return this.subscribersMap.get(key)!;
  }

  public notifySubscribers(agentId: string, threadId: string = "default"): void {
    this.getSubscribers(agentId, threadId).forEach((sub) => sub());
  }

  public getProcessor(agentId: string, threadId: string = "default"): ChunkProcessor {
    if (!agentId || !threadId) {
      throw new Error("Agent ID and thread ID are required");
    }

    const key = this.createKey(agentId, threadId);
    if (!this.processorsMap.has(key)) {
      const processor = new ChunkProcessor();
      const origAppendChunk = processor.appendChunk.bind(processor);
      const origAppendMessage = processor.appendMessage.bind(processor);
      const origReset = processor.reset.bind(processor);

      processor.appendChunk = (chunk) => {
        const res = origAppendChunk(chunk);
        this.notifySubscribers(agentId, threadId);
        this.saveConversation(agentId, threadId).catch(console.error);
        return res;
      };
      processor.appendMessage = (msg) => {
        const res = origAppendMessage(msg);
        this.notifySubscribers(agentId, threadId);
        this.saveConversation(agentId, threadId).catch(console.error);
        return res;
      };
      processor.reset = () => {
        const res = origReset();
        this.notifySubscribers(agentId, threadId);
        this.saveConversation(agentId, threadId).catch(console.error);
        return res;
      };

      this.processorsMap.set(key, processor);
    }
    return this.processorsMap.get(key)!;
  }

  // ---------------------------------------------------------------------
  // API-key bootstrap utilities
  // ---------------------------------------------------------------------

  /**
   * Kick off background resolution of an API key *if* we're using the default
   * provider *and* no key is configured yet.  If/when a key arrives it is
   * persisted and {@link handleApiSettingsUpdate} is invoked again so the LLM
   * provider is recreated with proper credentials.
   */
  private ensureApiKeyBackground(): void {
    // Only relevant for the default provider.
    if (this.settings.baseUrl !== DEFAULT_SETTINGS.baseUrl || this.settings.apiKey) return;

    resolveEphemeralKey(this.settings.baseUrl)
      .then(async (key) => {
        if (key && !this.settings.apiKey) {
          this.settings.apiKey = key;
          // Persist without triggering handleApiSettingsUpdate → we'll call it explicitly.
          await this.saveData(this.settings);
          await this.handleApiSettingsUpdate();
        }
      })
      .catch((err) => console.error("Failed to resolve API key", err));
  }
}
