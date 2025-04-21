// NOTE: Avoid importing directly from obsidian in this file, since it only works in Obisdian and thus breaks tests
import type { App, MarkdownView, TFile } from "obsidian";

import * as Obsidian from "obsidian";

import type { MetaPlugin } from "@/src/plugin";
import { tool, type ToolExecutionOptions } from "ai";
import { z } from "zod";
import type { ChunkProcessor } from "../chunk-processor";

export const obsidianToolContextSchema = z.object({
  app: z.custom<App>(),
  plugin: z.custom<MetaPlugin>(),
  getProcessor: z.function().args(z.string(), z.string()).returns(z.custom<ChunkProcessor>()),
  abortSignal: z.instanceof(AbortSignal).optional(),
});

export type ObsidianContext = z.infer<typeof obsidianToolContextSchema>;

export const listFilesTool = tool({
  description: "List files in the vault. Returns file path, last modified time, and size in bytes.",
  parameters: z.object({}),
  execute: async (_, options: ToolExecutionOptions & { context: ObsidianContext }) => {
    const { app } = options.context;
    return app.vault
      .getFiles()
      .map((x) => ({ path: x.path, mtime: x.stat.mtime, size: x.stat.size }));
  },
});

export const readFilesTool = tool({
  description: "Read the content of a text file in the vault. Returns the uft-8 file content.",
  parameters: z.object({
    path: z.string().describe("Path within the vault to the file to read"),
  }),
  execute: async ({ path }, options: ToolExecutionOptions & { context: ObsidianContext }) => {
    const { app } = options.context;
    const file = app.vault.getFileByPath(path);

    if (!file) {
      throw new Error(`File not found: ${path}`);
    }

    return app.vault.read(file);
  },
});

export const searchVaultTool = tool({
  description:
    "Search the vault contents for a specific term. Matching lines in files will be returned. Similar to grep functionality.",
  parameters: z.object({
    searchTerm: z
      .string()
      .describe(
        "Term to search for in the vault files. String literal. Regex not currently supported."
      ),
    caseSensitive: z
      .boolean()
      .default(false)
      .describe("Whether the search should be case sensitive"),
    fileExtensions: z
      .array(z.string())
      .default(["md", "txt"])
      .describe(
        "List of file extensions to search (e.g., ['md', 'txt']). If not provided, all files will be searched."
      ),
  }),
  execute: async (
    { searchTerm, caseSensitive = false, fileExtensions },
    options: ToolExecutionOptions & { context: ObsidianContext }
  ) => {
    const { app } = options.context;
    const files = app.vault.getFiles();

    const results = [];

    for (const file of files) {
      // Skip files that don't match the requested extensions
      if (fileExtensions && fileExtensions.length > 0) {
        const ext = file.extension.toLowerCase();
        if (!fileExtensions.includes(ext)) {
          continue;
        }
      }

      try {
        const content = await app.vault.read(file);
        const lines = content.split("\n");
        const matchingLines = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const searchMethod = caseSensitive
            ? (s: string) => s.includes(searchTerm)
            : (s: string) => s.toLowerCase().includes(searchTerm.toLowerCase());

          if (searchMethod(line)) {
            matchingLines.push({
              lineNumber: i + 1,
              content: line.trim(),
            });
          }
        }

        if (matchingLines.length > 0) {
          results.push({
            path: file.path,
            matches: matchingLines,
          });
        }
      } catch (error) {
        // Skip binary files or files that can't be read as text
        continue;
      }
    }

    return results;
  },
});

export const searchFilesByNameTool = tool({
  description:
    "Search for files in the vault by filename. Returns a list of files whose names match the search term.",
  parameters: z.object({
    searchTerm: z
      .string()
      .describe("Term to search for in filenames. String literal. Regex not currently supported."),
    caseSensitive: z
      .boolean()
      .default(false)
      .describe("Whether the search should be case sensitive"),
    fileExtensions: z
      .array(z.string())
      .default(["md", "txt"])
      .describe(
        "List of file extensions to search (e.g., ['md', 'txt']). If not provided, all files will be searched."
      ),
  }),
  execute: async (
    { searchTerm, caseSensitive = false, fileExtensions },
    options: ToolExecutionOptions & { context: ObsidianContext }
  ) => {
    const { app } = options.context;
    const files = app.vault.getFiles();

    const results = [];

    for (const file of files) {
      // Skip files that don't match the requested extensions
      if (fileExtensions && fileExtensions.length > 0) {
        const ext = file.extension.toLowerCase();
        if (!fileExtensions.includes(ext)) {
          continue;
        }
      }

      // Extract filename from path
      const filename = file.name;

      // Check if filename matches search term
      const searchMethod = caseSensitive
        ? (s: string) => s.includes(searchTerm)
        : (s: string) => s.toLowerCase().includes(searchTerm.toLowerCase());

      if (searchMethod(filename)) {
        results.push({
          path: file.path,
          name: filename,
          mtime: file.stat.mtime,
          size: file.stat.size,
        });
      }
    }

    return results;
  },
});

export const createFileTool = tool({
  description:
    "Create a new file in the vault with the specified content. Calls app.vault.create under the hood.",
  parameters: z.object({
    path: z.string().describe("Path within the vault where the file should be created"),
    content: z.string().describe("Content to write to the new file"),
    overwrite: z
      .boolean()
      .default(false)
      .describe("Whether to overwrite an existing file. Defaults to false."),
  }),
  execute: async (
    { path, content, overwrite = false },
    options: ToolExecutionOptions & { context: ObsidianContext }
  ) => {
    const { app } = options.context;

    // Check if file already exists
    const existingFile = app.vault.getFileByPath(path);
    if (existingFile && !overwrite) {
      throw new Error(`File already exists at path: ${path}. Set overwrite=true to replace it.`);
    }

    try {
      if (existingFile) {
        // Modify existing file
        await app.vault.modify(existingFile, content);
        return { success: true, path, message: "File updated successfully" };
      } else {
        // Create directories if needed
        const dirPath = path.split("/").slice(0, -1).join("/");
        if (dirPath) {
          await app.vault.createFolder(dirPath).catch((e) => {
            // Ignore errors if folder already exists
            if (!e.message.includes("already exists")) {
              throw e;
            }
          });
        }

        // Create new file
        await app.vault.create(path, content);
        return { success: true, path, message: "File created successfully" };
      }
    } catch (error) {
      return {
        success: false,
        path,
        message: `Failed to create file: ${error.message || error}`,
      };
    }
  },
});

export const updateFileTool = tool({
  description:
    "Update the content of an existing file in the vault. Calls app.vault.modify under the hood.",
  parameters: z.object({
    path: z.string().describe("Path within the vault to the file to update"),
    content: z.string().describe("New content for the file"),
    createIfNotExists: z
      .boolean()
      .default(false)
      .describe("Whether to create the file if it doesn't exist. Defaults to false."),
  }),
  execute: async (
    { path, content, createIfNotExists = false },
    options: ToolExecutionOptions & { context: ObsidianContext }
  ) => {
    const { app } = options.context;
    const file = app.vault.getFileByPath(path);

    try {
      if (file) {
        // Update existing file
        await app.vault.modify(file, content);
        return { success: true, path, message: "File updated successfully" };
      } else if (createIfNotExists) {
        // Create directories if needed
        const dirPath = path.split("/").slice(0, -1).join("/");
        if (dirPath) {
          await app.vault.createFolder(dirPath).catch((e) => {
            // Ignore errors if folder already exists
            if (!e.message.includes("already exists")) {
              throw e;
            }
          });
        }

        // Create new file
        await app.vault.create(path, content);
        return { success: true, path, message: "File created successfully" };
      } else {
        throw new Error(`File not found: ${path}. Set createIfNotExists=true to create it.`);
      }
    } catch (error) {
      return {
        success: false,
        path,
        message: `Failed to update file: ${error.message || error}`,
      };
    }
  },
});

/**
 * NOTE: I created this to allow the AI to request functionality i've not yet
 * implemented, and then implement standalone tools as needed. That being said,
 * we could implement this API directly and let the AI have free reign. Seems a
 * bit ill-advised though, especially since the user can use whatever model they
 * like.
 */
export const obsidianAPITool = tool({
  description: `
    Use the Obsidian API directly. This is an experimental tool and should be used with caution. Only use this tool when the other Obsidian tools are insufficient.
      
    IMPORTANT: Be very careful when using this tool. It provides full, unrestricted access to the Obsidian API, which allows destructive actions.
    
    Definitions:
    - \`app\` is the Obsidian App instance.
    - \`obsidian\` is the 'obsidian' module import. I.e. the result of \`require('obsidian')\` or \`import * as obsidian from 'obsidian'\`.
      
    How to use:
    - Write a function body as a string that takes the Obsidian \`app\` instance as the first argument and the \`obsidian\` module as the second argument.
      - Example: \`"return typeof app === undefined;"\`. This will return \`false\`, since \`app\` is is the first argument and is defined.
      - The string will be evaluated using the \`new Function\` constructor. \`new Function('app', 'obsidian', yourCode)\`.
      - The App object is documented here, although full documentation is not provided: https://docs.obsidian.md/Reference/TypeScript+API/App. Make use of your expertise with Obsidian plugins to utilise this API.
    - Pass the function definition as a string to this tool.
    - The function will be called with the Obsidian \`app\` instance as the first argument, and the \`obsidian\` module as the second argument.
    - The return value of your function will be returned as the result of this tool.
    - NOTE: The \`obsidian\` module is provided as an argument so that you do not need to \`require\` or \`import\` it in your function body. Neither of these are available in the global scope and will not be available to the function.
    - NOTE: A return value is not required. If your function has a return statement we will attempt to serialize the value using JSON.stringify.
    - NOTE: Any error thrown by your function will be caught and returned as an error object.
  `,
  parameters: z.object({
    functionBody: z
      .string()
      .describe(
        "The full function, as a plain string, to be called with the Obisidan `app` instance as the first argument."
      ),
  }),
  execute: async (
    { functionBody },
    options: ToolExecutionOptions & { context: ObsidianContext }
  ) => {
    const { app } = options.context;

    try {
      const fn = new Function("app", "obsidian", functionBody);
      let result = fn(app, Obsidian);
      const isThenable = typeof result === "object" && typeof result.then === "function";

      // Check if the result is a Promise and await it if so. I've seen the
      // model return a promise before, so we need to handle that case.
      if (result instanceof Promise || isThenable) {
        result = await result;
      }

      return {
        success: true,
        result: result !== undefined ? result : undefined,
        message: "Function executed successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: `Error executing function: ${error.message || error}`,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      };
    }
  },
});

export const getCurrentThemeTool = tool({
  description:
    "Get the currently active Obsidian theme. Returns the theme name, light/dark mode, and the CSS classes applied to the body.",
  parameters: z.object({}),
  execute: async (_, options: ToolExecutionOptions & { context: ObsidianContext }) => {
    const { app } = options.context;

    try {
      const activeTheme = app.vault.config.cssTheme;
      const lightDarkMode = app.vault.config.theme;

      return {
        success: true,
        theme: {
          activeTheme,
          lightDarkMode,
          cssClasses: Array.from(document.body.classList).join(" "),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get current theme: ${error.message || error}`,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      };
    }
  },
});

export const listAvailableThemesTool = tool({
  description: "List all available themes that the user can choose from in Obsidian.",
  parameters: z.object({}),
  execute: async (_, options: ToolExecutionOptions & { context: ObsidianContext }) => {
    const { plugin } = options.context;
    const app = plugin.app;
    const vault = app.vault;

    try {
      const activeTheme = app.customCss?.theme || app.vault.config.cssTheme;
      const themes = app.customCss?.themes;

      return {
        success: true,
        themes,
        activeTheme,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to list available themes: ${error.message || error}`,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      };
    }
  },
});

export const setThemeTool = tool({
  description: `
    Set the currently active Obsidian theme. Only installed themes can be set. 
    Set light or dark mode (Optional).
    First list available themes if unsure. 
    If the user requests a theme that is not available tell them as much.
  `,
  parameters: z.object({
    themeName: z.string().describe("The name of the theme to set. Must already be installed."),
    lightDarkMode: z
      .enum(["light", "dark", "default"])
      .describe(
        "The light/dark mode to set the theme to. In Obsidian 'light' corresponds to 'moonstone' and 'dark' corresponds to 'obsidian'. 'default' is a noop and will not change the mode."
      ),
  }),
  execute: async (
    { themeName, lightDarkMode },
    options: ToolExecutionOptions & { context: ObsidianContext }
  ) => {
    const { app } = options.context;
    if (!app.customCss) {
      throw new Error("No custom CSS found");
    }

    app.customCss.setTheme(themeName);

    if (lightDarkMode !== "default") {
      const newMode = { light: "moonstone", dark: "obsidian" }[lightDarkMode];
      app.changeTheme(newMode as "obsidian" | "moonstone" | "system");
    }

    return { success: true, message: "Theme set successfully" };
  },
});

export const listLastOpenFilesTool = tool({
  description:
    "List all files that have been recently opened in Obsidian. Calls app.workspace.getLastOpenFiles under the hood but returns a list of file objects.",
  parameters: z.object({}),
  execute: async (_, options: ToolExecutionOptions & { context: ObsidianContext }) => {
    const { app } = options.context;
    const files = app.workspace
      .getLastOpenFiles()
      .map((x) => app.vault.getFileByPath(x))
      .filter((x) => x !== null)
      .map((x) => ({
        path: x.path,
        mtime: x.stat.mtime,
        size: x.stat.size,
      }));
    return files;
  },
});

export const listOpenFilesTool = tool({
  description:
    "List all open files in Obsidian. These files are open tabs in the user's Obsidian editor.",
  parameters: z.object({}),
  execute: async (_, options: ToolExecutionOptions & { context: ObsidianContext }) => {
    const { app } = options.context;

    function getOpenFiles(): TFile[] {
      const openFiles: TFile[] = [];
      const leaves = app.workspace.getLeavesOfType("markdown").filter((x) => {
        return (x.view as MarkdownView).file !== null;
      });

      for (const leaf of leaves) {
        const file = (leaf.view as MarkdownView).file;
        if (file) {
          openFiles.push(file);
        }
      }

      return openFiles;
    }

    const files = getOpenFiles();

    return files.map((x) => ({
      path: x.path,
      mtime: x.stat.mtime,
      size: x.stat.size,
    }));
  },
});

export const getCurrentFileTool = tool({
  description:
    "Get the current file that the user is editing in Obsidian. Can be null, which indicates the user has no files open.",
  parameters: z.object({}),
  execute: async (_, options: ToolExecutionOptions & { context: ObsidianContext }) => {
    const { app } = options.context;
    const file = app.workspace.getActiveFile();
    return {
      file: file ? { path: file.path, mtime: file.stat.mtime, size: file.stat.size } : null,
    };
  },
});

export const listCssSnippetsTool = tool({
  description:
    "List all CSS snippets installed in the Obsidian vault, including their active status.",
  parameters: z.object({}),
  execute: async (_, options: ToolExecutionOptions & { context: ObsidianContext }) => {
    const { app } = options.context;

    try {
      if (!app.customCss) {
        throw new Error("Custom CSS module not available");
      }

      const snippetNames = app.customCss.snippets || [];

      // To get active status, we need to check if each snippet is enabled
      // Obsidian stores enabled snippets in a Set in the internal structure
      let enabledSnippets = new Set<string>();

      // Access the enabledSnippets property using the API tool approach
      // This is a bit hacky but necessary as the public types don't expose this property
      try {
        const enabled = app.customCss.enabledSnippets;
        if (enabled && (enabled instanceof Set || Array.isArray(enabled))) {
          // Convert to Set if it's an array
          Array.isArray(enabled)
            ? (enabledSnippets = new Set(enabled))
            : (enabledSnippets = enabled);
        }
      } catch (e) {
        // Fallback - try to use direct property access
        // @ts-ignore - Accessing internal property
        const enabled = app.customCss.enabledSnippets;
        if (enabled) {
          enabledSnippets = new Set(Array.from(enabled));
        }
      }

      // Build the result
      const snippets = snippetNames.map((name) => ({
        name,
        isActive: enabledSnippets.has(name),
        path: `${name}.css`, // Snippets are stored as .css files
      }));

      const snippetFolder = app.customCss.getSnippetsFolder();

      return {
        success: true,
        snippets,
        snippetFolder,
        totalCount: snippets.length,
        activeCount: snippets.filter((s) => s.isActive).length,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to list CSS snippets: ${error.message || error}`,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      };
    }
  },
});

export const toggleCssSnippetTool = tool({
  description:
    "Enable or disable a CSS snippet in the Obsidian vault by name. Generally you will get the snippet name by first listing the user's CSS snippets.",
  parameters: z.object({
    snippetName: z.string().describe("Name of the CSS snippet to toggle (without .css extension)"),
    enabled: z.boolean().describe("Whether to enable (true) or disable (false) the snippet"),
  }),
  execute: async (
    { snippetName, enabled },
    options: ToolExecutionOptions & { context: ObsidianContext }
  ) => {
    const { app } = options.context;

    try {
      if (!app.customCss) {
        throw new Error("Custom CSS module not available");
      }

      // Check if the snippet exists
      const snippets = app.customCss.snippets || [];
      if (!snippets.includes(snippetName)) {
        return {
          success: false,
          message: `CSS snippet '${snippetName}' not found. Use listCssSnippetsTool to see available snippets.`,
        };
      }

      // Toggle the snippet
      app.customCss.setCssEnabledStatus(snippetName, enabled);

      return {
        success: true,
        message: `CSS snippet '${snippetName}' ${enabled ? "enabled" : "disabled"} successfully.`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to ${enabled ? "enable" : "disable"} CSS snippet: ${
          error.message || error
        }`,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      };
    }
  },
});

export const togglePluginTool = tool({
  description: `Enable or disable an Obsidian plugin by ID. Use this to toggle plugins on
  or off programmatically. IMPORTANT: If a new plugin was created and plugins
    have not yet been reloaded, enabling it may fail. The user must first click
  the "Reload plugins" button in Obsidian settings "Community plugins" tab.`,
  parameters: z.object({
    pluginId: z.string().describe("ID of the Obsidian plugin to toggle"),
    enabled: z.boolean().describe("Whether to enable (true) or disable (false) the plugin"),
  }),
  execute: async (
    { pluginId, enabled },
    options: ToolExecutionOptions & { context: ObsidianContext }
  ) => {
    const { app } = options.context;

    try {
      if (!app.plugins) {
        throw new Error("Plugin API not available");
      }

      // Toggle the plugin
      if (enabled) {
        await app.plugins.enablePluginAndSave(pluginId);
      } else {
        await app.plugins.disablePluginAndSave(pluginId);
      }

      return {
        success: true,
        message: `Plugin '${pluginId}' ${enabled ? "enabled" : "disabled"} successfully.`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to ${enabled ? "enable" : "disable"} plugin: ${error.message || error}`,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      };
    }
  },
});

export const listPluginsTool = tool({
  description:
    "List all installed plugins in the Obsidian vault, showing their ID, name, version, and enabled status.",
  parameters: z.object({}),
  execute: async (_, options: ToolExecutionOptions & { context: ObsidianContext }) => {
    const { app } = options.context;

    try {
      if (!app.plugins) {
        throw new Error("Plugin API not available");
      }

      // Get all plugin manifests and active status
      const manifests = app.plugins.manifests || {};
      const enabledPlugins = app.plugins.enabledPlugins || new Set();

      // Build the result list
      const plugins = Object.entries(manifests).map(([id, manifest]) => ({
        id,
        name: manifest.name,
        version: manifest.version,
        author: manifest.author,
        description: manifest.description || "",
        enabled: enabledPlugins.has(id),
      }));

      return {
        success: true,
        plugins,
        totalCount: plugins.length,
        enabledCount: plugins.filter((p) => p.enabled).length,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to list plugins: ${error.message || error}`,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      };
    }
  },
});
