import { useCallback, useEffect, useState } from "react";
import { ChunkProcessor, type Message } from "../llm/chunk-processor";
import type { ResponseChunk } from "../components/types";

// Create a singleton processor instance
const _processor = new ChunkProcessor();

// Create a singleton store for subscribers
type Subscriber = () => void;
const subscribers = new Set<Subscriber>();

// Function to notify all subscribers of changes
const notifySubscribers = () => {
  subscribers.forEach((subscriber) => subscriber());
};

// Plain utility function to find a tool result
export const findToolResult = (
  chunks: ResponseChunk[],
  toolCallId: string
): ResponseChunk | null => {
  return (
    chunks.find((chunk) => chunk.type === "tool-result" && chunk.toolCallId === toolCallId) || null
  );
};

// Hook to use the chunked messages
export const useChunkedMessages = () => {
  const [messages, setMessages] = useState<Message[]>(_processor.getMessages());
  const [chunks, setChunks] = useState<ResponseChunk[]>(_processor.getChunks());

  // Set up the processor on window for debugging
  useEffect(() => {
    (window as any).processor = _processor;
  }, []);

  // Subscribe to changes
  useEffect(() => {
    const updateState = () => {
      setMessages(JSON.parse(JSON.stringify(_processor.getMessages())));
      setChunks(JSON.parse(JSON.stringify(_processor.getChunks())));
    };

    // Add subscriber
    subscribers.add(updateState);

    // Initial update
    updateState();

    // Clean up subscriber on unmount
    return () => {
      subscribers.delete(updateState);
    };
  }, []);

  const update = useCallback(() => {
    setMessages(JSON.parse(JSON.stringify(_processor.getMessages())));
    setChunks(JSON.parse(JSON.stringify(_processor.getChunks())));
    notifySubscribers();
  }, []);

  const reset = useCallback(() => {
    _processor.reset();
    update();
  }, [update]);

  // Function to find a tool result using the current chunks
  const getToolResult = useCallback(
    (toolCallId: string) => findToolResult(chunks, toolCallId),
    [chunks]
  );

  return {
    appendMessage: (message: Message) => {
      _processor.appendMessage(message);
      update();
    },
    appendResponseChunk: (chunk: ResponseChunk) => {
      _processor.appendChunk(chunk);
      update();
    },
    messages,
    chunks,
    reset,
    getMessages: () => _processor.getMessages(),
    getChunks: () => _processor.getChunks(),
    getToolResult,
  };
};

// Hook specifically for tool results that will react to changes
export const useToolResult = (toolCallId: string) => {
  const [result, setResult] = useState<ResponseChunk | null>(null);

  useEffect(() => {
    // Initial state
    setResult(findToolResult(_processor.getChunks(), toolCallId));

    // Create subscriber function
    const updateResult = () => {
      setResult(findToolResult(_processor.getChunks(), toolCallId));
    };

    // Add subscriber
    subscribers.add(updateResult);

    // Clean up
    return () => {
      subscribers.delete(updateResult);
    };
  }, [toolCallId]);

  return result;
};
