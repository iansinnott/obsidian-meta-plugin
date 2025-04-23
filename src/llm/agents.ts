import { generateText, streamText, tool, type LanguageModelV1, type ToolSet } from "ai";
import { z } from "zod";

import { createDirectReportDelegationTool } from "./tools";
import { createFileEditorTool } from "./tools/fileEditor";
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
  listPluginsTool,
  obsidianAPITool,
  obsidianToolContextSchema,
  readFilesTool,
  searchFilesByNameTool,
  searchVaultTool,
  setThemeTool,
  toggleCssSnippetTool,
  togglePluginTool,
  updateFileTool,
} from "./tools/obsidian";
import { bundleTSSourceTool } from "./tools/bundler-tools";

export const DELEGATE_TO_AGENT_TOOL_NAME = "delegateToAgent";
export const OBSIDIAN_API_TOOL_NAME = "obsidianAPITool";
export const FILE_EDITOR_TOOL_NAME = "str_replace_editor";

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
    this.agents = args.agents || [];
    this.tools = args.tools || ({} as TTools);
    this.settings = args.settings || {
      maxSteps: 20,
      maxRetries: 2,
      maxTokens: 8000,
    };

    // Add the delegation tool if there are agents. This also sets up chunk
    // processing so that we can recursively render agent calls.
    if (this.agents.length > 0) {
      this.tools = {
        ...this.tools,
        [DELEGATE_TO_AGENT_TOOL_NAME]: createDirectReportDelegationTool<TContext>(this.agents, {
          onChunk: ({ agentId: _, toolCallId, chunk, context }) => {
            // @ts-expect-error - @todo We will need to fix this if we want to distribute the agent system
            const processor = context.getProcessor(this.name, toolCallId);
            processor.appendChunk(chunk);
          },
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
const createObsidianContentAgent = ({
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

const createObsidianThemesAgent = ({
  llm,
  settings,
  obsidianPaths,
}: {
  llm: LanguageModelV1;
  settings?: AgentSettings;
  obsidianPaths: ObsidianPaths;
}) => {
  const agents = [
    createFileEditorAgent({
      llm,
      settings,
      obsidianPaths,
      additionalInstructions: `
  Your expected job scope is to perform CRUD operations on the user's
  snippets. Help the user acheive the look and feel they desire with their
  Obsidian UI.
      `,
    }),
  ];
  return new Agent({
    name: "obsidian theme manager",
    instructions: `
You are an AI agent that specializes in themeing Obsidian and managing the
user's existing themes and snippets.

You can help users understand their installed themes, enable/disable themes,
and provide information about theme functionality.
  
If you cannot accomplish the user's request, either delegate it to your team or
simply say so. Do not respond with instructions on how to do it manually.
  
In addition to your own tools, you have access to the following team members:

${agents
  .map((agent) => {
    return `- \`${agent.name}\`\n  This agent is instructed to: """${agent.instructions}"""`;
  })
  .join("\n")}
  
Delegate to your team using the ${DELEGATE_TO_AGENT_TOOL_NAME} tool when needed.
    `,
    model: llm,
    contextSchema: obsidianToolContextSchema,
    settings,
    // @ts-expect-error - @todo We will need to fix this if we want to distribute the agent system
    agents,
    tools: {
      getCurrentTheme: getCurrentThemeTool,
      listAvailableThemes: listAvailableThemesTool,
      setTheme: setThemeTool,
      listCssSnippets: listCssSnippetsTool,
      toggleCssSnippet: toggleCssSnippetTool,
    },
  });
};

const createObsidianWorkspaceAgent = ({
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

export interface ObsidianPaths {
  vaultPath: string;
  configPath: string;
  themesPath?: string;
  snippetsPath?: string;
  pluginsPath?: string;
}

const createObsidianPluginsAgent = ({
  llm,
  settings,
  obsidianPaths,
}: {
  llm: LanguageModelV1;
  settings?: AgentSettings;
  obsidianPaths: ObsidianPaths;
}) => {
  return new Agent({
    name: "obsidian plugin manager",
    instructions: `
You are an AI agent that specializes in managing Obsidian plugins.
You can help users understand their installed plugins and provide information
about plugin functionality.
  
You can also create new plugins or modify existing ones to add functionality to
Obsidian. Whatever the user desires.
  
==== Break the problem down ====

When asked to implement or modify a plugin, break the problem down into
smaller problems. This will make it easier to reason about and solve.
  
==== Obsidian Plugin Basic Structure ====

Obsidian plugins require (at least) the following files:

- manifest.json
- main.ts (will be bundled into main.js)
- styles.css (optional)

==== Obsidian Plugin Manifest File ====

The manifest.json file is a JSON file that describes the plugin. It is used to
configure the plugin and provide information about it.

Example:

\`\`\`json
{
	"id": "omp-my-cool-plugin",
	"name": "My Cool Plugin",
	"version": "1.0.0",
	"minAppVersion": "0.15.0",
	"description": "A very cool plugin that does something very cool.",
	"author": "Obsidian Meta Plugin",
	"authorUrl": "https://github.com/iansinnott/obsidian-meta-plugin",
	"fundingUrl": "https://github.com/sponsors/iansinnott",
	"isDesktopOnly": true
}
\`\`\`

NOTE: When creating a plugin the manifest.json file should include
"Obsidian Meta Plugin" as the author. The ID should _start with_ 'omp-',
representing 'Obsidian Meta Plugin'. This will make it easier to
identify your plugins after the fact. The author URL should always be
'https://github.com/iansinnott/obsidian-meta-plugin'.

==== No addidtional build step required ====
  
Do NOT create a build step. You have a tool to bundle TypeScript into
JavaScript. In other words, DO use TypeScript to write the plugin. Implicit and
explicit \`any\` are both allowed, so don't worry too much about types. Use
\`import\`/\`export\` syntax to import/export modules, NOT \`require\`/\`module.exports\`.
  
==== Use Multiple Files ====
  
Separate parts of your plugin into multiple files so that each file remains
easier to reason about. All files will be bundled into a single JavaScript file
by the when you use your bundler tool.

==== Reading and Writing Files ====

You have access to the ${FILE_EDITOR_TOOL_NAME} tool which you can use to access
the filesystem. 

Your primary job scope with regard to the filesystem is to do CRUD operations on
the user's Obsidian plugins. You help users manage their files effectively and safely.

All files you work with will be in the user's Obsidian vault. Every file or
directory path you request will be relative to the user's Obsidian vault.

For example, if a user's vault is located at "/Users/john/Documents/Obsidian
Vault" and they want you to edit the file "example.md" in the root of their
vault, they would simply provide you with the path "example.md".
  
Alternatively, if you want to edit a nested file, you can provide a path like
"notes/example.md" which would be the file "example.md" in the "notes" folder
within the user's vault.

Here are some paths that may come in handy: 

- Config Path: ${obsidianPaths.configPath}
- Plugins Path: ${obsidianPaths.pluginsPath}

IMPORTANT: All paths you provide should be relative paths. They will be interpreted as relative to the user's Obsidian vault.

DEVELOPERS NOTE: Windows users will have a different path structure. Error messages should tell you if you're on a Windows system.
  
NOTE: When listing plugins, assume that any plugin's who's ID starts
with 'omp-' were authored by the 'Obsidian Meta Plugin' agent, i.e. the
controller of the system which you are a part of.
  
==== Bundling TypeScript ====

You can bundle a TypeScript main.ts file into a JavaScript main.js file using the
bundleMainTS tool.

You will need to run this on your main.ts file after writing your plugin.

    `,
    model: llm,
    contextSchema: obsidianToolContextSchema,
    settings,
    tools: {
      listPlugins: listPluginsTool,
      // @note Disabled for now. Seemed finnicky. Ask the user to do it.
      // togglePlugin: togglePluginTool,
      bundleMainTS: bundleTSSourceTool,
      [OBSIDIAN_API_TOOL_NAME]: obsidianAPITool,
      [FILE_EDITOR_TOOL_NAME]: createFileEditorTool({
        basePath: obsidianPaths.vaultPath,
      }),
    },
  });
};

/**
 * Create an agent that specializes in editing files through LLM-guided operations
 * @param param0 Configuration options
 * @returns A file editor agent
 */
const createFileEditorAgent = ({
  llm,
  settings,
  obsidianPaths,
  additionalInstructions = "",
}: {
  llm: LanguageModelV1;
  settings?: AgentSettings;
  obsidianPaths: ObsidianPaths;
  additionalInstructions?: string;
}) => {
  return new Agent({
    name: "file editor",
    instructions: `You are an AI agent that specializes in reading and editing files and directories. You can do things like:

- View file contents
- Create new files
- Replace text within files
- Insert text at specific lines
- Undo edits when needed

Your primary responsibility is to help users manage their files effectively and safely.
Always confirm changes were made successfully and provide informative error messages when issues occur.

All files you work with will be in the user's Obsidian vault. Every file or directory path you request will be relative to the user's Obsidian vault.

For example, if a user's vault is located at "/Users/john/Documents/Obsidian
Vault" and they want you to edit the file "example.md" in the root of their
vault, they would simply provide you with the path "example.md".
  
Alternatively, if you want to edit a nested file, you can provide a path like
"notes/example.md" which would be the file "example.md" in the "notes" folder
within the user's vault.

Here are some paths that may come in handy: 

- Config Path: ${obsidianPaths.configPath}
- Themes Path: ${obsidianPaths.themesPath}
- Snippets Path: ${obsidianPaths.snippetsPath}
- Plugins Path: ${obsidianPaths.pluginsPath}

Of course content files can be placed anywhere within the vault path.

IMPORTANT: All paths you provide should be relative paths. They will be interpreted as relative to the user's Obsidian vault.

DEVELOPERS NOTE: Windows users will have a different path structure. Error messages should tell you if you're on a Windows system.

Additional instructions:

${additionalInstructions}
`,
    model: llm,
    settings,
    tools: {
      [FILE_EDITOR_TOOL_NAME]: createFileEditorTool({
        basePath: obsidianPaths.vaultPath,
      }),
    },
  });
};

export const createTeamManagerAgent = ({
  llm,
  settings,
  obsidianPaths,
}: {
  llm: LanguageModelV1;
  settings?: AgentSettings;
  obsidianPaths: ObsidianPaths;
}) => {
  const agents = [
    createObsidianContentAgent({ llm, settings }),
    createObsidianThemesAgent({ llm, settings, obsidianPaths }),
    createObsidianWorkspaceAgent({ llm, settings }),
    createObsidianPluginsAgent({ llm, settings, obsidianPaths }),
  ];

  const agent = new Agent({
    name: "team manager",
    instructions: `You are an AI agent that manages a team of Obsidian experts
that can help the user with all sorts of tasks. Your team of experts are
also AI agents but they have specific skills and knowledge.
      
Your team includes:

${agents
  .map((agent) => {
    return `<agent_instructions agent_name="${agent.name}">\n${agent.instructions}\n</agent_instructions>`;
  })
  .join("\n\n")}
  
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

Carefully consider your team members' responses before continuing.

You can also utilize the obsidian API _directly_, but this is highly
discouraged. Please only use this functionality when you're team is unable to
handle a user request.

DO NOT show the user source code unless they ask for it.`,
    model: llm,
    contextSchema: obsidianToolContextSchema,
    // @ts-expect-error @todo We will need to fix this if we want to distribute the agent system - something about the streams
    agents,
    tools: {
      getCurrentDateTime,
      [OBSIDIAN_API_TOOL_NAME]: obsidianAPITool,
    },
  });

  return agent;
};
