import { useCallback, useEffect, useState } from "react";
import { ChunkProcessor, type Message } from "../llm/chunk-processor";
import type { ResponseChunk, ErrorChunk } from "../components/types";

// Exported for debugging purposes
export const processors = new Map<string, ChunkProcessor>();

// Helper function to get or create a processor for an agent
export const getProcessor = (agentId: string): ChunkProcessor => {
  if (!processors.has(agentId)) {
    processors.set(agentId, new ChunkProcessor());
  }
  return processors.get(agentId)!;
};
