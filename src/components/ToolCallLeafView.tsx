import React from "react";
import { useToolResult } from "../hooks/useChunkedMessages";
import {
  DELEGATE_TO_AGENT_TOOL_NAME,
  FILE_EDITOR_TOOL_NAME,
  OBSIDIAN_API_TOOL_NAME,
} from "../llm/agents";
import type { ToolCall } from "./MetaSidebar";

export function camelCaseToTitleCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export const getToolCallHeading = (
  toolName: string,
  args: any
): { title: string; icon?: string } => {
  switch (toolName) {
    case OBSIDIAN_API_TOOL_NAME:
      return {
        title: "Obsidian API",
      };
    case FILE_EDITOR_TOOL_NAME:
      switch (args.command) {
        case "view":
          return {
            title: `Inspect: ${args.path}`,
          };
        case "str_replace":
          return {
            title: `Edit: ${args.path}`,
          };
        case "create":
          return {
            title: `Create: ${args.path}`,
          };
        case "insert":
          return {
            title: `Edit: ${args.path} @ ${args.insert_line}`,
          };
        case "undo_edit":
          return {
            title: `Undo: ${args.path}`,
          };
        default:
          return {
            title: "File Editor",
          };
      }
    default:
      return {
        title: camelCaseToTitleCase(toolName),
      };
  }
};

export const ToolCallLeaf: React.FC<ToolCall & { callingAgentId: string; threadId: string }> = (
  props
) => {
  const { callingAgentId, threadId, toolCallId, toolName, args } = props;
  const { result, error, isLoading } = useToolResult(callingAgentId, threadId, toolCallId);
  const isSubAgentCall = toolName === DELEGATE_TO_AGENT_TOOL_NAME;

  if (isSubAgentCall) {
    console.error("Unexpected sub-agent call in ToolCallLeaf component", props);
    return (
      <div className="meta-bg-red-100 meta-text-red-800 meta-p-2 meta-rounded meta-text-sm meta-my-2">
        Error: Unexpected sub-agent call in ToolCallLeaf component
      </div>
    );
  }

  switch (toolName) {
    case OBSIDIAN_API_TOOL_NAME:
      return (
        <>
          <div className="tool-call-args">
            <pre className="meta-bg-gray-50 dark:meta-bg-gray-900 meta-p-2 meta-rounded meta-overflow-x-auto meta-text-xs meta-my-2">
              {args.functionBody}
            </pre>
          </div>
          {result && (
            <div className="tool-call-result">
              {(() => {
                const resultStr = JSON.stringify(result.result, null, 2);
                const truncated = resultStr.length > 1000;
                return (
                  <pre>{truncated ? `${resultStr.slice(0, 1000)}... (truncated)` : resultStr}</pre>
                );
              })()}
            </div>
          )}
        </>
      );
    case FILE_EDITOR_TOOL_NAME: {
      switch (args.command) {
        case "view":
        default: {
          return (
            <>
              <div className="tool-call-args">
                <pre className="meta-bg-gray-50 dark:meta-bg-gray-900 meta-p-2 meta-rounded meta-overflow-x-auto meta-text-xs meta-my-2">
                  {JSON.stringify(args, null, 2)}
                </pre>
              </div>
              {result && (
                <div className="tool-call-result">
                  {(() => {
                    const resultStr =
                      typeof result.result === "string"
                        ? result.result
                        : JSON.stringify(result.result, null, 2);
                    const truncated = resultStr.length > 1000;
                    return (
                      <pre>
                        {truncated ? `${resultStr.slice(0, 1000)}... (truncated)` : resultStr}
                      </pre>
                    );
                  })()}
                </div>
              )}
            </>
          );
        }
      }
    }
    default:
      // The default tool call view just shows args and result directly
      return (
        <>
          <div className="tool-call-args">
            {(() => {
              if (toolName === OBSIDIAN_API_TOOL_NAME) {
                return (
                  <pre className="meta-bg-gray-50 dark:meta-bg-gray-900 meta-p-2 meta-rounded meta-overflow-x-auto meta-text-xs meta-my-2">
                    {args.functionBody}
                  </pre>
                );
              }

              const argsStr = JSON.stringify(args, null, 2);
              const truncated = argsStr.length > 1000;
              return (
                <code className="meta-bg-gray-50 dark:meta-bg-gray-900 meta-block meta-rounded-b-md meta-overflow-x-auto meta-text-xs meta-whitespace-pre meta-text-gray-800 dark:meta-text-gray-200">
                  {"→ " + (truncated ? `${argsStr.slice(0, 1000)}... (truncated)` : argsStr)}
                </code>
              );
            })()}
          </div>
          {result && (
            <div className="tool-call-result">
              {(() => {
                const resultStr = JSON.stringify(result.result, null, 2);
                const truncated = resultStr.length > 1000;
                return (
                  <pre>
                    {"← " + (truncated ? `${resultStr.slice(0, 1000)}... (truncated)` : resultStr)}
                  </pre>
                );
              })()}
            </div>
          )}
        </>
      );
  }
};
