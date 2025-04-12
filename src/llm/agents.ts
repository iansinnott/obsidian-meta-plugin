import { generateText, streamText, tool, type LanguageModelV1, type ToolSet } from "ai";
import { sonnet } from "./models";
import { z } from "zod";

interface AgentArgs<TTools extends ToolSet, TSchema extends z.ZodTypeAny = z.ZodObject<{}>> {
  name: string;
  instructions: string;
  model: LanguageModelV1;
  tools?: TTools;
  contextSchema?: TSchema;
}

type GenerateTextArg = Omit<Parameters<typeof generateText>[0], "model" | "system" | "tools">;
type StreamTextArg = Omit<Parameters<typeof streamText>[0], "model" | "system" | "tools">;

/**
 * An agent is simply a system prompt, tools and context wrapped up for ease of
 * use. This, just like all the 3rd-party frameworks, may be an unecessary
 * abstraction. However, I find the multi-agent mental model is a good fit for
 * the task of managing Obsidian.
 */
export class Agent<
  TTools extends ToolSet = {},
  TSchema extends z.ZodTypeAny = z.ZodObject<{}>,
  TContext = z.infer<TSchema>
> {
  name: string;
  instructions: string;
  model: LanguageModelV1;
  tools: TTools;
  contextSchema?: TSchema;

  constructor(args: AgentArgs<TTools, TSchema>) {
    this.name = args.name;
    this.instructions = args.instructions;
    this.model = args.model;
    this.tools = args.tools || ({} as TTools);
    this.contextSchema = args.contextSchema;
  }

  private wrapTools(tools: TTools, context?: TContext): TTools {
    if (!context) {
      return tools;
    }

    return Object.fromEntries(
      Object.entries(tools).map(([key, { execute, ...toolConfig }]) => {
        const newTool = tool({
          ...toolConfig,
          // @ts-expect-error
          execute: (args, options) => execute(args, { ...options, context }),
        });
        return [key, newTool];
      })
    ) as TTools;
  }

  async generateText(arg: GenerateTextArg, context?: TContext) {
    // Validate context with zod schema if provided
    if (this.contextSchema && context) {
      this.contextSchema.parse(context);
    }

    return generateText<TTools, unknown, unknown>({
      system: this.instructions,
      model: this.model,
      tools: this.wrapTools(this.tools, context),
      ...arg,
    });
  }

  streamText(arg: StreamTextArg, context?: TContext) {
    // Validate context with zod schema if provided
    if (this.contextSchema && context) {
      this.contextSchema.parse(context);
    }

    return streamText<TTools, unknown, unknown>({
      system: this.instructions,
      model: this.model,
      tools: this.wrapTools(this.tools, context),
      ...arg,
    });
  }
}
