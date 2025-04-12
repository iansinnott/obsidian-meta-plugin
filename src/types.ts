import type { Plugin } from "obsidian";
import type { OpenAI } from "openai";
import type { Provider } from "ai";

export interface MetaPluginSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  availableModels: string[];
}

export const DEFAULT_SETTINGS: MetaPluginSettings = {
  apiKey: "",
  baseUrl: "https://api.openai.com",
  model: "",
  availableModels: [],
};

// Define an interface that extends Plugin for the plugin to be used by other modules
export interface IMetaPlugin extends Plugin {
  settings: MetaPluginSettings;
  api: OpenAI;
  provider: Provider;
  saveSettings(): Promise<void>;
  refreshModelList(): Promise<string[]>;
}
