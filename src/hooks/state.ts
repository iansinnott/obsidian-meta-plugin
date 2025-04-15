import { useCallback, useEffect, useState } from "react";
import { ChunkProcessor, type Message } from "../llm/chunk-processor";
import type { ResponseChunk, ErrorChunk } from "../components/types";

// Exported for debugging purposes
export const processors = new Map<string, ChunkProcessor>();

// Create a Map of subscribers for different agents
export const subscribersMap = new Map<string, Set<() => void>>();

// Helper function to get or create subscribers for an agent
export const getSubscribers = (agentId: string): Set<() => void> => {
  if (!subscribersMap.has(agentId)) {
    subscribersMap.set(agentId, new Set());
  }
  return subscribersMap.get(agentId)!;
};

// Function to notify all subscribers of changes for a specific agent
export const notifySubscribers = (agentId: string) => {
  const subscribers = getSubscribers(agentId);
  subscribers.forEach((subscriber) => subscriber());
};

// Helper function to get or create a processor for an agent
export const getProcessor = (agentId: string): ChunkProcessor => {
  if (!processors.has(agentId)) {
    const processor = new ChunkProcessor();

    // Wrap the processor's methods to trigger notifications
    const originalAppendChunk = processor.appendChunk.bind(processor);
    const originalAppendMessage = processor.appendMessage.bind(processor);
    const originalReset = processor.reset.bind(processor);

    // Override methods to add notification
    processor.appendChunk = (chunk) => {
      const result = originalAppendChunk(chunk);
      notifySubscribers(agentId);
      return result;
    };

    processor.appendMessage = (message) => {
      const result = originalAppendMessage(message);
      notifySubscribers(agentId);
      return result;
    };

    processor.reset = () => {
      const result = originalReset();
      notifySubscribers(agentId);
      return result;
    };

    processors.set(agentId, processor);
  }
  return processors.get(agentId)!;
};
