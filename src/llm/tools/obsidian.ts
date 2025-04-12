import { tool, type ToolExecutionOptions } from "ai";
import type { App } from "obsidian";
import { z } from "zod";

export const obsidianToolContextSchema = z.object({
  app: z.custom<App>(),
});

type ObsidianContext = z.infer<typeof obsidianToolContextSchema>;

export const listFilesTool = tool({
  description: "Get current weather for a location",
  parameters: z.object({}),
  // The execute function now accepts the context as the second parameter
  execute: async (_, options: ToolExecutionOptions & { context: ObsidianContext }) => {
    console.log("\n\nWeather tool called with context:", options.context);
    const { app } = options.context;
    return app.vault.getFiles();
  },
});
