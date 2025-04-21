import type { Agent } from "../agents";
import { tool, type ToolExecutionOptions } from "ai";
import { z } from "zod";

export const createDirectReportDelegationTool = <TContext>(
  agents: Agent[],
  {
    onChunk,
  }: {
    onChunk?: (chunk: {
      agentId: string;
      toolCallId: string;
      chunk: any;
      context: TContext;
    }) => void;
  }
) =>
  tool({
    description: "Delegate a task to a direct report.",
    parameters: z.object({
      agentId: z.string().describe("The ID (name) of the agent to delegate to."),
      prompt: z.string().describe("The task prompt to send to the delegated agent."),
    }),
    execute: async (
      { agentId, prompt },
      options: ToolExecutionOptions & { context?: TContext }
    ) => {
      const agent = agents.find((agent) => agent.name === agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }

      // Pass the task to the delegated agent and wait for completion
      const subAgentStream = agent.streamText(
        {
          prompt,
          maxSteps: agent.settings.maxSteps || 10,
          maxRetries: agent.settings.maxRetries || 2,
          maxTokens: agent.settings.maxTokens || 8000,
          experimental_continueSteps: true,
          // @ts-expect-error - @todo fix this - we didn't type the abort signal
          abortSignal: options.context?.abortSignal,
        },
        options.context as any
      );

      // If we're passed a chunk processor use it to append all the chunks.
      for await (const chunk of subAgentStream.fullStream) {
        onChunk?.({
          agentId,
          chunk,
          toolCallId: options.toolCallId,
          context: options.context as TContext,
        });
      }

      // Then it will be down
      const response = await subAgentStream.response;
      const lastMessage = response.messages?.at(-1);

      // @ts-expect-error - assume the message type has text
      return lastMessage?.content[0].text;
    },
  });
