import React, { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { ShimmerText } from "./ShimmerText";
import { DELEGATE_TO_AGENT_TOOL_NAME } from "../llm/agents";
import { type Message } from "../llm/chunk-processor";
import type { ToolCall } from "./MetaSidebar";
import { useToolResult } from "../hooks/useChunkedMessages";

interface ResponseAreaProps {
  chunks: any[];
  isLoading: boolean;
  messages?: Message[]; // Conversation history
}

const ToolCallView: React.FC<ToolCall> = ({ toolCallId, toolName, args }) => {
  const _name = toolName === DELEGATE_TO_AGENT_TOOL_NAME ? args.agentId : toolName;
  const result = useToolResult(toolCallId);

  console.log("tool call result", toolCallId, result);

  return (
    <details
      data-id={toolCallId}
      className={`${toolCallId} meta-mb-4 meta-rounded-md meta-border meta-border-gray-200 dark:meta-border-gray-700`}
    >
      <summary className="meta-p-2 meta-cursor-pointer hover:meta-bg-gray-100 dark:hover:meta-bg-gray-800 meta-font-medium">
        {result ? _name : <ShimmerText text={_name} />}
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

// Component to display each message in the conversation
const MessageBubble: React.FC<{ message: Message; isLoading: boolean }> = ({
  message,
  isLoading,
}) => {
  const isUser = message.role === "user";

  return (
    <div
      className={`meta-mb-4 ${
        isUser
          ? "meta-ml-auto meta-max-w-[85%] meta-border meta-border-gray-200 dark:meta-border-gray-700"
          : "meta-w-full"
      }`}
    >
      <div
        className={`meta-rounded-lg${
          isUser
            ? "meta-bg-blue-500 meta-text-white meta-p-2"
            : "meta-text-gray-900 dark:meta-text-gray-100"
        }`}
      >
        {isUser ? (
          <p className="meta-m-0">
            {message.content
              ?.filter((c) => c.type === "text")
              .map((c) => c.text)
              .join("")}
          </p>
        ) : (
          <>
            {/* Render message content */}
            {message.content && (
              <div className="meta-prose meta-prose-sm dark:meta-prose-invert meta-max-w-none meta-bg-gray-200 dark:meta-bg-gray-700 meta-p-3 meta-rounded-lg">
                <ReactMarkdown>
                  {message.content
                    ?.filter((c) => c.type === "text")
                    .map((c) => c.text)
                    .join("")}
                </ReactMarkdown>
              </div>
            )}

            {/* Render tool calls if present */}
            {message.content
              ?.filter((c) => c.type === "tool-call")
              .map((c) => {
                return <ToolCallView key={c.toolCallId} {...c} />;
              })}
          </>
        )}
      </div>
    </div>
  );
};

export const ResponseArea: React.FC<ResponseAreaProps> = ({
  isLoading,
  messages = [],
  chunks = [],
}) => {
  const responseRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when new messages appear
  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [chunks, messages]);

  // Initial loading state with no messages
  if (isLoading && chunks.length === 0 && messages.length === 0) {
    return (
      <div className="meta-flex-1 meta-overflow-y-auto meta-w-full meta-h-full meta-p-4">
        <div className="meta-text-center meta-py-2 meta-font-medium">
          <ShimmerText text="Processing..." />
        </div>
      </div>
    );
  }

  return (
    <div
      className="meta-flex-1 meta-overflow-y-auto meta-w-full meta-h-full meta-p-4"
      ref={responseRef}
    >
      {/* NOTE: "tool" messages are not displayed. instead the tool-call is displayed and we tack the result onto the call site when complete */}
      {messages
        .filter((m) => m.role !== "tool")
        .map((message, index) => (
          <MessageBubble
            key={message.id || `msg-${index}`}
            message={message}
            isLoading={isLoading}
          />
        ))}
    </div>
  );
};
