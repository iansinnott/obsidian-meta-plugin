import { generateText, streamText, tool, type LanguageModelV1, type ToolSet } from "ai";
import { z } from "zod";
import { createDirectReportDelegationTool } from "./tools";
import { getCurrentDateTime } from "./tools/locale";
import {
  createFileTool,
  getCurrentFileTool,
  getCurrentThemeTool,
  listAvailableThemesTool,
  listCssSnippetsTool,
  listFilesTool,
  listLastOpenFilesTool,
  listOpenFilesTool,
  obsidianAPITool,
  obsidianToolContextSchema,
  readFilesTool,
  searchFilesByNameTool,
  searchVaultTool,
  setThemeTool,
  updateFileTool,
} from "./tools/obsidian";

export const DELEGATE_TO_AGENT_TOOL_NAME = "delegateToAgent";
export const OBSIDIAN_API_TOOL_NAME = "obsidianAPITool";

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
  settings?: {
    maxSteps?: number;
    maxRetries?: number;
    maxTokens?: number;
  };
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
  readonly settings: {
    maxSteps?: number;
    maxRetries?: number;
    maxTokens?: number;
  };

  constructor(args: AgentArgs<TTools, TSchema, TSubAgent>) {
    this.name = args.name;
    this.instructions = args.instructions;
    this.model = args.model;
    this.contextSchema = args.contextSchema;
    this.agents = args.agents;
    this.tools = args.tools || ({} as TTools);
    this.settings = args.settings || {
      maxSteps: 20,
      maxRetries: 2,
      maxTokens: 8000,
    };

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

type AgentSettings = AgentArgs<{}, any, any>["settings"];

/**
 * Create an agent that can help users manage the content files in their Obsidian vault.
 * @param llm - The language model to use. This is runtime-configurable so it must be taken as an arg
 * @returns An agent that can help users manage the content files in their Obsidian vault.
 */
export const createObsidianContentAgent = ({
  llm,
  settings,
}: {
  llm: LanguageModelV1;
  settings?: AgentSettings;
}) => {
  return new Agent({
    name: "obsidian vault content manager",
    instructions: `You're part of a team that manages, maintains and enhances a
    user's Obsidian vault. 
    Your specialty is managing the content files in the
    Obsidian vault. These are usually markdown or plain text files, but Obsidian
    supports a broad range of content.
    
    You do NOT manage themes or plugins. You're concerned ONLY with the vault
    content created directly by the user.`,
    model: llm,
    contextSchema: obsidianToolContextSchema,
    settings,
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

export const createObsidianThemesAgent = ({
  llm,
  settings,
}: {
  llm: LanguageModelV1;
  settings?: AgentSettings;
}) => {
  return new Agent({
    name: "obsidian theme manager",
    instructions: `You are an AI agent that specializes in themeing Obsidian and managing the user's exisdting themes.`,
    model: llm,
    contextSchema: obsidianToolContextSchema,
    settings,
    tools: {
      getCurrentTheme: getCurrentThemeTool,
      listAvailableThemes: listAvailableThemesTool,
      setTheme: setThemeTool,
      listCssSnippets: listCssSnippetsTool,
    },
  });
};

export const createObsidianWorkspaceAgent = ({
  llm,
  settings,
}: {
  llm: LanguageModelV1;
  settings?: AgentSettings;
}) => {
  return new Agent({
    name: "obsidian workspace manager",
    instructions: `
You are an AI agent that specializes in managing the user's Obsidian workspace.
This includes managing the user's open files, recently opened files.

You do NOT do CRUD operations on the user's vault. Another agent will handle
that. If CRUD operations are needed simply request help in working with the
users vault.

Prefer your specific tools, but when you don't have a specific tool to use, you
can use the obsidian API directly. For example, if the user wants you to _modify_
the tabs in their Obsidian window you should use the obsidian API directly.
    `,
    model: llm,
    contextSchema: obsidianToolContextSchema,
    settings,
    tools: {
      listOpenFiles: listOpenFilesTool,
      listLastOpenFiles: listLastOpenFilesTool,
      getCurrentFile: getCurrentFileTool,
      [OBSIDIAN_API_TOOL_NAME]: obsidianAPITool,
    },
  });
};

export const createTeamManagerAgent = ({
  llm,
  settings,
}: {
  llm: LanguageModelV1;
  settings?: AgentSettings;
}) => {
  // prettier-ignore
  const agents = [
    createObsidianContentAgent({ llm, settings }),
    createObsidianThemesAgent({ llm, settings }),
    createObsidianWorkspaceAgent({ llm, settings }),
  ];

  const agent = new Agent({
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
  
NOTE: The full conversation history is available to you but not your agents.
Provide relevant information to them in your prompt.

Assume that user queries are related to Obsidian. For example, phrases like 
"my notes", "my vault", "my files", "my documents", "my writing", etc. are all
related to Obsidian.

You can delegate tasks to these team members using the
${DELEGATE_TO_AGENT_TOOL_NAME} tool. Do not mention to the user that you're
delegating. The UI will display a tool call message box to the user which makes
it redundant to mention it in prose. For example, do not preface with "Now I
will delegate...".

You can also utilize the obsidian API _directly_, but this is highly
discouraged. Please only use this functionality when you're team is unable to
handle a user request.`,
    model: llm,
    contextSchema: obsidianToolContextSchema,
    // @ts-ignore for now - something about the streams
    agents,
    onSubAgentChunk: ({ toolCallId, chunk, context }) => {
      const processor = context.getProcessor(agent.name, toolCallId);
      processor.appendChunk(chunk);
    },
    tools: {
      getCurrentDateTime,
      [OBSIDIAN_API_TOOL_NAME]: obsidianAPITool,
    },
  });

  return agent;
};
