export type TextDeltaChunk = {
  type: "text-delta";
  textDelta: string;
};

export type ToolCallChunk = {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  args: Record<string, any>;
};

export type ToolResultChunk = {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  result: any;
};

export type ResponseChunk = TextDeltaChunk | ToolCallChunk | ToolResultChunk;
