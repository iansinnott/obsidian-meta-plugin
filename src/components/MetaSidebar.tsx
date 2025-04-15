import { Component } from "obsidian";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../hooks/useApp";
import { useChunkedMessages } from "../hooks/useChunkedMessages";
import { type Message } from "../llm/chunk-processor";
import type { MetaPlugin as IMetaPlugin } from "../plugin";
import { PromptInput } from "./PromptInput";
import { AgentResponseArea } from "./ResponseArea";
import type { ResponseChunk } from "./types";

interface MetaSidebarProps {
  plugin: IMetaPlugin;
  component: Component;
}

// Define tool call interface
export interface ToolCall {
  toolCallId: string;
  toolName: string;
  args: Record<string, any>;
  result?: any;
}

export const MetaSidebar: React.FC<MetaSidebarProps> = ({ plugin, component }) => {
  const ctx = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const threadId = "root";
  const { messages, chunks, appendMessage, appendResponseChunk, reset, getMessages, getChunks } =
    useChunkedMessages(plugin.agent?.name, threadId);

  const handleSubmit = useCallback(
    async (prompt: string) => {
      if (!prompt.trim()) return;

      const userMessage: Message = {
        role: "user",
        content: [{ type: "text", text: prompt }],
        id: `user-${Date.now()}`,
      };

      appendMessage(userMessage);
      setIsLoading(true);

      try {
        if (plugin.agent) {
          const stream = plugin.agent.streamText(
            {
              // @ts-expect-error - some deeply nested thing
              messages: getMessages(),
              maxSteps: plugin.agent.settings.maxSteps || 10,
              maxRetries: plugin.agent.settings.maxRetries || 2,
              maxTokens: plugin.agent.settings.maxTokens || 8000,
              temperature: 0.2,
            },
            ctx
          );

          for await (const chunk of stream.fullStream) {
            appendResponseChunk(chunk as ResponseChunk);
          }
        } else {
          const errorMessage = "Agent not initialized. Please check your settings.";
          const errorAssistantMessage: Message = {
            role: "assistant",
            content: [{ type: "text", text: errorMessage }],
            id: `error-${Date.now()}`,
          };
          appendMessage(errorAssistantMessage);
        }
      } catch (error) {
        console.error("Error:", error);
        const errorMessage = `Error: ${error.message || String(error)}`;
        const errorAssistantMessage: Message = {
          role: "assistant",
          content: [{ type: "text", text: errorMessage }],
          id: `error-${Date.now()}`,
        };
        appendMessage(errorAssistantMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [plugin, ctx, appendMessage, getMessages, getChunks, appendResponseChunk]
  );

  return (
    <div className="meta-plugin-container meta-flex meta-flex-col meta-h-full">
      <div className="meta-border-b meta-border-gray-200 dark:meta-border-gray-700 meta-p-2 meta-flex meta-justify-between meta-items-center">
        <p className="meta-text-xl meta-font-semibold meta-text-gray-800 dark:meta-text-gray-200 meta-mt-0 meta-mb-0">
          Meta Assistant
        </p>
        <button
          onClick={reset}
          className="meta-px-2 meta-py-1 meta-rounded meta-text-sm meta-bg-gray-200 hover:meta-bg-gray-300 dark:meta-bg-gray-700 dark:hover:meta-bg-gray-600 meta-transition-colors"
        >
          Clear Chat
        </button>
      </div>

      <div className="meta-flex-1 meta-overflow-hidden meta-flex meta-flex-col">
        <AgentResponseArea
          isLoading={isLoading}
          messages={messages} // Pass the conversation to display message history
          chunks={chunks}
          agentId={plugin.agent?.name}
          threadId={threadId}
        />
      </div>

      <div className="meta-mt-auto meta-border-t meta-border-gray-200 dark:meta-border-gray-700 meta-shrink-0">
        <PromptInput onSubmit={handleSubmit} isLoading={isLoading} />
      </div>
    </div>
  );
};
