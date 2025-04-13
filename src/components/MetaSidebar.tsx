import React, { useState } from "react";
import { Component } from "obsidian";
import { PromptInput } from "./PromptInput";
import { ResponseArea } from "./ResponseArea";
import { useApp } from "./useApp";
import type { ResponseChunk, StreamProps } from "./types";
import type { MetaPlugin as IMetaPlugin } from "../plugin";

interface MetaSidebarProps {
  plugin: IMetaPlugin;
  component: Component;
}

export const MetaSidebar: React.FC<MetaSidebarProps> = ({ plugin, component }) => {
  const app = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [responseChunks, setResponseChunks] = useState<ResponseChunk[]>([]);

  const handleSubmit = async (prompt: string) => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setResponseChunks([]);

    try {
      if (plugin.agent) {
        const streamProps: StreamProps = {
          prompt,
          maxSteps: 10,
          maxRetries: 2,
          maxTokens: 8000,
        };

        const stream = plugin.agent.streamText(streamProps, { app });

        for await (const chunk of stream.fullStream) {
          setResponseChunks((prev) => [...prev, chunk as ResponseChunk]);
        }
      } else {
        setResponseChunks([
          {
            type: "text-delta",
            textDelta: "Agent not initialized. Please check your settings.",
          },
        ]);
      }
    } catch (error) {
      console.error("Error:", error);
      setResponseChunks([
        {
          type: "text-delta",
          textDelta: `Error: ${error.message || String(error)}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="meta-plugin-container meta-flex meta-flex-col meta-h-full">
      <div className="meta-border-b meta-border-gray-200 dark:meta-border-gray-700">
        <p className="meta-text-xl meta-font-semibold meta-text-gray-800 dark:meta-text-gray-200 meta-mt-0">
          Meta Assistant
        </p>
      </div>

      <div className="meta-flex-1 meta-overflow-hidden meta-flex meta-flex-col">
        <ResponseArea responseChunks={responseChunks} isLoading={isLoading} component={component} />
      </div>

      <div className="meta-mt-auto meta-border-t meta-border-gray-200 dark:meta-border-gray-700 meta-shrink-0">
        <PromptInput onSubmit={handleSubmit} isLoading={isLoading} />
      </div>
    </div>
  );
};
