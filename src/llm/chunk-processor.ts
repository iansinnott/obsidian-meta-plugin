import { generateId } from "ai";

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

  reset() {
    this.chunks = [];
    this.messages = [];
    this.currentMessage = null;
    this.currentTextDelta = "";
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
      case "step-finish":
        this.finalizeCurrentMessage();
        break;
      case "finish":
        // Nothing to do on final finish
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
  }

  private appendTextDelta(textDelta: string) {
    if (!this.currentMessage) {
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
  }

  private addToolCall(chunk: any) {
    if (!this.currentMessage) {
      return;
    }

    const toolCallPart: ToolCallPart = {
      type: "tool-call",
      toolCallId: chunk.toolCallId,
      toolName: chunk.toolName,
      args: chunk.args,
    };

    this.currentMessage.content.push(toolCallPart);
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
    if (this.currentMessage && this.currentMessage.content.length > 0) {
      this.messages.push(this.currentMessage);
      this.currentMessage = null;
      this.currentTextDelta = "";
    }
  }

  getMessages(): Message[] {
    return this.messages;
  }

  /**
   * Used for user messages, which are never streamed and always fully formed
   * but need to go into the message stream.
   */
  appendMessage(message: Message) {
    this.messages.push(message);
  }
}
