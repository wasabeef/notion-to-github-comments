import { extractNotionURLs } from '../src/url-extractor';

describe('extractNotionURLs', () => {
  it('should extract multiple Notion URLs', () => {
    const text = 'Here are https://www.notion.so/abc123def456gh789ijkl012mnop3456 and https://notion.so/9876fedcba543210fedcba0987654321.';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(2);
    expect(urls[0]).toContain('notion.so');
  });

  it('should remove duplicate URLs', () => {
    const text = 'https://notion.so/abc123def456gh789ijkl012mnop3456 https://notion.so/abc123def456gh789ijkl012mnop3456';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(1);
  });

  it('should return empty array if no Notion URLs', () => {
    const text = 'No Notion links here.';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(0);
  });

  it('should handle UUID format URLs', () => {
    const text = 'Check this: https://notion.so/12345678-1234-1234-1234-123456789abc';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(1);
    expect(urls[0]).toBe('https://notion.so/12345678-1234-1234-1234-123456789abc');
  });

  it('should clean trailing punctuation', () => {
    const text = 'See https://notion.so/abc123def456gh789ijkl012mnop3456.';
    const urls = extractNotionURLs(text);
    expect(urls[0]).toBe('https://notion.so/abc123def456gh789ijkl012mnop3456');
  });

  it('should handle URLs in markdown links', () => {
    const text = '[Design](https://notion.so/abc123def456gh789ijkl012mnop3456)';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(1);
  });

  it('should extract username.notion.site URLs', () => {
    const text = 'Link: https://username.notion.site/page-title-1234567890abcdef1234567890abcdef';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(1);
    expect(urls[0]).toBe('https://username.notion.site/page-title-1234567890abcdef1234567890abcdef');
  });

  it('should extract workspace.notion.site URLs', () => {
    const text = 'Check this out: https://yourworkspace.notion.site/another-page-11223344556677889900aabbccddeeff';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(1);
    expect(urls[0]).toBe('https://yourworkspace.notion.site/another-page-11223344556677889900aabbccddeeff');
  });

  it('should extract URLs with page titles and hyphens in title', () => {
    const text = 'The doc: https://www.notion.so/my-cool-page-title-abcdef1234567890abcdef1234567890';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(1);
    expect(urls[0]).toBe('https://www.notion.so/my-cool-page-title-abcdef1234567890abcdef1234567890');
  });

  it('should extract database URLs with view ID', () => {
    const text = 'DB: https://www.notion.so/myworkspace/databasename-qwerty1234567890asdfgh1234567890?v=zxcvb6543210mnbvc9876543210lkjhg';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(1);
    expect(urls[0]).toBe('https://www.notion.so/myworkspace/databasename-qwerty1234567890asdfgh1234567890?v=zxcvb6543210mnbvc9876543210lkjhg');
  });

  it('should extract URLs with only ID (no page title)', () => {
    const text = 'Minimal URL: https://www.notion.so/abcdef1234567890abcdef1234567890';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(1);
    expect(urls[0]).toBe('https://www.notion.so/abcdef1234567890abcdef1234567890');
  });

  it('should correctly extract URL with page ID query parameter ?p=', () => {
    const text = 'Test URL: https://www.notion.so/some-text/Page-Title-12345?p=abcdef1234567890abcdef1234567890&somethinelse';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(1);
    expect(urls[0]).toBe('https://www.notion.so/some-text/Page-Title-12345?p=abcdef1234567890abcdef1234567890');
  });

  it('should correctly extract URL with page ID query parameter ?page_id=', () => {
    const text = 'Another: https://www.notion.site/whatever/slug?page_id=12345678-1234-5678-1234-1234567890ab&foo=bar';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(1);
    expect(urls[0]).toBe('https://www.notion.site/whatever/slug?page_id=12345678-1234-5678-1234-1234567890ab');
  });

  it('should handle custom domain like URLs if they contain a Notion ID', () => {
    const text = 'Custom: https://notes.example.com/my-great-doc-abcdef1234567890abcdef1234567890';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(1);
    expect(urls[0]).toBe('https://notes.example.com/my-great-doc-abcdef1234567890abcdef1234567890');
  });

  it('should handle custom domain like URLs with hyphenated UUIDs', () => {
    const text = 'Custom UUID: https://docs.anotherexample.co.uk/page-slug-12345678-aaaa-bbbb-cccc-1234567890ab?query=true';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(1);
    expect(urls[0]).toBe('https://docs.anotherexample.co.uk/page-slug-12345678-aaaa-bbbb-cccc-1234567890ab?query=true');
  });

  it('should ignore URLs inside HTML comments', () => {
    const text = 'Here is a valid URL: https://www.notion.so/valid-abcdef1234567890abcdef1234567890\n<!-- e.g. https://www.notion.so/jumptoon/ea9b5bce5ce34c1b8059c2dd3ccf279d -->';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(1);
    expect(urls[0]).toBe('https://www.notion.so/valid-abcdef1234567890abcdef1234567890');
  });

  it('should ignore multiple URLs inside multiple HTML comments', () => {
    const text = `
    Valid URL: https://www.notion.so/valid-abcdef1234567890abcdef1234567890
    <!-- Comment 1: https://www.notion.so/comment1-1111111111111111111111111111111 -->
    Another valid: https://username.notion.site/another-valid-2222222222222222222222222222222
    <!-- Comment 2: https://workspace.notion.site/comment2-3333333333333333333333333333333 -->
    `;
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(2);
    expect(urls).toContain('https://www.notion.so/valid-abcdef1234567890abcdef1234567890');
    expect(urls).toContain('https://username.notion.site/another-valid-2222222222222222222222222222222');
  });

  it('should handle multiline HTML comments', () => {
    const text = `
    Valid URL: https://www.notion.so/valid-abcdef1234567890abcdef1234567890
    <!--
    This is a multiline comment
    https://www.notion.so/commented-out-1111111111111111111111111111111
    End of comment
    -->
    `;
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(1);
    expect(urls[0]).toBe('https://www.notion.so/valid-abcdef1234567890abcdef1234567890');
  });
});
