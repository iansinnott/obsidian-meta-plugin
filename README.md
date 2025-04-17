# Obsidian Meta Plugin

A plugin for [Obsidian](https://obsidian.md) that can modify Obsidian itself. It can create or modify plugins, themes, and settings, acting as your personal Obsidian developer.

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

## License

This project is licensed under the [MIT License](LICENSE).
