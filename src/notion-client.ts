/**
 * @fileoverview Notion API Client
 *
 * This module provides a comprehensive client for interacting with the Notion API.
 * It handles authentication, content fetching, and conversion of Notion blocks to Markdown.
 *
 * **Key Features:**
 * - Fetches content from both Notion pages and databases
 * - Converts Notion's block-based structure to GitHub-flavored Markdown
 * - Supports recursive fetching of child pages with depth control
 * - Handles various Notion block types including tables, lists, and toggles
 * - Preserves page hierarchy and formatting in the output
 *
 * **Supported Content Types:**
 * - Pages with all standard block types
 * - Databases with property-based table rendering
 * - Child pages with configurable recursion depth
 * - Column layouts and nested structures
 * - Rich text formatting and links
 *
 * **Error Handling:**
 * - Specific error messages for common API failures
 * - Graceful fallbacks for missing content
 * - Rate limiting awareness
 *
 * @module notion-client
 * @requires @notionhq/client
 */

import { Client } from '@notionhq/client';
import {
  BlockObjectResponse,
  ListBlockChildrenResponse,
  PageObjectResponse,
  GetPageResponse,
  GetDatabaseResponse,
  QueryDatabaseParameters,
} from '@notionhq/client/build/src/api-endpoints';
import {
  blocksToMarkdown,
  richTextArrayToMarkdown,
  AugmentedBlockObjectResponse,
} from './markdown-converter';

/**
 * Default maximum recursion depth for fetching child pages.
 * Prevents infinite loops and controls API usage.
 * @constant {number}
 */
const DEFAULT_MAX_RECURSION_DEPTH = 1;

/**
 * Initial recursion depth when starting to fetch page content.
 * @constant {number}
 */
const DEFAULT_INITIAL_DEPTH = 0;

/**
 * Client for interacting with the Notion API and converting content to Markdown.
 *
 * This class encapsulates all Notion API interactions and provides methods
 * for fetching and converting both pages and databases to Markdown format.
 *
 * **Authentication:**
 * Requires a Notion integration token with appropriate permissions:
 * - Read access to pages and databases
 * - Access to workspace content
 *
 * **Usage Pattern:**
 * 1. Initialize with integration token
 * 2. Call getTitleAndMarkdown() with a Notion URL
 * 3. Receive formatted Markdown content
 *
 * @class
 * @example
 * ```typescript
 * const client = new NotionClient(process.env.NOTION_TOKEN);
 * const result = await client.getTitleAndMarkdown('https://notion.so/page-id');
 * console.log(result.markdown);
 * ```
 */
export class NotionClient {
  private client: Client;

  /**
   * Initializes the Notion API client with authentication.
   *
   * Creates an authenticated client instance using the official Notion SDK.
   * The token must be from a Notion integration with appropriate permissions.
   *
   * **Required Permissions:**
   * - Read content
   * - Access to target pages/databases
   *
   * @param {string} token - Notion integration token (starts with 'secret_')
   * @throws {Error} The Notion SDK will throw if the token is invalid
   * @constructor
   */
  constructor(token: string) {
    this.client = new Client({ auth: token });
  }

  /**
   * Fetches Notion content from a URL and converts it to Markdown.
   *
   * This is the main entry point for content retrieval. It handles both
   * pages and databases, automatically detecting the content type from the URL.
   *
   * **Process Flow:**
   * 1. Extracts the ID from the Notion URL
   * 2. Determines if URL points to a page or database
   * 3. Fetches content using appropriate API endpoint
   * 4. Converts blocks to Markdown format
   * 5. Recursively fetches child pages up to maxDepth
   *
   * **URL Formats Supported:**
   * - Pages: `https://notion.so/Page-Title-{32-char-id}`
   * - Databases: `https://notion.so/workspace/{32-char-id}?v=...`
   * - Workspace URLs: `https://workspace.notion.site/...`
   *
   * **Error Handling:**
   * - `object_not_found`: Page/database doesn't exist or no access
   * - `unauthorized`: Invalid token
   * - `forbidden`: Integration lacks permissions
   * - `rate_limited`: API rate limit exceeded
   *
   * @param {string} url - Full Notion URL to fetch content from
   * @param {number} [maxDepth=1] - Maximum depth for recursive child page fetching
   * @returns {Promise<Object>} Parsed content object
   * @returns {string} returns.title - Page or database title
   * @returns {string} returns.markdown - Content converted to Markdown
   * @returns {string} returns.url - Original Notion URL
   * @returns {string|null} returns.icon - Emoji or image URL for the page icon
   * @throws {Error} Detailed error message for various failure scenarios
   * @async
   */
  async getTitleAndMarkdown(
    url: string,
    maxDepth = DEFAULT_MAX_RECURSION_DEPTH
  ): Promise<{
    title: string;
    markdown: string;
    url: string;
    icon: string | null;
  }> {
    const id = this.extractId(url);
    let title = '';
    let markdown = '';
    let icon: string | null = null;
    let pageObject: PageObjectResponse | null = null;

    try {
      if (url.includes('/database/')) {
        const db = await this.client.databases.retrieve({ database_id: id });
        title = this.getDatabaseTitle(db);
        markdown = await this.databaseToMarkdown(id);
        if ('icon' in db && db.icon) {
          icon =
            db.icon.type === 'emoji'
              ? db.icon.emoji
              : db.icon.type === 'external' && db.icon.external
                ? db.icon.external.url
                : null;
        }
      } else {
        const page = (await this.client.pages.retrieve({
          page_id: id,
        })) as PageObjectResponse;
        pageObject = page;
        title = this.getPageTitle(page);
        markdown = await this.pageToMarkdown(
          id,
          pageObject,
          DEFAULT_INITIAL_DEPTH,
          maxDepth
        );
        if ('icon' in page && page.icon) {
          icon =
            page.icon.type === 'emoji'
              ? page.icon.emoji
              : page.icon.type === 'external' && page.icon.external
                ? page.icon.external.url
                : null;
        }
      }
      return { title, markdown, url, icon };
    } catch (error: any) {
      if (error.code === 'object_not_found') {
        throw new Error(
          `Notion page/database not found: ${url}. Please check if the page exists and the integration has access to it.`
        );
      }
      if (error.code === 'unauthorized') {
        throw new Error(
          `Unauthorized access to Notion. Please check if your integration token is valid and has access to the page: ${url}`
        );
      }
      if (error.code === 'forbidden') {
        throw new Error(
          `Insufficient permissions to access Notion page: ${url}. Please ensure the integration is connected to the page's workspace.`
        );
      }
      if (error.code === 'rate_limited') {
        throw new Error(
          `Notion API rate limit exceeded. Please try again later.`
        );
      }
      throw new Error(
        `Failed to fetch Notion content from ${url}: ${error.message || error}`
      );
    }
  }

  /**
   * Extracts the Notion ID from various URL formats.
   *
   * Notion IDs can appear in URLs in multiple formats:
   * - With hyphens: `12345678-1234-5678-1234-567890abcdef`
   * - Without hyphens: `1234567812345678123456789abcdef`
   *
   * This method normalizes the ID by removing hyphens for API usage.
   *
   * **Supported Patterns:**
   * - UUID with hyphens (8-4-4-4-12 format)
   * - 32-character hexadecimal string
   * - IDs embedded in various URL structures
   *
   * @param {string} url - Notion URL containing an ID
   * @returns {string} Normalized 32-character ID without hyphens
   * @throws {Error} If no valid Notion ID pattern is found in the URL
   * @private
   */
  private extractId(url: string): string {
    let match = url.match(
      /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/
    );
    if (match) {
      return match[1].replace(/-/g, '');
    }

    match = url.match(/([0-9a-fA-F]{32})/);
    if (match) {
      return match[1];
    }

    throw new Error(`Invalid Notion URL format: ${url}`);
  }

  /**
   * Extracts the title from a Notion page object.
   *
   * Searches through all page properties to find the title property,
   * which is identified by its type. Falls back to a default if not found.
   *
   * **Title Resolution Order:**
   * 1. First property with type="title"
   * 2. First plain_text value from title array
   * 3. "Untitled Page" as fallback
   *
   * @param {GetPageResponse} page - Notion API page response object
   * @returns {string} Extracted title or "Untitled Page" if not found
   * @private
   */
  private getPageTitle(page: GetPageResponse): string {
    if (!('properties' in page)) {
      return 'Untitled Page';
    }
    if (page.properties) {
      const titleProp = Object.values(page.properties).find(
        (prop) => prop.type === 'title'
      );
      if (
        titleProp &&
        titleProp.type === 'title' &&
        titleProp.title.length > 0
      ) {
        return titleProp.title[0].plain_text;
      }
    }
    return 'Untitled Page';
  }

  /**
   * Extracts the title from a Notion database object.
   *
   * Database titles are stored as rich text arrays at the root level.
   * Converts the rich text to plain Markdown for display.
   *
   * @param {GetDatabaseResponse} db - Notion API database response object
   * @returns {string} Database title or "Untitled Database" if not found
   * @private
   */
  private getDatabaseTitle(db: GetDatabaseResponse): string {
    if (!('title' in db) || !db.title || db.title.length === 0) {
      return 'Untitled Database';
    }
    return richTextArrayToMarkdown(db.title as any[], { type: 'standard' });
  }

  /**
   * Recursively fetches all child blocks from a parent block.
   *
   * This method is the core of content retrieval, handling Notion's
   * hierarchical block structure with proper indentation and depth control.
   *
   * **Special Handling:**
   * - **Column Lists**: Fetches columns and their content separately
   * - **Tables**: Fetches table rows as children of table blocks
   * - **Child Pages**: Recursively fetches content if within depth limit
   * - **Lists & Toggles**: Increases indentation for nested items
   *
   * **Pagination:**
   * - Fetches up to 100 blocks per API call
   * - Automatically handles pagination for large pages
   *
   * **Augmentation:**
   * Each block is augmented with:
   * - `_indentationLevel`: Visual nesting level for Markdown conversion
   * - `_isExpanded`: Whether child pages were fetched
   * - `child_page_details`: Nested content for child pages
   *
   * @param {string} blockId - ID of the parent block to fetch children from
   * @param {number} [currentLevel=0] - Current indentation level for visual nesting
   * @param {number} [currentDepth=0] - Current recursion depth for child pages
   * @param {number} [maxDepth=1] - Maximum recursion depth to prevent infinite loops
   * @returns {Promise<AugmentedBlockObjectResponse[]>} Array of blocks with metadata
   * @public
   * @async
   */
  public async getAllBlockChildren(
    blockId: string,
    currentLevel = 0,
    currentDepth = DEFAULT_INITIAL_DEPTH,
    maxDepth = DEFAULT_MAX_RECURSION_DEPTH
  ): Promise<AugmentedBlockObjectResponse[]> {
    const allBlocks: AugmentedBlockObjectResponse[] = [];
    let hasMore = true;
    let startCursor: string | undefined = undefined;

    while (hasMore) {
      const response: ListBlockChildrenResponse =
        await this.client.blocks.children.list({
          block_id: blockId,
          start_cursor: startCursor,
          page_size: 100,
        });

      const fetchedBlocks = response.results as BlockObjectResponse[];

      for (const block of fetchedBlocks) {
        if (!('type' in block)) {
          continue;
        }

        const augmentedBlock = {
          ...block,
          _indentationLevel: currentLevel,
        } as AugmentedBlockObjectResponse;

        if (block.type === 'column_list' && block.has_children) {
          const columnListChildren = await this.getAllBlockChildren(
            block.id,
            currentLevel,
            currentDepth,
            maxDepth
          );
          allBlocks.push(augmentedBlock);
          for (const columnBlock of columnListChildren) {
            if (columnBlock.type === 'column' && columnBlock.has_children) {
              const columnContentBlocks = await this.getAllBlockChildren(
                columnBlock.id,
                currentLevel + 1,
                currentDepth,
                maxDepth
              );
              allBlocks.push(columnBlock);
              allBlocks.push(...columnContentBlocks);
            } else {
              allBlocks.push(columnBlock);
            }
          }
        } else if (block.type === 'table' && block.has_children) {
          allBlocks.push(augmentedBlock);
          const tableRows = await this.getAllBlockChildren(
            block.id,
            currentLevel + 1,
            currentDepth,
            maxDepth
          );
          for (const rowBlock of tableRows) {
            if (rowBlock.type === 'table_row') {
              allBlocks.push(rowBlock);
            }
          }
        } else if (block.type === 'child_page') {
          if (currentDepth < maxDepth) {
            try {
              const childPageId = block.id;
              const childPageObject = (await this.client.pages.retrieve({
                page_id: childPageId,
              })) as PageObjectResponse;
              const childPageTitle = this.getPageTitle(childPageObject);
              let childPageIcon: string | null = null;
              if ('icon' in childPageObject && childPageObject.icon) {
                childPageIcon =
                  childPageObject.icon.type === 'emoji'
                    ? childPageObject.icon.emoji
                    : childPageObject.icon.type === 'external' &&
                        childPageObject.icon.external
                      ? childPageObject.icon.external.url
                      : null;
              }
              const childBlocks = await this.getAllBlockChildren(
                childPageId,
                0,
                currentDepth + 1,
                maxDepth
              );
              augmentedBlock.child_page_details = {
                title: childPageTitle,
                icon: childPageIcon,
                blocks: childBlocks,
                page: childPageObject,
              };
              augmentedBlock._isExpanded = true;
              allBlocks.push(augmentedBlock);
            } catch {
              // Failed to fetch child page, mark as unexpanded
              augmentedBlock._isExpanded = false;
              allBlocks.push(augmentedBlock);
            }
          } else {
            augmentedBlock._isExpanded = false;
            allBlocks.push(augmentedBlock);
          }
        } else {
          allBlocks.push(augmentedBlock);
          if (block.has_children) {
            if (block.type !== 'child_database' && block.type !== 'table') {
              let childrenIndentLevel = currentLevel;
              if (
                block.type === 'bulleted_list_item' ||
                block.type === 'numbered_list_item' ||
                block.type === 'toggle' ||
                block.type === 'to_do'
              ) {
                childrenIndentLevel = currentLevel + 1;
              }
              const children = await this.getAllBlockChildren(
                block.id,
                childrenIndentLevel,
                currentDepth,
                maxDepth
              );
              allBlocks.push(...children);
            }
          }
        }
      }

      hasMore = response.has_more;
      startCursor = response.next_cursor || undefined;
    }
    return allBlocks;
  }

  /**
   * Converts a Notion page to Markdown format.
   *
   * Fetches all blocks from the page and delegates to the Markdown
   * converter for formatting. Passes page properties for context.
   *
   * @param {string} pageId - ID of the page to convert
   * @param {PageObjectResponse} pageObject - Page object containing properties
   * @param {number} [currentDepth=0] - Current depth in page hierarchy
   * @param {number} [maxDepth=1] - Maximum depth for child page expansion
   * @returns {Promise<string>} Complete Markdown representation of the page
   * @private
   * @async
   */
  private async pageToMarkdown(
    pageId: string,
    pageObject: PageObjectResponse,
    currentDepth = DEFAULT_INITIAL_DEPTH,
    maxDepth = DEFAULT_MAX_RECURSION_DEPTH
  ): Promise<string> {
    const pageBlocks = await this.getAllBlockChildren(
      pageId,
      0,
      currentDepth,
      maxDepth
    );
    return blocksToMarkdown(pageBlocks, pageObject, this);
  }

  /**
   * Converts a Notion database to a Markdown table.
   *
   * Fetches all database entries and renders them as a GitHub-flavored
   * Markdown table with proper formatting and escaping.
   *
   * **Process:**
   * 1. Queries all pages in the database (handles pagination)
   * 2. Extracts property names as table headers
   * 3. Converts each property value to appropriate Markdown
   * 4. Formats as aligned table with escaped special characters
   *
   * **Property Type Handling:**
   * - Title/Rich Text: Converted to Markdown with formatting
   * - Numbers: Displayed as-is
   * - Select/Multi-select: Comma-separated values
   * - Dates: Start date only
   * - Checkboxes: ✅ or ⬜ emoji
   * - URLs: Markdown link format
   * - Others: Type indicator in brackets
   *
   * **Special Characters:**
   * - Pipe characters (|) are escaped
   * - Newlines are converted to `<br>` tags
   *
   * @param {string} databaseId - ID of the database to convert
   * @returns {Promise<string>} Markdown table or empty message
   * @private
   * @async
   */
  private async databaseToMarkdown(databaseId: string): Promise<string> {
    const fetchedPages: PageObjectResponse[] = [];
    let hasMoreDbQuery = true;
    let dbQueryStartCursor: string | undefined = undefined;

    const queryParams: QueryDatabaseParameters = {
      database_id: databaseId,
      page_size: 100,
    };

    while (hasMoreDbQuery) {
      if (dbQueryStartCursor) {
        queryParams.start_cursor = dbQueryStartCursor;
      }
      const response = await this.client.databases.query(queryParams);
      fetchedPages.push(...(response.results as PageObjectResponse[]));
      hasMoreDbQuery = response.has_more;
      dbQueryStartCursor = response.next_cursor || undefined;
    }

    if (fetchedPages.length === 0) {
      return 'The database is empty or no items were fetched.';
    }

    const headers: string[] = [];
    const firstPageProperties = fetchedPages[0].properties;
    const propertyNames = Object.keys(firstPageProperties);

    for (const propName of propertyNames) {
      headers.push(propName);
    }

    let markdownTable = `| ${headers.join(' | ')} |\\n`;
    markdownTable += `| ${headers.map(() => '---').join(' | ')} |\\n`;

    for (const page of fetchedPages) {
      const row: string[] = [];
      for (const header of headers) {
        const prop = page.properties[header];
        let cellContent = '';
        if (prop) {
          switch (prop.type) {
            case 'title':
              cellContent = richTextArrayToMarkdown(prop.title as any[], {
                type: 'tableCell',
              });
              break;
            case 'rich_text':
              cellContent = richTextArrayToMarkdown(prop.rich_text as any[], {
                type: 'tableCell',
              });
              break;
            case 'number':
              cellContent = prop.number !== null ? String(prop.number) : '';
              break;
            case 'select':
              cellContent = prop.select ? prop.select.name : '';
              break;
            case 'multi_select':
              cellContent = prop.multi_select.map((s) => s.name).join(', ');
              break;
            case 'status':
              cellContent = prop.status ? prop.status.name : '';
              break;
            case 'date':
              cellContent = prop.date ? prop.date.start : '';
              break;
            case 'checkbox':
              cellContent = prop.checkbox ? '✅' : '⬜';
              break;
            case 'url':
              cellContent = prop.url ? `[${prop.url}](${prop.url})` : '';
              break;
            case 'email':
              cellContent = prop.email || '';
              break;
            case 'phone_number':
              cellContent = prop.phone_number || '';
              break;
            case 'created_time':
              cellContent = prop.created_time;
              break;
            case 'last_edited_time':
              cellContent = prop.last_edited_time;
              break;
            default:
              cellContent = `[${prop.type}]`;
          }
        }
        cellContent = cellContent.replace(/\|/g, '\\|').replace(/n/g, '<br>');
        row.push(cellContent);
      }
      markdownTable += `| ${row.join(' | ')} |\\n`;
    }
    return markdownTable;
  }
}
