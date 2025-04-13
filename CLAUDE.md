# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Dev Commands
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production version (typecheck and bundle)
- `npm run version` - Bump version and update manifest

## Project Structure
- **main.ts**: Entry point exporting the main plugin class
- **src/plugin.ts**: Main plugin implementation (MetaPlugin class)
- **src/sidebar.ts**: Sidebar implementation with LLM integration
- **src/settings.ts**: Plugin settings management
- **src/modal.ts**: Modal dialog components
- **src/llm/**: LLM integration
  - **agents.ts**: Agent class for LLM interaction
  - **models.ts**: Available language models (Claude, GPT, Llama, etc.)
  - **tools/**: Tool implementations for LLMs
    - **obsidian.ts**: Tools for Obsidian vault file operations
    - **weather.ts**: Weather information tool

## LLM Integration
- **Agent System**: Use the Agent class from src/llm/agents.ts for LLM interactions
- **Available Models**: Import models from src/llm/models.ts (sonnet, haiku, llama4, etc.)
- **Tool Creation**: Create tools using the tool() function from the ai package
- **Context Schema**: Define schema for tool contexts using zod
- **Stream Handling**: Use streamText() for real-time responses in the UI

## Code Style Guidelines
- **TypeScript**: Use strict types, avoid `any` when possible
- **Imports**: Group imports by source (obsidian, 3rd party, local)
- **Formatting**: 2-space indentation, trailing commas in multi-line lists
- **Classes**: Use ES6 class syntax with typed properties
- **Interfaces**: Prefix interfaces with "I" when they extend core types
- **Error Handling**: Use async/await with try/catch blocks
- **Generics**: Use for type-safe abstractions, especially with LLM tools
- **Models**: Import from dedicated model files, don't instantiate inline
- **Tools**: Place tool implementations in src/llm/tools/ directory
- **Naming**: Use camelCase for variables/functions, PascalCase for classes
- **Paths**: Use @/* path alias for imports when appropriate

## Dependencies
- **LLM Packages**: @ai-sdk/anthropic, @ai-sdk/openai, @ai-sdk/groq
- **Core LLM**: ai package for Tool and Agent abstractions
- **UI**: React for component-based UI (React 19)
- **Validation**: zod for schema validation and typing