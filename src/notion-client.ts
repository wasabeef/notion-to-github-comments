import { Client } from '@notionhq/client';
// import { NotionToMarkdown } from 'notion-to-md';
import { 
  BlockObjectResponse, 
  ListBlockChildrenResponse, 
  PageObjectResponse, 
  GetPageResponse, 
  GetDatabaseResponse, // Re-added
  QueryDatabaseParameters, // Re-added
  // QueryDatabaseParameters // Temporarily removed
  // PartialBlockObjectResponse, // Removed
  // PartialDatabaseObjectResponse, // Removed
  // GetPagePropertyResponse, // Removed
  // PartialUserObjectResponse, // Removed
  // UserObjectResponse, // Removed
} from "@notionhq/client/build/src/api-endpoints";
import { blocksToMarkdown, richTextArrayToMarkdown, AugmentedBlockObjectResponse } from './markdown-converter'; // richTextArrayToMarkdown もインポート

// Add default depth constants
const DEFAULT_MAX_RECURSION_DEPTH = 1;
const DEFAULT_INITIAL_DEPTH = 0;

export class NotionClient {
  private client: Client;
  // private n2m: NotionToMarkdown;

  /**
   * Creates an instance of NotionClient.
   * @param {string} token The Notion API integration token.
   */
  constructor(token: string) {
    this.client = new Client({ auth: token });
    // this.n2m = new NotionToMarkdown({ notionClient: this.client });
  }

  /**
   * Retrieves the title and markdown content of a Notion page or a simplified markdown representation of a database.
   * @param {string} url The URL of the Notion page or database.
   * @returns {Promise<{ title: string; markdown: string; url: string; icon: string | null }>} A promise that resolves to an object containing the title, markdown content, the original URL, and the icon.
   * @throws {Error} If the Notion URL format is invalid or if there is an error retrieving data from Notion API.
   */
  async getTitleAndMarkdown(
    url: string,
    maxDepth = DEFAULT_MAX_RECURSION_DEPTH, // Add maxDepth
  ): Promise<{ title: string; markdown: string; url: string; icon: string | null }> {
    const id = this.extractId(url);
    let title = '';
    let markdown = '';
    let icon: string | null = null;
    let pageObject: PageObjectResponse | null = null;

    if (url.includes('/database/')) {
      const db = await this.client.databases.retrieve({ database_id: id });
      title = this.getDatabaseTitle(db);
      markdown = await this.databaseToMarkdown(id); // Database to Markdown does not currently support depth.
      if ('icon' in db && db.icon) {
        icon = db.icon.type === 'emoji' ? db.icon.emoji : (db.icon.type === 'external' && db.icon.external ? db.icon.external.url : null);
      }
    } else {
      const page = await this.client.pages.retrieve({ page_id: id }) as PageObjectResponse;
      pageObject = page;
      title = this.getPageTitle(page);
      // Pass pageObject to pageToMarkdown for properties and icon
      markdown = await this.pageToMarkdown(id, pageObject, DEFAULT_INITIAL_DEPTH, maxDepth);
      if ('icon' in page && page.icon) {
        icon = page.icon.type === 'emoji' ? page.icon.emoji : (page.icon.type === 'external' && page.icon.external ? page.icon.external.url : null);
      }
    }
    return { title, markdown, url, icon };
  }

  private extractId(url: string): string {
    // Extract ID from various Notion URL formats
    // Format 1: notion.so/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (32 hex chars)
    // Format 2: notion.so/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (UUID format)
    // Format 3: notion.so/workspace/page-name-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    
    // First try to find UUID format with hyphens
    let match = url.match(/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/);
    if (match) {
      return match[1].replace(/-/g, ''); // Remove hyphens for API
    }
    
    // Then try to find 32 character hex string
    match = url.match(/([0-9a-fA-F]{32})/);
    if (match) {
      return match[1];
    }
    
    throw new Error(`Invalid Notion URL format: ${url}`);
  }

  private getPageTitle(page: GetPageResponse): string {
    if (!('properties' in page)) {
      return 'Untitled Page'; 
    }
    if (page.properties) {
      const titleProp = Object.values(page.properties).find(prop => prop.type === 'title');
      if (titleProp && titleProp.type === 'title' && titleProp.title.length > 0) {
        return titleProp.title[0].plain_text;
      }
    }
    return 'Untitled Page';
  }

  private getDatabaseTitle(db: GetDatabaseResponse): string {
    if (!('title' in db) || !db.title || db.title.length === 0) {
        return 'Untitled Database';
    }
    // Assuming title is an array of RichTextItem-like objects
    return richTextArrayToMarkdown(db.title as any[], { type: 'standard' }); // Cast for now
  }

  public async getAllBlockChildren(
    blockId: string,
    currentLevel = 0,
    currentDepth = DEFAULT_INITIAL_DEPTH, // Add currentDepth
    maxDepth = DEFAULT_MAX_RECURSION_DEPTH, // Add maxDepth
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
            currentLevel, // columns themselves are at the same level as column_list
            currentDepth, 
            maxDepth
          );
          // Push the column_list block itself, then its resolved children (columns)
          allBlocks.push(augmentedBlock);
          for (const columnBlock of columnListChildren) {
            if (columnBlock.type === "column" && columnBlock.has_children) {
              const columnContentBlocks = await this.getAllBlockChildren(
                columnBlock.id,
                currentLevel + 1, // Content within column is indented further
                currentDepth, 
                maxDepth
              );
              // Push the column block itself, then its content
              allBlocks.push(columnBlock); 
              allBlocks.push(...columnContentBlocks);
            } else {
              allBlocks.push(columnBlock); // Push column if it has no children or is not a column block (should not happen)
            }
          }
        } else if (block.type === "table" && block.has_children) {
          allBlocks.push(augmentedBlock); // Push the table block itself
          const tableRows = await this.getAllBlockChildren(
            block.id, // Get children of the table (these are table_row blocks)
            currentLevel + 1, // table_row is one level deeper
            currentDepth,
            maxDepth
          );
          for (const rowBlock of tableRows) {
            if (rowBlock.type === 'table_row') {
              allBlocks.push(rowBlock); // Push the table_row block
              // Cells are properties of table_row, not separate blocks fetched via children.list
              // The markdown converter will handle cell content from rowBlock.table_row.cells
            }
          }
        } else if (block.type === "child_page") {
          // ... (child_page handling as previously defined) ...
          if (currentDepth < maxDepth) {
            try {
              const childPageId = block.id;
              const childPageObject = await this.client.pages.retrieve({ page_id: childPageId }) as PageObjectResponse;
              const childPageTitle = this.getPageTitle(childPageObject);
              let childPageIcon: string | null = null;
              if ('icon' in childPageObject && childPageObject.icon) {
                childPageIcon = childPageObject.icon.type === 'emoji' ? childPageObject.icon.emoji : (childPageObject.icon.type === 'external' && childPageObject.icon.external ? childPageObject.icon.external.url : null);
              }
              const childBlocks = await this.getAllBlockChildren(childPageId, 0, currentDepth + 1, maxDepth);
              augmentedBlock.child_page_details = {
                title: childPageTitle,
                icon: childPageIcon,
                blocks: childBlocks,
                page: childPageObject,
              };
              augmentedBlock._isExpanded = true;
              allBlocks.push(augmentedBlock);
            } catch (e) {
              // eslint-disable-next-line no-console
              console.warn(`Failed to fetch or process child page ${block.id}: ${(e as Error).message}`);
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
            if (block.type !== "child_database" && block.type !== "table" /* table children handled above */) { 
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

  private async pageToMarkdown(
    pageId: string, 
    pageObject: PageObjectResponse, 
    currentDepth = DEFAULT_INITIAL_DEPTH, 
    maxDepth = DEFAULT_MAX_RECURSION_DEPTH, 
  ): Promise<string> {
    const pageBlocks = await this.getAllBlockChildren(pageId, 0, currentDepth, maxDepth);
    return blocksToMarkdown(pageBlocks, pageObject, this); 
  }

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
    // Ensure properties are iterated in a consistent order if possible (Object.keys gives some order)
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
              cellContent = richTextArrayToMarkdown(prop.title as any[], { type: 'tableCell' }); 
              break;
            case "rich_text":
              cellContent = richTextArrayToMarkdown(prop.rich_text as any[], { type: 'tableCell' }); 
              break;
            case "number":
              cellContent = prop.number !== null ? String(prop.number) : "";
              break;
            case "select":
              cellContent = prop.select ? prop.select.name : "";
              break;
            case "multi_select":
              cellContent = prop.multi_select.map(s => s.name).join(", ");
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
        cellContent = cellContent.replace(/\|/g, "\\|").replace(/n/g, "<br>");
        row.push(cellContent);
      }
      markdownTable += `| ${row.join(" | ")} |\\n`;
    }
    return markdownTable;
  }

  private async getUserName(userId: string): Promise<string> {
    try {
      const user = await this.client.users.retrieve({ user_id: userId });
      // User object from retrieve can be UserObjectResponse or PartialUserObjectResponse.
      // Check for 'name' property which exists on full UserObjectResponse.
      if (user && 'name' in user && user.name) {
        return user.name;
      }
      return userId; // Fallback to ID if name is not available or user is partial
    } catch {
      // console.warn(`Could not fetch user name for ID ${userId}`);
      return userId; // Fallback to ID if user lookup fails
    }
  }
}
