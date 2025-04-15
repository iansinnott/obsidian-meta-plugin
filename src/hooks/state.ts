import { ChunkProcessor } from "../llm/chunk-processor";

// Create a function to generate a composite key from agentId and threadId
const createKey = (agentId: string, threadId: string): string => {
  return `${agentId}:${threadId}`;
};

// Exported for debugging purposes
export const processors = new Map<string, ChunkProcessor>();

// Create a Map of subscribers for different agent+thread combinations
export const subscribersMap = new Map<string, Set<() => void>>();

// Helper function to get or create subscribers for an agent+thread
export const getSubscribers = (agentId: string, threadId: string): Set<() => void> => {
  const key = createKey(agentId, threadId);
  if (!subscribersMap.has(key)) {
    subscribersMap.set(key, new Set());
  }
  return subscribersMap.get(key)!;
};

// Function to notify all subscribers of changes for a specific agent+thread
export const notifySubscribers = (agentId: string, threadId: string) => {
  const key = createKey(agentId, threadId);
  const subscribers = getSubscribers(agentId, threadId);
  subscribers.forEach((subscriber) => subscriber());
};

// Helper function to get or create a processor for an agent+thread
export const getProcessor = (agentId: string, threadId: string): ChunkProcessor => {
  if (!agentId || !threadId) {
    throw new Error("Agent ID and thread ID are required");
  }

  const key = createKey(agentId, threadId);

  if (!processors.has(key)) {
    const processor = new ChunkProcessor();

    // Wrap the processor's methods to trigger notifications
    const originalAppendChunk = processor.appendChunk.bind(processor);
    const originalAppendMessage = processor.appendMessage.bind(processor);
    const originalReset = processor.reset.bind(processor);

    // Override methods to add notification
    processor.appendChunk = (chunk) => {
      const result = originalAppendChunk(chunk);
      notifySubscribers(agentId, threadId);
      return result;
    };

    processor.appendMessage = (message) => {
      const result = originalAppendMessage(message);
      notifySubscribers(agentId, threadId);
      return result;
    };

    processor.reset = () => {
      const result = originalReset();
      notifySubscribers(agentId, threadId);
      return result;
    };

    console.log("setting processor", key, processor, processors);
    processors.set(key, processor);
  }

  return processors.get(key)!;
};
