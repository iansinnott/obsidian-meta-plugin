import type { MetaPlugin } from "../plugin";
import type { ChunkProcessor } from "../llm/chunk-processor";

// Holds the active MetaPlugin instance
let pluginInstance: MetaPlugin | null = null;

/** Register the MetaPlugin instance for state delegation */
export function registerPluginInstance(plugin: MetaPlugin): void {
  pluginInstance = plugin;
}

/** Ensure plugin instance is registered */
function ensurePlugin(): MetaPlugin {
  if (!pluginInstance) {
    throw new Error(
      "MetaPlugin instance is not registered. Call registerPluginInstance in plugin.onload()."
    );
  }
  return pluginInstance;
}

/** Delegate to plugin's processors map */
export const getProcessorsMap = (): Map<string, ChunkProcessor> => {
  return ensurePlugin().getProcessorsMap();
};

/** Delegate to plugin's subscribers */
export const getSubscribers = (agentId: string, threadId: string = "default"): Set<() => void> => {
  return ensurePlugin().getSubscribers(agentId, threadId);
};

/** Delegate to plugin's notifications */
export const notifySubscribers = (agentId: string, threadId: string = "default"): void => {
  ensurePlugin().notifySubscribers(agentId, threadId);
};

/** Delegate to plugin's processor retrieval */
export const getProcessor = (agentId: string, threadId: string = "default"): ChunkProcessor => {
  return ensurePlugin().getProcessor(agentId, threadId);
};
