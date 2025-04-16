import { expect, test, describe } from "bun:test";
import { transformAnthropicRequest } from "./transformAnthropicRequest";

describe("transformAnthropicRequest", () => {
  test("should replace str_replace_editor tool with simplified version", () => {
    // Mock request options with str_replace_editor tool
    const mockOptions: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 8000,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "can you edit test.css to implement a container class?",
              },
            ],
          },
        ],
        tools: [
          {
            name: "str_replace_editor",
            description: "edit a file",
            input_schema: {
              type: "object",
              properties: {
                command: {
                  type: "string",
                  enum: ["view", "str_replace", "create", "insert", "undo_edit"],
                },
                path: {
                  type: "string",
                },
                view_range: {
                  type: "array",
                  items: {
                    type: "number",
                  },
                },
              },
              required: ["command"],
              additionalProperties: false,
              $schema: "http://json-schema.org/draft-07/schema#",
            },
          },
        ],
        tool_choice: {
          type: "auto",
        },
      }),
    };

    // Transform the request
    const transformedOptions = transformAnthropicRequest(mockOptions);

    // Parse the transformed body
    const transformedBody = JSON.parse(transformedOptions.body as string);

    // Check that the tool was transformed correctly
    expect(transformedBody.tools).toHaveLength(1);
    expect(transformedBody.tools[0]).toEqual({
      name: "str_replace_editor",
      type: "text_editor_20250124",
    });

    // Ensure other properties weren't affected
    expect(transformedBody.model).toBe("claude-3-7-sonnet-20250219");
    expect(transformedBody.max_tokens).toBe(8000);
    expect(transformedBody.messages).toHaveLength(1);
    expect(transformedBody.tool_choice).toEqual({ type: "auto" });
  });

  test("should leave request unchanged if no str_replace_editor tool is present", () => {
    // Mock request options without str_replace_editor tool
    const mockOptions: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 8000,
        tools: [
          {
            name: "weather_tool",
            description: "Get weather information",
          },
        ],
      }),
    };

    const originalBody = mockOptions.body as string;
    const transformedOptions = transformAnthropicRequest(mockOptions);

    // Verify the body wasn't changed
    expect(transformedOptions.body).toEqual(originalBody);
  });

  test("should handle non-JSON body gracefully", () => {
    const mockOptions: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "This is not JSON",
    };

    const transformedOptions = transformAnthropicRequest(mockOptions);

    // Should return original options unchanged
    expect(transformedOptions).toEqual(mockOptions);
  });

  test("should handle missing body gracefully", () => {
    const mockOptions: RequestInit = {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    };

    const transformedOptions = transformAnthropicRequest(mockOptions);

    // Should return original options unchanged
    expect(transformedOptions).toEqual(mockOptions);
  });
});
