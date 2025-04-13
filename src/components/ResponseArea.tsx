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
    <details className={id}>
      <summary>
        {result ? "✅" : "🤔"} {toolName}
      </summary>
      <code style={{ whiteSpace: "pre-wrap", display: "block" }}>
        {JSON.stringify(args, null, 2)}
      </code>
      {result && (
        <code
          className="tool-response"
          style={{ whiteSpace: "pre-wrap", fontSize: "x-small", display: "block" }}
        >
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
      <div className="meta-sidebar-response">
        <div className="meta-sidebar-loading">Processing...</div>
      </div>
    );
  }

  return (
    <div className="meta-sidebar-response" ref={responseRef}>
      {Object.entries(toolCalls).map(([id, props]) => (
        <ToolCall key={id} {...props} />
      ))}

      {Object.keys(textResults).map((id) => (
        <div key={id} className="meta-sidebar-result" data-result-id={id} />
      ))}
    </div>
  );
};
