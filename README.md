<p align="center">
  <img src="assets/omp-transparent-512px.png" alt="Obsidian Meta Plugin Logo" width="256"/>
</p>

<p align="center">
  A plugin that can write other plugins.
</p>

<h1 align="center">
  Obsidian Meta Plugin
</h1>

A plugin for [Obsidian](https://obsidian.md) that can modify Obsidian itself. It can create or modify plugins, themes, and settings, acting as your personal Obsidian developer.

Now you can vibe code your own Obsidian plugins without coding at all! Just describe what you want and OMP _might_ make it happen.

## Demo

https://github.com/iansinnott/obsidian-meta-plugin/releases/download/v1.3.1/OMP.-.auto.tagger.plugin.mp4

## Features

- **LLM-Powered Assistance**: Integrates with various language models (Claude, GPT, Llama) to help you customize Obsidian
- **Plugin Development**: Create and modify plugins directly within Obsidian
- **CSS Customization**: Edit themes and CSS snippets with AI assistance
- **Settings Management**: Modify Obsidian settings through natural language requests
- **Interactive UI**: Clean React-based sidebar interface with real-time streaming responses

## Installation

### From Obsidian Community Plugins

1. Open Obsidian Settings > Community Plugins
2. Disable Safe Mode
3. Search for "Meta Plugin"
4. Install and enable the plugin

### Manual Installation

1. Download the latest release from the [Releases page](https://github.com/your-username/obsidian-meta-plugin/releases)
2. Extract the zip archive into your vault's plugins folder: `<vault>/.obsidian/plugins/`
3. Enable the plugin in Obsidian's Community Plugins settings

## Usage

1. Click the Meta Plugin icon in the ribbon to open the sidebar
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
git clone https://github.com/your-username/obsidian-meta-plugin.git

# Navigate to the plugin directory
cd obsidian-meta-plugin

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

Todo... Anthropic file editor use,

## Security

(... awkward silence)

Obsidian plugins are, in general, a security nightmare. This is not specific to OMP, but general to all plugins. From the [official documentation](https://help.obsidian.md/plugin-security#Plugin+capabilities), any Obsidian plugin can:

- Access files on your computer.
- Connect to internet.
- Install additional programs.

So, you should be skeptical of **_any plugin_** you install.

With that said, let's talk about the excitement OMP brings to the picture. OMP gives an AI access to all these superpowers. This is how the AI is able to modify Obsidian on your behalf, however, it means that AI responses can have **real-world impact** on your computer.

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

- The plugin that builds other plugins
- The last plugin you'll ever need
- You're own personal Obsidian dev team
- Cursor / Windsurf for Obsididan

## License

This project is licensed under the [MIT License](LICENSE).
