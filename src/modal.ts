import { type App, Component, MarkdownRenderer, Modal } from "obsidian";

import type { MetaPlugin as IMetaPlugin } from "./plugin";
import { generateText, streamText } from "ai";

export class SampleModal extends Modal {
  plugin: IMetaPlugin;

  constructor(app: App, plugin: IMetaPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.setText("This is a sample modal!");

    // Create form
    const form = contentEl.createEl("form");
    form.createEl("h2", { text: "Enter input" });

    // Create input field
    const inputContainer = form.createDiv();
    const input = inputContainer.createEl("input", {
      attr: {
        type: "text",
        placeholder: "Enter text here",
      },
    });

    // Submit button
    form.createEl("button", {
      text: "Submit",
      attr: {
        type: "submit",
        style: "margin-top: 8px;",
      },
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!input.value) {
        return;
      }

      try {
        const contentStr = input.value;
        input.value = "";
        const resultContainer = contentEl.createDiv();
        const queryEl = resultContainer.createEl("p", { text: contentStr });
        const component = new Component();
        component.load();

        const stream = this.plugin.agent.streamText(
          {
            prompt: contentStr,
            maxSteps: 10,
            maxRetries: 2,
            maxTokens: 8000,
          },

          // @todo I need to update the types to make this mandatory IF PROVIDED at the top level agent instantiation
          { app: this.app }
        );

        let resultEl = resultContainer.createDiv();
        let result = "";

        for await (const chunk of stream.fullStream) {
          switch (chunk.type) {
            case "text-delta": {
              result += chunk.textDelta;
              resultEl.empty();
              MarkdownRenderer.render(this.app, result, resultEl, "", component);
              break;
            }
            case "tool-call": {
              let toolEl = resultContainer.querySelector("." + chunk.toolCallId);
              if (!toolEl) {
                toolEl = resultContainer.createEl("details", { cls: chunk.toolCallId });
                const summary = toolEl.createEl("summary");
                summary.textContent = "-> (" + chunk.toolName + ")";
                toolEl.createEl("code").textContent = JSON.stringify(chunk.args, null, 2);
              } else {
                // If tool element already exists, update it
                const summary = toolEl.querySelector("summary");
                if (summary) {
                  summary.textContent = `🤔 ${chunk.toolName}`;
                }
                const code = toolEl.querySelector("code");
                if (code) {
                  code.textContent = JSON.stringify(chunk.args, null, 2);
                }
              }

              // Reset the result el so that new text will appear below the current tool
              resultEl = resultContainer.createDiv();
              break;
            }
            case "tool-result": {
              const toolEl = resultContainer.querySelector("." + chunk.toolCallId);
              if (!toolEl) {
                console.warn("[Tool Result]: No matching tool call found for id", chunk.toolCallId);
                break;
              }

              // Create or update response element within details
              let responseEl = toolEl.querySelector(".tool-response");
              if (!responseEl) {
                responseEl = toolEl.createEl("code", {
                  cls: "tool-response",
                  attr: { style: "white-space: pre-wrap; font-size: x-small;" },
                });
              }
              responseEl.textContent = JSON.stringify(chunk.result, null, 2);

              // Update summary to show it has a response
              const summary = toolEl.querySelector("summary");
              if (summary) {
                summary.textContent = `✅ ${chunk.toolName}`;
              }

              // Reset the result el so that new text will appear below the current tool
              resultEl = resultContainer.createDiv();
              break;
            }
            default: {
              console.log("[Unknown Chunk Type]:", chunk);
            }
          }
        }

        component.unload();

        console.log("[Final Steps]:", await stream.steps);
      } catch (error) {
        console.error("Error:", error);
        const errorContainer = contentEl.createDiv({ cls: "error" });
        errorContainer.createEl("h3", { text: "Error:" });
        errorContainer.createEl("p", { text: String(error) });
      }
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
