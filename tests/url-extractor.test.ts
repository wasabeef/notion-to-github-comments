import { extractNotionURLs } from '../src/url-extractor';

/**
 * Test suite for Notion URL extraction functionality
 * Tests various URL formats, edge cases, and filtering logic
 */
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

  it('should NOT extract custom domain URLs even if they contain a Notion-like ID', () => {
    const text = 'Custom: https://notes.example.com/my-great-doc-abcdef1234567890abcdef1234567890';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(0);
  });

  it('should NOT extract custom domain URLs with hyphenated UUIDs', () => {
    const text = 'Custom UUID: https://docs.anotherexample.co.uk/page-slug-12345678-aaaa-bbbb-cccc-1234567890ab?query=true';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(0);
  });

  it('should NOT extract GitHub URLs with similar ID patterns', () => {
    const text = 'GitHub link: https://github.com/example/repo/blob/abcdef1234567890abcdef1234567890/docs/example.md';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(0);
  });

  it('should NOT extract other service URLs with UUID-like patterns', () => {
    const text = `
      Google Drive: https://drive.google.com/file/d/1234567890abcdef1234567890abcdef/view
      Dropbox: https://www.dropbox.com/s/abcdef1234567890abcdef1234567890/file.pdf
      Generic: https://example.com/files/12345678-1234-5678-1234-567890abcdef
    `;
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(0);
  });

  it('should NOT extract other common service URLs with hex patterns', () => {
    const text = `
      GitLab: https://gitlab.com/project/repo/-/commit/fedcba9876543210abcdef1234567890
      Bitbucket: https://bitbucket.org/workspace/repo/commits/0123456789abcdef0123456789abcdef
      AWS S3: https://s3.amazonaws.com/bucket/folder/abcdef1234567890abcdef1234567890/file.pdf
      Azure: https://myaccount.blob.core.windows.net/container/12345678-90ab-cdef-1234-567890abcdef
      Slack: https://files.slack.com/files-pri/T12345678-F1234567890abcdef1234567890abcdef/file.png
      Trello: https://trello.com/c/aBcDeFgH/123-card-name-with-1234567890abcdef1234567890abcdef
      Jira: https://example.atlassian.net/browse/PROJ-1234?focusedCommentId=12345678-1234-1234-1234-123456789abc
      Confluence: https://example.atlassian.net/wiki/spaces/SPACE/pages/1234567890/Page+Title+abcdef1234567890
      MongoDB: https://cloud.mongodb.com/v2/1234567890abcdef1234567890abcdef#clusters
      Firebase: https://console.firebase.google.com/project/my-project-1234567890abcdef/database/data
    `;
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(0);
  });

  it('should ignore URLs inside HTML comments', () => {
    const text = 'Here is a valid URL: https://www.notion.so/valid-abcdef1234567890abcdef1234567890\n<!-- e.g. https://www.notion.so/workspace/1234567890abcdef1234567890abcdef -->';
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

  // Additional edge case tests
  it('should handle empty string', () => {
    const urls = extractNotionURLs('');
    expect(urls).toEqual([]);
  });

  it('should handle null input', () => {
    const urls = extractNotionURLs(null as any);
    expect(urls).toEqual([]);
  });

  it('should handle undefined input', () => {
    const urls = extractNotionURLs(undefined as any);
    expect(urls).toEqual([]);
  });

  it('should handle URLs with special characters in path', () => {
    const text = 'https://notion.so/workspace/Page-with-%20spaces-abc123def456gh789ijkl012mnop3456';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(1);
    expect(urls[0]).toBe('https://notion.so/workspace/Page-with-%20spaces-abc123def456gh789ijkl012mnop3456');
  });

  it('should handle URLs with unicode characters', () => {
    const text = 'https://notion.so/workspace/ページ-タイトル-abc123def456gh789ijkl012mnop3456';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(1);
    expect(urls[0]).toBe('https://notion.so/workspace/ページ-タイトル-abc123def456gh789ijkl012mnop3456');
  });

  it('should handle URLs with fragment identifiers', () => {
    const text = 'https://notion.so/page-abc123def456gh789ijkl012mnop3456#heading-123';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(1);
    expect(urls[0]).toBe('https://notion.so/page-abc123def456gh789ijkl012mnop3456#heading-123');
  });

  it('should handle URLs with multiple query parameters', () => {
    const text = 'https://notion.so/page?p=abc123def456gh789ijkl012mnop3456&v=gallery&sort=name';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(1);
    // The URL extraction keeps all parameters when the ID format doesn't match the regex
    expect(urls[0]).toBe('https://notion.so/page?p=abc123def456gh789ijkl012mnop3456&v=gallery&sort=name');
  });

  it('should handle malformed URLs gracefully', () => {
    const text = 'https://notion.so/[invalid-characters]-abc123def456gh789ijkl012mnop3456';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(1);
    // Should still extract the URL even if it contains invalid characters
  });

  it('should handle URLs in nested HTML structures', () => {
    const text = '<div><a href="https://notion.so/page-abc123def456gh789ijkl012mnop3456">Link</a></div>';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(1);
    expect(urls[0]).toBe('https://notion.so/page-abc123def456gh789ijkl012mnop3456');
  });

  it('should handle very long input text', () => {
    const longText = 'Some text '.repeat(10000) + 'https://notion.so/page-abc123def456gh789ijkl012mnop3456' + ' more text'.repeat(10000);
    const urls = extractNotionURLs(longText);
    expect(urls.length).toBe(1);
    expect(urls[0]).toBe('https://notion.so/page-abc123def456gh789ijkl012mnop3456');
  });

  it('should handle URLs with different protocols', () => {
    const text = `
      http://notion.so/page-abc123def456gh789ijkl012mnop3456
      https://notion.so/page-def456gh789ijkl012mnop3456abc123
      ftp://notion.so/not-a-valid-notion-url
      notion://not-a-web-url
    `;
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(2);
    expect(urls).toContain('http://notion.so/page-abc123def456gh789ijkl012mnop3456');
    expect(urls).toContain('https://notion.so/page-def456gh789ijkl012mnop3456abc123');
  });

  it('should handle edge case with URL at the very end', () => {
    const text = 'Check this out: https://notion.so/abc123def456gh789ijkl012mnop3456';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(1);
    expect(urls[0]).toBe('https://notion.so/abc123def456gh789ijkl012mnop3456');
  });

  it('should handle edge case with URL at the very beginning', () => {
    const text = 'https://notion.so/abc123def456gh789ijkl012mnop3456 is the URL';
    const urls = extractNotionURLs(text);
    expect(urls.length).toBe(1);
    expect(urls[0]).toBe('https://notion.so/abc123def456gh789ijkl012mnop3456');
  });
});
