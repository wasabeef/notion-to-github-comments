import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';

export class NotionClient {
  private client: Client;
  private n2m: NotionToMarkdown;

  /**
   * Creates an instance of NotionClient.
   * @param {string} token The Notion API integration token.
   */
  constructor(token: string) {
    this.client = new Client({ auth: token });
    this.n2m = new NotionToMarkdown({ notionClient: this.client });
  }

  /**
   * Retrieves the title and markdown content of a Notion page or a simplified markdown representation of a database.
   * @param {string} url The URL of the Notion page or database.
   * @returns {Promise<{ title: string; markdown: string; url: string; icon: string | null }>} A promise that resolves to an object containing the title, markdown content, the original URL, and the icon.
   * @throws {Error} If the Notion URL format is invalid or if there is an error retrieving data from Notion API.
   */
  async getTitleAndMarkdown(url: string): Promise<{ title: string; markdown: string; url: string; icon: string | null }> {
    const id = this.extractId(url);
    let title = '';
    let markdown = '';
    let icon: string | null = null;

    if (url.includes('/database/')) {
      const db = await this.client.databases.retrieve({ database_id: id });
      title = this.getDatabaseTitle(db);
      markdown = await this.databaseToMarkdown(id);
      if ('icon' in db && db.icon) {
        icon = db.icon.type === 'emoji' ? db.icon.emoji : (db.icon.type === 'external' && db.icon.external ? db.icon.external.url : null);
      }
    } else {
      const page = await this.client.pages.retrieve({ page_id: id });
      title = this.getPageTitle(page);
      markdown = await this.pageToMarkdown(id);
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

  private getPageTitle(page: any): string {
    // Find the property with type 'title'
    if (page.properties) {
      for (const propName in page.properties) {
        const prop = page.properties[propName];
        if (prop?.type === 'title' && prop.title?.[0]?.plain_text) {
          return prop.title[0].plain_text;
        }
      }
    }
    // Fallback for older page structures or if no title property found
    return page.title?.[0]?.plain_text || 'Untitled Page';
  }

  private getDatabaseTitle(db: any): string {
    return db.title?.[0]?.plain_text || 'Untitled Database';
  }

  private async pageToMarkdown(pageId: string): Promise<string> {
    const mdBlocks = await this.n2m.pageToMarkdown(pageId);
    const result = this.n2m.toMarkdownString(mdBlocks);
    return typeof result === 'string' ? result : result.parent || '';
  }

  private async databaseToMarkdown(databaseId: string): Promise<string> {
    // Simple table markdown conversion for database
    const query = await this.client.databases.query({ database_id: databaseId });
    const rows = query.results;
    if (!rows.length) return 'No data';
    
    // Type guard to ensure we have page objects with properties
    const pageRows = rows.filter((row): row is any => 'properties' in row);
    if (!pageRows.length) return 'No accessible data';
    
    const headers = Object.keys(pageRows[0].properties);
    const table = [
      '| ' + headers.join(' | ') + ' |',
      '| ' + headers.map(() => '---').join(' | ') + ' |',
      ...pageRows.map(row =>
        '| ' +
        headers
          .map(h => {
            const prop = row.properties[h];
            if (prop?.type === 'title') return prop.title?.[0]?.plain_text || '';
            if (prop?.type === 'rich_text') return prop.rich_text?.[0]?.plain_text || '';
            if (prop?.type === 'select') return prop.select?.name || '';
            if (prop?.type === 'date') return prop.date?.start || '';
            return '';
          })
          .join(' | ') +
        ' |'
      ),
    ];
    return table.join('\n');
  }
}
