import { Plugin, normalizePath, Notice } from "obsidian";
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
import * as esbuild from "esbuild-wasm";
import { createSamplePlugin } from "./bundler-test";

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
  // esbuild instance
  private esbuildInitialized: boolean = false;

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

  /**
   * Initialize esbuild-wasm for bundling
   */
  async initializeEsbuild() {
    if (this.esbuildInitialized) return;

    try {
      const path = require("path");
      const adapter = this.app.vault.adapter;
      const esbuildDir = await this.ensureDataDir("esbuild");
      const wasmPath: string = normalizePath(path.join(esbuildDir, "esbuild.wasm"));

      // Check if wasm binary exists, if not, we need to download it
      if (!(await adapter.exists(wasmPath))) {
        // Create URL for the esbuild.wasm file from the CDN
        const wasmURL = "https://unpkg.com/esbuild-wasm@0.25.2/esbuild.wasm";

        // Fetch the wasm file
        const response = await fetch(wasmURL);
        if (!response.ok) {
          throw new Error(`Failed to download esbuild.wasm: ${response.statusText}`);
        }

        // Convert to arraybuffer and save to disk
        const arrayBuffer = await response.arrayBuffer();
        await adapter.writeBinary(wasmPath, arrayBuffer);
      }

      try {
        // First attempt: Try with local WASM file
        // Get the URL to the wasm file in the vault
        const wasmURL = adapter.getResourcePath(wasmPath);

        // Initialize esbuild with the wasm binary
        await esbuild.initialize({
          wasmURL,
          worker: false, // Try without worker mode first for debugging
        });

        this.esbuildInitialized = true;
        console.log("esbuild initialized with local WASM file");
      } catch (localError) {
        console.warn(
          "Failed to initialize esbuild with local WASM file, falling back to CDN:",
          localError
        );

        // Second attempt: Try with direct CDN URL
        // This might work better in some environments
        try {
          await esbuild.initialize({
            wasmURL: "https://unpkg.com/esbuild-wasm@0.25.2/esbuild.wasm",
            worker: false,
          });

          this.esbuildInitialized = true;
          console.log("esbuild initialized with CDN WASM file");
        } catch (cdnError) {
          console.error("Failed to initialize esbuild with CDN WASM file:", cdnError);
          throw cdnError;
        }
      }
    } catch (error) {
      console.error("Failed to initialize esbuild:", error);
      throw error;
    }
  }

  /**
   * Bundle a plugin project from source files
   * @param files Record of file paths to file contents
   * @param entryPoint The main entry point file (typically main.ts or index.ts)
   * @param outputPath Where to write the bundled plugin (relative to plugins folder)
   */
  async bundlePlugin(files: Record<string, string>, entryPoint: string, outputPath: string) {
    if (!this.esbuildInitialized) {
      await this.initializeEsbuild();
    }

    try {
      console.log(`[bundler] Starting bundling for entry point: ${entryPoint}`);
      console.log(`[bundler] Available files:`, Object.keys(files));

      // Ensure the manifest.json exists
      const manifestFile = Object.keys(files).find((file) => file.endsWith("manifest.json"));
      if (!manifestFile) {
        throw new Error("manifest.json is required for an Obsidian plugin");
      }

      // Create a virtual file system plugin for esbuild
      const virtualFilePlugin: esbuild.Plugin = {
        name: "virtual-files",
        setup(build: esbuild.PluginBuild) {
          // Resolve virtual file paths
          build.onResolve({ filter: /.*/ }, (args: esbuild.OnResolveArgs) => {
            console.log(`[esbuild] Resolving: ${args.path} from ${args.importer}`);

            // Handle relative imports - might need to add extensions
            if (args.path.startsWith(".")) {
              // Try exact match first
              if (files[args.path]) {
                console.log(`[esbuild] Found exact match for ${args.path}`);
                return { path: args.path, namespace: "virtual-fs" };
              }

              // Try adding extensions
              const extensions = [".ts", ".tsx", ".js", ".jsx", ".json"];
              for (const ext of extensions) {
                const pathWithExt = args.path + ext;
                if (files[pathWithExt]) {
                  console.log(`[esbuild] Found with extension: ${pathWithExt}`);
                  return { path: pathWithExt, namespace: "virtual-fs" };
                }
              }

              // Try resolving index files in directories
              for (const ext of extensions) {
                const indexPath = args.path + "/index" + ext;
                if (files[indexPath]) {
                  console.log(`[esbuild] Found index file: ${indexPath}`);
                  return { path: indexPath, namespace: "virtual-fs" };
                }
              }

              console.log(`[esbuild] Could not resolve relative import: ${args.path}`);
              console.log(`[esbuild] Available files:`, Object.keys(files));
            }
            // Direct file reference without relative path
            else if (files[args.path]) {
              console.log(`[esbuild] Found direct reference: ${args.path}`);
              return { path: args.path, namespace: "virtual-fs" };
            }

            // External packages that would be in node_modules
            console.log(`[esbuild] Treating as external: ${args.path}`);
            return { path: args.path, external: true };
          });

          // Load virtual files from our files object
          build.onLoad({ filter: /.*/, namespace: "virtual-fs" }, (args: esbuild.OnLoadArgs) => {
            console.log(`[esbuild] Loading: ${args.path}`);

            // Get the file content from our files object
            const contents = files[args.path];
            if (contents) {
              // Determine the loader based on file extension
              const ext = args.path.split(".").pop()?.toLowerCase();
              const loader =
                ext === "ts" || ext === "tsx"
                  ? "tsx"
                  : ext === "jsx"
                  ? "jsx"
                  : ext === "json"
                  ? "json"
                  : "js";

              console.log(`[esbuild] Loaded ${args.path} with loader: ${loader}`);
              return { contents, loader: loader as esbuild.Loader };
            }

            // File not found in our virtual filesystem
            console.error(`[esbuild] File not found in virtual filesystem: ${args.path}`);
            return { errors: [{ text: `File not found: ${args.path}` }] };
          });
        },
      };

      // Run esbuild
      const result = await esbuild.build({
        entryPoints: [entryPoint],
        bundle: true,
        write: false,
        format: "cjs",
        platform: "browser",
        target: "es2018",
        plugins: [virtualFilePlugin],
        minify: false,
        treeShaking: true,
        logLevel: "info", // Enable logging for debugging
      });

      if (result.outputFiles && result.outputFiles.length > 0) {
        const bundledCode = result.outputFiles[0].text;

        // Ensure the output directory exists
        const adapter = this.app.vault.adapter;
        const path = require("path");
        const pluginsFolder = this.app.plugins?.getPluginFolder();
        const targetPluginDir = normalizePath(path.join(pluginsFolder, outputPath));

        if (!(await adapter.exists(targetPluginDir))) {
          await adapter.mkdir(targetPluginDir);
        }

        // Write the main.js file
        const mainJsPath = normalizePath(path.join(targetPluginDir, "main.js"));
        await adapter.write(mainJsPath, bundledCode);

        // Copy the manifest.json file
        const manifestContent = files[manifestFile];
        const manifestPath = normalizePath(path.join(targetPluginDir, "manifest.json"));
        await adapter.write(manifestPath, manifestContent);

        console.log(`[bundler] Plugin files written to: ${targetPluginDir}`);
        console.log(`[bundler] - main.js: ${mainJsPath}`);
        console.log(`[bundler] - manifest.json: ${manifestPath}`);

        return {
          success: true,
          outputPath: targetPluginDir,
          files: {
            mainJs: mainJsPath,
            manifest: manifestPath,
          },
        };
      } else {
        throw new Error("No output generated from esbuild");
      }
    } catch (error) {
      console.error("Bundle failed:", error);
      return { success: false, error };
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

    // Initialize esbuild in the background
    this.initializeEsbuild().catch(console.error);

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

    // Add a command to test the bundler functionality
    this.addCommand({
      id: "test-bundler-sample-plugin",
      name: "Test Bundler: Create Sample Plugin",
      callback: async () => {
        try {
          const result = await createSamplePlugin(this);
          if (result.success) {
            new Notice(`Plugin bundled successfully at: ${result.outputPath}`, 5000);
          } else {
            new Notice(`Plugin bundling failed: ${result.error}`, 5000);
          }
        } catch (error) {
          console.error("Error testing bundler:", error);
          new Notice("Error testing bundler. Check console for details.", 5000);
        }
      },
    });

    const settingsTab = new MetaSettingTab(this.app, this);
    this.addSettingTab(settingsTab);
  }

  onunload() {
    // Shutdown esbuild if it was initialized
    if (this.esbuildInitialized) {
      esbuild.stop();
      this.esbuildInitialized = false;
    }

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
