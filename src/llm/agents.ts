import { generateText, streamText, tool, type LanguageModelV1, type ToolSet } from "ai";
import { z } from "zod";
import {
  createFileTool,
  getCurrentThemeTool,
  listAvailableThemesTool,
  listFilesTool,
  obsidianAPITool,
  obsidianToolContextSchema,
  readFilesTool,
  searchFilesByNameTool,
  searchVaultTool,
  setThemeTool,
  updateFileTool,
} from "./tools/obsidian";
import { createDirectReportDelegationTool } from "./tools";
import { getCurrentDateTime } from "./tools/locale";

export const DELEGATE_TO_AGENT_TOOL_NAME = "delegateToAgent";

interface AgentArgs<
  TTools extends ToolSet,
  TSchema extends z.ZodTypeAny = z.ZodObject<{}>,
  TSubAgent extends Agent = Agent
> {
  name: string;
  instructions: string;
  model: LanguageModelV1;
  tools?: TTools;
  contextSchema?: TSchema;
  agents?: TSubAgent[];
  onSubAgentChunk?: (arg: {
    agentId: string;
    toolCallId: string;
    chunk: any;
    context: z.infer<TSchema>;
  }) => void;
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
  TContext = z.infer<TSchema>,
  TSubAgent extends Agent = any
> {
  readonly name: string;
  readonly instructions: string;
  readonly model: LanguageModelV1;
  readonly tools: TTools;
  readonly contextSchema?: TSchema;
  readonly agents?: TSubAgent[];

  constructor(args: AgentArgs<TTools, TSchema, TSubAgent>) {
    this.name = args.name;
    this.instructions = args.instructions;
    this.model = args.model;
    this.contextSchema = args.contextSchema;
    this.agents = args.agents;
    this.tools = args.tools || ({} as TTools);

    // Add the delegation tool if there are agents
    if (this.agents) {
      this.tools = {
        ...this.tools,
        [DELEGATE_TO_AGENT_TOOL_NAME]: createDirectReportDelegationTool<TContext>(this.agents, {
          onChunk: args.onSubAgentChunk,
        }),
      };
    }
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

/**
 * Create an agent that can help users manage the content files in their Obsidian vault.
 * @param llm - The language model to use. This is runtime-configurable so it must be taken as an arg
 * @returns An agent that can help users manage the content files in their Obsidian vault.
 */
export const createObsidianContentAgent = ({ llm }: { llm: LanguageModelV1 }) => {
  return new Agent({
    name: "obsidian vault content manager",
    instructions: `You're part of a team that manages, maintains and enhances a
    user's Obsidian vault. 
    Your specialty is managing the content files in the
    Obsidian vault. These are usually markdown or plain text files, but Obsidian
    supports a broad range of content.`,
    model: llm,
    contextSchema: obsidianToolContextSchema,
    tools: {
      listFilesTool,
      readFilesTool,
      createFileTool,
      updateFileTool,
      searchFilesByNameTool,
      searchVaultTool,
      getCurrentDateTime,
    },
  });
};

export const createObsidianAPIAgent = ({ llm }: { llm: LanguageModelV1 }) => {
  return new Agent({
    name: "obsidian plugin API",
    instructions: `You are an AI agent that has direct access to the Obsidian API. Your tools give you full reign over the user's Obsidian vault.`,
    model: llm,
    contextSchema: obsidianToolContextSchema,
    tools: {
      obsidianAPITool,
    },
  });
};

export const createObsidianThemesAgent = ({ llm }: { llm: LanguageModelV1 }) => {
  return new Agent({
    name: "obsidian theme manager",
    instructions: `You are an AI agent that specializes in themeing Obsidian and managing the user's exisdting themes.`,
    model: llm,
    contextSchema: obsidianToolContextSchema,
    tools: {
      getCurrentTheme: getCurrentThemeTool,
      listAvaialbleThemes: listAvailableThemesTool,
      setThemeTool,
    },
  });
};

export const createTeamManagerAgent = ({ llm }: { llm: LanguageModelV1 }) => {
  // prettier-ignore
  const agents = [
    createObsidianContentAgent({ llm }), 
    createObsidianThemesAgent({ llm }),
    // createObsidianAPIAgent({ llm }),
  ];

  return new Agent({
    name: "team manager",
    instructions: `You are an AI agent that manages a team of Obsidian experts
that can help the user with all sorts of tasks. Your team of experts are
also AI agents but they have specific skills and knowledge.
      
Your team includes:

${agents
  .map((agent) => {
    return `- \`${agent.name}\`\n  This agent is instructed to: """${agent.instructions}"""`;
  })
  .join("\n")}

Assume that user queries are related to Obsidian. For example, phrases like 
"my notes", "my vault", "my files", "my documents", "my writing", etc. are all
related to Obsidian.

You can delegate tasks to these team members using the
${DELEGATE_TO_AGENT_TOOL_NAME} tool. Do not mention to the user that you're
delegatin. The UI will display a tool call message box to the user which makes
it redundant to mention it in prose. For example, do not preface with "Now I
will delegate...".

You can also utilize the obsidian API _directly_, but this is highly
discouraged. Please only use this functionality when you're team is unable to
handle a user request.`,
    model: llm,
    contextSchema: obsidianToolContextSchema,
    // @ts-ignore for now - something about the streams
    agents,
    onSubAgentChunk: ({ agentId, toolCallId, chunk, context }) => {
      context.getProcessor(agentId).appendChunk(chunk);
    },
    tools: {
      getCurrentDateTime,
      obsidianAPITool,
    },
  });
};
