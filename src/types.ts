import { Plugin } from "obsidian";
import { OpenAI } from "openai";

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
  llm: OpenAI;
  saveSettings(): Promise<void>;
  refreshModelList(): Promise<string[]>;
}
