import { ItemView, WorkspaceLeaf, type App, Component } from "obsidian";
import type { MetaPlugin as IMetaPlugin } from "./plugin";
import * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { MetaSidebar } from "./components/MetaSidebar";
import { AppProvider } from "./hooks/useApp";
import "./components/metaSidebar.css";

// Define a unique view type for the sidebar
export const META_SIDEBAR_VIEW_TYPE = "meta-sidebar-view";

export class MetaSidebarView extends ItemView {
  plugin: IMetaPlugin;
  component: Component;
  private root: Root | null = null;

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
    const { contentEl, app } = this;

    // Clear content
    contentEl.empty();

    // Add container for React
    const reactRoot = contentEl.createDiv({ cls: "meta-sidebar-root" });

    // Create React root
    this.root = createRoot(reactRoot);

    // Render the React component
    this.root.render(
      React.createElement(
        AppProvider,
        { value: app },
        React.createElement(MetaSidebar, {
          plugin: this.plugin,
          component: this.component,
        })
      )
    );
  }

  // Clean up when closing
  async onClose(): Promise<void> {
    // Clean up React
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }

    // Clean up obsidian component
    this.component.unload();

    // Clear DOM
    const { contentEl } = this;
    contentEl.empty();
  }
}

// Helper function to activate the sidebar view
export async function activateSidebarView(plugin: IMetaPlugin): Promise<void> {
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
