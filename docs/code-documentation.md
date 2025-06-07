# Code Documentation

## Overview

This document provides comprehensive documentation for the notion-to-github-comments codebase. The project is designed to extract Notion content from GitHub PR descriptions and convert it to Markdown format for AI-ready context in PR comments.

## Architecture

### Core Components

#### 1. Entry Point (`src/index.ts`)
The main GitHub Action entry point that orchestrates the entire workflow.

**Key Responsibilities:**
- Extracts Notion URLs from PR descriptions using `url-extractor`
- Fetches content via `NotionClient`
- Posts/updates comments via `GithubClient`
- Handles error reporting and success logging

**Flow:**
1. Parse GitHub Action inputs (notion-token, github-token)
2. Extract Notion URLs from PR body
3. Process each URL to get title and markdown content
4. Format results with collapsible sections and icons
5. Create or update PR comment with results

#### 2. Notion Client (`src/notion-client.ts`)
Handles all Notion API interactions and content retrieval.

**Key Features:**
- Supports both pages and databases
- Recursive child page fetching (configurable depth)
- Rich error handling with detailed messages
- Icon extraction for pages and databases
- Property extraction for database pages

**Main Methods:**
- `getTitleAndMarkdown(url)`: Primary interface for content extraction
- `fetchPageContent(pageId)`: Fetches page blocks and metadata
- `fetchDatabaseContent(databaseId)`: Fetches database structure and entries
- `fetchChildPages(blocks)`: Recursively fetches child page content

#### 3. Markdown Converter (`src/markdown-converter.ts`)
Core conversion engine that transforms Notion blocks to Markdown.

**Architecture Highlights:**
- **Context-aware conversion**: Different processing for standard text, Mermaid diagrams, code blocks, and table cells
- **Modular block handlers**: Separate functions for each Notion block type
- **Constants-based formatting**: All hardcoded strings centralized in `MARKDOWN_CONSTANTS`
- **Flattened toggle blocks**: Toggle blocks are converted to plain text (not collapsible) while child pages remain collapsible

#### 4. GitHub Client (`src/github-client.ts`)
Manages GitHub PR comment operations.

**Key Features:**
- Smart comment identification using hidden HTML markers
- Atomic comment updates (update existing vs. create new)
- Comment deletion when no Notion URLs found
- Error handling for API failures

#### 5. URL Extractor (`src/url-extractor.ts`)
Robust URL detection and validation.

**Features:**
- Multiple Notion URL format support
- HTML comment filtering (ignores commented URLs)
- UUID and 32-character hex ID support
- Workspace-specific URL handling

## Detailed Component Analysis

### Markdown Converter Deep Dive

The markdown converter is the most complex component, responsible for accurately converting Notion's rich content structure to clean, readable Markdown.

#### Block Handler Architecture

The converter uses a dispatch pattern with specialized handler functions:

```typescript
const blockToMarkdown = (block: AugmentedBlockObjectResponse, ...): string => {
  // Dispatch to appropriate handler based on block type
  switch (block.type) {
    case "paragraph": return handleParagraphBlock(block, context);
    case "heading_1": return handleHeadingBlock(block, context, 1);
    // ... other block types
  }
};
```

#### Key Handler Functions

**Block Handlers:**
- `handleParagraphBlock`: Processes paragraph text with rich formatting
- `handleHeadingBlock`: Converts headings (levels 1-3) with proper Markdown syntax
- `handleListItemBlock`: Handles both bulleted and numbered lists with proper nesting
- `handleCodeBlock`: Special processing for code blocks and Mermaid diagrams
- `handleToggleBlock`: Flattens toggle content (no longer collapsible)
- `handleChildPageBlock`: Creates collapsible sections for child pages
- `handleTableProcessing`: Complex table conversion with header detection

**Utility Functions:**
- `processTableBlocks`: Extracted table processing logic for better maintainability
- `addBlockSpacing`: Intelligent spacing between different block types
- `richTextArrayToMarkdown`: Context-aware rich text processing

#### Context-Aware Processing

The converter uses different processing contexts to ensure proper formatting:

- **Standard Context**: Normal text with full rich text formatting (bold, italic, links)
- **Mermaid Content**: Preserves newlines and syntax-critical formatting
- **Code Block Content**: Raw text preservation without rich text processing
- **Table Cell Context**: Pipe escaping and `<br>` tag conversion for tables
- **Code Block Caption**: Rich text formatting for code block captions

#### Constants and Configuration

All formatting strings are centralized in `MARKDOWN_CONSTANTS`:

```typescript
const MARKDOWN_CONSTANTS = {
  NEWLINE: '\n',
  INDENT: '  ',
  DIVIDER: '---',
  CODE_FENCE: '```',
  BLOCKQUOTE: '> ',
  // ... other constants
} as const;
```

This approach ensures:
- Consistent formatting across all conversions
- Easy maintenance and updates
- Clear separation of logic and presentation

### Table Processing

Tables require special handling due to their multi-block nature in Notion:

1. **Table Block Detection**: Identifies table start block
2. **Row Collection**: Gathers all subsequent table_row blocks
3. **Header Processing**: Handles optional column headers
4. **Cell Processing**: Converts rich text content to table-safe format
5. **Column Normalization**: Ensures consistent column counts across rows

### Error Handling Strategy

The codebase implements comprehensive error handling:

- **Notion API Errors**: Detailed error messages based on error codes
- **Network Failures**: Graceful degradation with error sections in comments
- **Type Safety**: Strong TypeScript typing to prevent runtime errors
- **Input Validation**: URL format validation and sanitization

## Configuration and Constants

### Hardcoded Configurations

- **Child Page Recursion Depth**: 1 level (prevents excessive API calls)
- **Supported URL Formats**: notion.so and *.notion.site domains
- **Block Processing**: Toggle blocks flattened, child pages collapsible

### Environment Variables

- `NOTION_TOKEN`: Required Notion integration token
- `GITHUB_TOKEN`: GitHub API token for comment operations

## Testing Strategy

The project uses Jest for comprehensive testing:

### Test Categories

1. **Unit Tests**: Individual function testing with mocks
2. **Integration Tests**: Real Notion API calls (environment-dependent)
3. **Type Tests**: TypeScript compilation verification

### Key Test Files

- `tests/markdown-converter.test.ts`: Comprehensive block conversion testing
- `tests/notion-client.test.ts`: Notion API integration testing
- `tests/url-extractor.test.ts`: URL parsing and validation testing

### Test Data Management

- Mock Notion blocks for unit testing
- Environment-based integration test skipping
- Flexible test configuration for different environments

## Performance Considerations

### API Efficiency

- **Single Comment Strategy**: Updates existing comments instead of creating new ones
- **Batch Processing**: Processes multiple URLs in single action run
- **Controlled Recursion**: Limited child page depth to prevent API abuse

### Memory Management

- **Streaming Processing**: Processes blocks sequentially to manage memory
- **Efficient String Building**: Uses array joining for large text assembly
- **Type-Safe Operations**: Prevents memory leaks through strong typing

## Security Considerations

### Input Validation

- URL format validation prevents malicious inputs
- HTML comment filtering prevents code injection
- Token validation ensures API security

### API Security

- Token-based authentication with GitHub and Notion
- Limited API scope (read-only for Notion, comment-write for GitHub)
- Error message sanitization to prevent information leakage

## Future Enhancement Areas

### Potential Improvements

1. **Caching Strategy**: Implement content caching to reduce API calls
2. **Incremental Updates**: Only update changed content sections
3. **Rich Media Support**: Enhanced image and file handling
4. **Custom Formatting Options**: User-configurable output formatting
5. **Performance Monitoring**: API call tracking and optimization

### Extension Points

- **Block Handler System**: Easy addition of new Notion block types
- **Context System**: Expandable processing contexts for special formatting
- **Output Formats**: Support for formats beyond Markdown
- **Integration Points**: Additional source/destination platform support

## Maintenance Guidelines

### Code Quality Standards

- **Function Length**: Keep functions under 50 lines when possible
- **Single Responsibility**: Each function should have one clear purpose
- **Type Safety**: Use strict TypeScript typing throughout
- **Error Handling**: Comprehensive error handling with user-friendly messages

### Documentation Requirements

- **Function Documentation**: Clear JSDoc comments for public APIs
- **Type Documentation**: Comprehensive interface and type definitions
- **Example Usage**: Code examples for complex functions
- **Change Log**: Document breaking changes and major updates

### Testing Requirements

- **Coverage**: Maintain >90% test coverage for core functionality
- **Integration Tests**: Environment-based testing for external APIs
- **Regression Tests**: Tests for all fixed bugs to prevent reoccurrence
- **Performance Tests**: Monitoring for API call efficiency and memory usage

This documentation provides a comprehensive overview of the codebase architecture, design decisions, and maintenance guidelines. For specific implementation details, refer to the inline code comments and type definitions.