import { useCallback, useEffect, useState } from "react";

import type { ErrorChunk, ResponseChunk, ToolResultChunk } from "../components/types";
import { type Message } from "../llm/chunk-processor";
import { useApp } from "./useApp";

// Plain utility function to find a tool result
export const findToolResult = (
  chunks: ResponseChunk[],
  toolCallId: string
): ToolResultChunk | null => {
  return (
    chunks
      .filter((chunk) => chunk.type === "tool-result")
      .find((chunk) => chunk.toolCallId === toolCallId) || null
  );
};

// Plain utility function to find a tool error
export const findToolError = (chunks: ResponseChunk[], toolCallId: string): ErrorChunk | null => {
  return (
    (chunks.find(
      (chunk) => chunk.type === "error" && chunk.error?.toolCallId === toolCallId
    ) as ErrorChunk) || null
  );
};

// Hook to use the chunked messages for a specific agent and thread
export const useChunkedMessages = (agentId: string, threadId: string = "default") => {
  const { plugin } = useApp();
  const processor = plugin.getProcessor(agentId, threadId);
  const [messages, setMessages] = useState<Message[]>(processor.getMessages());
  const [chunks, setChunks] = useState<ResponseChunk[]>(processor.getChunks());

  // Subscribe to changes for this agent+thread
  useEffect(() => {
    const updateState = () => {
      setMessages(JSON.parse(JSON.stringify(processor.getMessages())));
      setChunks(JSON.parse(JSON.stringify(processor.getChunks())));
    };

    const subscribers = plugin.getSubscribers(agentId, threadId);
    subscribers.add(updateState);
    updateState();

    return () => {
      subscribers.delete(updateState);
    };
  }, [agentId, threadId, processor, plugin]);

  const reset = useCallback(() => {
    const map = plugin.getProcessorsMap();
    for (const [key, processor] of map.entries()) {
      if (key.startsWith(agentId)) {
        processor.reset();
      }
    }
  }, [agentId, plugin]);

  const getToolResult = useCallback(
    (toolCallId: string) => findToolResult(chunks, toolCallId),
    [chunks]
  );

  return {
    appendMessage: (message: Message) => {
      processor.appendMessage(message);
    },
    appendResponseChunk: (chunk: ResponseChunk) => {
      processor.appendChunk(chunk);
    },
    messages,
    chunks,
    reset,
    getMessages: () => processor.getMessages(),
    getChunks: () => processor.getChunks(),
    getToolResult,
    agentId,
    threadId,
  };
};

/**
 * Hook specifically for tracking tool execution results that will react to changes.
 *
 * This hook monitors the execution of a specific tool call and provides real-time
 * updates about its result or error state. It's particularly useful for displaying
 * tool execution progress in UI components.
 *
 * @param agentId - The ID of the agent that initiated the tool call. This might be confusing for delegated agent use, but it will be the calling agent's ID. The one that initiated the delegation, which is just a tool call. So it's the calling agent's ID.
 * @param toolCallId - The unique ID of the specific tool call to monitor
 * @returns An object containing:
 *   - result: The current result of the tool execution (null if not completed)
 *   - error: Any error that occurred during tool execution (null if no error)
 *   - isLoading: Boolean indicating if the tool is still executing (true if no result or error yet)
 *   - agentId: The ID of the agent that initiated the tool call (passed through)
 */
export const useToolResult = (agentId: string, threadId: string, toolCallId: string) => {
  const { plugin } = useApp();
  const processor = plugin.getProcessor(agentId, threadId);
  const [result, setResult] = useState<ToolResultChunk | null>(null);
  const [error, setError] = useState<{
    name: string;
    cause: any;
    message: string;
    stack: string;
    toolArgs: any;
    toolName: string;
    toolCallId: string;
  } | null>(null);

  useEffect(() => {
    // Helper function to find result or error across all processors
    const findAcrossProcessors = <T>(
      findFn: (chunks: ResponseChunk[], id: string) => T | null,
      toolCallId: string
    ): { data: T | null; source?: string } => {
      // First check in the current processor. This is the only non-bug case here.
      let data = findFn(processor.getChunks(), toolCallId);
      if (data) return { data };

      // If not found, search in other processors. This is a bug case. Somewhere
      // in the data pipeline chunks are getting stored on on a parent when a
      // leaf agent is expected.
      // However, I'm currently favoring more rolling this into (hypotheical)
      // refactoring of state management down the line.
      for (const [k, v] of plugin.getProcessorsMap().entries()) {
        if (k.startsWith(agentId)) continue; // Skip if it's the same agent
        const found = findFn(v.getChunks(), toolCallId);
        if (found) {
          console.debug("useToolResult", agentId, toolCallId, "data misplaced in", k, v);
          return { data: found, source: k };
        }
      }

      return { data: null };
    };

    // Function to update state with latest data
    const updateState = () => {
      const { data: resultData } = findAcrossProcessors(findToolResult, toolCallId);
      const { data: errorData } = findAcrossProcessors(findToolError, toolCallId);

      setResult(resultData);
      setError(
        errorData
          ? {
              name: errorData.error.name,
              message: errorData.error.message,
              cause: errorData.error.cause,
              toolArgs: errorData.error.toolArgs,
              toolName: errorData.error.toolName,
              toolCallId: errorData.error.toolCallId,
              stack: errorData.error.stack ?? "",
            }
          : null
      );
    };

    // Initial update
    updateState();

    // Add subscriber
    const subscribers = plugin.getSubscribers(agentId, threadId);
    subscribers.add(updateState);

    // Clean up
    return () => {
      subscribers.delete(updateState);
    };
  }, [toolCallId, agentId, threadId, processor, plugin]);

  return { result, error, isLoading: !result && !error, agentId };
};
