import { gemma, haiku, llama4Maverick, llama4Scout, optimus, sonnet } from "@/src/llm/models";
import { weatherTool } from "@/src/llm/tools/weather";
import { fmt, omit } from "@/src/llm/utils";
import { transformAnthropicRequest } from "@/src/llm/utils/transformAnthropicRequest";
import { createAnthropic, type AnthropicProviderOptions } from "@ai-sdk/anthropic";

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

      const transformedPaths = new Map<string, string>();

      // Store file backups for undo operations
      const fileBackups = new Map<string, string>();

      // Initialize conversation with Claude using the text editor tool
      console.log(`Starting file edit session for ${filePath} with prompt: ${prompt}`);

      const toolUseSchema = z.object({
        command: z.enum(["view", "str_replace", "create", "insert", "undo_edit"]),
        path: z.string().optional(),
        view_range: z.array(z.number()).optional(),
        old_str: z.string().optional(),
        new_str: z.string().optional(),
        file_text: z.string().optional(),
        insert_line: z.number().optional(),
      });

      // Process tool requests from Claude
      const handleToolUse = async (toolUse: z.infer<typeof toolUseSchema>): Promise<string> => {
        const {
          command,
          path: llmPath,
          view_range,
          old_str,
          new_str,
          file_text,
          insert_line,
        } = toolUse;

        const getTargetPath = (x: string | undefined) => {
          if (!x) {
            throw new Error("path is required");
          }

          // @todo don't only use test paths
          const result = path.resolve(process.cwd(), x.replace(/^\/repo\//, "tmp/"));

          transformedPaths.set(result, x);

          return result;
        };

        try {
          switch (command) {
            case "view": {
              const targetPath = getTargetPath(llmPath);
              console.log("targetPath", targetPath);

              // Handle viewing file contents or directory listing
              if (fs.existsSync(targetPath)) {
                const stats = fs.statSync(targetPath);

                if (stats.isFile()) {
                  // Read file contents
                  const content = fs.readFileSync(targetPath, "utf-8");

                  // Handle view_range if specified
                  if (view_range && Array.isArray(view_range) && view_range.length === 2) {
                    const lines = content.split("\n");
                    const [start, end] = view_range;
                    const actualEnd = end === -1 ? lines.length : end;
                    const selectedLines = lines.slice(Math.max(0, start - 1), actualEnd);

                    // Return raw text without line numbers
                    return selectedLines.join("\n");
                  }

                  // Return full file without line numbers
                  return content;
                } else if (stats.isDirectory()) {
                  // List directory contents
                  const files = fs.readdirSync(targetPath);
                  return files.join("\n");
                }
              }

              return `Error: File or directory not found: ${transformedPaths.get(targetPath)}`;
            }

            case "str_replace": {
              const targetPath = getTargetPath(llmPath);
              console.log("targetPath", targetPath);

              // Handle string replacement
              if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
                console.error("File not found:", targetPath);
                return `Error: File not found: ${transformedPaths.get(targetPath)}`;
              }

              // Backup the file before modifying
              const content = fs.readFileSync(targetPath, "utf-8");
              fileBackups.set(targetPath, content);

              // Check if the old_str exists exactly once
              const matches = content.split(old_str!).length - 1;
              if (matches === 0) {
                console.error("No match found for replacement:", targetPath);
                return `Error: No match found for replacement. Please check your text and try again. ${transformedPaths.get(
                  targetPath
                )}`;
              } else if (matches > 1) {
                console.error("Found multiple matches for replacement:", targetPath);
                return `Error: Found ${matches} matches for replacement text. Please provide more context to make a unique match. ${transformedPaths.get(
                  targetPath
                )}`;
              }

              // Perform the replacement
              const newContent = content.replace(old_str!, new_str!);
              fs.writeFileSync(targetPath, newContent);
              return "Successfully replaced text at exactly one location.";
            }

            case "create": {
              const targetPath = getTargetPath(llmPath);
              console.log("targetPath", targetPath);
              // Handle file creation
              // Ensure the directory exists
              const dirPath = path.dirname(targetPath);
              if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
              }

              // Create the file
              fs.writeFileSync(targetPath, file_text!);
              return `Successfully created file: ${transformedPaths.get(targetPath)}`;
            }

            case "insert": {
              const targetPath = getTargetPath(llmPath);
              console.log("targetPath", targetPath);
              // Handle text insertion at specific line
              if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
                console.error("File not found:", targetPath);
                return `Error: File not found: ${transformedPaths.get(targetPath)}`;
              }

              // Backup the file before modifying
              const content = fs.readFileSync(targetPath, "utf-8");
              fileBackups.set(targetPath, content);

              // Insert text at the specified line
              const lines = content.split("\n");
              const insertAt = Math.min(insert_line!, lines.length);

              lines.splice(insertAt, 0, new_str!);
              fs.writeFileSync(targetPath, lines.join("\n"));
              return `Successfully inserted text after line ${insertAt}`;
            }

            case "undo_edit": {
              const targetPath = getTargetPath(llmPath);
              console.log("targetPath", targetPath);
              // Handle undo operation
              if (!fileBackups.has(targetPath)) {
                console.error("No backup found for file:", targetPath);
                return `Error: No backup found for file: ${transformedPaths.get(targetPath)}`;
              }

              // Restore from backup
              fs.writeFileSync(targetPath, fileBackups.get(targetPath)!);
              fileBackups.delete(targetPath);
              return `Successfully reverted changes to: ${transformedPaths.get(targetPath)}`;
            }

            default:
              return `Error: Unknown command: ${command}`;
          }
        } catch (error: any) {
          console.error("Error processing tool command:", error);
          return `Error: ${error.message}`;
        }
      };

      const anthropicWithEditorFactory = createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
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

      const anthropicWithEditor = anthropicWithEditorFactory("claude-3-7-sonnet-20250219");

      const str_replace_editor = tool({
        description: "edit a file",
        parameters: toolUseSchema,
        execute: async (x) => {
          return handleToolUse(x);
        },
      });

      try {
        const result = await generateText({
          model: anthropicWithEditor,
          prompt,
          tools: {
            str_replace_editor,
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
