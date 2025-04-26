/**
 * Example demonstrating how to use the esbuild bundler to create an Obsidian plugin
 */

import type { MetaPlugin } from "../plugin";

/**
 * Creates a sample plugin to test the bundler functionality
 */
export async function createSamplePlugin(
  plugin: MetaPlugin,
  normalizePath: (path: string) => string
) {
  try {
    // First, create the sample plugin files on disk
    const path = require("path");
    const adapter = plugin.app.vault.adapter;
    const pluginsFolder = plugin.app.plugins?.getPluginFolder();
    const samplePluginDir = normalizePath(path.join(pluginsFolder, "sample-meta-plugin"));

    // Ensure the directory exists
    if (!(await adapter.exists(samplePluginDir))) {
      await adapter.mkdir(samplePluginDir);
    }

    // Create the main.ts file
    const mainTsPath = normalizePath(path.join(samplePluginDir, "main.ts"));
    const mainTsContent = `
import { Plugin, MarkdownView } from 'obsidian';

export default class SamplePlugin extends Plugin {
  async onload() {
    console.log('Sample plugin loaded!');
    
    this.addCommand({
      id: 'sample-command',
      name: 'Sample Command',
      callback: () => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view) {
          const editor = view.editor;
          const cursor = editor.getCursor();
          editor.replaceRange('Hello from Sample Plugin!', cursor);
        }
      }
    });
  }

  onunload() {
    console.log('Sample plugin unloaded!');
  }
}
`;
    await adapter.write(mainTsPath, mainTsContent);

    // Create the manifest.json file
    const manifestPath = normalizePath(path.join(samplePluginDir, "manifest.json"));
    const manifestContent = `{
  "id": "sample-meta-plugin",
  "name": "Sample Meta Plugin",
  "version": "1.0.0",
  "minAppVersion": "0.15.0",
  "description": "A sample plugin created by Vibesidian",
  "author": "Vibesidian",
  "isDesktopOnly": false
}
`;
    await adapter.write(manifestPath, manifestContent);

    // Now bundle the plugin
    return await plugin.bundlePlugin(mainTsPath);
  } catch (error) {
    console.error("Error creating sample plugin:", error);
    return { success: false, error };
  }
}

/**
 * Creates a more advanced plugin to test the bundler functionality with multiple files
 */
export async function createAdvancedPlugin(
  plugin: MetaPlugin,
  normalizePath: (path: string) => string
) {
  try {
    // First, create the advanced plugin files on disk
    const path = require("path");
    const adapter = plugin.app.vault.adapter;
    const pluginsFolder = plugin.app.plugins?.getPluginFolder();
    const advancedPluginDir = normalizePath(path.join(pluginsFolder, "advanced-meta-plugin"));

    // Ensure the directory exists
    if (!(await adapter.exists(advancedPluginDir))) {
      await adapter.mkdir(advancedPluginDir);
    }

    // Create src directory
    const srcDir = normalizePath(path.join(advancedPluginDir, "src"));
    if (!(await adapter.exists(srcDir))) {
      await adapter.mkdir(srcDir);
    }

    // Create the main.ts file
    const mainTsPath = normalizePath(path.join(advancedPluginDir, "main.ts"));
    const mainTsContent = `
import { Plugin } from 'obsidian';
import { createAdvancedCommand } from './src/commands';
import { VERSION } from './src/version';

export default class AdvancedPlugin extends Plugin {
  async onload() {
    console.log(\`Advanced plugin v\${VERSION} loaded!\`);
    createAdvancedCommand(this);
  }

  onunload() {
    console.log('Advanced plugin unloaded!');
  }
}
`;
    await adapter.write(mainTsPath, mainTsContent);

    // Create the commands.ts file
    const commandsPath = normalizePath(path.join(srcDir, "commands.ts"));
    const commandsContent = `
import { MarkdownView, type Plugin } from 'obsidian';
import { formatMessage } from './utils';

export function createAdvancedCommand(plugin: Plugin) {
  plugin.addCommand({
    id: 'advanced-command',
    name: 'Advanced Command',
    callback: () => {
      const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
      if (view) {
        const editor = view.editor;
        const cursor = editor.getCursor();
        editor.replaceRange(formatMessage('Hello from Advanced Plugin!'), cursor);
      }
    }
  });
}
`;
    await adapter.write(commandsPath, commandsContent);

    // Create the utils.ts file
    const utilsPath = normalizePath(path.join(srcDir, "utils.ts"));
    const utilsContent = `
export function formatMessage(message: string): string {
  return \`[${new Date().toISOString()}] \${message}\`;
}
`;
    await adapter.write(utilsPath, utilsContent);

    // Create the version.ts file
    const versionPath = normalizePath(path.join(srcDir, "version.ts"));
    const versionContent = `
export const VERSION = '1.0.0';
`;
    await adapter.write(versionPath, versionContent);

    // Create the manifest.json file
    const manifestPath = normalizePath(path.join(advancedPluginDir, "manifest.json"));
    const manifestContent = `{
  "id": "advanced-meta-plugin",
  "name": "Advanced Meta Plugin",
  "version": "1.0.0",
  "minAppVersion": "0.15.0",
  "description": "An advanced plugin created by Vibesidian with multiple source files",
  "author": "Vibesidian",
  "isDesktopOnly": false
}
`;
    await adapter.write(manifestPath, manifestContent);

    // Now bundle the plugin
    return await plugin.bundlePlugin(mainTsPath);
  } catch (error) {
    console.error("Error creating advanced plugin:", error);
    return { success: false, error };
  }
}
