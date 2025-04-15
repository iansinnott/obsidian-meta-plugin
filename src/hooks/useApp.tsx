import { createContext, useContext } from "react";
import type { App } from "obsidian";
import type { MetaPlugin } from "../plugin";
import type { ChunkProcessor } from "../llm/chunk-processor";

// Define the type for the context value
export interface AppContextType {
  app: App;
  plugin: MetaPlugin;
  getProcessor: (agentId: string) => ChunkProcessor;
}

// Create a context to hold both the Obsidian App instance and plugin
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component for the App context
export const AppProvider = AppContext.Provider;

// Hook to access the App context
export function useApp(): AppContextType {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }

  return context;
}
