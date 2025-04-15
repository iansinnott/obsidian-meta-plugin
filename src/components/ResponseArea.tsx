import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ShimmerText } from "./ShimmerText";
import { DELEGATE_TO_AGENT_TOOL_NAME } from "../llm/agents";
import { type Message } from "../llm/chunk-processor";
import type { ToolCall } from "./MetaSidebar";
import { useToolResult, useChunkedMessages } from "../hooks/useChunkedMessages";

const ToolCallView: React.FC<ToolCall & { callingAgentId: string }> = ({
  toolCallId,
  toolName,
  args,
  callingAgentId,
}) => {
  const isSubAgentCall = toolName === DELEGATE_TO_AGENT_TOOL_NAME;

  const _name = isSubAgentCall ? args.agentId : toolName;
  const { result, error, isLoading } = useToolResult(callingAgentId, toolCallId);
  const [isOpen, setIsOpen] = useState(isLoading);

  // For sub-agent calls, get the sub-agent's messages and chunks
  const subAgentData = isSubAgentCall ? useChunkedMessages(args.agentId) : null;

  useEffect(() => {
    if (isLoading) {
      setIsOpen(true);
    } else if (!isLoading && !error) {
      setIsOpen(false);
    }
  }, [isLoading, error]);

  return (
    <details
      data-id={toolCallId}
      className={`${toolCallId} meta-mb-4 meta-rounded-md meta-border meta-border-gray-200 dark:meta-border-gray-700`}
      open={isOpen}
      onToggle={(e) => setIsOpen(e.currentTarget.open)}
    >
      <summary className="meta-p-2 meta-cursor-pointer hover:meta-bg-gray-100 dark:hover:meta-bg-gray-800 meta-font-medium meta-flex meta-items-center meta-gap-2">
        {isLoading ? <ShimmerText text={_name} /> : _name}
        {error && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="meta-h-4 meta-w-4 meta-text-red-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </summary>

      {isSubAgentCall && subAgentData ? (
        // Render a nested AgentResponseArea for sub-agent calls
        <div className="meta-border-t meta-border-gray-200 dark:meta-border-gray-700">
          <AgentResponseArea
            isLoading={isLoading}
            messages={subAgentData.messages}
            chunks={subAgentData.chunks}
            agentId={args.agentId}
          />
        </div>
      ) : (
        // Render the regular tool call view for normal tool calls
        <>
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
        </>
      )}

      {error && (
        <code className="meta-p-3 meta-bg-gray-100 dark:meta-bg-gray-800 meta-block meta-text-xs meta-overflow-x-auto meta-border-t meta-border-gray-200 dark:meta-border-gray-700 meta-whitespace-pre">
          {JSON.stringify(error, null, 2)}
        </code>
      )}
    </details>
  );
};

// Component to display each message in the conversation
const MessageBubble: React.FC<{ message: Message; isLoading: boolean; agentId: string }> = ({
  message,
  isLoading,
  agentId,
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
                return <ToolCallView key={c.toolCallId} {...c} callingAgentId={agentId} />;
              })}
          </>
        )}
      </div>
    </div>
  );
};

interface AgentResponseAreaProps {
  chunks: any[];
  isLoading: boolean;
  messages?: Message[]; // Conversation history
  agentId: string;
}

export const AgentResponseArea: React.FC<AgentResponseAreaProps> = ({
  isLoading,
  messages = [],
  chunks = [],
  agentId,
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
      data-agent-id={agentId}
      data-testid="AgentResponseArea"
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
            agentId={agentId}
          />
        ))}
    </div>
  );
};
