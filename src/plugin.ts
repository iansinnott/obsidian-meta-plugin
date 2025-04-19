import { Plugin } from "obsidian";
import { createAnthropic, type AnthropicProvider } from "@ai-sdk/anthropic";
import type { LanguageModelV1 } from "ai";
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { createTeamManagerAgent } from "./llm/agents";
import { SampleModal } from "./modal";
import { DEFAULT_SETTINGS, MetaSettingTab } from "./settings";
import { META_SIDEBAR_VIEW_TYPE, MetaSidebarView, activateSidebarView } from "./sidebar";
import { transformAnthropicRequest } from "./llm/utils/transformAnthropicRequest";

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
      // @todo Should prob make this configurable from the settings tab.
      settings: {
        maxSteps: 35,
        maxRetries: 2,
        maxTokens: 14_000,
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

  async onload() {
    await this.loadSettings();

    this.handleApiSettingsUpdate();

    // Register the sidebar view
    this.registerView(META_SIDEBAR_VIEW_TYPE, (leaf) => new MetaSidebarView(leaf, this));

    // This creates an icon in the left ribbon.
    const ribbonIconEl = this.addRibbonIcon("brain", "Obsidian Meta Plugin", (evt: MouseEvent) => {
      // Called when the user clicks the icon.
      activateSidebarView(this);
    });

    // Perform additional things with the ribbon
    ribbonIconEl.addClass("my-plugin-ribbon-class");

    // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
    const statusBarItemEl = this.addStatusBarItem();
    statusBarItemEl.setText("Status Bar Text");

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

    // This adds a settings tab so the user can configure various aspects of the plugin
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
}
