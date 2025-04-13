import type { Agent } from "../agents";
import { tool, type ToolExecutionOptions } from "ai";
import { z } from "zod";

export const createDirectReportDelegationTool = (agents: Agent[]) =>
  tool({
    description: "Delegate a task to a direct report.",
    parameters: z.object({
      agentId: z.string().describe("The ID (name) of the agent to delegate to."),
      prompt: z.string().describe("The task prompt to send to the delegated agent."),
    }),
    execute: async ({ agentId, prompt }, options: ToolExecutionOptions & { context?: unknown }) => {
      const agent = agents.find((agent) => agent.name === agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }

      // Pass the task to the delegated agent and wait for completion
      const response = await agent.generateText(
        {
          prompt,
          maxSteps: 10,
          maxRetries: 2,
          maxTokens: 8000,
          onStepFinish: (step) => {
            console.log(`[${agent.name}] step:`, step);
          },
        },
        options.context as any
      );

      // Return the result back to the calling agent
      return response.text;
    },
  });
