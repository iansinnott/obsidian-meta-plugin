import { type App, Editor, MarkdownView, Notice, Plugin } from "obsidian";

import { OpenAI } from "openai";
import { MetaSettingTab } from "./src/settings";
import { SampleModal } from "./src/modal";
import { MetaPluginSettings, DEFAULT_SETTINGS } from "./src/types";
import { createOpenAI } from "@ai-sdk/openai";
import type { Provider } from "ai";

export default class MetaPlugin extends Plugin {
  settings: MetaPluginSettings;
  provider: Provider;
  api: OpenAI;

  async onload() {
    await this.loadSettings();

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

    // This creates an icon in the left ribbon.
    const ribbonIconEl = this.addRibbonIcon("brain", "Obsidian Meta Plugin", (evt: MouseEvent) => {
      // Called when the user clicks the icon.
      new Notice("This is a notice!");
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
    // This adds an editor command that can perform some operation on the current editor instance
    this.addCommand({
      id: "sample-editor-command",
      name: "Sample editor command",
      editorCallback: (editor: Editor, view: MarkdownView) => {
        console.log(editor.getSelection());
        editor.replaceSelection("Sample Editor Command");
      },
    });
    // This adds a complex command that can check whether the current state of the app allows execution of the command
    this.addCommand({
      id: "open-sample-modal-complex",
      name: "Open sample modal (complex)",
      checkCallback: (checking: boolean) => {
        // Conditions to check
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (markdownView) {
          // If checking is true, we're simply "checking" if the command can be run.
          // If checking is false, then we want to actually perform the operation.
          if (!checking) {
            new SampleModal(this.app, this).open();
          }

          // This command will only show up in Command Palette when the check function returns true
          return true;
        }
      },
    });

    const settingsTab = new MetaSettingTab(this.app, this);

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(settingsTab);

    // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
    // Using this function will automatically remove the event listener when this plugin is disabled.
    this.registerDomEvent(document, "click", (evt: MouseEvent) => {
      console.log("click", evt);
    });

    // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
    this.registerInterval(window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000));
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);

    // Re-initialize LLM with new settings
    this.api = new OpenAI({
      apiKey: this.settings.apiKey,
      baseURL: this.settings.baseUrl,
      dangerouslyAllowBrowser: true,
    });
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
