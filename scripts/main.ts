import { sonnet, haiku, optimus, llama4Maverick, llama4Scout, gemma } from "@/src/llm/models";
import { generateId, generateText, streamText } from "ai";
import { type BaseCLIContext, type CLICommandSPec, runCommands } from "./lib/cli";
import { fmt, omit } from "@/src/llm/utils";
import { weatherTool } from "@/src/llm/tools/weather";
import { Agent } from "@/src/llm/agents";
import { z } from "zod";
import type { AnthropicProviderOptions } from "@ai-sdk/anthropic";

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
  "dev:x": {
    description: "x",
    exec: async (ctx) => {
      const weatherAgent = new Agent({
        name: "weather agent",
        instructions: `You help users find weather for various locales`,
        model: sonnet,
        contextSchema: z.object({
          useMetric: z.boolean().optional(),
          stuff: z.string(),
        }),
        tools: {
          weatherTool,
        },
      });

      const result = weatherAgent.streamText(
        {
          prompt: "What's the weather like in San Francisco?",
        },
        {
          stuff: "some stuff",
          useMetric: true,
        }
      );

      for await (const chunk of result.fullStream) {
        switch (chunk.type) {
          case "text-delta":
            process.stdout.write(chunk.textDelta);
            break;
          case "tool-call":
          case "tool-call-delta":
          case "tool-call-streaming-start":
          case "tool-result":
            console.log("\n[Tool Call]:", JSON.stringify(chunk));
            break;
        }
      }
    },
  },

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

  /**
   * Similar to gen but streams the output to the console as it comes in
   */
  stream: {
    description: "stream AI text output as it's generated",
    exec: async (ctx) => {
      const { args, flags } = ctx;
      const { model: modelName = DEFAULT_MODEL } = flags;
      const model = modelByArg[modelName as keyof typeof modelByArg];
      if (!model) {
        throw new Error(`Unknown model: ${modelName}`);
      }
      const prompt = args[0];

      const weatherAgent = new Agent({
        name: "weather agent",
        instructions: `You help users find weather for various locales`,
        model: sonnet,
        contextSchema: z.object({
          useMetric: z.boolean().optional(),
          stuff: z.string(),
        }),
        tools: {
          weatherTool,
        },
      });

      process.stdout.write(".");
      const interval = setInterval(() => {
        process.stdout.write(".");
      }, 100);

      try {
        const result = weatherAgent.streamText({
          prompt,
          maxSteps: 10,
          maxRetries: 2,
          maxTokens: 8000,
        });

        for await (const chunk of result.fullStream) {
          switch (chunk.type) {
            case "step-start":
              console.log("\n[Step Start]: Message ID", chunk.messageId);
              clearInterval(interval);
              break;

            case "text-delta":
              process.stdout.write(chunk.textDelta);
              break;

            case "reasoning":
              console.log("\n[Reasoning]:", chunk.textDelta);
              break;

            case "reasoning-signature":
              console.log("\n[Reasoning Signature]:", chunk.signature);
              break;

            case "redacted-reasoning":
              console.log("\n[Redacted Reasoning] - Content redacted");
              break;

            case "tool-call":
              // Combining toolName and args for display
              const toolCallInfo = {
                toolName: chunk.toolName,
                args: chunk.args,
              };
              console.log("\n[->]:", JSON.stringify(toolCallInfo, null, 2));
              break;

            case "tool-call-streaming-start":
              console.log("\n[Tool Call Started]:", chunk.toolName);
              break;

            case "tool-call-delta":
              console.log("\n[Tool Call Delta]:", chunk.argsTextDelta);
              break;

            case "tool-result":
              console.log("\n[<-]:", JSON.stringify(chunk.result, null, 2));
              break;

            case "error":
              console.error("\n[Error]:", chunk.error);
              break;

            case "source":
              console.log("\n[Source]:", JSON.stringify(chunk.source, null, 2));
              break;

            case "file":
              // GeneratedFile type properties
              if ("path" in chunk && "content" in chunk) {
                console.log("\n[File]:", chunk.path, "\n", chunk.content);
              } else {
                console.log("\n[File]:", JSON.stringify(chunk, null, 2));
              }
              break;

            case "step-finish":
              console.log("\n[Step Complete]: Message ID", chunk.messageId);
              break;

            case "finish":
              console.log("\n[Generation Finished]");
              break;

            default:
              console.log("\n[Unknown Chunk Type]:", JSON.stringify(chunk));
          }
        }

        console.log("\n------- USAGE -------");
        console.log(fmt(await result.usage));
        console.log("\n------- STEPS -------");
        console.log(
          fmt((await result.steps).map((x) => omit(x, ["request", "response", "usage"])))
        );
      } catch (error) {
        console.error("\nError during streaming:", error);
      } finally {
        clearInterval(interval);
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
