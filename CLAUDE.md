# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Dev Commands

- `bun run dev` - Start development server with hot reload
- `bun run build` - Build production version (typecheck and bundle)
- `bun run version` - Bump version and update manifest
- `bun run tag` - Create git tag from version in manifest
- `bun run dist` - Create release distribution package
- `bun run release` - Create and publish a release

## Testing

- `bun test` - Run all tests
- `bun test src/llm/agent.test.ts` - Run a specific test file
- `bun test --watch` - Run tests in watch mode

## Project Structure

- **main.ts**: Entry point exporting the main plugin class
- **src/plugin.ts**: Main plugin implementation (MetaPlugin class)
- **src/sidebar.ts**: Sidebar implementation with LLM integration
- **src/settings.ts**: Plugin settings management
- **src/llm/**: LLM integration with models, agents, and tools
- **src/bundler/**: WASM-based esbuild bundler for plugins

## Code Style Guidelines

- **TypeScript**: Use strict types, avoid `any` when possible
- **Imports**: Group imports by source (obsidian, 3rd party, local)
- **Formatting**: 2-space indentation, trailing commas in multi-line lists
- **Classes**: Use ES6 class syntax with typed properties
- **Interfaces**: Prefix interfaces with "I" when they extend core types
- **Error Handling**: Use async/await with try/catch blocks
- **React Components**: Functional components with hooks (be careful with dependencies)
- **State Management**: Use hooks/state.ts for global state

## LLM Integration

- **Agent System**: Use the Agent class from src/llm/agents.ts for LLM interactions
- **Available Models**: Import models from src/llm/models.ts (sonnet, haiku, llama4, etc.)
- **Tool Creation**: Create tools using the tool() function from the ai package
- **Context Schema**: Define schema for tool contexts using zod
- **Stream Handling**: Use ChunkProcessor for handling streaming responses

## React Hooks Guidelines

- Always include all dependencies in useEffect/useCallback dependency arrays
- Consider whether a hook is necessary before implementing it
- Be mindful of re-rendering behavior and performance impact
- Use refs for values that shouldn't trigger re-renders
