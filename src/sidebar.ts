import { ItemView, WorkspaceLeaf, type App, Component, MarkdownRenderer } from "obsidian";
import type { MetaPlugin as IMetaPlugin } from "./plugin";

// Define a unique view type for the sidebar
export const META_SIDEBAR_VIEW_TYPE = "meta-sidebar-view";

export class MetaSidebarView extends ItemView {
  plugin: IMetaPlugin;
  component: Component;

  constructor(leaf: WorkspaceLeaf, plugin: IMetaPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.component = new Component();
    this.component.load();
  }

  // Get the view type - must be unique
  getViewType(): string {
    return META_SIDEBAR_VIEW_TYPE;
  }

  // Display text shown in the tab
  getDisplayText(): string {
    return "Meta Sidebar";
  }

  // Icon shown in the sidebar
  getIcon(): string {
    return "brain";
  }

  // Set up the sidebar content when opening
  async onOpen(): Promise<void> {
    const { contentEl } = this;
    
    // Clear content
    contentEl.empty();
    
    // Create header
    const headerContainer = contentEl.createDiv({ cls: "meta-sidebar-header" });
    headerContainer.createEl("h2", { text: "Meta Assistant" });
    
    // Create input area
    const inputContainer = contentEl.createDiv({ cls: "meta-sidebar-input" });
    const promptInput = inputContainer.createEl("textarea", {
      attr: {
        placeholder: "Ask a question about your notes...",
        rows: "3"
      },
      cls: "meta-sidebar-prompt"
    });
    
    // Create submit button
    const buttonContainer = inputContainer.createDiv({ cls: "meta-sidebar-button-container" });
    const submitButton = buttonContainer.createEl("button", {
      text: "Ask",
      cls: "mod-cta"
    });
    
    // Create response area
    const responseContainer = contentEl.createDiv({ cls: "meta-sidebar-response" });
    
    // Add click handler to submit button
    submitButton.addEventListener("click", async () => {
      if (!promptInput.value.trim()) return;
      
      // Show loading indicator
      const loadingEl = responseContainer.createEl("div", { cls: "meta-sidebar-loading" });
      loadingEl.innerHTML = "Processing...";
      
      try {
        // Get the user's prompt
        const prompt = promptInput.value;
        promptInput.value = "";
        
        // Clear previous responses
        responseContainer.empty();
        
        // Use the agent to process the prompt
        if (this.plugin.agent) {
          const stream = this.plugin.agent.streamText(
            {
              prompt: prompt,
              maxSteps: 10,
              maxRetries: 2,
              maxTokens: 8000,
            },
            { app: this.plugin.app }
          );
          
          let resultEl = responseContainer.createDiv({ cls: "meta-sidebar-result" });
          let result = "";
          
          for await (const chunk of stream.fullStream) {
            switch (chunk.type) {
              case "text-delta": {
                result += chunk.textDelta;
                resultEl.empty();
                MarkdownRenderer.render(this.plugin.app, result, resultEl, "", this.component);
                break;
              }
              case "tool-call": {
                let toolEl = responseContainer.querySelector("." + chunk.toolCallId);
                if (!toolEl) {
                  toolEl = responseContainer.createEl("details", { cls: chunk.toolCallId });
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
                resultEl = responseContainer.createDiv({ cls: "meta-sidebar-result" });
                break;
              }
              case "tool-result": {
                const toolEl = responseContainer.querySelector("." + chunk.toolCallId);
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
                resultEl = responseContainer.createDiv({ cls: "meta-sidebar-result" });
                break;
              }
              default: {
                console.log("[Unknown Chunk Type]:", chunk);
              }
            }
          }
        } else {
          responseContainer.createEl("div", { 
            text: "Agent not initialized. Please check your settings.", 
            cls: "meta-sidebar-error" 
          });
        }
      } catch (error) {
        console.error("Error:", error);
        responseContainer.empty();
        responseContainer.createEl("div", { 
          text: `Error: ${error.message || String(error)}`, 
          cls: "meta-sidebar-error" 
        });
      }
    });

    // Add some basic styles
    this.addStyles();
  }
  
  // Clean up when closing
  async onClose() {
    this.component.unload();
    const { contentEl } = this;
    contentEl.empty();
  }
  
  // Add styles for the sidebar
  private addStyles() {
    const { containerEl } = this;
    
    containerEl.addClass("meta-sidebar-container");
    
    const styleEl = document.createElement("style");
    styleEl.textContent = `
      .meta-sidebar-container {
        padding: 10px;
      }
      .meta-sidebar-header {
        margin-bottom: 15px;
        border-bottom: 1px solid var(--background-modifier-border);
        padding-bottom: 10px;
      }
      .meta-sidebar-prompt {
        width: 100%;
        resize: vertical;
        margin-bottom: 8px;
      }
      .meta-sidebar-button-container {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 15px;
      }
      .meta-sidebar-response {
        border-top: 1px solid var(--background-modifier-border);
        padding-top: 15px;
        max-height: 500px;
        overflow-y: auto;
      }
      .meta-sidebar-loading {
        color: var(--text-muted);
        font-style: italic;
      }
      .meta-sidebar-error {
        color: var(--text-error);
        padding: 10px;
        border: 1px solid var(--background-modifier-error);
        border-radius: 4px;
        background-color: var(--background-modifier-error-rgb), 0.1);
      }
    `;
    
    containerEl.appendChild(styleEl);
  }
}

// Helper function to activate the sidebar view
export async function activateView(plugin: IMetaPlugin): Promise<void> {
  const { workspace } = plugin.app;
  
  // Detach existing leaves with our view type
  workspace.detachLeavesOfType(META_SIDEBAR_VIEW_TYPE);
  
  // Create a leaf in the right sidebar
  const leaf = workspace.getRightLeaf(false);
  if (leaf) {
    // Open our view in the new leaf
    await leaf.setViewState({
      type: META_SIDEBAR_VIEW_TYPE,
      active: true,
    });
    
    // Reveal the leaf in case the sidebar is collapsed
    workspace.revealLeaf(leaf);
  }
}