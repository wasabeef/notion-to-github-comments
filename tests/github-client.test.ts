import { GitHubClient } from '../src/github-client';
import * as github from '@actions/github';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';

// Mock GitHub context and getOctokit
jest.mock('@actions/github');

describe('GitHubClient', () => {
  // Type definition for the methods we're using
  interface GitHubClientInterface {
    findExistingComment: () => Promise<number | null>;
    postNewComment: (body: string) => Promise<string>;
    updateExistingComment: (commentId: number, body: string) => Promise<string>;
  }
  let mockOctokit: any;
  let gitHubClient: GitHubClientInterface;
  const mockToken = 'test-github-token';

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock Octokit instance
    mockOctokit = {
      rest: {
        issues: {
          listComments: jest.fn(),
          createComment: jest.fn(),
          updateComment: jest.fn(),
          get: jest.fn(),
        },
        pulls: {
          get: jest.fn(),
        },
      },
    };

    // Mock getOctokit to return our mock instance
    (github.getOctokit as jest.Mock).mockReturnValue(mockOctokit);

    // Setup default GitHub context
    Object.defineProperty(github, 'context', {
      value: {
        repo: { owner: 'test-owner', repo: 'test-repo' },
        issue: { number: 123 },
        eventName: 'pull_request',
        payload: {
          pull_request: { number: 123 },
        },
      },
      writable: true,
    });

    // Create GitHubClient instance
    gitHubClient = new GitHubClient(mockToken) as any;
  });

  describe('constructor', () => {
    it('should initialize with provided token', () => {
      expect(github.getOctokit).toHaveBeenCalledWith(mockToken);
    });
  });

  describe('findExistingComment', () => {
    const mockContext = {
      repo: { owner: 'test-owner', repo: 'test-repo' },
      issue: { number: 123 },
    };

    beforeEach(() => {
      // Mock github.context
      Object.defineProperty(github, 'context', {
        value: mockContext,
        writable: true,
      });
    });

    it('should return existing comment when found', async () => {
      const mockComments = [
        { id: 1, body: 'Some other comment', user: { login: 'user1' } },
        { id: 2, body: '## 📝 Notion Context\nTest content\n<!-- NOTION_TO_GITHUB_COMMENTS -->', user: { login: 'github-actions[bot]' } },
      ];

      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: mockComments });

      const result = await gitHubClient.findExistingComment();

      expect(mockOctokit.rest.issues.listComments).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 123,
      });
      expect(result).toBe(2);
    });

    it('should return null when no matching comment found', async () => {
      const mockComments = [
        { id: 1, body: 'Some other comment', user: { login: 'user1' } },
        { id: 2, body: 'Another comment', user: { login: 'github-actions[bot]' } },
      ];

      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: mockComments });

      const result = await gitHubClient.findExistingComment();

      expect(result).toBeNull();
    });

    it('should handle comments with missing body', async () => {
      const mockComments = [
        { id: 1, body: null, user: { login: 'github-actions[bot]' } },
        { id: 2, body: undefined, user: { login: 'github-actions[bot]' } },
        { id: 3, user: { login: 'github-actions[bot]' } }, // no body property
      ];

      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: mockComments });

      const result = await gitHubClient.findExistingComment();

      expect(result).toBeNull();
    });

    it('should handle comments with missing user', async () => {
      const mockComments = [
        { id: 1, body: '## 📝 Notion Context\nTest', user: null },
        { id: 2, body: '## 📝 Notion Context\nTest' }, // no user property
      ];

      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: mockComments });

      const result = await gitHubClient.findExistingComment();

      expect(result).toBeNull();
    });

    it('should handle empty comments array', async () => {
      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: [] });

      const result = await gitHubClient.findExistingComment();

      expect(result).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      mockOctokit.rest.issues.listComments.mockRejectedValue(new Error('API Error'));

      await expect(gitHubClient.findExistingComment()).rejects.toThrow('API Error');
    });
  });

  describe('postNewComment', () => {
    beforeEach(() => {
      // postNewComment uses the default context set in the outer beforeEach
    });

    it('should create a new comment successfully', async () => {
      const body = 'Test comment body';
      const mockResponse = {
        data: {
          id: 789,
          html_url: 'https://github.com/test-owner/test-repo/issues/456#issuecomment-789',
        },
      };

      mockOctokit.rest.issues.createComment.mockResolvedValue(mockResponse);

      const result = await gitHubClient.postNewComment(body);

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 123,
        body: body + '\n<!-- NOTION_TO_GITHUB_COMMENTS -->',
      });
      expect(result).toBe('https://github.com/test-owner/test-repo/issues/456#issuecomment-789');
    });

    it('should handle empty body', async () => {
      const mockResponse = {
        data: {
          id: 123,
          html_url: 'https://github.com/test-owner/test-repo/issues/456#issuecomment-123',
        },
      };

      mockOctokit.rest.issues.createComment.mockResolvedValue(mockResponse);

      const result = await gitHubClient.postNewComment('');

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 123,
        body: '\n<!-- NOTION_TO_GITHUB_COMMENTS -->',
      });
      expect(result).toBe('https://github.com/test-owner/test-repo/issues/456#issuecomment-123');
    });

    it('should handle API errors', async () => {
      mockOctokit.rest.issues.createComment.mockRejectedValue(new Error('Failed to create comment'));

      await expect(gitHubClient.postNewComment('test')).rejects.toThrow('Failed to create comment');
    });
  });

  describe('updateExistingComment', () => {
    const mockContext = {
      repo: { owner: 'test-owner', repo: 'test-repo' },
    };

    beforeEach(() => {
      Object.defineProperty(github, 'context', {
        value: mockContext,
        writable: true,
      });
    });

    it('should update an existing comment successfully', async () => {
      const commentId = 999;
      const body = 'Updated comment body';
      const mockResponse = {
        data: {
          id: commentId,
          html_url: 'https://github.com/test-owner/test-repo/issues/123#issuecomment-999',
        },
      };

      mockOctokit.rest.issues.updateComment.mockResolvedValue(mockResponse);

      const result = await gitHubClient.updateExistingComment(commentId, body);

      expect(mockOctokit.rest.issues.updateComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        comment_id: commentId,
        body: body + '\n<!-- NOTION_TO_GITHUB_COMMENTS -->',
      });
      expect(result).toBe('https://github.com/test-owner/test-repo/issues/123#issuecomment-999');
    });

    it('should handle zero comment ID', async () => {
      const mockResponse = {
        data: {
          id: 0,
          html_url: 'https://github.com/test-owner/test-repo/issues/123#issuecomment-0',
        },
      };

      mockOctokit.rest.issues.updateComment.mockResolvedValue(mockResponse);

      const result = await gitHubClient.updateExistingComment(0, 'test body');

      expect(mockOctokit.rest.issues.updateComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        comment_id: 0,
        body: 'test body\n<!-- NOTION_TO_GITHUB_COMMENTS -->',
      });
      expect(result).toBe('https://github.com/test-owner/test-repo/issues/123#issuecomment-0');
    });

    it('should handle API errors', async () => {
      mockOctokit.rest.issues.updateComment.mockRejectedValue(new Error('Update failed'));

      await expect(gitHubClient.updateExistingComment(123, 'test')).rejects.toThrow('Update failed');
    });
  });

  // Note: getPRorIssueBody method tests are removed as this method doesn't exist in the actual GitHubClient implementation
});