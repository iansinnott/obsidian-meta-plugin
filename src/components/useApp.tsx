import { createContext, useContext } from "react";
import type { App } from "obsidian";

// Create a context to hold the Obsidian App instance
const AppContext = createContext<App | undefined>(undefined);

// Provider component for the App context
export const AppProvider = AppContext.Provider;

// Hook to access the App context
export function useApp(): App {
  const app = useContext(AppContext);

  if (!app) {
    throw new Error("useApp must be used within an AppProvider");
  }

  return app;
}
