import { type App, Editor, MarkdownView, Notice, Plugin } from "obsidian";

import { OpenAI } from "openai";
import { MetaSettingTab, DEFAULT_SETTINGS } from "./settings";
import { SampleModal } from "./modal";
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import type { LanguageModelV1 } from "ai";
import { Agent } from "./llm/agents";
import { listFilesTool, obsidianToolContextSchema, readFilesTool } from "./llm/tools/obsidian";
import { MetaSidebarView, META_SIDEBAR_VIEW_TYPE, activateSidebarView } from "./sidebar";

const createAgent = ({ llm }: { llm: LanguageModelV1 }) => {
  return new Agent({
    name: "obsidian vault file manager",
    instructions: `You help users manage the files in their Obsidian vault.`,
    model: llm,
    contextSchema: obsidianToolContextSchema,
    tools: {
      listFilesTool,
      readFilesTool,
    },
  });
};

export class MetaPlugin extends Plugin {
  settings: typeof DEFAULT_SETTINGS;
  api: OpenAI;
  provider: OpenAIProvider;
  llm: LanguageModelV1;
  agent: ReturnType<typeof createAgent>;

  /**
   * Handle changes to the LLM configuration. Whenever the LLM settings change
   * we need to re-instantiate a few things with the updated information.
   */
  handleApiSettingsUpdate() {
    // No sonnet for now, sorry sonnet
    this.api = new OpenAI({
      apiKey: this.settings.apiKey,
      baseURL: this.settings.baseUrl,
      dangerouslyAllowBrowser: true,
    });

    this.provider = createOpenAI({
      apiKey: this.settings.apiKey,
      baseURL: this.settings.baseUrl,
    });

    if (this.settings.model && this.llm?.modelId !== this.settings.model) {
      this.llm = this.provider(this.settings.model);
    }

    this.agent = createAgent({ llm: this.llm });
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
