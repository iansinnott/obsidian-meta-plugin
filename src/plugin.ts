import { Plugin, normalizePath } from "obsidian";
import { createAnthropic, type AnthropicProvider } from "@ai-sdk/anthropic";
import type { LanguageModelV1 } from "ai";
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { createTeamManagerAgent } from "./llm/agents";
import { SampleModal } from "./modal";
import { DEFAULT_SETTINGS, MetaSettingTab } from "./settings";
import { META_SIDEBAR_VIEW_TYPE, MetaSidebarView, activateSidebarView } from "./sidebar";
import { transformAnthropicRequest } from "./llm/utils/transformAnthropicRequest";
import { ChunkProcessor } from "./llm/chunk-processor";
import { registerPluginInstance } from "./hooks/state";

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
  handleApiSettingsUpdate() {
    // If we're using Anthropic, we need a different way to fetch models since
    // ai sdk doesn't provide that. Otherwise, everything should be the same.
    const isAnthropic = () => this.settings.baseUrl.includes("api.anthropic.com");

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

  async onload() {
    // Register the plugin instance for state delegation
    registerPluginInstance(this);
    await this.loadSettings();

    // Set initial theme attribute and register listener for changes
    this.setThemeAttribute();
    this.registerEvent(this.app.workspace.on("css-change", this.setThemeAttribute));

    this.handleApiSettingsUpdate();

    // Restore last active conversation (or create new)
    await this.restoreActiveConversation();

    // Register the sidebar view
    this.registerView(META_SIDEBAR_VIEW_TYPE, (leaf) => new MetaSidebarView(leaf, this));

    // This creates an icon in the left ribbon.
    const ribbonIconEl = this.addRibbonIcon("brain", "Obsidian Meta Plugin", (evt: MouseEvent) => {
      // Called when the user clicks the icon.
      activateSidebarView(this);
    });

    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: "open-sample-modal-simple",
      name: "Open sample modal (simple)",
      callback: () => {
        new SampleModal(this.app, this).open();
      },
    });

    // Add command to open the sidebar view
    this.addCommand({
      id: "open-meta-sidebar",
      name: "Open Meta Sidebar",
      callback: async () => {
        await activateSidebarView(this);
      },
    });

    const settingsTab = new MetaSettingTab(this.app, this);
    this.addSettingTab(settingsTab);
  }

  onunload() {
    // Detach any leaves with our view type
    this.app.workspace.detachLeavesOfType(META_SIDEBAR_VIEW_TYPE);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.handleApiSettingsUpdate();
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
}
