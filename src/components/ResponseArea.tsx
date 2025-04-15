import classNames from "classnames";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useChunkedMessages, useToolResult } from "../hooks/useChunkedMessages";
import { DELEGATE_TO_AGENT_TOOL_NAME } from "../llm/agents";
import { type Message } from "../llm/chunk-processor";
import type { ToolCall } from "./MetaSidebar";
import { ShimmerText } from "./ShimmerText";

const capitalizeWords = (str: string) => {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const ToolCallView: React.FC<ToolCall & { callingAgentId: string }> = ({
  toolCallId,
  toolName,
  args,
  callingAgentId,
}) => {
  const isSubAgentCall = toolName === DELEGATE_TO_AGENT_TOOL_NAME;

  const displayName = isSubAgentCall ? capitalizeWords(args.agentId) : toolName;
  const { result, error, isLoading } = useToolResult(args.agentId, toolCallId);
  const [isOpen, setIsOpen] = useState(isSubAgentCall ? isLoading : false);

  // For sub-agent calls, get the sub-agent's messages and chunks
  const subAgentData = isSubAgentCall ? useChunkedMessages(args.agentId) : null;

  // Auto open/close functionality for sub-agent calls. I.e. show it to me while
  // auto completing and then close it. It can of course be opened manually.
  useEffect(() => {
    if (isSubAgentCall) {
      if (isLoading) {
        setIsOpen(true);
      } else if (!isLoading && !error) {
        setIsOpen(false);
      }
    }
  }, [isLoading, error, isSubAgentCall]);

  return (
    <div
      data-tool-call-id={toolCallId}
      data-calling-agent-id={callingAgentId}
      data-arg-agent-id={args.agentId}
      className={`${toolCallId} tool-call-container meta-rounded-lg meta-border meta-border-solid meta-border-gray-200 dark:meta-border-gray-700 meta-mt-2 meta-bg-black/10 dark:meta-bg-white/10`}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={classNames(
          "meta-p-2 meta-cursor-pointer hover:meta-bg-gray-100 dark:hover:meta-bg-gray-800 meta-font-medium meta-flex meta-items-center meta-gap-2 meta-border-b meta-border-b-solid meta-border-gray-200 dark:meta-border-gray-700",
          {
            "meta-border-b-0": !isOpen,
            "meta-border-b-1 meta-border-b-solid": isOpen,
          }
        )}
      >
        {/* Terminal icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="meta-h-4 meta-w-4 meta-mr-2 meta-text-gray-500 dark:meta-text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 9l3 3-3 3m5 0h3"
          />
        </svg>
        <span className="meta-text-xs">
          {isLoading ? <ShimmerText text={displayName} /> : displayName}
        </span>
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
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
    <div className={`meta-mb-2 meta-w-full`}>
      <div
        className={classNames(
          "meta-rounded-lg",
          isUser
            ? "meta-bg-blue-500 meta-text-white meta-p-2"
            : "meta-text-gray-900 dark:meta-text-gray-100"
        )}
      >
        {isUser ? (
          <>
            <div className="meta-flex meta-items-center">
              <svg
                className="meta-w-4 meta-h-4 meta-mr-2 meta-text-white meta-fill-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
              <p className="meta-m-0">
                {message.content
                  ?.filter((c) => c.type === "text")
                  .map((c) => c.text)
                  .join("")}
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Render message content */}
            {message.content && (
              <div className="meta-prose meta-prose-sm dark:meta-prose-invert meta-max-w-none meta-bg-gray-200 dark:meta-bg-gray-700 meta-p-3 meta-rounded-lg meta-overflow-auto">
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
      <div className="meta-flex-1 meta-overflow-y-auto meta-w-full meta-h-full meta-p-2">
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
      className="meta-flex-1 meta-overflow-y-auto meta-w-full meta-h-full meta-p-2"
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
