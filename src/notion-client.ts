import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';

export class NotionClient {
  private client: Client;
  private n2m: NotionToMarkdown;

  constructor(token: string) {
    this.client = new Client({ auth: token });
    this.n2m = new NotionToMarkdown({ notionClient: this.client });
  }

  async getTitleAndMarkdown(url: string): Promise<{ title: string; markdown: string }> {
    const id = this.extractId(url);
    let title = '';
    let markdown = '';
    if (url.includes('/database/')) {
      const db = await this.client.databases.retrieve({ database_id: id });
      title = this.getDatabaseTitle(db);
      markdown = await this.databaseToMarkdown(id);
    } else {
      const page = await this.client.pages.retrieve({ page_id: id });
      title = this.getPageTitle(page);
      markdown = await this.pageToMarkdown(id);
    }
    return { title, markdown };
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
    return page.properties?.title?.title?.[0]?.plain_text || page.title?.[0]?.plain_text || 'Untitled Page';
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
