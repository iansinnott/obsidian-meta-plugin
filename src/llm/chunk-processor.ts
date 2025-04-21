import type { streamText } from "ai";

interface TextPart {
  type: "text";
  text: string;
}

interface ToolCallPart {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  args: any;
}

interface ToolResultPart {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  result: any;
  isError?: boolean;
}

type MessageContent = TextPart | ToolCallPart | ToolResultPart;

export interface Message {
  role: "assistant" | "tool" | "user";
  content: MessageContent[];
  id: string;
}

type thang = ReturnType<typeof streamText>;

/**
 * Incrementally process message stream chunks as they come in. These chunks
 * come from the LLM provider streaming API.
 *
 * As chunks are appended messages will be built up. UI displaying the messages
 * can render them simply, as individual message contents will also be updated
 * as new chunks come in.
 */
export class ChunkProcessor {
  private chunks: any[] = [];
  private messages: Message[] = [];
  private currentMessage: Message | null = null;
  private currentTextDelta = "";
  private currentMessageIndex: number = -1;

  reset() {
    this.chunks = [];
    this.messages = [];
    this.currentMessage = null;
    this.currentTextDelta = "";
    this.currentMessageIndex = -1;
  }

  appendChunk(chunk: any) {
    this.chunks.push(chunk);
    this.processChunk(chunk);
  }

  private processChunk(chunk: any) {
    switch (chunk.type) {
      case "step-start":
        this.startNewAssistantMessage(chunk.messageId);
        break;
      case "text-delta":
        this.appendTextDelta(chunk.textDelta);
        break;
      case "tool-call":
        this.addToolCall(chunk);
        break;
      case "tool-result":
        this.addToolResult(chunk);
        break;
      case "error":
        this.finalizeCurrentMessage();
        // Create a tool message for tool execution errors
        const err = chunk.error;
        if (err && err.toolCallId && err.toolName) {
          const toolMessage: Message = {
            role: "tool",
            id: "msg-" + err.toolCallId,
            content: [
              {
                type: "tool-result",
                toolCallId: err.toolCallId,
                toolName: err.toolName,
                result: err,
                isError: true,
              },
            ],
          };
          this.messages.push(toolMessage);
        } else {
          console.warn(`[ChunkProcessor] error:`, chunk);
          console.warn(
            `[ChunkProcessor]      : ai module doesn't report provider-specific errors. check event stream logs directly.`
          );
        }
        break;
      case "step-finish":
        this.finalizeCurrentMessage();
        break;
      case "finish":
        // Nothing to do on final finish
        break;
      default:
        console.log(`[ChunkProcessor] unknown chunk type:`, chunk);
        break;
    }
  }

  private startNewAssistantMessage(messageId: string) {
    // Finalize any existing message first
    this.finalizeCurrentMessage();

    this.currentMessage = {
      role: "assistant",
      content: [],
      id: messageId,
    };
    this.currentTextDelta = "";

    // Add the message to the array immediately
    this.messages.push(this.currentMessage);
    this.currentMessageIndex = this.messages.length - 1;
  }

  private appendTextDelta(textDelta: string) {
    if (!this.currentMessage || this.currentMessageIndex === -1) {
      return;
    }

    this.currentTextDelta += textDelta;

    // Update or add the text part in the current message
    const textPartIndex = this.currentMessage.content.findIndex((part) => part.type === "text");

    if (textPartIndex >= 0) {
      (this.currentMessage.content[textPartIndex] as TextPart).text = this.currentTextDelta;
    } else {
      this.currentMessage.content.unshift({
        type: "text",
        text: this.currentTextDelta,
      });
    }

    // Ensure changes are reflected in the messages array
    this.messages[this.currentMessageIndex] = this.currentMessage;
  }

  private addToolCall(chunk: any) {
    if (!this.currentMessage || this.currentMessageIndex === -1) {
      return;
    }

    const toolCallPart: ToolCallPart = {
      type: "tool-call",
      toolCallId: chunk.toolCallId,
      toolName: chunk.toolName,
      args: chunk.args,
    };

    this.currentMessage.content.push(toolCallPart);

    // Ensure changes are reflected in the messages array
    this.messages[this.currentMessageIndex] = this.currentMessage;
  }

  private addToolResult(chunk: any) {
    // Finalize any existing message first
    this.finalizeCurrentMessage();

    // Create a tool message
    const toolMessage: Message = {
      role: "tool",
      id: "msg-" + chunk.toolCallId,
      content: [
        {
          type: "tool-result",
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          result: chunk.result,
        },
      ],
    };

    this.messages.push(toolMessage);
  }

  private finalizeCurrentMessage() {
    if (this.currentMessage) {
      // The message is already in the messages array, just reset the current state
      this.currentMessage = null;
      this.currentTextDelta = "";
      this.currentMessageIndex = -1;
    }
  }

  /**
   * Get a copy of the messages array.
   *
   * This is important because the messages array is used internally by the
   * ChunkProcessor and will be mutated as chunks are processed.
   *
   */
  getMessages(): Message[] {
    return this.messages.slice();
  }

  /**
   * Get a copy of the chunks array.
   *
   * This is important because the chunks array is used internally by the
   * ChunkProcessor and will be mutated as chunks are processed.
   *
   */
  getChunks(): any[] {
    return this.chunks.slice();
  }

  /**
   * Print the current messages state to the console using console.table
   * for debugging purposes.
   */
  debug() {
    const tableData = [];
    for (const message of this.messages) {
      for (const part of message.content) {
        let details = "";
        switch (part.type) {
          case "text":
            details = part.text;
            break;
          case "tool-call":
            details = `${part.toolName}(id=${part.toolCallId}, args=${JSON.stringify(part.args)})`;
            break;
          case "tool-result":
            details = `${part.toolName}(id=${part.toolCallId}, result=${JSON.stringify(
              part.result
            )})${part.isError ? " [ERROR]" : ""}`;
            break;
          default:
            // @ts-expect-error - Handle potential unknown part types
            details = `Unknown part type: ${part.type}`;
        }

        tableData.push({
          role: message.role,
          type: part.type,
          details: details,
        });
      }
    }
    console.table(tableData);
  }

  /**
   * Used for user messages, which are never streamed and always fully formed
   * but need to go into the message stream.
   */
  appendMessage(message: Message) {
    this.messages.push(message);
  }

  /**
   * Restore processor state from persisted data
   */
  public loadState(state: { messages: Message[]; chunks: any[] }) {
    this.reset();
    // Directly set internal arrays to persisted values
    this.messages = state.messages;
    this.chunks = state.chunks;
  }
}
