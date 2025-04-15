import { useCallback, useEffect, useState } from "react";

import type { ErrorChunk, ResponseChunk } from "../components/types";
import { type Message } from "../llm/chunk-processor";
import { getProcessor, getProcessorsMap, getSubscribers } from "./state";

// Plain utility function to find a tool result
export const findToolResult = (
  chunks: ResponseChunk[],
  toolCallId: string
): ResponseChunk | null => {
  return (
    chunks.find((chunk) => chunk.type === "tool-result" && chunk.toolCallId === toolCallId) || null
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
  const processor = getProcessor(agentId, threadId);
  const [messages, setMessages] = useState<Message[]>(processor.getMessages());
  const [chunks, setChunks] = useState<ResponseChunk[]>(processor.getChunks());

  // Set up the processor on window for debugging
  // @todo remove before distributing
  useEffect(() => {
    if (!(window as any).processors) {
      (window as any).processors = getProcessorsMap();
    }
  }, []);

  // Subscribe to changes for this agent+thread
  useEffect(() => {
    const updateState = () => {
      setMessages(JSON.parse(JSON.stringify(processor.getMessages())));
      setChunks(JSON.parse(JSON.stringify(processor.getChunks())));
    };

    const subscribers = getSubscribers(agentId, threadId);
    subscribers.add(updateState);
    updateState();

    return () => {
      subscribers.delete(updateState);
    };
  }, [agentId, threadId, processor]);

  const reset = useCallback(() => {
    const map = getProcessorsMap();
    for (const [key, processor] of map.entries()) {
      if (key.startsWith(agentId)) {
        processor.reset();
      }
    }
  }, []);

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
  const processor = getProcessor(agentId, threadId);
  const [result, setResult] = useState<ResponseChunk | null>(null);
  const [error, setError] = useState<ErrorChunk | null>(null);

  useEffect(() => {
    // Helper function to find result or error across all processors
    const findAcrossProcessors = <T>(
      findFn: (chunks: ResponseChunk[], id: string) => T | null,
      toolCallId: string
    ): { data: T | null; source?: string } => {
      // First check in the current processor
      let data = findFn(processor.getChunks(), toolCallId);
      if (data) return { data };

      // If not found, search in other processors
      for (const [k, v] of getProcessorsMap().entries()) {
        if (k.startsWith(agentId)) continue; // Skip if it's the same agent
        const found = findFn(v.getChunks(), toolCallId);
        if (found) {
          console.warn("useToolResult", agentId, toolCallId, "data misplaced in", k, v);
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
      setError(errorData);
    };

    // Initial update
    updateState();

    // Add subscriber
    const subscribers = getSubscribers(agentId, threadId);
    subscribers.add(updateState);

    // Clean up
    return () => {
      subscribers.delete(updateState);
    };
  }, [toolCallId, agentId, threadId, processor]);

  return { result, error, isLoading: !result && !error, agentId };
};
