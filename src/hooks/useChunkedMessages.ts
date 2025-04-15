import { useCallback, useEffect, useState } from "react";
import { ChunkProcessor, type Message } from "../llm/chunk-processor";
import type { ResponseChunk, ErrorChunk } from "../components/types";
import { getProcessor, processors, getSubscribers } from "./state";

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

// Hook to use the chunked messages for a specific agent
export const useChunkedMessages = (agentId: string) => {
  const processor = getProcessor(agentId);
  const [messages, setMessages] = useState<Message[]>(processor.getMessages());
  const [chunks, setChunks] = useState<ResponseChunk[]>(processor.getChunks());

  // Set up the processor on window for debugging
  // @todo remove before distributing
  useEffect(() => {
    if (!(window as any).processors) {
      (window as any).processors = processors;
    }
  }, []);

  // Subscribe to changes for this agent
  useEffect(() => {
    const updateState = () => {
      setMessages(JSON.parse(JSON.stringify(processor.getMessages())));
      setChunks(JSON.parse(JSON.stringify(processor.getChunks())));
    };

    const subscribers = getSubscribers(agentId);
    subscribers.add(updateState);
    updateState();

    return () => {
      subscribers.delete(updateState);
    };
  }, [agentId, processor]);

  const reset = useCallback(() => {
    processor.reset();
  }, [processor]);

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
  };
};

// Hook specifically for tool results that will react to changes
export const useToolResult = (agentId: string, toolCallId: string) => {
  const processor = getProcessor(agentId);
  const [result, setResult] = useState<ResponseChunk | null>(null);
  const [error, setError] = useState<ErrorChunk | null>(null);

  useEffect(() => {
    // Initial state
    setResult(findToolResult(processor.getChunks(), toolCallId));
    setError(findToolError(processor.getChunks(), toolCallId));

    // Create subscriber function
    const updateResult = () => {
      setResult(findToolResult(processor.getChunks(), toolCallId));
      setError(findToolError(processor.getChunks(), toolCallId));
    };

    // Add subscriber
    const subscribers = getSubscribers(agentId);
    subscribers.add(updateResult);

    // Clean up
    return () => {
      subscribers.delete(updateResult);
    };
  }, [toolCallId, agentId, processor]);

  return { result, error, isLoading: !result && !error, agentId };
};
