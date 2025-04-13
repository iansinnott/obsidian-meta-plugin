import React, { useEffect, useRef } from "react";
import { MarkdownRenderer } from "obsidian";
import { useApp } from "./useApp";
import type { ResponseChunk } from "./types";

interface ResponseAreaProps {
  responseChunks: ResponseChunk[];
  isLoading: boolean;
  component: any; // Obsidian Component
}

interface ToolCallProps {
  id: string;
  toolName: string;
  args: Record<string, any>;
  result?: any;
}

const ToolCall: React.FC<ToolCallProps> = ({ id, toolName, args, result }) => {
  return (
    <details
      className={`meta-mb-4 meta-rounded-md meta-border meta-border-gray-200 dark:meta-border-gray-700 ${id}`}
    >
      <summary className="meta-p-2 meta-cursor-pointer hover:meta-bg-gray-100 dark:hover:meta-bg-gray-800 meta-font-medium">
        {result ? "✅" : "🤔"} {toolName}
      </summary>
      <code className="meta-p-3 meta-bg-gray-50 dark:meta-bg-gray-900 meta-block meta-rounded-b-md meta-overflow-x-auto">
        {JSON.stringify(args, null, 2)}
      </code>
      {result && (
        <code className="meta-p-3 meta-bg-gray-100 dark:meta-bg-gray-850 meta-block meta-text-xs meta-overflow-x-auto meta-border-t meta-border-gray-200 dark:meta-border-gray-700">
          {JSON.stringify(result, null, 2)}
        </code>
      )}
    </details>
  );
};

export const ResponseArea: React.FC<ResponseAreaProps> = ({
  responseChunks,
  isLoading,
  component,
}) => {
  const app = useApp();
  const responseRef = useRef<HTMLDivElement>(null);
  const textResults: { [key: string]: string } = {};
  const toolCalls: { [key: string]: ToolCallProps } = {};

  // Process chunks into UI state
  responseChunks.forEach((chunk, index) => {
    switch (chunk.type) {
      case "text-delta":
        const resultId = `result-${index}`;
        textResults[resultId] = (textResults[resultId] || "") + chunk.textDelta;
        break;
      case "tool-call":
        toolCalls[chunk.toolCallId] = {
          id: chunk.toolCallId,
          toolName: chunk.toolName,
          args: chunk.args,
        };
        break;
      case "tool-result":
        if (toolCalls[chunk.toolCallId]) {
          toolCalls[chunk.toolCallId].result = chunk.result;
        }
        break;
    }
  });

  // Render markdown after component updates
  useEffect(() => {
    if (!responseRef.current) return;

    Object.entries(textResults).forEach(([id, text]) => {
      const el = responseRef.current?.querySelector(`[data-result-id="${id}"]`) as HTMLElement;
      if (el) {
        el.empty();
        MarkdownRenderer.render(app, text, el, "", component);
      }
    });
  }, [responseChunks, app, component]);

  if (isLoading && responseChunks.length === 0) {
    return (
      <div className="meta-flex-1 meta-p-4 meta-overflow-y-auto">
        <div className="meta-text-center meta-py-12 meta-text-gray-500 dark:meta-text-gray-400">
          Processing...
        </div>
      </div>
    );
  }

  return (
    <div className="meta-flex-1 meta-p-4 meta-overflow-y-auto" ref={responseRef}>
      {Object.entries(toolCalls).map(([id, props]) => (
        <ToolCall key={id} {...props} />
      ))}

      {Object.keys(textResults).map((id) => (
        <div
          key={id}
          className="meta-prose dark:meta-prose-invert meta-max-w-none"
          data-result-id={id}
        />
      ))}
    </div>
  );
};
