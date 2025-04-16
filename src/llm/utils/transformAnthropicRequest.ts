/**
 * Transforms Anthropic API requests to replace the str_replace_editor tool
 * with a simplified version that uses the text_editor_20250124 type.
 */
export function transformAnthropicRequest(options: RequestInit): RequestInit {
  if (!options.body || typeof options.body !== "string") {
    return options;
  }

  try {
    const body = JSON.parse(options.body);

    // Check if tools array exists
    if (!body.tools || !Array.isArray(body.tools)) {
      return options;
    }

    // Find and replace the str_replace_editor tool
    const updatedTools = body.tools.map((tool: { name: string; [key: string]: any }) => {
      if (tool.name === "str_replace_editor") {
        return {
          name: "str_replace_editor",
          type: "text_editor_20250124",
        };
      }
      return tool;
    });

    // Update the body with the modified tools
    const updatedBody = {
      ...body,
      tools: updatedTools,
    };

    // Return updated options with stringified body
    return {
      ...options,
      body: JSON.stringify(updatedBody),
    };
  } catch (error) {
    console.error("Error transforming Anthropic request:", error);
    return options;
  }
}
