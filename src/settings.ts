import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import type { MetaPlugin as IMetaPlugin } from "./plugin";

export const LOCAL_STORAGE_API_KEY = "vibesidian-api-key";

export const DEFAULT_SETTINGS = {
  apiKey: "",
  baseUrl: "https://llm-oprah.zenture.cloud/v1",
  model: "claude-3-7-sonnet-20250219",
  availableModels: [] as string[],
  maxSteps: 20,
  maxRetries: 2,
  maxTokens: 8000,
};

export class MetaSettingTab extends PluginSettingTab {
  plugin: IMetaPlugin;

  constructor(app: App, plugin: IMetaPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  // Fetch a new API key from the CloudFlare Workers endpoint
  async fetchNewApiKey(): Promise<string> {
    try {
      const response = await fetch("https://cf-llm-oprah-bff.txn.workers.dev/key/generate", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch API key: ${response.statusText}`);
      }

      const data = await response.json();
      return data.key;
    } catch (error) {
      console.error("Error fetching new API key:", error);
      new Notice("Failed to fetch API key. Check console for details.");
      return "";
    }
  }

  async display(): Promise<void> {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h3", { text: "LLM Connection Settings" });
    let el;
    el = containerEl.createEl("p");
    el.innerHTML = `This plugin comes <strong>pre-configured</strong> with LLM access, but you can configure your own here.`;
    el = containerEl.createEl("p");
    el.innerHTML =
      "Be sure to use <i>intelligent</i> models. Lesser models generally will <strong><i>not</i></strong> work.";
    el = containerEl.createEl("p");
    el.style.padding = "0.5rem";
    el.style.borderRadius = "0.25rem";
    el.style.borderWidth = "1px";
    el.style.borderStyle = "solid";
    el.style.backgroundColor = "rgba(254, 252, 191, 0.12)"; // light yellow with alpha
    el.style.borderColor = "var(--border-warning, #fde047)";
    el.style.color = "var(--text-warning, #92400e)";
    el.style.fontSize = "0.875rem";
    el.style.marginBottom = "1rem";

    el.innerHTML = `<strong>Beta Notice:</strong> LLM access is currently provided free of charge while this plugin is in beta. This may change in future versions, potentially requiring you to configure your own API key and endpoint.`;

    new Setting(containerEl)
      .setName("API Key")
      .setDesc("Enter your API key here")
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
    const presetButtonSetting = new Setting(containerEl);
    presetButtonSetting.settingEl.style.borderTop = "none";

    // Add Default button with fetching a new API key
    presetButtonSetting.addButton((button) => {
      return button.setButtonText("Default").onClick(async () => {
        // Check if we have a stored key in localStorage
        let apiKey = localStorage.getItem(LOCAL_STORAGE_API_KEY);

        // If no key exists, fetch a new one
        if (!apiKey) {
          apiKey = await this.fetchNewApiKey();
          if (apiKey) {
            localStorage.setItem(LOCAL_STORAGE_API_KEY, apiKey);
          }
        }

        this.plugin.settings.baseUrl = DEFAULT_SETTINGS.baseUrl;
        this.plugin.settings.model = DEFAULT_SETTINGS.model;
        this.plugin.settings.availableModels = DEFAULT_SETTINGS.availableModels;
        this.plugin.settings.apiKey = apiKey || "";
        await this.plugin.saveSettings();
        this.display(); // Refresh the display to update the text field
      });
    });

    // Add OpenAI button
    presetButtonSetting.addButton((button) => {
      return button.setButtonText("OpenAI").onClick(async () => {
        this.plugin.settings.baseUrl = "https://api.openai.com/v1";
        this.plugin.settings.apiKey = "";
        await this.plugin.saveSettings();
        this.display(); // Refresh the display to update the text field
      });
    });

    // Add OpenRouter button
    presetButtonSetting.addButton((button) => {
      return button.setButtonText("OpenRouter").onClick(async () => {
        this.plugin.settings.baseUrl = "https://openrouter.ai/api/v1";
        this.plugin.settings.apiKey = "";
        await this.plugin.saveSettings();
        this.display(); // Refresh the display to update the text field
      });
    });

    // Add Ollama button
    presetButtonSetting.addButton((button) => {
      return button.setButtonText("Ollama").onClick(async () => {
        this.plugin.settings.baseUrl = "http://localhost:11434/v1";
        this.plugin.settings.apiKey = "";
        await this.plugin.saveSettings();
        this.display(); // Refresh the display to update the text field
      });
    });

    presetButtonSetting.addButton((button) => {
      return button.setButtonText("Claude").onClick(async () => {
        this.plugin.settings.baseUrl = "https://api.anthropic.com/v1";
        this.plugin.settings.apiKey = "";
        await this.plugin.saveSettings();
        this.display(); // Refresh the display to update the text field
      });
    });

    new Setting(containerEl).setName("Model").setDesc("Select the model to use for generation.");

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

    // Add advanced LLM settings
    containerEl.createEl("h3", { text: "Advanced LLM Settings" });

    new Setting(containerEl)
      .setName("Max Steps")
      .setDesc("Maximum number of steps the agent can take.")
      .addText((text) =>
        text
          .setPlaceholder("35")
          .setValue(String(this.plugin.settings.maxSteps))
          .onChange(async (value) => {
            const numValue = parseInt(value, 10);
            if (!isNaN(numValue)) {
              this.plugin.settings.maxSteps = numValue;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("Max Retries")
      .setDesc("Maximum number of retries for failed steps.")
      .addText((text) =>
        text
          .setPlaceholder("2")
          .setValue(String(this.plugin.settings.maxRetries))
          .onChange(async (value) => {
            const numValue = parseInt(value, 10);
            if (!isNaN(numValue)) {
              this.plugin.settings.maxRetries = numValue;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("Max Tokens")
      .setDesc("Maximum number of tokens for LLM responses.")
      .addText((text) =>
        text
          .setPlaceholder("14000")
          .setValue(String(this.plugin.settings.maxTokens))
          .onChange(async (value) => {
            const numValue = parseInt(value, 10);
            if (!isNaN(numValue)) {
              this.plugin.settings.maxTokens = numValue;
              await this.plugin.saveSettings();
            }
          })
      );
  }
}
