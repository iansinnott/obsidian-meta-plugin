import React, { useCallback, useEffect, useRef, useState } from "react";
import { Component } from "obsidian";
import { PromptInput } from "./PromptInput";
import { AgentResponseArea } from "./ResponseArea";
import { useApp } from "../hooks/useApp";
import type { ResponseChunk } from "./types";
import type { MetaPlugin as IMetaPlugin } from "../plugin";
import { type Message } from "../llm/chunk-processor";
import { useChunkedMessages } from "../hooks/useChunkedMessages";

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

export const MetaSidebar: React.FC<MetaSidebarProps> = ({ plugin }) => {
  const ctx = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const { messages, chunks, appendMessage, appendResponseChunk, reset, getMessages, getChunks } =
    useChunkedMessages(plugin.agent?.name);

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
              maxSteps: 10,
              maxRetries: 2,
              maxTokens: 8000,
              temperature: 0,
            },
            ctx
          );

          // @todo remove. dev - want to see what the same requests gives us when done without streaming
          // plugin.agent
          //   .generateText(
          //     {
          //       // @ts-expect-error - some deeply nested thing
          //       messages: getMessages(),
          //       maxSteps: 10,
          //       maxRetries: 2,
          //       maxTokens: 8000,
          //       temperature: 0,
          //     },
          //     ctx,
          //   )
          //   .then((response) => {
          //     console.log("dev gen response", response);
          //   })
          //   .catch((err) => {
          //     console.error("Error with dev gen call:", err);
          //   });

          for await (const chunk of stream.fullStream) {
            appendResponseChunk(chunk as ResponseChunk);
          }

          console.log("stream response", await stream.response);
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
        />
      </div>

      <div className="meta-mt-auto meta-border-t meta-border-gray-200 dark:meta-border-gray-700 meta-shrink-0">
        <PromptInput onSubmit={handleSubmit} isLoading={isLoading} />
      </div>
    </div>
  );
};
