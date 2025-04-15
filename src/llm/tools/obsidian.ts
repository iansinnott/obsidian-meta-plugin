import { tool, type ToolExecutionOptions } from "ai";
import type { App } from "obsidian";
import { z } from "zod";

export const obsidianToolContextSchema = z.object({
  app: z.custom<App>(),
});

type ObsidianContext = z.infer<typeof obsidianToolContextSchema>;

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
    caseSensitive: z.boolean().optional().describe("Whether the search should be case sensitive"),
    fileExtensions: z
      .array(z.string())
      .optional()
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
    caseSensitive: z.boolean().optional().describe("Whether the search should be case sensitive"),
    fileExtensions: z
      .array(z.string())
      .optional()
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
      .optional()
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
      .optional()
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
      
    How to use:
    - Write a function body as a string that takes the Obsidian \`app\` instance as the first argument.
      - Example: \`"return typeof app === undefined;"\`. This will return \`false\`, since \`app\` is is the first argument and is defined.
      - The string will be evaluated using the \`new Function\` constructor. \`new Function('app', yourCode)\`.
      - The App object is documented here, although full documentation is not provided: https://docs.obsidian.md/Reference/TypeScript+API/App. Make use of your expertise with Obsidian plugins to utilise this API.
    - Pass the function definition as a string to this tool.
    - The function will be called with the Obsidian \`app\` instance as the first argument, and the return value of your function will be returned as the result of this tool.
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
      const fn = new Function("app", functionBody);
      const result = fn(app);

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
