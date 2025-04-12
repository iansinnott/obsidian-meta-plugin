import { App, Modal } from "obsidian";
import { IMetaPlugin } from "./types";

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

    // Create submit button
    const submitBtn = form.createEl("button", {
      text: "Submit",
      attr: {
        type: "submit",
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
        const loadingEl = resultContainer.createEl("p", { text: "Loading..." });

        const completion = await this.plugin.llm.chat.completions.create({
          model: this.plugin.settings.model,
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant.",
            },
            {
              role: "user",
              content: contentStr,
            },
          ],
        });

        const result = completion.choices[0].message.content || "";

        // Display the result
        loadingEl.remove();
        resultContainer.createEl("h3", { text: "Response:" });
        resultContainer.createEl("p", { text: result });
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
