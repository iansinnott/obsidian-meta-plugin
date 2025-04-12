# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Dev Commands
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production version (typecheck and bundle)
- `npm run version` - Bump version and update manifest

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