// Augmented type definitions for the Obsidian API
import "obsidian";

declare module "obsidian" {
  interface DataAdapter {
    basePath: string;
    getBasePath(): string;
  }

  interface Vault {
    config: {
      cssTheme: string;
      /** 'obsidian' means 'dark' and 'moonstone' means 'light'. Not sure what it means when undefined. Implicitly 'system'? */
      theme?: "system" | "obsidian" | "moonstone";
    };
  }

  interface App {
    changeTheme: (theme: "obsidian" | "moonstone" | "system") => void;

    // Custom CSS module
    customCss?: {
      theme: string;
      themes: {
        [themeId: string]: {
          name: string;
          author: string;
          version?: string;
          authorUrl?: string;
          dir?: string;
        };
      };

      /**
       * @param snippetName - The name of the CSS snippet to enable/disable.
       * @param enabled - Whether to enable (true) or disable (false) the snippet.
       */
      setCssEnabledStatus: (snippetName: string, enabled: boolean) => void;

      enabledSnippets: Set<string>;

      /** Get's the configured folder where all themes are stored. */
      getThemeFolder(): string;
      /** Get's the configured folder where all snippets are stored. */
      getSnippetsFolder(): string;

      /** The names of css snippet files installed in the current vault. Does not include the .css extension. Does not include active status. */
      snippets: string[];

      setTheme: (themeName: string) => void;
    };

    // Plugin module
    plugins?: {
      getPluginFolder(): string;
      enabledPlugins: Set<string>;
      plugins: {
        [pluginId: string]: Plugin; // Plugin instances
      };
      manifests: {
        [pluginId: string]: {
          id: string;
          name: string;
          author: string;
          version: string;
          minAppVersion?: string;
          description?: string;
        };
      };
      /** Get a plugin instance by its ID */
      getPlugin(id: string): Plugin | null;
      /** Enable a plugin and save the change to disk */
      enablePluginAndSave(id: string): Promise<void>;
      /** Disable a plugin and save the change to disk */
      disablePluginAndSave(id: string): Promise<void>;
    };

    internalPlugins: {
      plugins: {
        [pluginId: string]: Plugin; // Plugin instances
      };
      config: {
        "file-explorer": boolean;
        "global-search": boolean;
        switcher: boolean;
        graph: boolean;
        backlink: boolean;
        canvas: boolean;
        "outgoing-link": boolean;
        "tag-pane": boolean;
        properties: boolean;
        "page-preview": boolean;
        "daily-notes": boolean;
        templates: boolean;
        "note-composer": boolean;
        "command-palette": boolean;
        "slash-command": boolean;
        "editor-status": boolean;
        bookmarks: boolean;
        "markdown-importer": boolean;
        "zk-prefixer": boolean;
        "random-note": boolean;
        outline: boolean;
        "word-count": boolean;
        slides: boolean;
        "audio-recorder": boolean;
        workspaces: boolean;
        "file-recovery": boolean;
        publish: boolean;
        sync: boolean;
        webviewer: boolean;
        // Catchall in case our keys are off
        [key: string]: boolean;
      };
    };

    // Add other app properties that aren't in the official types
    commands?: {
      commands: {
        [commandId: string]: ObsidianCommand;
      };
      executeCommandById: (commandId: string) => boolean;
      findCommand: (commandId: string) => any;
    };

    // Settings module
    setting?: {
      // Primary settings tabs like Appearance, Hotkeys, About, etc.
      settingTabs: SettingTab[];
      // Plugin settings tabs
      pluginTabs: SettingTab[];
      // Currently active tab
      activeTab: SettingTab | null;
      // Last opened tab ID
      lastTabId: string | null;

      // Methods
      open: () => void;
      openTabById: (tabId: string) => boolean;
      close: () => void;
    };
  }

  // You can also define new interfaces for internal Obsidian structures
  interface ObsidianTheme {
    id: string;
    name: string;
    author: string;
    version?: string;
    isActive?: boolean;
  }

  interface ObsidianCommand {
    id: string;
    name: string;
    hotkeys?: Array<{
      modifiers: string[];
      key: string;
    }>;
  }
}
