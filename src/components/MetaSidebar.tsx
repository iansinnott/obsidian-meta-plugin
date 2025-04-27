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
import { generateId, APICallError, AISDKError, RetryError } from "ai";

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
  const { messages, chunks, appendMessage, appendResponseChunk, reset, getMessages } =
    useChunkedMessages(plugin.agent?.name, threadId);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (prompt: string) => {
      if (!prompt.trim()) return;
      if (abortControllerRef.current) {
        console.warn(
          "[unanticipated state] abortControllerRef.current is not null when handleSubmit is called"
        );
        abortControllerRef.current?.abort();
      }
      setErrorMessage(null);
      // Set up loading and cancellation
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsLoading(true);

      // Append the user's message
      appendMessage({
        role: "user",
        content: [{ type: "text", text: prompt }],
        id: generateId(),
      } satisfies Message);

      // Helper to append an assistant message
      const showAssistant = (text: string) => {
        const msg: Message = {
          role: "assistant",
          content: [{ type: "text", text }],
          id: generateId(),
        };
        appendMessage(msg);
      };

      // Handle HTTP status codes and show friendly messages
      const handleStatus = (code: number, err: unknown) => {
        let text: string;
        switch (code) {
          case 401:
          case 403:
            text =
              "🔑 Your API key or plan is invalid or has been revoked. Please check billing or re-authenticate. You can enter your own API key in the settings.";
            break;
          case 429: {
            const retry = (err as any).responseHeaders?.["retry-after"];
            text = retry
              ? `You've hit your monthly free quota. Try again after ${retry}s or enter your own API key in the settings to avoid this.`
              : "Quota exhausted. Please enter your own API key in the settings or wait for reset.";
            break;
          }
          case 400:
            text = "Bad request — check prompt size, model name, or other parameters.";
            break;
          default:
            text = `Error ${code}. Please try again later.`;
        }

        // NOTE: For now we don't put this in the message stream because we
        // don't have logic for filtering it out prior to sending as part of the
        // conversation
        setErrorMessage(text);
      };

      try {
        if (plugin.agent) {
          const currentMessages = getMessages();
          const stream = plugin.agent.streamText(
            {
              // @ts-expect-error - custom Message[] is not assignable to CoreMessage[]
              messages: currentMessages,
              maxSteps: plugin.agent.settings.maxSteps || 10,
              maxRetries: plugin.agent.settings.maxRetries || 2,
              maxTokens: plugin.agent.settings.maxTokens || 8000,
              temperature: 0.2,
              abortSignal: controller.signal,
            },
            ctx
          );

          for await (const part of stream.fullStream) {
            if ((part as any).type === "error") {
              if (RetryError.isInstance((part as any).error)) {
                const err = (part as any).error as RetryError;
                const statusCode = err.errors?.find((x) => APICallError.isInstance(x))?.statusCode;
                handleStatus(statusCode ?? 500, err);
              } else {
                handleStatus((part as any).error?.statusCode ?? 500, (part as any).error);
              }
              break;
            }
            appendResponseChunk(part as ResponseChunk);
          }
        } else {
          showAssistant("Agent not initialized. Please check your settings.");
        }
      } catch (err: any) {
        if (APICallError.isInstance(err)) {
          handleStatus(err.statusCode ?? 500, err);
        } else if (err.name === "AbortError") {
          showAssistant("Request cancelled.");
        } else {
          const unexpected = `Unexpected error: ${err.message || err}`;
          showAssistant(unexpected);
          setErrorMessage(unexpected);
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [plugin, ctx, appendMessage, appendResponseChunk, getMessages, setErrorMessage]
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

      {errorMessage && (
        <div className="meta-bg-red-100 meta-border meta-border-red-400 meta-text-red-700 meta-px-4 meta-py-2 meta-rounded">
          {errorMessage}
        </div>
      )}
    </div>
  );
};
