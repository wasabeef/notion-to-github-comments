import { Client } from "@notionhq/client";
import {
  BlockObjectResponse,
  ListBlockChildrenResponse,
  PageObjectResponse,
  GetPageResponse,
  GetDatabaseResponse,
  QueryDatabaseParameters,
} from "@notionhq/client/build/src/api-endpoints";
import {
  blocksToMarkdown,
  richTextArrayToMarkdown,
  AugmentedBlockObjectResponse,
} from "./markdown-converter";

// Add default depth constants
const DEFAULT_MAX_RECURSION_DEPTH = 1;
const DEFAULT_INITIAL_DEPTH = 0;

/**
 * Client for interacting with Notion API to fetch and convert content.
 * 
 * This class provides comprehensive functionality for:
 * - Fetching Notion pages and databases
 * - Converting Notion blocks to GitHub-flavored Markdown
 * - Handling nested content and child pages
 * - Processing various block types including text, lists, code, tables, etc.
 * - Managing API rate limits and error handling
 * 
 * @class NotionClient
 * @example
 * const client = new NotionClient(notionToken);
 * const { title, markdown } = await client.getTitleAndMarkdown('https://notion.so/page-id');
 * console.log(`# ${title}\n\n${markdown}`);
 */
export class NotionClient {
  private client: Client;

  /**
   * Initializes the Notion client with authentication.
   * 
   * @constructor
   * @param {string} token - Notion integration token (internal integration token)
   * @throws {Error} May throw if token is invalid or Notion API is unreachable
   * 
   * @example
   * // Initialize with integration token
   * const client = new NotionClient(process.env.NOTION_TOKEN);
   */
  constructor(token: string) {
    this.client = new Client({ auth: token });
  }

  /**
   * Fetches and converts a Notion page or database to title and Markdown.
   * 
   * This is the main entry point for content conversion. It handles:
   * - Page vs database detection
   * - Content fetching with proper error handling
   * - Recursive processing of child pages up to maxDepth
   * - Icon extraction (emoji or external URL)
   * 
   * @async
   * @param {string} url - Notion page or database URL
   * @param {number} [maxDepth=1] - Maximum recursion depth for child pages
   * @returns {Promise<{title: string, markdown: string, url: string, icon: string|null}>}
   *          Object containing processed title, markdown content, cleaned URL, and icon
   * @throws {Error} Throws specific errors for:
   *         - Invalid URL format
   *         - Page/database not found (404)
   *         - Unauthorized access (401)
   *         - Rate limit exceeded (429)
   *         - Other API errors
   * 
   * @example
   * try {
   *   const result = await client.getTitleAndMarkdown(
   *     'https://notion.so/My-Page-abc123',
   *     2 // Max depth
   *   );
   *   console.log(result.title);    // "My Page"
   *   console.log(result.markdown); // Converted content
   *   console.log(result.icon);     // "📄" or URL
   * } catch (error) {
   *   console.error('Failed to fetch:', error.message);
   * }
   */
  async getTitleAndMarkdown(
    url: string,
    maxDepth = DEFAULT_MAX_RECURSION_DEPTH,
  ): Promise<{
    title: string;
    markdown: string;
    url: string;
    icon: string | null;
  }> {
    const id = this.extractId(url);
    let title = "";
    let markdown = "";
    let icon: string | null = null;
    let pageObject: PageObjectResponse | null = null;

    try {
      if (url.includes("/database/")) {
        const db = await this.client.databases.retrieve({ database_id: id });
        title = this.getDatabaseTitle(db);
        markdown = await this.databaseToMarkdown(id);
        if ("icon" in db && db.icon) {
          icon =
            db.icon.type === "emoji"
              ? db.icon.emoji
              : db.icon.type === "external" && db.icon.external
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
          maxDepth,
        );
        if ("icon" in page && page.icon) {
          icon =
            page.icon.type === "emoji"
              ? page.icon.emoji
              : page.icon.type === "external" && page.icon.external
                ? page.icon.external.url
                : null;
        }
      }
      return { title, markdown, url, icon };
    } catch (error: any) {
      if (error.code === "object_not_found") {
        throw new Error(
          `Notion page/database not found: ${url}. Please check if the page exists and the integration has access to it.`,
        );
      }
      if (error.code === "unauthorized") {
        throw new Error(
          `Unauthorized access to Notion. Please check if your integration token is valid and has access to the page: ${url}`,
        );
      }
      if (error.code === "forbidden") {
        throw new Error(
          `Insufficient permissions to access Notion page: ${url}. Please ensure the integration is connected to the page's workspace.`,
        );
      }
      if (error.code === "rate_limited") {
        throw new Error(
          `Notion API rate limit exceeded. Please try again later.`,
        );
      }
      throw new Error(
        `Failed to fetch Notion content from ${url}: ${error.message || error}`,
      );
    }
  }

  /**
   * Extracts Notion page/database ID from URL
   * @param url Notion URL containing ID
   * @returns Clean page/database ID
   */
  private extractId(url: string): string {
    let match = url.match(
      /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/,
    );
    if (match) {
      return match[1].replace(/-/g, "");
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
   * Searches through page properties to find title-type properties,
   * checking common property names in multiple languages.
   * 
   * @private
   * @param {GetPageResponse} page - Page object from Notion API
   * @returns {string} Page title or "Untitled Page" if not found
   */
  private getPageTitle(page: GetPageResponse): string {
    if (!("properties" in page)) {
      return "Untitled Page";
    }
    if (page.properties) {
      const titleProp = Object.values(page.properties).find(
        (prop) => prop.type === "title",
      );
      if (
        titleProp &&
        titleProp.type === "title" &&
        titleProp.title.length > 0
      ) {
        return titleProp.title[0].plain_text;
      }
    }
    return "Untitled Page";
  }

  /**
   * Extracts the title from a Notion database object.
   * 
   * Handles both full database responses and query results
   * which may have different structures.
   * 
   * @private
   * @param {GetDatabaseResponse} database - Database object from Notion API
   * @returns {string} Database title or "Untitled Database" if not found
   */
  private getDatabaseTitle(db: GetDatabaseResponse): string {
    if (!("title" in db) || !db.title || db.title.length === 0) {
      return "Untitled Database";
    }
    return richTextArrayToMarkdown(db.title as any[], { type: "standard" });
  }

  /**
   * Recursively fetches all child blocks with pagination support.
   * 
   * This method handles:
   * - Pagination for blocks with many children
   * - Special handling for column_list and column blocks
   * - Child page expansion based on depth limits
   * - Toggle block expansion
   * - Table and table_row relationship management
   * 
   * @async
   * @param {string} blockId - Parent block ID to fetch children for
   * @param {number} [currentLevel=0] - Current indentation level for formatting
   * @param {number} [currentDepth=0] - Current recursion depth
   * @param {number} [maxDepth=1] - Maximum recursion depth to prevent infinite loops
   * @returns {Promise<AugmentedBlockObjectResponse[]>} Array of blocks with metadata
   * @throws {Error} May throw if API request fails
   * 
   * @example
   * const blocks = await this.getAllBlockChildren(
   *   'page-id',
   *   0,    // Start at level 0
   *   1,    // Current depth 1
   *   3     // Max depth 3
   * );
   */
  public async getAllBlockChildren(
    blockId: string,
    currentLevel = 0,
    currentDepth = DEFAULT_INITIAL_DEPTH,
    maxDepth = DEFAULT_MAX_RECURSION_DEPTH,
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
        if (!("type" in block)) {
          continue;
        }

        const augmentedBlock = {
          ...block,
          _indentationLevel: currentLevel,
        } as AugmentedBlockObjectResponse;

        if (block.type === "column_list" && block.has_children) {
          const columnListChildren = await this.getAllBlockChildren(
            block.id,
            currentLevel,
            currentDepth,
            maxDepth,
          );
          allBlocks.push(augmentedBlock);
          for (const columnBlock of columnListChildren) {
            if (columnBlock.type === "column" && columnBlock.has_children) {
              const columnContentBlocks = await this.getAllBlockChildren(
                columnBlock.id,
                currentLevel + 1,
                currentDepth,
                maxDepth,
              );
              allBlocks.push(columnBlock);
              allBlocks.push(...columnContentBlocks);
            } else {
              allBlocks.push(columnBlock);
            }
          }
        } else if (block.type === "table" && block.has_children) {
          allBlocks.push(augmentedBlock);
          const tableRows = await this.getAllBlockChildren(
            block.id,
            currentLevel + 1,
            currentDepth,
            maxDepth,
          );
          for (const rowBlock of tableRows) {
            if (rowBlock.type === "table_row") {
              allBlocks.push(rowBlock);
            }
          }
        } else if (block.type === "child_page") {
          if (currentDepth < maxDepth) {
            try {
              const childPageId = block.id;
              const childPageObject = (await this.client.pages.retrieve({
                page_id: childPageId,
              })) as PageObjectResponse;
              const childPageTitle = this.getPageTitle(childPageObject);
              let childPageIcon: string | null = null;
              if ("icon" in childPageObject && childPageObject.icon) {
                childPageIcon =
                  childPageObject.icon.type === "emoji"
                    ? childPageObject.icon.emoji
                    : childPageObject.icon.type === "external" &&
                        childPageObject.icon.external
                      ? childPageObject.icon.external.url
                      : null;
              }
              const childBlocks = await this.getAllBlockChildren(
                childPageId,
                0,
                currentDepth + 1,
                maxDepth,
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
            if (block.type !== "child_database" && block.type !== "table") {
              let childrenIndentLevel = currentLevel;
              if (
                block.type === "bulleted_list_item" ||
                block.type === "numbered_list_item" ||
                block.type === "toggle" ||
                block.type === "to_do"
              ) {
                childrenIndentLevel = currentLevel + 1;
              }
              const children = await this.getAllBlockChildren(
                block.id,
                childrenIndentLevel,
                currentDepth,
                maxDepth,
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
   * Converts a Notion page to Markdown format
   * @param pageId Notion page ID
   * @param pageObject Page object for properties
   * @param currentDepth Current recursion depth
   * @param maxDepth Maximum recursion depth
   * @returns Markdown representation of the page
   */
  private async pageToMarkdown(
    pageId: string,
    pageObject: PageObjectResponse,
    currentDepth = DEFAULT_INITIAL_DEPTH,
    maxDepth = DEFAULT_MAX_RECURSION_DEPTH,
  ): Promise<string> {
    const pageBlocks = await this.getAllBlockChildren(
      pageId,
      0,
      currentDepth,
      maxDepth,
    );
    return blocksToMarkdown(pageBlocks, pageObject, this);
  }

  /**
   * Converts a Notion database to Markdown table format
   * @param databaseId Notion database ID
   * @returns Markdown table representation of the database
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
      return "The database is empty or no items were fetched.";
    }

    const headers: string[] = [];
    const firstPageProperties = fetchedPages[0].properties;
    const propertyNames = Object.keys(firstPageProperties);

    for (const propName of propertyNames) {
      headers.push(propName);
    }

    let markdownTable = `| ${headers.join(" | ")} |\\n`;
    markdownTable += `| ${headers.map(() => "---").join(" | ")} |\\n`;

    for (const page of fetchedPages) {
      const row: string[] = [];
      for (const header of headers) {
        const prop = page.properties[header];
        let cellContent = "";
        if (prop) {
          switch (prop.type) {
            case "title":
              cellContent = richTextArrayToMarkdown(prop.title as any[], {
                type: "tableCell",
              });
              break;
            case "rich_text":
              cellContent = richTextArrayToMarkdown(prop.rich_text as any[], {
                type: "tableCell",
              });
              break;
            case "number":
              cellContent = prop.number !== null ? String(prop.number) : "";
              break;
            case "select":
              cellContent = prop.select ? prop.select.name : "";
              break;
            case "multi_select":
              cellContent = prop.multi_select.map((s) => s.name).join(", ");
              break;
            case "status":
              cellContent = prop.status ? prop.status.name : "";
              break;
            case "date":
              cellContent = prop.date ? prop.date.start : "";
              break;
            case "checkbox":
              cellContent = prop.checkbox ? "✅" : "⬜";
              break;
            case "url":
              cellContent = prop.url ? `[${prop.url}](${prop.url})` : "";
              break;
            case "email":
              cellContent = prop.email || "";
              break;
            case "phone_number":
              cellContent = prop.phone_number || "";
              break;
            case "created_time":
              cellContent = prop.created_time;
              break;
            case "last_edited_time":
              cellContent = prop.last_edited_time;
              break;
            default:
              cellContent = `[${prop.type}]`;
          }
        }
        cellContent = cellContent.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
        row.push(cellContent);
      }
      markdownTable += `| ${row.join(" | ")} |\\n`;
    }
    return markdownTable;
  }
}
