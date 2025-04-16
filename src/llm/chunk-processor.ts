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
}

type MessageContent = TextPart | ToolCallPart | ToolResultPart;

export interface Message {
  role: "assistant" | "tool" | "user";
  content: MessageContent[];
  id: string;
}

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
      case "step-finish":
        this.finalizeCurrentMessage();
        if (chunk.type === "error") {
          console.warn(`[ChunkProcessor] error:`, chunk);
        }
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

  getMessages(): Message[] {
    return this.messages;
  }

  getChunks(): any[] {
    return this.chunks;
  }

  /**
   * Used for user messages, which are never streamed and always fully formed
   * but need to go into the message stream.
   */
  appendMessage(message: Message) {
    this.messages.push(message);
  }
}
