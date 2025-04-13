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
