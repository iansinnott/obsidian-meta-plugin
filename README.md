<p align="center">
  <img src="assets/vibesidian-transparent-512px.png" alt="Vibesidian Logo" width="256"/>
</p>

<p align="center">
  A plugin that can write other plugins (and themes!)
</p>

Now you can vibe code your own Obsidian plugins without coding at all! Just describe what you want and you _might_ get it.

Vibesidian is a plugin for [Obsidian](https://obsidian.md) that can modify Obsidian itself. It can create or modify plugins, themes, and settings, acting as your personal Obsidian developer.

## Demo

https://github.com/user-attachments/assets/da8ca679-4d37-4e27-875c-4210888341a9

**NOTE:** Formerly Obsidian Meta Plugin, which shows up in some of the videos.

## Features

- **LLM-Powered Assistance**: Integrates with various language models (Claude, GPT, Llama) to help you customize Obsidian
- **Plugin Development**: Create and modify plugins directly within Obsidian
- **CSS Customization**: Edit themes and CSS snippets with AI assistance
- **Content Managemetn**: Ask the AI to find new links, summarize, draft, etc.
- **Interactive UI**: The classic chat interface returns...

## Limitations

This plugin uses large language models (LLMs) to modify Obsidian on your behalf. LLMs can make mistakes.

## Installation

### From Obsidian Community Plugins

It's not yet in community plugins. Until it's approved use the manual installation.

### Manual Installation

1. Download the latest release from the [Releases page](https://github.com/iansinnott/vibesidian/releases)
2. Extract the zip archive into your vault's plugins folder: `<vault>/.obsidian/plugins/`
3. Enable the plugin in Obsidian's Community Plugins settings

## Usage

1. Click the Vibesidian icon in the ribbon to open the sidebar
2. Enter your request (e.g., "Create a plugin that adds a word count to the status bar")
3. Choose your preferred language model
4. The plugin will process your request and provide interactive results

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Bun](https://bun.sh) (v1 or higher)

### Setup

```bash
# Clone the repository
git clone https://github.com/iansinnott/vibesidian.git

# Navigate to the plugin directory
cd vibesidian

# Install dependencies
bun install

# Start development server with hot reload
bun run dev
```

### Testing

```bash
# Run all tests
bun test

# Run a specific test file
bun test src/llm/agent.test.ts

# Run tests in watch mode
bun test --watch
```

### Building

```bash
# Build the production version
bun run build

# Bump version
bun run version
```

## Points of interst

### Claude Text Editor

Did you know Claude has an experimental (as of 2025-04-26) text editor ability? It's documented here:

- https://docs.anthropic.com/en/docs/build-with-claude/tool-use/text-editor-tool

When using Sonnet 3.7 as your LLM Vibesidian will make use of this API for reading and editing files. This is important for long files that would otherwise blow up the context window.

### Agents of Agents

Vibesidian is a multi-agent system. Generally speaking a "manager" agent delegates task to subordinate agents which get tasks done.

This is not a new idea, but it's another proof point showing what agents can accomplish working together.

General structure:

- Manager agent
  - Theme agent (manages themes and snippets)
    - Example: "Change the color of the ribbon buttons to hot pink"
    - Example: "Write me a new theme based on The Warriors colors"
  - Plugin agent (manages plugins)
    - Exmaple: "Write me a plugin to automatically tag my posts based on content"
    - Example: "Write a plugin to highlight specific terms if they appear in my notes"
  - Content agenet (manages note content)
    - Example: "Summarize this note"
    - Example: "What did i write about last week?"
    - Example: "Write me a poem about PKM tools"
  - Workspace agent (manages active tabs)
    - Example: "Open my daily note from last monday"
  - File editor agent (handles file editing tasks)
    - File editor is used indirectly. For example, if you ask the plugin to create snippets or themes it will use the file editor.

## Security

(... awkward silence)

Obsidian plugins are, in general, a security nightmare. This is not specific to Vibsidian, but general to all plugins. From the [official documentation](https://help.obsidian.md/plugin-security#Plugin+capabilities), any Obsidian plugin can:

- Access files on your computer.
- Connect to internet.
- Install additional programs.

So, you should be skeptical of **_any plugin_** you install.

With that said, let's talk about the excitement Vibesidian brings to the picture. Vibesidian gives an AI access to all these superpowers. This is how the AI is able to modify Obsidian on your behalf, however, it means that AI responses can have **real-world impact** on your computer.

### Hallucinations

Large Language Models (LLMs) like the one powering OMP can sometimes "hallucinate" – generating responses that are incorrect, nonsensical, or entirely fabricated, despite sounding confident.

In the context of OMP, a hallucination could manifest as:

- Misinterpreting your request and performing the wrong action (e.g., editing the wrong file).
- Generating incorrect or non-functional code when asked to create or modify a plugin.
  - NOTE: When code simply throws an error it's likely not an issue. Obsidian is fairly robust against plugin errors. Incorrect code that actually runs is what to look out for.
- Attempting to use tools with incorrect arguments, potentially leading to errors or unwanted side effects.
- Making up file paths or plugin names.

Because OMP agents can directly modify your filesystem and Obsidian configuration, the consequences of a hallucination could range from minor annoyance to data loss or a broken Obsidian setup.

**Mitigation:** Use the best model you can! During development testing I mostly used Sonnet 3.7, which I found to be very capable.

### Prompt Injection

Prompt injection is an attack where malicious text is crafted to manipulate the LLM's behavior, potentially overriding its original instructions or causing it to perform unintended actions.

OMP agents have access to your notes, which means _your notes_ should be considered part of the prompt. If you put "Ignore all previous instructions..." in one of your notes, its entirely possible that text gets into a prompt.

If you use Obsidian web clipper consider that clipped content, which you didn't write, can be used to prompt the LLM.

There's a risk that specially crafted text within a note, or a malicious prompt you are tricked into providing, could exploit this. For example, an attacker could try to:

- Embed instructions in a note file telling the AI to delete other files or modify sensitive settings when that note is processed.
- Craft a prompt that tricks the AI into revealing sensitive information from other notes or system configuration.
- Instruct the AI to generate a seemingly harmless plugin that actually contains malicious code.
- Cause the AI agent to misuse its tools to exfiltrate data or execute harmful commands (especially if tools with network or shell access were ever added).

**Mitigation:** Use a smart model. Other than that, if you have suggestions please open an issue or PR. Contributions welcome.

## FAQ

- **Will my Obsidian vault content be sent to a third party?**

  It depends on what model you use. You can run Vibesidain with Ollama, or any provider that adheres to the Openai API. This means your interactions can remain entirely local.

  However, if you utilize a hosted provider like OpenAI or Anthropic your messages and the results of tool calls will be sent to the provider.

- **Can I use local LLMs like Ollama with Vibesidian?**

  Yes! You can use any AI provider that exposes an OpenAI-compatible endpoint, and Ollama does exactly that. There are some caveats though.

  1. Any model you use must support **tool use**. You can see a list of compatible Ollama models here: https://ollama.com/search?c=tools
  2. The model must be intelligent, otherwise it will simply fail at any task you ask of it. When developing this plugin I used `gpt-4.1` and `claude-sonnet-3.7`. If you use models less intelligent than those two you will likely get poor results.

- **Can I use Vibesidian offline?**

  Only if you are using a local LLM.

## Release Process

To create a new release, simply run the automated release script:

```bash
bun run release
```

This script will:

1.  Prompt you for the new version number (suggesting the next patch version).
2.  Update the version in `package.json`.
3.  Run the necessary build steps (`bun run build`).
4.  Update `manifest.json` and `versions.json` based on the new version (`bun run version`).
5.  Create a Git tag for the new version (`bun run tag`).
6.  Generate the distribution files (`bun run dist`).

## Alternate taglines

- Cursor / Windsurf for Obsididan
- The plugin that builds other plugins
- The last plugin you'll ever need
- You're own personal Obsidian dev team

## License

This project is licensed under the [MIT License](LICENSE).
