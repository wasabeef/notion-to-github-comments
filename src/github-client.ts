import * as github from "@actions/github";
import * as core from "@actions/core";

/**
 * Hidden HTML comment marker used to identify comments created by this action.
 * This allows the action to find and update its own comments without affecting
 * other comments in the PR/issue thread.
 */
const HIDDEN_MARKER = "<!-- NOTION_TO_GITHUB_COMMENTS -->";

/**
 * GitHub client for managing pull request and issue comments.
 * 
 * This class provides a clean interface for interacting with GitHub's API
 * to create, update, find, and delete comments. It automatically handles
 * authentication and adds hidden markers to track comments created by this action.
 * 
 * @class GitHubClient
 * @example
 * const client = new GitHubClient(githubToken);
 * const existingId = await client.findExistingComment();
 * if (existingId) {
 *   await client.updateExistingComment(existingId, 'Updated content');
 * } else {
 *   await client.postNewComment('New content');
 * }
 */
export class GitHubClient {
  private octokit: ReturnType<typeof github.getOctokit>;
  private context: typeof github.context;

  /**
   * Initializes the GitHub client with authentication token.
   * 
   * @constructor
   * @param {string} token - GitHub personal access token or GITHUB_TOKEN from Actions
   * @throws {Error} May throw if token is invalid or GitHub API is unreachable
   * 
   * @example
   * // Using GitHub Actions token
   * const client = new GitHubClient(process.env.GITHUB_TOKEN);
   * 
   * // Using personal access token
   * const client = new GitHubClient('ghp_xxxxxxxxxxxx');
   */
  constructor(token: string) {
    this.octokit = github.getOctokit(token);
    this.context = github.context;
  }

  /**
   * Searches for an existing comment created by this action.
   * 
   * This method scans through all comments on the current PR/issue to find
   * one that contains our hidden marker and was created by the github-actions bot.
   * This ensures we only update comments created by this specific action.
   * 
   * @async
   * @returns {Promise<number|null>} The comment ID if found, null otherwise
   * @throws {Error} May throw if GitHub API request fails
   * 
   * @example
   * const commentId = await client.findExistingComment();
   * if (commentId) {
   *   console.log(`Found existing comment: ${commentId}`);
   * }
   */
  async findExistingComment(): Promise<number | null> {
    const { owner, repo } = this.context.repo;
    const issue_number = this.context.issue.number;
    const comments = await this.octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number,
    });
    return (
      comments.data.find(
        (c: {
          id: number;
          body?: string | null;
          user: { login?: string | null } | null;
        }) =>
          c.user?.login === "github-actions[bot]" &&
          c.body?.includes(HIDDEN_MARKER),
      )?.id || null
    );
  }

  /**
   * Creates a new comment on the pull request or issue.
   * 
   * The comment will automatically include a hidden marker that allows
   * this action to identify and update it in future runs.
   * 
   * @async
   * @param {string} body - Comment content in Markdown format
   * @returns {Promise<string>} URL of the created comment
   * @throws {Error} May throw if GitHub API request fails or permissions are insufficient
   * 
   * @example
   * const url = await client.postNewComment('## Hello\nThis is my comment');
   * console.log(`Comment created at: ${url}`);
   */
  async postNewComment(body: string): Promise<string | undefined> {
    const { owner, repo } = this.context.repo;
    const issue_number = this.context.issue.number;
    const response = await this.octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number,
      body: body + "\n" + HIDDEN_MARKER,
    });
    return response.data.html_url;
  }

  /**
   * Updates an existing comment with new content.
   * 
   * The hidden marker is preserved to ensure the comment can still be
   * found in future runs of the action.
   * 
   * @async
   * @param {number} commentId - ID of the comment to update
   * @param {string} body - New comment content in Markdown format
   * @returns {Promise<string|undefined>} URL of the updated comment
   * @throws {Error} May throw if comment doesn't exist or permissions are insufficient
   * 
   * @example
   * const url = await client.updateExistingComment(12345, '## Updated\nNew content');
   * console.log(`Comment updated at: ${url}`);
   */
  async updateExistingComment(
    commentId: number,
    body: string,
  ): Promise<string | undefined> {
    const { owner, repo } = this.context.repo;
    const response = await this.octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: commentId,
      body: body + "\n" + HIDDEN_MARKER,
    });
    return response.data.html_url;
  }

  /**
   * Deletes a comment from the pull request or issue.
   * 
   * This is typically used when no Notion URLs are found in the PR/issue body,
   * ensuring outdated Notion context comments are removed.
   * 
   * @async
   * @param {number} commentId - ID of the comment to delete
   * @returns {Promise<void>}
   * @throws {Error} May throw if comment doesn't exist or permissions are insufficient
   * 
   * @example
   * await client.deleteComment(12345);
   * console.log('Comment deleted successfully');
   */
  async deleteComment(commentId: number): Promise<void> {
    const { owner, repo } = this.context.repo;
    await this.octokit.rest.issues.deleteComment({
      owner,
      repo,
      comment_id: commentId,
    });
    core.info(`Deleted comment with ID: ${commentId}`);
  }
}
