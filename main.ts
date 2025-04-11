import {
  App,
  Editor,
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
} from "obsidian";

import { OpenAI } from "openai";

interface MetaPluginSettings {
  apiKey: string;
  baseUrl: string;
}

const DEFAULT_SETTINGS: MetaPluginSettings = {
  apiKey: "",
  baseUrl: "https://api.openai.com",
};

export default class MetaPlugin extends Plugin {
  settings: MetaPluginSettings;
  llm: OpenAI;

  async onload() {
    await this.loadSettings();

    this.llm = new OpenAI({
      apiKey: this.settings.apiKey,
      baseURL: this.settings.baseUrl,
      dangerouslyAllowBrowser: true,
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
        new SampleModal(this.app).open();
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
            new SampleModal(this.app).open();
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
    this.llm = new OpenAI({
      apiKey: this.settings.apiKey,
      baseURL: this.settings.baseUrl,
      dangerouslyAllowBrowser: true,
    });
  }
}

class SampleModal extends Modal {
  constructor(app: App) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.setText("Woah!");
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class MetaSettingTab extends PluginSettingTab {
  plugin: MetaPlugin;

  constructor(app: App, plugin: MetaPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("API Key")
      .setDesc("Enter your OpenAI API key here")
      .addText((text) => {
        text
          .setPlaceholder("Enter your API key")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value;
            await this.plugin.saveSettings();
          });
        // Set the input type to password to hide the content
        text.inputEl.type = "password";
        return text;
      });

    // Base URL text input
    new Setting(containerEl)
      .setName("Base URL")
      .setDesc("Enter the base URL for the API or select a preset below.")
      .addText((text) =>
        text
          .setPlaceholder("https://api.openai.com")
          .setValue(this.plugin.settings.baseUrl)
          .onChange(async (value) => {
            this.plugin.settings.baseUrl = value;
            await this.plugin.saveSettings();
          })
      );

    // Add a separate section for preset API endpoint buttons
    const presetButtonSetting = new Setting(containerEl).setDesc("Select a preset API endpoint");

    // Add OpenAI button
    presetButtonSetting.addButton((button) => {
      return button.setButtonText("OpenAI").onClick(async () => {
        this.plugin.settings.baseUrl = "https://api.openai.com";
        await this.plugin.saveSettings();
        this.display(); // Refresh the display to update the text field
      });
    });

    // Add OpenRouter button
    presetButtonSetting.addButton((button) => {
      return button.setButtonText("OpenRouter").onClick(async () => {
        this.plugin.settings.baseUrl = "https://openrouter.ai/api";
        await this.plugin.saveSettings();
        this.display(); // Refresh the display to update the text field
      });
    });

    // Add Ollama button
    presetButtonSetting.addButton((button) => {
      return button.setButtonText("Ollama").onClick(async () => {
        this.plugin.settings.baseUrl = "http://localhost:11434";
        await this.plugin.saveSettings();
        this.display(); // Refresh the display to update the text field
      });
    });
  }
}
