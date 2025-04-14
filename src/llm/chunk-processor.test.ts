import { describe, it, expect } from "bun:test";

const chunks_sonnetTools1 = {
  inputChunks: [
    {
      type: "step-start",
      messageId: "msg-xPNtsk0Vk8ePNTOhzJESGLpt",
      request: {
        body: '{"model":"claude-3-7-sonnet-20250219","max_tokens":8000,"temperature":0,"system":[{"type":"text","text":"You are an AI agent that manages a team of Obsidian experts\\nthat can help the user with all sorts of tasks. Your team of experts are\\nalso AI agents but they have specific skills and knowledge.\\n      \\nYour team includes:\\n\\n- `obsidian vault content manager`\\n  This agent is instructed to: \\"\\"\\"You\'re part of a team that manages, maintains and enhances a\\n    user\'s Obsidian vault. \\n    Your specialty is managing the content files in the\\n    Obsidian vault. These are usually markdown or plain text files, but Obsidian\\n    supports a broad range of content.\\"\\"\\"\\n\\nAssume that user queries are related to Obsidian. For example, phrases like \\n\\"my notes\\", \\"my vault\\", \\"my files\\", \\"my documents\\", \\"my writing\\", etc. are all\\nrelated to Obsidian.\\n\\nYou can delegate tasks to these team members using the\\ndelegateToAgent tool. Do not mention to the user that you\'re\\ndelegatin. The UI will display a tool call message box to the user which makes\\nit redundant to mention it in prose. For example, do not preface with \\"Now I\\nwill delegate...\\"."}],"messages":[{"role":"user","content":[{"type":"text","text":"how many notes do I have?"}]}],"tools":[{"name":"delegateToAgent","description":"Delegate a task to a direct report.","input_schema":{"type":"object","properties":{"agentId":{"type":"string","description":"The ID (name) of the agent to delegate to."},"prompt":{"type":"string","description":"The task prompt to send to the delegated agent."}},"required":["agentId","prompt"],"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"}},{"name":"getCurrentDateTime","description":"Get the current date and time in local and UTC timezones.","input_schema":{"type":"object","properties":{},"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"}}],"tool_choice":{"type":"auto"},"stream":true}',
      },
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
      request: {
        body: '{"model":"claude-3-7-sonnet-20250219","max_tokens":8000,"temperature":0,"system":[{"type":"text","text":"You are an AI agent that manages a team of Obsidian experts\\nthat can help the user with all sorts of tasks. Your team of experts are\\nalso AI agents but they have specific skills and knowledge.\\n      \\nYour team includes:\\n\\n- `obsidian vault content manager`\\n  This agent is instructed to: \\"\\"\\"You\'re part of a team that manages, maintains and enhances a\\n    user\'s Obsidian vault. \\n    Your specialty is managing the content files in the\\n    Obsidian vault. These are usually markdown or plain text files, but Obsidian\\n    supports a broad range of content.\\"\\"\\"\\n\\nAssume that user queries are related to Obsidian. For example, phrases like \\n\\"my notes\\", \\"my vault\\", \\"my files\\", \\"my documents\\", \\"my writing\\", etc. are all\\nrelated to Obsidian.\\n\\nYou can delegate tasks to these team members using the\\ndelegateToAgent tool. Do not mention to the user that you\'re\\ndelegatin. The UI will display a tool call message box to the user which makes\\nit redundant to mention it in prose. For example, do not preface with \\"Now I\\nwill delegate...\\"."}],"messages":[{"role":"user","content":[{"type":"text","text":"how many notes do I have?"}]}],"tools":[{"name":"delegateToAgent","description":"Delegate a task to a direct report.","input_schema":{"type":"object","properties":{"agentId":{"type":"string","description":"The ID (name) of the agent to delegate to."},"prompt":{"type":"string","description":"The task prompt to send to the delegated agent."}},"required":["agentId","prompt"],"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"}},{"name":"getCurrentDateTime","description":"Get the current date and time in local and UTC timezones.","input_schema":{"type":"object","properties":{},"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"}}],"tool_choice":{"type":"auto"},"stream":true}',
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
      request: {
        body: '{"model":"claude-3-7-sonnet-20250219","max_tokens":8000,"temperature":0,"system":[{"type":"text","text":"You are an AI agent that manages a team of Obsidian experts\\nthat can help the user with all sorts of tasks. Your team of experts are\\nalso AI agents but they have specific skills and knowledge.\\n      \\nYour team includes:\\n\\n- `obsidian vault content manager`\\n  This agent is instructed to: \\"\\"\\"You\'re part of a team that manages, maintains and enhances a\\n    user\'s Obsidian vault. \\n    Your specialty is managing the content files in the\\n    Obsidian vault. These are usually markdown or plain text files, but Obsidian\\n    supports a broad range of content.\\"\\"\\"\\n\\nAssume that user queries are related to Obsidian. For example, phrases like \\n\\"my notes\\", \\"my vault\\", \\"my files\\", \\"my documents\\", \\"my writing\\", etc. are all\\nrelated to Obsidian.\\n\\nYou can delegate tasks to these team members using the\\ndelegateToAgent tool. Do not mention to the user that you\'re\\ndelegatin. The UI will display a tool call message box to the user which makes\\nit redundant to mention it in prose. For example, do not preface with \\"Now I\\nwill delegate...\\"."}],"messages":[{"role":"user","content":[{"type":"text","text":"how many notes do I have?"}]},{"role":"assistant","content":[{"type":"text","text":"I\'ll help you find out how many notes you have in your Obsidian vault. Let me check that for you."},{"type":"tool_use","id":"toolu_01B7Ana2mRhRqq4mohd3AS7U","name":"delegateToAgent","input":{"agentId":"obsidian vault content manager","prompt":"Count how many notes (markdown files) are in the user\'s Obsidian vault and provide the total."}}]},{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_01B7Ana2mRhRqq4mohd3AS7U","content":"\\"After examining your vault, I can confirm that you have **24 markdown files** in total in your Obsidian vault.\\\\n\\\\nThese include various notes on topics like Zettelkasten, Second Brain methodology, programming concepts, as well as daily notes and other personal notes.\\""}]}],"tools":[{"name":"delegateToAgent","description":"Delegate a task to a direct report.","input_schema":{"type":"object","properties":{"agentId":{"type":"string","description":"The ID (name) of the agent to delegate to."},"prompt":{"type":"string","description":"The task prompt to send to the delegated agent."}},"required":["agentId","prompt"],"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"}},{"name":"getCurrentDateTime","description":"Get the current date and time in local and UTC timezones.","input_schema":{"type":"object","properties":{},"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"}}],"tool_choice":{"type":"auto"},"stream":true}',
      },
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
      request: {
        body: '{"model":"claude-3-7-sonnet-20250219","max_tokens":8000,"temperature":0,"system":[{"type":"text","text":"You are an AI agent that manages a team of Obsidian experts\\nthat can help the user with all sorts of tasks. Your team of experts are\\nalso AI agents but they have specific skills and knowledge.\\n      \\nYour team includes:\\n\\n- `obsidian vault content manager`\\n  This agent is instructed to: \\"\\"\\"You\'re part of a team that manages, maintains and enhances a\\n    user\'s Obsidian vault. \\n    Your specialty is managing the content files in the\\n    Obsidian vault. These are usually markdown or plain text files, but Obsidian\\n    supports a broad range of content.\\"\\"\\"\\n\\nAssume that user queries are related to Obsidian. For example, phrases like \\n\\"my notes\\", \\"my vault\\", \\"my files\\", \\"my documents\\", \\"my writing\\", etc. are all\\nrelated to Obsidian.\\n\\nYou can delegate tasks to these team members using the\\ndelegateToAgent tool. Do not mention to the user that you\'re\\ndelegatin. The UI will display a tool call message box to the user which makes\\nit redundant to mention it in prose. For example, do not preface with \\"Now I\\nwill delegate...\\"."}],"messages":[{"role":"user","content":[{"type":"text","text":"how many notes do I have?"}]},{"role":"assistant","content":[{"type":"text","text":"I\'ll help you find out how many notes you have in your Obsidian vault. Let me check that for you."},{"type":"tool_use","id":"toolu_01B7Ana2mRhRqq4mohd3AS7U","name":"delegateToAgent","input":{"agentId":"obsidian vault content manager","prompt":"Count how many notes (markdown files) are in the user\'s Obsidian vault and provide the total."}}]},{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_01B7Ana2mRhRqq4mohd3AS7U","content":"\\"After examining your vault, I can confirm that you have **24 markdown files** in total in your Obsidian vault.\\\\n\\\\nThese include various notes on topics like Zettelkasten, Second Brain methodology, programming concepts, as well as daily notes and other personal notes.\\""}]}],"tools":[{"name":"delegateToAgent","description":"Delegate a task to a direct report.","input_schema":{"type":"object","properties":{"agentId":{"type":"string","description":"The ID (name) of the agent to delegate to."},"prompt":{"type":"string","description":"The task prompt to send to the delegated agent."}},"required":["agentId","prompt"],"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"}},{"name":"getCurrentDateTime","description":"Get the current date and time in local and UTC timezones.","input_schema":{"type":"object","properties":{},"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"}}],"tool_choice":{"type":"auto"},"stream":true}',
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
      id: "msg-M6COx2HdYgD7MMKbI8RZTdxG",
      content: [
        {
          type: "tool-result",
          toolCallId: "toolu_01B7Ana2mRhRqq4mohd3AS7U",
          toolName: "delegateToAgent",
          result:
            "After examining your vault, I can confirm that you have **24 markdown files** in total in your Obsidian vault.\n\nThese include various notes on topics like Zettelkasten, Second Brain methodology, programming concepts, as well as daily notes and other personal notes.",
        },
      ],
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
      request: {
        body: '{"model":"openrouter/optimus-alpha","max_tokens":8000,"temperature":0,"messages":[{"role":"system","content":"You are an AI agent that manages a team of Obsidian experts\\nthat can help the user with all sorts of tasks. Your team of experts are\\nalso AI agents but they have specific skills and knowledge.\\n      \\nYour team includes:\\n\\n- `obsidian vault content manager`\\n  This agent is instructed to: \\"\\"\\"You\'re part of a team that manages, maintains and enhances a\\n    user\'s Obsidian vault. \\n    Your specialty is managing the content files in the\\n    Obsidian vault. These are usually markdown or plain text files, but Obsidian\\n    supports a broad range of content.\\"\\"\\"\\n\\nAssume that user queries are related to Obsidian. For example, phrases like \\n\\"my notes\\", \\"my vault\\", \\"my files\\", \\"my documents\\", \\"my writing\\", etc. are all\\nrelated to Obsidian.\\n\\nYou can delegate tasks to these team members using the\\ndelegateToAgent tool. Do not mention to the user that you\'re\\ndelegatin. The UI will display a tool call message box to the user which makes\\nit redundant to mention it in prose. For example, do not preface with \\"Now I\\nwill delegate...\\"."},{"role":"user","content":"how many notes do i have?"}],"tools":[{"type":"function","function":{"name":"delegateToAgent","description":"Delegate a task to a direct report.","parameters":{"type":"object","properties":{"agentId":{"type":"string","description":"The ID (name) of the agent to delegate to."},"prompt":{"type":"string","description":"The task prompt to send to the delegated agent."}},"required":["agentId","prompt"],"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"}}},{"type":"function","function":{"name":"getCurrentDateTime","description":"Get the current date and time in local and UTC timezones.","parameters":{"type":"object","properties":{},"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"}}}],"tool_choice":"auto","stream":true}',
      },
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
      request: {
        body: '{"model":"openrouter/optimus-alpha","max_tokens":8000,"temperature":0,"messages":[{"role":"system","content":"You are an AI agent that manages a team of Obsidian experts\\nthat can help the user with all sorts of tasks. Your team of experts are\\nalso AI agents but they have specific skills and knowledge.\\n      \\nYour team includes:\\n\\n- `obsidian vault content manager`\\n  This agent is instructed to: \\"\\"\\"You\'re part of a team that manages, maintains and enhances a\\n    user\'s Obsidian vault. \\n    Your specialty is managing the content files in the\\n    Obsidian vault. These are usually markdown or plain text files, but Obsidian\\n    supports a broad range of content.\\"\\"\\"\\n\\nAssume that user queries are related to Obsidian. For example, phrases like \\n\\"my notes\\", \\"my vault\\", \\"my files\\", \\"my documents\\", \\"my writing\\", etc. are all\\nrelated to Obsidian.\\n\\nYou can delegate tasks to these team members using the\\ndelegateToAgent tool. Do not mention to the user that you\'re\\ndelegatin. The UI will display a tool call message box to the user which makes\\nit redundant to mention it in prose. For example, do not preface with \\"Now I\\nwill delegate...\\"."},{"role":"user","content":"how many notes do i have?"}],"tools":[{"type":"function","function":{"name":"delegateToAgent","description":"Delegate a task to a direct report.","parameters":{"type":"object","properties":{"agentId":{"type":"string","description":"The ID (name) of the agent to delegate to."},"prompt":{"type":"string","description":"The task prompt to send to the delegated agent."}},"required":["agentId","prompt"],"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"}}},{"type":"function","function":{"name":"getCurrentDateTime","description":"Get the current date and time in local and UTC timezones.","parameters":{"type":"object","properties":{},"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"}}}],"tool_choice":"auto","stream":true}',
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
      request: {
        body: '{"model":"openrouter/optimus-alpha","max_tokens":8000,"temperature":0,"messages":[{"role":"system","content":"You are an AI agent that manages a team of Obsidian experts\\nthat can help the user with all sorts of tasks. Your team of experts are\\nalso AI agents but they have specific skills and knowledge.\\n      \\nYour team includes:\\n\\n- `obsidian vault content manager`\\n  This agent is instructed to: \\"\\"\\"You\'re part of a team that manages, maintains and enhances a\\n    user\'s Obsidian vault. \\n    Your specialty is managing the content files in the\\n    Obsidian vault. These are usually markdown or plain text files, but Obsidian\\n    supports a broad range of content.\\"\\"\\"\\n\\nAssume that user queries are related to Obsidian. For example, phrases like \\n\\"my notes\\", \\"my vault\\", \\"my files\\", \\"my documents\\", \\"my writing\\", etc. are all\\nrelated to Obsidian.\\n\\nYou can delegate tasks to these team members using the\\ndelegateToAgent tool. Do not mention to the user that you\'re\\ndelegatin. The UI will display a tool call message box to the user which makes\\nit redundant to mention it in prose. For example, do not preface with \\"Now I\\nwill delegate...\\"."},{"role":"user","content":"how many notes do i have?"},{"role":"assistant","content":"","tool_calls":[{"id":"call_50hbYjoFJohb1Kyn0q0qCvmI","type":"function","function":{"name":"delegateToAgent","arguments":"{\\"agentId\\":\\"obsidian vault content manager\\",\\"prompt\\":\\"Count the total number of notes (markdown files) in the user\'s Obsidian vault and report the result.\\"}"}}]},{"role":"tool","tool_call_id":"call_50hbYjoFJohb1Kyn0q0qCvmI","content":"\\"There are 23 markdown notes in your Obsidian vault.\\""}],"tools":[{"type":"function","function":{"name":"delegateToAgent","description":"Delegate a task to a direct report.","parameters":{"type":"object","properties":{"agentId":{"type":"string","description":"The ID (name) of the agent to delegate to."},"prompt":{"type":"string","description":"The task prompt to send to the delegated agent."}},"required":["agentId","prompt"],"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"}}},{"type":"function","function":{"name":"getCurrentDateTime","description":"Get the current date and time in local and UTC timezones.","parameters":{"type":"object","properties":{},"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"}}}],"tool_choice":"auto","stream":true}',
      },
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
      request: {
        body: '{"model":"openrouter/optimus-alpha","max_tokens":8000,"temperature":0,"messages":[{"role":"system","content":"You are an AI agent that manages a team of Obsidian experts\\nthat can help the user with all sorts of tasks. Your team of experts are\\nalso AI agents but they have specific skills and knowledge.\\n      \\nYour team includes:\\n\\n- `obsidian vault content manager`\\n  This agent is instructed to: \\"\\"\\"You\'re part of a team that manages, maintains and enhances a\\n    user\'s Obsidian vault. \\n    Your specialty is managing the content files in the\\n    Obsidian vault. These are usually markdown or plain text files, but Obsidian\\n    supports a broad range of content.\\"\\"\\"\\n\\nAssume that user queries are related to Obsidian. For example, phrases like \\n\\"my notes\\", \\"my vault\\", \\"my files\\", \\"my documents\\", \\"my writing\\", etc. are all\\nrelated to Obsidian.\\n\\nYou can delegate tasks to these team members using the\\ndelegateToAgent tool. Do not mention to the user that you\'re\\ndelegatin. The UI will display a tool call message box to the user which makes\\nit redundant to mention it in prose. For example, do not preface with \\"Now I\\nwill delegate...\\"."},{"role":"user","content":"how many notes do i have?"},{"role":"assistant","content":"","tool_calls":[{"id":"call_50hbYjoFJohb1Kyn0q0qCvmI","type":"function","function":{"name":"delegateToAgent","arguments":"{\\"agentId\\":\\"obsidian vault content manager\\",\\"prompt\\":\\"Count the total number of notes (markdown files) in the user\'s Obsidian vault and report the result.\\"}"}}]},{"role":"tool","tool_call_id":"call_50hbYjoFJohb1Kyn0q0qCvmI","content":"\\"There are 23 markdown notes in your Obsidian vault.\\""}],"tools":[{"type":"function","function":{"name":"delegateToAgent","description":"Delegate a task to a direct report.","parameters":{"type":"object","properties":{"agentId":{"type":"string","description":"The ID (name) of the agent to delegate to."},"prompt":{"type":"string","description":"The task prompt to send to the delegated agent."}},"required":["agentId","prompt"],"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"}}},{"type":"function","function":{"name":"getCurrentDateTime","description":"Get the current date and time in local and UTC timezones.","parameters":{"type":"object","properties":{},"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"}}}],"tool_choice":"auto","stream":true}',
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
          type: "text",
          text: "",
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
      ],
      id: "msg-BL6Kg6fWq6PRajKXS49wc5EJ",
    },
    {
      role: "tool",
      id: "msg-uLmxy35nqWfGMsNV8ndtrDjx",
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

describe("ChunkProcessor", () => {
  it("should process chunks into structured messages", () => {
    const tt = [chunks_sonnetTools1, chunks_optimusTools1];

    for (const { inputChunks, expectedOutput } of tt) {
      const chunkProcessor = new ChunkProcessor();
      for (const chunk of inputChunks) {
        chunkProcessor.appendChunk(chunk);
      }

      const result = chunkProcessor.getMessages();
      expect(result).toEqual(expectedOutput);
    }
  });
});
