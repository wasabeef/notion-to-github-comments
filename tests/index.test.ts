import { run } from '../src/index';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { GitHubClient } from '../src/github-client';
import { NotionClient } from '../src/notion-client';
import { extractNotionURLs } from '../src/url-extractor';
import { jest, describe, beforeEach, it, expect, afterEach } from '@jest/globals';

// Mock all dependencies
jest.mock('@actions/core');
jest.mock('@actions/github');
jest.mock('../src/github-client');
jest.mock('../src/notion-client');
jest.mock('../src/url-extractor');

describe('index.ts - Integration Tests', () => {
  let mockGetInput: jest.MockedFunction<typeof core.getInput>;
  let mockSetFailed: jest.MockedFunction<typeof core.setFailed>;
  let mockSetOutput: jest.MockedFunction<typeof core.setOutput>;
  let mockInfo: jest.MockedFunction<typeof core.info>;
  let mockWarning: jest.MockedFunction<typeof core.warning>;
  let mockGitHubClient: jest.Mocked<GitHubClient>;
  let mockNotionClient: jest.Mocked<NotionClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock core functions
    mockGetInput = core.getInput as jest.MockedFunction<typeof core.getInput>;
    mockSetFailed = core.setFailed as jest.MockedFunction<typeof core.setFailed>;
    mockSetOutput = core.setOutput as jest.MockedFunction<typeof core.setOutput>;
    mockInfo = core.info as jest.MockedFunction<typeof core.info>;
    mockWarning = core.warning as jest.MockedFunction<typeof core.warning>;

    // Setup input mocks
    mockGetInput.mockImplementation((name: string) => {
      if (name === 'github-token') return 'test-github-token';
      if (name === 'notion-token') return 'test-notion-token';
      return '';
    });

    // Setup GitHub client mock - Use actual method names
    mockGitHubClient = {
      findExistingComment: jest.fn(),
      postNewComment: jest.fn(),
      updateExistingComment: jest.fn(),
      deleteComment: jest.fn(),
    } as any;
    (GitHubClient as jest.MockedClass<typeof GitHubClient>).mockImplementation(() => mockGitHubClient);

    // Setup Notion client mock
    mockNotionClient = {
      getTitleAndMarkdown: jest.fn(),
    } as any;
    (NotionClient as jest.MockedClass<typeof NotionClient>).mockImplementation(() => mockNotionClient);

    // Setup URL extractor mock
    (extractNotionURLs as jest.MockedFunction<typeof extractNotionURLs>).mockReturnValue([]);

    // Setup GitHub context
    Object.defineProperty(github, 'context', {
      value: {
        payload: {
          pull_request: { body: '' },
          issue: { body: '' }
        },
        repo: { owner: 'test-owner', repo: 'test-repo' },
        issue: { number: 123 }
      },
      writable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic functionality', () => {
    it('should handle PR with no Notion URLs', async () => {
      // Setup
      github.context.payload.pull_request = { body: 'This is a PR without any Notion URLs', number: 123 };
      (extractNotionURLs as jest.MockedFunction<typeof extractNotionURLs>).mockReturnValue([]);

      // Execute
      await run();

      // Verify
      expect(extractNotionURLs).toHaveBeenCalledWith('This is a PR without any Notion URLs');
      expect(mockInfo).toHaveBeenCalledWith('No Notion URLs found.');
      expect(mockNotionClient.getTitleAndMarkdown).not.toHaveBeenCalled();
    });

    it('should handle empty PR body', async () => {
      // Setup
      github.context.payload.pull_request = { body: '', number: 123 };

      // Execute
      await run();

      // Verify
      expect(mockInfo).toHaveBeenCalledWith('No Notion URLs found.');
      expect(mockNotionClient.getTitleAndMarkdown).not.toHaveBeenCalled();
    });

    it('should process single Notion URL and create new comment', async () => {
      // Setup
      const notionUrl = 'https://notion.so/page-abc123def456gh789ijkl012mnop3456';
      github.context.payload.pull_request = { body: `Check out this page: ${notionUrl}`, number: 123 };
      (extractNotionURLs as jest.MockedFunction<typeof extractNotionURLs>).mockReturnValue([notionUrl]);
      mockNotionClient.getTitleAndMarkdown.mockResolvedValue({
        title: 'Test Page',
        markdown: '# Test Content\n\nThis is test content.',
        url: notionUrl,
        icon: null,
      });
      mockGitHubClient.findExistingComment.mockResolvedValue(null);
      mockGitHubClient.postNewComment.mockResolvedValue('https://github.com/owner/repo/issues/1#issuecomment-123');

      // Execute
      await run();

      // Verify
      expect(mockNotionClient.getTitleAndMarkdown).toHaveBeenCalledWith(notionUrl);
      expect(mockGitHubClient.postNewComment).toHaveBeenCalled();
      const commentBody = mockGitHubClient.postNewComment.mock.calls[0][0];
      expect(commentBody).toContain('### 🤖 Notion Context');
      expect(commentBody).toContain('Test Page');
      expect(commentBody).toContain('# Test Content\n\nThis is test content.');
      expect(mockSetOutput).toHaveBeenCalledWith('comment-url', 'https://github.com/owner/repo/issues/1#issuecomment-123');
    });

    it('should process multiple Notion URLs', async () => {
      // Setup
      const notionUrls = [
        'https://notion.so/page1-abc123def456gh789ijkl012mnop3456',
        'https://notion.so/page2-def456gh789ijkl012mnop3456abc123',
      ];
      github.context.payload.pull_request = { body: `URLs: ${notionUrls.join(' and ')}`, number: 123 };
      (extractNotionURLs as jest.MockedFunction<typeof extractNotionURLs>).mockReturnValue(notionUrls);
      
      mockNotionClient.getTitleAndMarkdown
        .mockResolvedValueOnce({ title: 'Page 1', markdown: 'Content 1', url: notionUrls[0], icon: null })
        .mockResolvedValueOnce({ title: 'Page 2', markdown: 'Content 2', url: notionUrls[1], icon: null });
      
      mockGitHubClient.findExistingComment.mockResolvedValue(null);
      mockGitHubClient.postNewComment.mockResolvedValue('https://github.com/owner/repo/issues/1#issuecomment-123');

      // Execute
      await run();

      // Verify
      expect(mockNotionClient.getTitleAndMarkdown).toHaveBeenCalledTimes(2);
      expect(mockNotionClient.getTitleAndMarkdown).toHaveBeenCalledWith(notionUrls[0]);
      expect(mockNotionClient.getTitleAndMarkdown).toHaveBeenCalledWith(notionUrls[1]);
      
      const commentBody = mockGitHubClient.postNewComment.mock.calls[0][0];
      expect(commentBody).toContain('Page 1');
      expect(commentBody).toContain('Content 1');
      expect(commentBody).toContain('Page 2');
      expect(commentBody).toContain('Content 2');
    });

    it('should update existing comment', async () => {
      // Setup
      const notionUrl = 'https://notion.so/page-abc123def456gh789ijkl012mnop3456';
      github.context.payload.pull_request = { body: `URL: ${notionUrl}`, number: 123 };
      (extractNotionURLs as jest.MockedFunction<typeof extractNotionURLs>).mockReturnValue([notionUrl]);
      mockNotionClient.getTitleAndMarkdown.mockResolvedValue({
        title: 'Updated Page',
        markdown: 'Updated content',
        url: notionUrl,
        icon: null,
      });
      mockGitHubClient.findExistingComment.mockResolvedValue(456); // Existing comment ID
      mockGitHubClient.updateExistingComment.mockResolvedValue('https://github.com/owner/repo/issues/1#issuecomment-456');

      // Execute
      await run();

      // Verify
      expect(mockGitHubClient.updateExistingComment).toHaveBeenCalledWith(456, expect.any(String));
      expect(mockGitHubClient.postNewComment).not.toHaveBeenCalled();
      expect(mockSetOutput).toHaveBeenCalledWith('comment-url', 'https://github.com/owner/repo/issues/1#issuecomment-456');
    });
  });

  describe('Error handling', () => {
    it('should handle missing github-token', async () => {
      // Setup
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'github-token') return '';
        if (name === 'notion-token') return 'test-notion-token';
        return '';
      });

      // Execute & Verify - Should not throw but may fail later when using the token
      await run();
      
      // Verify no errors were logged since we don't have any URLs to process
      expect(mockInfo).toHaveBeenCalledWith('No Notion URLs found.');
    });

    it('should handle missing notion-token', async () => {
      // Setup
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'github-token') return 'test-github-token';
        if (name === 'notion-token') return '';
        return '';
      });

      // Execute & Verify - Should not throw but may fail later when using the token
      await run();
      
      // Verify no errors were logged since we don't have any URLs to process
      expect(mockInfo).toHaveBeenCalledWith('No Notion URLs found.');
    });

    it('should handle Notion API errors gracefully', async () => {
      // Setup
      const notionUrl = 'https://notion.so/page-abc123def456gh789ijkl012mnop3456';
      github.context.payload.pull_request = { body: `URL: ${notionUrl}`, number: 123 };
      (extractNotionURLs as jest.MockedFunction<typeof extractNotionURLs>).mockReturnValue([notionUrl]);
      mockNotionClient.getTitleAndMarkdown.mockRejectedValue(new Error('Notion API error'));
      mockGitHubClient.findExistingComment.mockResolvedValue(null);
      mockGitHubClient.postNewComment.mockResolvedValue('https://github.com/owner/repo/issues/1#issuecomment-123');

      // Execute
      await run();

      // Verify
      expect(mockWarning).toHaveBeenCalledWith(expect.stringContaining('Failed to process'));
      expect(mockGitHubClient.postNewComment).toHaveBeenCalled();
      const commentBody = mockGitHubClient.postNewComment.mock.calls[0][0];
      expect(commentBody).toContain('Failed to fetch');
      expect(commentBody).toContain('Notion API error');
    });

    it('should handle errors with non-Error objects', async () => {
      // Setup
      const notionUrl = 'https://notion.so/page-abc123def456gh789ijkl012mnop3456';
      github.context.payload.pull_request = { body: `URL: ${notionUrl}`, number: 123 };
      (extractNotionURLs as jest.MockedFunction<typeof extractNotionURLs>).mockReturnValue([notionUrl]);
      mockNotionClient.getTitleAndMarkdown.mockRejectedValue('String error');
      mockGitHubClient.findExistingComment.mockResolvedValue(null);
      mockGitHubClient.postNewComment.mockResolvedValue('https://github.com/owner/repo/issues/1#issuecomment-123');

      // Execute
      await run();

      // Verify
      expect(mockWarning).toHaveBeenCalledWith(expect.stringContaining('Failed to process'));
    });

    it('should handle comment creation failure', async () => {
      // Setup
      const notionUrl = 'https://notion.so/page-abc123def456gh789ijkl012mnop3456';
      github.context.payload.pull_request = { body: `URL: ${notionUrl}`, number: 123 };
      (extractNotionURLs as jest.MockedFunction<typeof extractNotionURLs>).mockReturnValue([notionUrl]);
      mockNotionClient.getTitleAndMarkdown.mockResolvedValue({
        title: 'Test Page',
        markdown: 'Test content',
        url: notionUrl,
        icon: null,
      });
      mockGitHubClient.findExistingComment.mockResolvedValue(null);
      mockGitHubClient.postNewComment.mockRejectedValue(new Error('Failed to create comment'));

      // Execute
      await run();

      // Verify
      expect(mockSetFailed).toHaveBeenCalledWith('Failed to create comment');
    });
  });

  describe('Edge cases', () => {
    it('should handle PR body with null', async () => {
      // Setup
      github.context.payload.pull_request = { body: null as any, number: 123 };

      // Execute
      await run();

      // Verify
      expect(extractNotionURLs).toHaveBeenCalledWith('');
      expect(mockInfo).toHaveBeenCalledWith('No Notion URLs found.');
    });

    it('should handle duplicate Notion URLs', async () => {
      // Setup
      const notionUrl = 'https://notion.so/page-abc123def456gh789ijkl012mnop3456';
      github.context.payload.pull_request = { body: `URL: ${notionUrl} and again ${notionUrl}`, number: 123 };
      (extractNotionURLs as jest.MockedFunction<typeof extractNotionURLs>).mockReturnValue([notionUrl, notionUrl]);
      mockNotionClient.getTitleAndMarkdown.mockResolvedValue({
        title: 'Test Page',
        markdown: 'Test content',
        url: notionUrl,
        icon: null,
      });
      mockGitHubClient.findExistingComment.mockResolvedValue(null);
      mockGitHubClient.postNewComment.mockResolvedValue('https://github.com/owner/repo/issues/1#issuecomment-123');

      // Execute
      await run();

      // Verify
      // Should process each URL even if duplicated
      expect(mockNotionClient.getTitleAndMarkdown).toHaveBeenCalledTimes(2);
    });

    it('should handle very long content', async () => {
      // Setup
      const notionUrl = 'https://notion.so/page-abc123def456gh789ijkl012mnop3456';
      const longContent = 'Very long content. '.repeat(1000);
      github.context.payload.pull_request = { body: `URL: ${notionUrl}`, number: 123 };
      (extractNotionURLs as jest.MockedFunction<typeof extractNotionURLs>).mockReturnValue([notionUrl]);
      mockNotionClient.getTitleAndMarkdown.mockResolvedValue({
        title: 'Long Page',
        markdown: longContent,
        url: notionUrl,
        icon: null,
      });
      mockGitHubClient.findExistingComment.mockResolvedValue(null);
      mockGitHubClient.postNewComment.mockResolvedValue('https://github.com/owner/repo/issues/1#issuecomment-123');

      // Execute
      await run();

      // Verify
      expect(mockGitHubClient.postNewComment).toHaveBeenCalled();
      const commentBody = mockGitHubClient.postNewComment.mock.calls[0][0];
      expect(commentBody).toContain(longContent);
    });

    it('should handle partial failures in multiple URLs', async () => {
      // Setup
      const notionUrls = [
        'https://notion.so/page1-abc123def456gh789ijkl012mnop3456',
        'https://notion.so/page2-def456gh789ijkl012mnop3456abc123',
        'https://notion.so/page3-ghi789jkl012mnop3456qrs789tuv012',
      ];
      github.context.payload.pull_request = { body: `URLs: ${notionUrls.join(' ')}`, number: 123 };
      (extractNotionURLs as jest.MockedFunction<typeof extractNotionURLs>).mockReturnValue(notionUrls);
      
      mockNotionClient.getTitleAndMarkdown
        .mockResolvedValueOnce({ title: 'Page 1', markdown: 'Content 1', url: notionUrls[0], icon: null })
        .mockRejectedValueOnce(new Error('Failed to fetch page 2'))
        .mockResolvedValueOnce({ title: 'Page 3', markdown: 'Content 3', url: notionUrls[2], icon: null });
      
      mockGitHubClient.findExistingComment.mockResolvedValue(null);
      mockGitHubClient.postNewComment.mockResolvedValue('https://github.com/owner/repo/issues/1#issuecomment-123');

      // Execute
      await run();

      // Verify
      expect(mockNotionClient.getTitleAndMarkdown).toHaveBeenCalledTimes(3);
      expect(mockWarning).toHaveBeenCalledWith(expect.stringContaining('Failed to process'));
      
      const commentBody = mockGitHubClient.postNewComment.mock.calls[0][0];
      expect(commentBody).toContain('Page 1');
      expect(commentBody).toContain('Content 1');
      expect(commentBody).toContain('Failed to fetch');
      expect(commentBody).toContain('Page 3');
      expect(commentBody).toContain('Content 3');
    });
  });
});