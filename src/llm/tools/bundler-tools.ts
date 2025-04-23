import { tool, type ToolExecutionOptions } from "ai";
import { z } from "zod";
import type { ObsidianContext } from "./obsidian";

export const bundleTSSourceTool = tool({
  description: "Bundle a TypeScript main.ts file into a JavaScript main.js file.",
  parameters: z.object({
    mainTSPath: z.string(),
  }),
  execute: async ({ mainTSPath }, options: ToolExecutionOptions & { context: ObsidianContext }) => {
    const { plugin } = options.context;
    const result = await plugin.bundlePlugin(mainTSPath);
    return result;
  },
});
