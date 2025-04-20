import { gemma, haiku, llama4Maverick, llama4Scout, optimus, sonnet } from "@/src/llm/models";
import { weatherTool } from "@/src/llm/tools/weather";
import { fmt, omit } from "@/src/llm/utils";
import { transformAnthropicRequest } from "@/src/llm/utils/transformAnthropicRequest";
import { createAnthropic, type AnthropicProviderOptions } from "@ai-sdk/anthropic";
import { createFileEditorTool } from "@/src/llm/tools/fileEditor";
import { FILE_EDITOR_TOOL_NAME } from "@/src/llm/agents";

import {
  generateId,
  generateText,
  streamText,
  tool,
  wrapLanguageModel,
  type LanguageModelV1StreamPart,
} from "ai";
import * as fs from "fs";
import * as path from "path";
import { z } from "zod";

import { type BaseCLIContext, type CLICommandSPec, runCommands } from "./lib/cli";
import { preconnect } from "react-dom";

const getCLIContext = async (baseCtx: BaseCLIContext) => {
  return {
    ...baseCtx,
    custom: "custom",
  };
};

type CLIContext = Awaited<ReturnType<typeof getCLIContext>>;

const modelByArg = {
  sonnet: sonnet,
  haiku: haiku,
  optimus: optimus,
  llama4Maverick: llama4Maverick,
  llama4Scout: llama4Scout,
  gemma: gemma,
};

const DEFAULT_MODEL = "llama4Maverick";

const commands: CLICommandSPec<CLIContext> = {
  /**
   * Commands can be defined using a "spec" like this, which includes a
   * description which will be printed in the help.
   */
  gen: {
    description: "generate some AI text",
    exec: async (ctx) => {
      const { args, flags } = ctx;
      const { model: modelName = DEFAULT_MODEL } = flags;
      const model = modelByArg[modelName as keyof typeof modelByArg];
      if (!model) {
        throw new Error(`Unknown model: ${modelName}`);
      }
      const prompt = args[0];
      const result = await generateText({
        model,
        prompt,
        tools: {
          weatherTool,
        },
        maxSteps: 10,
        maxRetries: 2,
        maxTokens: 8000,
      });
      console.log(result.text);
      console.log("\n------- USAGE -------");
      console.log(fmt(result.usage));
      console.log("\n------- STEPS -------");
      console.log(fmt(result.steps.map((x) => omit(x, ["request", "response", "usage"]))));
    },
  },

  "dev:edit-file": {
    description: "edit a file",
    exec: async (ctx) => {
      const { args, flags } = ctx;
      const { file: filePath, prompt } = flags;
      if (!filePath) {
        throw new Error("file is required");
      }

      if (!prompt) {
        throw new Error("prompt is required");
      }

      // Store file backups for undo operations
      const fileBackups = new Map<string, string>();

      // Initialize conversation with Claude using the text editor tool
      console.log(`Starting file edit session for ${filePath} with prompt: ${prompt}`);

      // Use the refactored anthropic provider
      const anthropicWithEditor = createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
        headers: {
          "anthropic-dangerous-direct-browser-access": "true",
        },
        fetch: Object.assign(
          (url: string, options: RequestInit) => {
            const transformedOptions = options ? transformAnthropicRequest(options) : options;
            return fetch(url, transformedOptions);
          },
          {
            preconnect: fetch.preconnect,
          }
        ),
      });

      // Use the refactored file editor tool
      const fileEditorTool = createFileEditorTool({ basePath: process.cwd() });

      try {
        const result = await generateText({
          model: anthropicWithEditor("claude-3-7-sonnet-20250219"),
          prompt,
          tools: {
            [FILE_EDITOR_TOOL_NAME]: fileEditorTool,
          },
          maxTokens: 80_000,
          toolChoice: "auto",
          maxSteps: 15, // Limit the maximum number of interactions
          maxRetries: 2,
          onStepFinish: ({ request, response, ...step }) => {
            console.log("step", step);
          },
        });

        console.log("\n===== Request Body =====");
        console.log(result.request.body);
        console.log("\n===== Claude's Response =====");
        console.dir(result.response.messages, { depth: null });

        console.log("\n===== Usage Information =====");
        console.log(fmt(result.usage));
      } catch (error) {
        console.error("Error during file editing session:", error);
      }
    },
  },

  "dev:provider-options": {
    description: "print the provider options",
    exec: async (ctx) => {
      const result = await generateText({
        model: sonnet,
        prompt: "What's the weather like in San Francisco?",
        providerOptions: {
          anthropic: {
            thinking: { type: "enabled", budgetTokens: 1000 },
          } satisfies AnthropicProviderOptions,
        },
      });
      console.log(result.text);
    },
  },

  /**
   * You can use functions directly, to avoid thinking about a description.
   * @example
   * $ bun run script.ts printArgs hey --there=you
   */
  "dev:print-args": async (ctx) => {
    console.log(`args=${JSON.stringify(ctx.args)} flags=${JSON.stringify(ctx.flags)}`);
  },
};

const main = async () => {
  await runCommands({ getContext: getCLIContext, commands });
};

main().catch(console.error);
