# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a GitHub Action that automatically extracts Notion URLs from PR descriptions, fetches the Notion content, converts it to Markdown, and posts it as a PR comment. The action uses TypeScript, Bun for package management, and @vercel/ncc for bundling into a single distributable file.

## Development Commands

```bash
# Install dependencies
bun install

# Run tests
bun test
bun test:watch              # Watch mode
bun test -- --coverage      # With coverage

# Lint and format
bun run lint                # ESLint check
bun run format              # Prettier format
bun run format:check        # Check format only

# Build
bun run build               # Build to dist/index.js
bun run prebuild            # Clean dist/ before build

# Development workflow
bun run dev                 # Build and run locally
```

## Architecture

The codebase follows a modular architecture with clear separation of concerns:

1. **Entry Point**: `src/index.ts` orchestrates the entire workflow - extracting URLs, fetching Notion content, converting to Markdown, and posting to GitHub.

2. **Core Modules**:

   - `notion-client.ts`: Handles all Notion API interactions including fetching pages, blocks, and child pages. Implements retry logic and error handling.
   - `github-client.ts`: Manages GitHub PR comments with automatic updates and collision prevention using comment markers.
   - `markdown-converter.ts`: Converts Notion blocks to GitHub-flavored Markdown with special handling for tables, toggles, code blocks, and nested structures.
   - `url-extractor.ts`: Extracts and validates Notion URLs from PR descriptions.

3. **Key Design Decisions**:
   - Toggle blocks are flattened (not collapsible) in the output
   - Child pages are rendered as collapsible sections
   - Tables maintain context through parent block tracking
   - Mermaid diagrams are properly formatted with language tags

## Development Workflow

This project uses an automated branch-based development workflow:

1. Create a branch with any name (e.g., `feat-new-feature`, `fix-bug-123`)
2. Push changes - the `auto-build.yml` workflow automatically builds and commits `dist/`
3. Create a PR - `build-preview.yml` posts usage instructions and download links
4. Test in other repos using `uses: wasabeef/notion-to-github-comments@your-branch-name`
5. For releases, manually trigger the `release.yml` workflow from the Actions tab

## Testing

The project uses Jest with both unit and integration tests:

```bash
# Run specific test file
bun test tests/notion-client.test.ts

# Run tests matching pattern
bun test -- --testNamePattern="should convert"

# Integration test (requires NOTION_TOKEN)
NOTION_TOKEN=your-token bun test
```

## Important Implementation Details

- The action requires `NOTION_TOKEN` secret and `pull-requests: write` permission
- Notion API responses are cached during execution to minimize API calls
- Comment updates preserve the original comment ID to prevent duplicates
- Error messages are sanitized before posting to GitHub
- The bundled output in `dist/index.js` must be committed for the action to work
