import { Component } from "obsidian";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../hooks/useApp";
import { useChunkedMessages } from "../hooks/useChunkedMessages";
import { type Message } from "../llm/chunk-processor";
import type { MetaPlugin as IMetaPlugin } from "../plugin";
import { PromptInput } from "./PromptInput";
import { AgentResponseArea } from "./ResponseArea";
import type { ResponseChunk } from "./types";
import classNames from "classnames";

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
  const abortControllerRef = useRef<AbortController | null>(null);
  const threadId = "root";
  const { messages, chunks, appendMessage, appendResponseChunk, reset, getMessages, getChunks } =
    useChunkedMessages(plugin.agent?.name, threadId);

  const handleSubmit = useCallback(
    async (prompt: string) => {
      if (!prompt.trim()) return;
      if (abortControllerRef.current) {
        console.warn(
          "[unanticipated state] abortControllerRef.current is not null when handleSubmit is called"
        );
        abortControllerRef.current?.abort();
      }

      // Create a new AbortController for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsLoading(true);

      console.log(
        "%c[handleSubmit] abortControllerRef.current",
        "color: red;",
        abortControllerRef.current
      );

      // Append the user's message
      const userMessage: Message = {
        role: "user",
        content: [{ type: "text", text: prompt }],
        id: `user-${Date.now()}`,
      };
      appendMessage(userMessage);

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
              abortSignal: controller.signal,
            },
            {
              ...ctx,
              abortSignal: controller.signal,
            }
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
      } catch (error: any) {
        if (error.name === "AbortError") {
          // User cancelled the request
          const cancelMessage: Message = {
            role: "assistant",
            content: [{ type: "text", text: "Request cancelled." }],
            id: `cancel-${Date.now()}`,
          };
          appendMessage(cancelMessage);
        } else {
          console.error("Error:", error);
          const errorMessage = `Error: ${error.message || String(error)}`;
          const errorAssistantMessage: Message = {
            role: "assistant",
            content: [{ type: "text", text: errorMessage }],
            id: `error-${Date.now()}`,
          };
          appendMessage(errorAssistantMessage);
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [plugin, ctx, appendMessage, appendResponseChunk, getMessages]
  );

  const handleCancellation = useCallback(() => {
    if (abortControllerRef.current) {
      console.log(
        "%c[handleCancellation] abortControllerRef.current",
        "color: red;",
        abortControllerRef.current
      );
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return (
    <div className="meta-plugin-container meta-flex meta-flex-col meta-h-full">
      <header
        className={classNames(
          "meta-flex meta-justify-between meta-items-center meta-border-t-0",
          "meta-border-b meta-border-solid meta-border-b-gray-200 dark:meta-border-b-gray-700",
          "meta-pb-2 meta-px-4 meta-mx-[-20px]"
        )}
      >
        <p className="meta-text-sm meta-font-mono meta-text-gray-800 dark:meta-text-gray-200 meta-mt-0 meta-mb-0">
          Obsidian Assistant
        </p>
        <div className="meta-flex meta-items-center meta-gap-2">
          {isLoading && (
            <button
              onClick={handleCancellation}
              className="meta-px-2 meta-py-1 meta-rounded meta-text-sm meta-bg-transparent meta-border meta-border-gray-300 hover:meta-border-gray-400 dark:meta-border-gray-600 dark:hover:meta-border-gray-500 meta-text-gray-700 dark:meta-text-gray-300 meta-transition-colors meta-flex meta-items-center meta-gap-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="meta-w-4 meta-h-4 meta-text-gray-600 dark:meta-text-gray-400"
              >
                <rect x="6" y="6" width="12" height="12" fill="currentColor" />
              </svg>
              Stop
            </button>
          )}
          <button
            onClick={() => {
              if (abortControllerRef.current) {
                console.log(
                  "%c[abort prev] abortControllerRef.current",
                  "color: red;",
                  abortControllerRef.current
                );
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
              }

              reset();
            }}
            disabled={isLoading}
            className={classNames(
              "meta-px-2 meta-py-1 meta-rounded meta-text-sm meta-transition-colors",
              isLoading
                ? "meta-bg-gray-100 meta-text-gray-400 dark:meta-bg-gray-800 dark:meta-text-gray-500 meta-cursor-not-allowed"
                : "meta-bg-gray-200 hover:meta-bg-gray-300 dark:meta-bg-gray-700 dark:hover:meta-bg-gray-600"
            )}
          >
            Clear Chat
          </button>
        </div>
      </header>

      <div className="meta-flex-1 meta-overflow-auto meta-flex meta-flex-col">
        <AgentResponseArea
          isLoading={isLoading}
          messages={messages} // Pass the conversation to display message history
          chunks={chunks}
          agentId={plugin.agent?.name}
          threadId={threadId}
        />
      </div>

      <div className="meta-sticky meta-bottom-0 meta-left-0 meta-right-0">
        <PromptInput onSubmit={handleSubmit} onCancel={handleCancellation} isLoading={isLoading} />
      </div>
    </div>
  );
};
