import { describe, test, expect, mock, spyOn } from "bun:test";
import { Agent } from "./agents";
import { tool } from "ai";
import { z } from "zod";

// Mocked generateText and streamText are not needed
// since we're directly testing the wrapTools method

describe("Agent", () => {
  // Setup a simple test tool that tracks context
  const createTestTool = () => {
    const mockFn = mock(({ message }, options = {}) => {
      return {
        message,
        contextReceived: options.context,
      };
    });

    return tool({
      description: "Test tool that echoes input and context",
      parameters: z.object({
        message: z.string().describe("Message to echo"),
      }),
      // @ts-expect-error
      execute: mockFn,
    });
  };

  // Create a context schema for testing
  const testContextSchema = z.object({
    userId: z.string(),
    permissions: z.array(z.string()),
  });

  test("wrapTools should correctly inject context", () => {
    // Create a test tool and access its execute function
    const testTool = createTestTool();

    // Create agent instance with minimal configuration
    const agent = new Agent({
      name: "TestAgent",
      instructions: "Test instructions",
      model: { name: "mock-model" } as any,
      contextSchema: testContextSchema,
      tools: { test: testTool },
    });

    // Access the wrapTools method directly
    const wrapTools = (agent as any).wrapTools.bind(agent);

    // Create test context
    const testContext = { userId: "test123", permissions: ["read"] };

    // Wrap the tools with context
    const wrappedTools = wrapTools({ test: testTool }, testContext);

    // Call the wrapped tool manually
    const result = wrappedTools.test.execute({ message: "hello" });

    // Verify context was passed through to the tool
    expect(result.contextReceived).toEqual(testContext);
  });

  test("wrapTools should work without context", () => {
    // Create a test tool
    const testTool = createTestTool();

    // Create agent instance
    const agent = new Agent({
      name: "TestAgent",
      instructions: "Test instructions",
      model: { name: "mock-model" } as any,
      tools: { test: testTool },
    });

    // Access wrapTools method directly
    const wrapTools = (agent as any).wrapTools.bind(agent);

    // Wrap tools without providing context
    const wrappedTools = wrapTools({ test: testTool });

    // Call the wrapped tool
    const result = wrappedTools.test.execute({ message: "hello" });

    // Context should be undefined when not provided
    expect(result.contextReceived).toBeUndefined();
  });

  test("wrapTools should add context to tool options", () => {
    // Create a test tool with a mockable execute function
    const testTool = createTestTool();
    const executeFunction = testTool.execute as ReturnType<typeof mock>;

    // Create the agent
    const agent = new Agent({
      name: "TestAgent",
      instructions: "Test instructions",
      model: { name: "mock-model" } as any,
      tools: { test: testTool },
    });

    // Access wrapTools directly
    const wrapTools = (agent as any).wrapTools.bind(agent);

    // Test context
    const testContext = { userId: "test", permissions: ["read"] };

    // Wrap tools with context
    const wrappedTools = wrapTools({ test: testTool }, testContext);

    // Call the wrapped tool
    wrappedTools.test.execute({ message: "hello" });

    // Verify original execute was called with context in options
    expect(executeFunction).toHaveBeenCalledTimes(1);
    const optionsArg = executeFunction.mock.calls[0][1] || {};
    expect(optionsArg.context).toBe(testContext);
  });
});
