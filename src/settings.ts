import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import type { MetaPlugin as IMetaPlugin } from "./plugin";

export const DEFAULT_SETTINGS = {
  apiKey: "",
  baseUrl: "https://api.openai.com",
  model: "",
  availableModels: [] as string[],
};

export class MetaSettingTab extends PluginSettingTab {
  plugin: IMetaPlugin;

  constructor(app: App, plugin: IMetaPlugin) {
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
    presetButtonSetting.settingEl.style.borderTop = "none";

    // Add OpenAI button
    presetButtonSetting.addButton((button) => {
      return button.setButtonText("OpenAI").onClick(async () => {
        this.plugin.settings.baseUrl = "https://api.openai.com/v1";
        await this.plugin.saveSettings();
        this.display(); // Refresh the display to update the text field
      });
    });

    // Add OpenRouter button
    presetButtonSetting.addButton((button) => {
      return button.setButtonText("OpenRouter").onClick(async () => {
        this.plugin.settings.baseUrl = "https://openrouter.ai/api/v1";
        await this.plugin.saveSettings();
        this.display(); // Refresh the display to update the text field
      });
    });

    // Add Ollama button
    presetButtonSetting.addButton((button) => {
      return button.setButtonText("Ollama").onClick(async () => {
        this.plugin.settings.baseUrl = "http://localhost:11434/v1";
        await this.plugin.saveSettings();
        this.display(); // Refresh the display to update the text field
      });
    });

    presetButtonSetting.addButton((button) => {
      return button.setButtonText("Claude").onClick(async () => {
        this.plugin.settings.baseUrl = "https://api.anthropic.com/v1";
        await this.plugin.saveSettings();
        this.display(); // Refresh the display to update the text field
      });
    });

    // Add Model Selection Dropdown and Refresh Button
    new Setting(containerEl).setName("Model").setDesc("Select the model to use for generation.");

    // Add Model Selection Dropdown and Refresh Button
    const modelSetting = new Setting(containerEl);

    modelSetting.infoEl.style.display = "none";
    modelSetting.settingEl.style.borderTop = "none";

    // Dropdown for model selection
    modelSetting.addDropdown((dropdown) => {
      // Populate dropdown options from settings
      // Use an empty array fallback if availableModels is undefined/null
      (this.plugin.settings.availableModels || []).forEach((model: string) => {
        dropdown.addOption(model, model);
      });
      dropdown.setValue(this.plugin.settings.model).onChange(async (value) => {
        this.plugin.settings.model = value;
        await this.plugin.saveSettings();
        console.log("Selected model:", value);
      });
    });

    // Refresh button for models
    modelSetting.addButton((button) => {
      button
        .setButtonText("Refresh")
        .setCta() // Makes it stand out slightly
        .setTooltip("Fetch the latest available models from the API")
        .onClick(async () => {
          button.setDisabled(true).setButtonText("Refreshing..."); // Disable button during refresh
          try {
            await this.plugin.refreshModelList();
            this.display(); // Refresh the settings display to update the dropdown
          } catch (error) {
            console.error("Error refreshing model list:", error);
            new Notice("Failed to refresh model list. Check console.");
            button.setDisabled(false).setButtonText("Refresh");
          }
        });
    });
  }
}
