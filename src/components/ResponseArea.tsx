import React, { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { useApp } from "./useApp";
import type { ResponseChunk } from "./types";

interface ResponseAreaProps {
  responseChunks: ResponseChunk[];
  isLoading: boolean;
}

interface Message {
  id: string;
  role: "assistant" | "tool";
  content?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  toolName?: string;
}

interface ToolCall {
  id: string;
  toolName: string;
  args: Record<string, any>;
  result?: any;
}

const ToolCallView: React.FC<ToolCall> = ({ id, toolName, args, result }) => {
  return (
    <details
      className={`meta-mb-4 meta-rounded-md meta-border meta-border-gray-200 dark:meta-border-gray-700 ${id}`}
    >
      <summary className="meta-p-2 meta-cursor-pointer hover:meta-bg-gray-100 dark:hover:meta-bg-gray-800 meta-font-medium">
        {result ? "✅" : "🤔"} {toolName}
      </summary>
      <code className="meta-p-3 meta-bg-gray-50 dark:meta-bg-gray-900 meta-block meta-rounded-b-md meta-overflow-x-auto meta-text-xs meta-whitespace-pre">
        {JSON.stringify(args, null, 2)}
      </code>
      {result && (
        <code className="meta-p-3 meta-bg-gray-100 dark:meta-bg-gray-800 meta-block meta-text-xs meta-overflow-x-auto meta-border-t meta-border-gray-200 dark:meta-border-gray-700 meta-whitespace-pre">
          {(() => {
            const resultStr = JSON.stringify(result, null, 2);
            const truncated = resultStr.length > 1000;
            return truncated ? `${resultStr.slice(0, 1000)}... (truncated)` : resultStr;
          })()}
        </code>
      )}
    </details>
  );
};

export const ResponseArea: React.FC<ResponseAreaProps> = ({ responseChunks, isLoading }) => {
  const app = useApp();
  const responseRef = useRef<HTMLDivElement>(null);

  // Add shimmer animation style
  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = `
      @keyframes shimmer {
        0% { background-position: 0% center; }
        100% { background-position: 200% center; }
      }
    `;
    document.head.appendChild(styleEl);

    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  // Auto-scroll to the bottom when new messages appear
  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [responseChunks]);

  // Process chunks into a conversation structure
  const messages: Message[] = [];
  let currentAssistantMessage: Message | null = null;

  responseChunks.forEach((chunk) => {
    switch (chunk.type) {
      case "text-delta":
        // Create a new assistant message if none exists
        if (!currentAssistantMessage || currentAssistantMessage.role !== "assistant") {
          currentAssistantMessage = {
            id: `assistant-${messages.length}`,
            role: "assistant",
            content: chunk.textDelta,
            tool_calls: [],
          };
          messages.push(currentAssistantMessage);
        } else {
          // Append to existing assistant message
          currentAssistantMessage.content += chunk.textDelta;
        }
        break;

      case "tool-call":
        // Create a new assistant message if none exists
        if (!currentAssistantMessage || currentAssistantMessage.role !== "assistant") {
          currentAssistantMessage = {
            id: `assistant-${messages.length}`,
            role: "assistant",
            content: "",
            tool_calls: [],
          };
          messages.push(currentAssistantMessage);
        }

        // Add the tool call to the current assistant message
        const existingToolCall = currentAssistantMessage.tool_calls?.find(
          (tc) => tc.id === chunk.toolCallId
        );

        if (existingToolCall) {
          // Update existing tool call
          Object.assign(existingToolCall, {
            toolName: chunk.toolName,
            args: chunk.args,
          });
        } else {
          // Add new tool call
          currentAssistantMessage.tool_calls?.push({
            id: chunk.toolCallId,
            toolName: chunk.toolName,
            args: chunk.args,
          });
        }
        break;

      case "tool-result":
        // Find the tool call in assistant messages
        let toolCall: ToolCall | undefined;
        for (const msg of messages) {
          if (msg.role === "assistant" && msg.tool_calls) {
            toolCall = msg.tool_calls.find((tc) => tc.id === chunk.toolCallId);
            if (toolCall) {
              toolCall.result = chunk.result;
              break;
            }
          }
        }

        // Add a tool message
        const toolMessage: Message = {
          id: `tool-${messages.length}`,
          role: "tool",
          tool_call_id: chunk.toolCallId,
          toolName: toolCall?.toolName,
          content: JSON.stringify(chunk.result),
        };
        messages.push(toolMessage);

        // Reset current assistant message so next text will create a new one
        currentAssistantMessage = null;
        break;
    }
  });

  if (isLoading && responseChunks.length === 0) {
    return (
      <div className="meta-flex-1 meta-overflow-y-auto meta-w-full meta-h-full meta-p-4">
        <div
          className="meta-text-center meta-py-2 meta-font-medium"
          style={{
            background: "linear-gradient(90deg, #334155, #cbd5e1, #334155)",
            backgroundSize: "200% auto",
            color: "transparent",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            animation: "shimmer 2s linear infinite",
          }}
        >
          Processing...
        </div>
      </div>
    );
  }

  return (
    <div className="meta-flex-1 meta-overflow-y-auto meta-w-full meta-h-full" ref={responseRef}>
      {messages.map((message) => (
        <div key={message.id} className="">
          {message.role === "assistant" && (
            <>
              {/* Render tool calls */}
              {message.tool_calls?.map((toolCall) => (
                <ToolCallView key={toolCall.id} {...toolCall} />
              ))}

              {/* Render markdown content */}
              {message.content && (
                <div className="meta-prose meta-prose-sm dark:meta-prose-invert meta-max-w-none">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
};
