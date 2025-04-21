import { describe, test, expect } from "bun:test";
import { ChunkProcessor } from "./chunk-processor";
import { generateId } from "ai";
import { findToolResult, findToolError } from "../hooks/useChunkedMessages";

const chunks_sonnetTools1 = {
  inputChunks: [
    {
      type: "step-start",
      messageId: "msg-xPNtsk0Vk8ePNTOhzJESGLpt",
      warnings: [],
    },
    { type: "text-delta", textDelta: "I" },
    { type: "text-delta", textDelta: "'ll help you find out how many notes you have" },
    { type: "text-delta", textDelta: " in your Obsidian vault. Let me" },
    { type: "text-delta", textDelta: " check that for you." },
    {
      type: "tool-call",
      toolCallId: "toolu_01B7Ana2mRhRqq4mohd3AS7U",
      toolName: "delegateToAgent",
      args: {
        agentId: "obsidian vault content manager",
        prompt:
          "Count how many notes (markdown files) are in the user's Obsidian vault and provide the total.",
      },
    },
    {
      type: "tool-result",
      toolCallId: "toolu_01B7Ana2mRhRqq4mohd3AS7U",
      toolName: "delegateToAgent",
      args: {
        agentId: "obsidian vault content manager",
        prompt:
          "Count how many notes (markdown files) are in the user's Obsidian vault and provide the total.",
      },
      result:
        "After examining your vault, I can confirm that you have **24 markdown files** in total in your Obsidian vault.\n\nThese include various notes on topics like Zettelkasten, Second Brain methodology, programming concepts, as well as daily notes and other personal notes.",
    },
    {
      type: "step-finish",
      finishReason: "tool-calls",
      usage: { promptTokens: 795, completionTokens: 126, totalTokens: 921 },
      providerMetadata: { anthropic: { cacheCreationInputTokens: 0, cacheReadInputTokens: 0 } },
      experimental_providerMetadata: {
        anthropic: { cacheCreationInputTokens: 0, cacheReadInputTokens: 0 },
      },
      response: {
        id: "msg_014XXFA1dWCG3jCH9AY8C3z6",
        timestamp: "2025-04-14T01:33:28.696Z",
        modelId: "claude-3-7-sonnet-20250219",
      },
      warnings: [],
      isContinued: false,
      messageId: "msg-xPNtsk0Vk8ePNTOhzJESGLpt",
    },
    {
      type: "step-start",
      messageId: "msg-7KciILgfhGf2vX4dzca12zVt",
      warnings: [],
    },
    { type: "text-delta", textDelta: "You" },
    { type: "text-delta", textDelta: " have 24 markdown files in your Obsidian vault. These" },
    { type: "text-delta", textDelta: " include various notes on topics like Zettel" },
    { type: "text-delta", textDelta: "kasten, Second Brain methodology, programming concepts," },
    { type: "text-delta", textDelta: " as well as daily notes and other personal notes." },
    {
      type: "step-finish",
      finishReason: "stop",
      usage: { promptTokens: 994, completionTokens: 50, totalTokens: 1044 },
      providerMetadata: { anthropic: { cacheCreationInputTokens: 0, cacheReadInputTokens: 0 } },
      experimental_providerMetadata: {
        anthropic: { cacheCreationInputTokens: 0, cacheReadInputTokens: 0 },
      },
      warnings: [],
      isContinued: false,
      messageId: "msg-7KciILgfhGf2vX4dzca12zVt",
    },
    {
      type: "finish",
      finishReason: "stop",
      usage: { promptTokens: 1789, completionTokens: 176, totalTokens: 1965 },
      providerMetadata: { anthropic: { cacheCreationInputTokens: 0, cacheReadInputTokens: 0 } },
      experimental_providerMetadata: {
        anthropic: { cacheCreationInputTokens: 0, cacheReadInputTokens: 0 },
      },
    },
  ],
  expectedOutput: [
    {
      role: "assistant",
      content: [
        {
          type: "text",
          text: "I'll help you find out how many notes you have in your Obsidian vault. Let me check that for you.",
        },
        {
          type: "tool-call",
          toolCallId: "toolu_01B7Ana2mRhRqq4mohd3AS7U",
          toolName: "delegateToAgent",
          args: {
            agentId: "obsidian vault content manager",
            prompt:
              "Count how many notes (markdown files) are in the user's Obsidian vault and provide the total.",
          },
        },
      ],
      id: "msg-xPNtsk0Vk8ePNTOhzJESGLpt",
    },
    {
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolCallId: "toolu_01B7Ana2mRhRqq4mohd3AS7U",
          toolName: "delegateToAgent",
          result:
            "After examining your vault, I can confirm that you have **24 markdown files** in total in your Obsidian vault.\n\nThese include various notes on topics like Zettelkasten, Second Brain methodology, programming concepts, as well as daily notes and other personal notes.",
        },
      ],
      id: "msg-toolu_01B7Ana2mRhRqq4mohd3AS7U",
    },
    {
      role: "assistant",
      content: [
        {
          type: "text",
          text: "You have 24 markdown files in your Obsidian vault. These include various notes on topics like Zettelkasten, Second Brain methodology, programming concepts, as well as daily notes and other personal notes.",
        },
      ],
      id: "msg-7KciILgfhGf2vX4dzca12zVt",
    },
  ],
};

const chunks_optimusTools1 = {
  inputChunks: [
    {
      type: "step-start",
      messageId: "msg-BL6Kg6fWq6PRajKXS49wc5EJ",
      warnings: [],
    },
    {
      type: "tool-call",
      toolCallId: "call_50hbYjoFJohb1Kyn0q0qCvmI",
      toolName: "delegateToAgent",
      args: {
        agentId: "obsidian vault content manager",
        prompt:
          "Count the total number of notes (markdown files) in the user's Obsidian vault and report the result.",
      },
    },
    {
      type: "tool-result",
      toolCallId: "call_50hbYjoFJohb1Kyn0q0qCvmI",
      toolName: "delegateToAgent",
      args: {
        agentId: "obsidian vault content manager",
        prompt:
          "Count the total number of notes (markdown files) in the user's Obsidian vault and report the result.",
      },
      result: "There are 23 markdown notes in your Obsidian vault.",
    },
    {
      type: "step-finish",
      finishReason: "tool-calls",
      usage: {
        promptTokens: 344,
        completionTokens: 46,
        totalTokens: 390,
      },
      providerMetadata: {
        openai: {
          reasoningTokens: 0,
          cachedPromptTokens: 0,
        },
      },
      experimental_providerMetadata: {
        openai: {
          reasoningTokens: 0,
          cachedPromptTokens: 0,
        },
      },
      response: {
        id: "gen-1744597664-fueQpCqzgcMI2s2OKivA",
        timestamp: "2025-04-14T02:27:44.000Z",
        modelId: "openrouter/optimus-alpha",
      },
      warnings: [],
      isContinued: false,
      messageId: "msg-BL6Kg6fWq6PRajKXS49wc5EJ",
    },
    {
      type: "step-start",
      messageId: "msg-yf4RdRJWArP2i6ABdNRJmmPk",
      warnings: [],
    },
    {
      type: "text-delta",
      textDelta: "You",
    },
    {
      type: "text-delta",
      textDelta: " have",
    },
    {
      type: "text-delta",
      textDelta: " ",
    },
    {
      type: "text-delta",
      textDelta: "23",
    },
    {
      type: "text-delta",
      textDelta: " notes",
    },
    {
      type: "text-delta",
      textDelta: " in",
    },
    {
      type: "text-delta",
      textDelta: " your",
    },
    {
      type: "text-delta",
      textDelta: " Ob",
    },
    {
      type: "text-delta",
      textDelta: "sid",
    },
    {
      type: "text-delta",
      textDelta: "ian",
    },
    {
      type: "text-delta",
      textDelta: " vault",
    },
    {
      type: "text-delta",
      textDelta: ".",
    },
    {
      type: "step-finish",
      finishReason: "stop",
      usage: {
        promptTokens: 411,
        completionTokens: 14,
        totalTokens: 425,
      },
      providerMetadata: {
        openai: {
          reasoningTokens: 0,
          cachedPromptTokens: 0,
        },
      },
      experimental_providerMetadata: {
        openai: {
          reasoningTokens: 0,
          cachedPromptTokens: 0,
        },
      },
      response: {
        id: "gen-1744597672-UbVGqH7mXuynhcNK3Z0K",
        timestamp: "2025-04-14T02:27:52.000Z",
        modelId: "openrouter/optimus-alpha",
      },
      warnings: [],
      isContinued: false,
      messageId: "msg-yf4RdRJWArP2i6ABdNRJmmPk",
    },
    {
      type: "finish",
      finishReason: "stop",
      usage: {
        promptTokens: 755,
        completionTokens: 60,
        totalTokens: 815,
      },
      providerMetadata: {
        openai: {
          reasoningTokens: 0,
          cachedPromptTokens: 0,
        },
      },
      experimental_providerMetadata: {
        openai: {
          reasoningTokens: 0,
          cachedPromptTokens: 0,
        },
      },
      response: {
        id: "gen-1744597672-UbVGqH7mXuynhcNK3Z0K",
        timestamp: "2025-04-14T02:27:52.000Z",
        modelId: "openrouter/optimus-alpha",
      },
    },
  ],
  expectedOutput: [
    {
      role: "assistant",
      content: [
        {
          type: "tool-call",
          toolCallId: "call_50hbYjoFJohb1Kyn0q0qCvmI",
          toolName: "delegateToAgent",
          args: {
            agentId: "obsidian vault content manager",
            prompt:
              "Count the total number of notes (markdown files) in the user's Obsidian vault and report the result.",
          },
        },
      ],
      id: "msg-BL6Kg6fWq6PRajKXS49wc5EJ",
    },
    {
      role: "tool",
      id: "msg-call_50hbYjoFJohb1Kyn0q0qCvmI",
      content: [
        {
          type: "tool-result",
          toolCallId: "call_50hbYjoFJohb1Kyn0q0qCvmI",
          toolName: "delegateToAgent",
          result: "There are 23 markdown notes in your Obsidian vault.",
        },
      ],
    },
    {
      role: "assistant",
      content: [
        {
          type: "text",
          text: "You have 23 notes in your Obsidian vault.",
        },
      ],
      id: "msg-yf4RdRJWArP2i6ABdNRJmmPk",
    },
  ],
};

const chunks_sonnetPartialText1 = {
  inputChunks: [
    {
      type: "step-start",
      messageId: "msg-abc",
      warnings: [],
    },
    { type: "text-delta", textDelta: "I" },
    { type: "text-delta", textDelta: "'ll help you find out how many notes you have" },
    { type: "text-delta", textDelta: " in your Obsidian vault. Let me" },
  ],
  expectedOutput: [
    {
      role: "assistant",
      content: [
        {
          type: "text",
          text: "I'll help you find out how many notes you have in your Obsidian vault. Let me",
        },
      ],
      id: "msg-abc",
    },
  ],
};

const chunks_error1 = {
  inputChunks: [
    {
      type: "step-start",
      messageId: "msg-SvcHq4X0Fr31GawwrwowHvgV",
      warnings: [],
    },
    {
      type: "text-delta",
      textDelta: "I",
    },
    {
      type: "text-delta",
      textDelta: "'ll help you check what themes are installed in",
    },
    {
      type: "text-delta",
      textDelta: " your Obsidian vault. Let me delegate",
    },
    {
      type: "text-delta",
      textDelta: " this task to the Obsidian plugin",
    },
    {
      type: "text-delta",
      textDelta: " API expert who can access this information for you.",
    },
    {
      type: "tool-call",
      toolCallId: "toolu_01LnLW47grQEVTVKcfvW6UFG",
      toolName: "delegateToAgent",
      args: {
        agentId: "obsidian plugin API",
        prompt:
          "Please check what themes are currently installed in the user's Obsidian vault and provide a list of them.",
      },
    },
    {
      type: "error",
      error: {
        name: "AI_ToolExecutionError",
        cause: {
          stack:
            "Error: Failed to execute 'structuredClone' on 'Window': #<Promise> could not be cloned.\n    at fn (plugin:obsidian-meta-plugin:33103:23)\n    at async eval (plugin:obsidian-meta-plugin:31132:22)\n    at async execute (plugin:obsidian-meta-plugin:35449:22)\n    at async eval (plugin:obsidian-meta-plugin:31132:22)",
        },
        toolArgs: {
          agentId: "obsidian plugin API",
          prompt:
            "Please check what themes are currently installed in the user's Obsidian vault and provide a list of them.",
        },
        toolName: "delegateToAgent",
        toolCallId: "toolu_01LnLW47grQEVTVKcfvW6UFG",
      },
    },
    {
      type: "step-finish",
      finishReason: "tool-calls",
      usage: {
        promptTokens: 845,
        completionTokens: 138,
        totalTokens: 983,
      },
      providerMetadata: {
        anthropic: {
          cacheCreationInputTokens: 0,
          cacheReadInputTokens: 0,
        },
      },
      experimental_providerMetadata: {
        anthropic: {
          cacheCreationInputTokens: 0,
          cacheReadInputTokens: 0,
        },
      },
      response: {
        id: "msg_01QpNSWY8vEa2AWqK7UV7X1v",
        timestamp: "2025-04-14T13:26:24.314Z",
        modelId: "claude-3-7-sonnet-20250219",
      },
      warnings: [],
      isContinued: false,
      messageId: "msg-SvcHq4X0Fr31GawwrwowHvgV",
    },
    {
      type: "finish",
      finishReason: "tool-calls",
      usage: {
        promptTokens: 845,
        completionTokens: 138,
        totalTokens: 983,
      },
      providerMetadata: {
        anthropic: {
          cacheCreationInputTokens: 0,
          cacheReadInputTokens: 0,
        },
      },
      experimental_providerMetadata: {
        anthropic: {
          cacheCreationInputTokens: 0,
          cacheReadInputTokens: 0,
        },
      },
      response: {
        id: "msg_01QpNSWY8vEa2AWqK7UV7X1v",
        timestamp: "2025-04-14T13:26:24.314Z",
        modelId: "claude-3-7-sonnet-20250219",
      },
    },
  ],
  expectedOutput: [
    {
      role: "assistant",
      content: [
        {
          type: "text",
          text: "I'll help you check what themes are installed in your Obsidian vault. Let me delegate this task to the Obsidian plugin API expert who can access this information for you.",
        },
        {
          type: "tool-call",
          toolCallId: "toolu_01LnLW47grQEVTVKcfvW6UFG",
          toolName: "delegateToAgent",
          args: {
            agentId: "obsidian plugin API",
            prompt:
              "Please check what themes are currently installed in the user's Obsidian vault and provide a list of them.",
          },
        },
      ],
      id: "msg-SvcHq4X0Fr31GawwrwowHvgV",
    },
    {
      role: "tool",
      id: "msg-toolu_01LnLW47grQEVTVKcfvW6UFG", // ID derived from toolCallId
      content: [
        {
          type: "tool-result",
          toolCallId: "toolu_01LnLW47grQEVTVKcfvW6UFG",
          toolName: "delegateToAgent",
          isError: true,
          result: {
            // The error object becomes the result
            name: "AI_ToolExecutionError",
            cause: {
              stack:
                "Error: Failed to execute 'structuredClone' on 'Window': #<Promise> could not be cloned.\n    at fn (plugin:obsidian-meta-plugin:33103:23)\n    at async eval (plugin:obsidian-meta-plugin:31132:22)\n    at async execute (plugin:obsidian-meta-plugin:35449:22)\n    at async eval (plugin:obsidian-meta-plugin:31132:22)",
            },
            toolArgs: {
              agentId: "obsidian plugin API",
              prompt:
                "Please check what themes are currently installed in the user's Obsidian vault and provide a list of them.",
            },
            toolName: "delegateToAgent",
            toolCallId: "toolu_01LnLW47grQEVTVKcfvW6UFG",
          },
        },
      ],
    },
  ],
};

describe("ChunkProcessor", () => {
  test("should process chunks into structured messages", () => {
    const tt = [chunks_sonnetTools1, chunks_optimusTools1, chunks_sonnetPartialText1];

    for (const { inputChunks, expectedOutput } of tt) {
      const chunkProcessor = new ChunkProcessor();
      for (const chunk of inputChunks) {
        chunkProcessor.appendChunk(chunk);
      }

      const result = chunkProcessor.getMessages();
      // @ts-ignore
      expect(result).toEqual(expectedOutput);
    }
  });

  test("should find tool errors and results correctly", () => {
    const chunkProcessor = new ChunkProcessor();

    // Add all chunks from the error example
    for (const chunk of chunks_error1.inputChunks) {
      chunkProcessor.appendChunk(chunk);
    }

    const allChunks = chunkProcessor.getChunks();
    const toolCallId = "toolu_01LnLW47grQEVTVKcfvW6UFG";

    // Test error finding
    const error = findToolError(allChunks, toolCallId);
    expect(error).not.toBeNull();
    expect(error?.type).toBe("error");
    expect(error?.error.toolCallId).toBe(toolCallId);

    // Test result should be null for this case
    const result = findToolResult(allChunks, toolCallId);
    expect(result).toBeNull();
  });

  test("should process tool use errors into messages", () => {
    const chunkProcessor = new ChunkProcessor();

    // Add all chunks from the error example
    for (const chunk of chunks_error1.inputChunks) {
      chunkProcessor.appendChunk(chunk);
    }

    const result = chunkProcessor.getMessages();
    // @ts-ignore
    expect(result).toEqual(chunks_error1.expectedOutput);
  });

  test("messages not passed by reference", () => {
    const p = new ChunkProcessor();
    p.appendMessage({
      role: "user",
      content: [
        {
          type: "text",
          text: "Hello, world!",
        },
      ],
      id: "msg-123",
    });
    const messages = p.getMessages();

    expect(p.getMessages()).not.toBe(messages);
    expect(p.getMessages()).toEqual(messages);
  });
});
