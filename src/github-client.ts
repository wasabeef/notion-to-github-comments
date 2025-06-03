import * as github from '@actions/github';
import * as core from '@actions/core';

const HIDDEN_MARKER = '<!-- NOTION_TO_GITHUB_COMMENTS -->';

export class GithubClient {
  private octokit: ReturnType<typeof github.getOctokit>;
  private context: typeof github.context;

  /**
   * Creates an instance of GithubClient.
   * @param {string} token The GitHub token for API authentication.
   */
  constructor(token: string) {
    this.octokit = github.getOctokit(token);
    this.context = github.context;
  }

  /**
   * Finds an existing comment created by this action on the current PR/issue.
   * It looks for a comment made by 'github-actions[bot]' containing a specific hidden marker.
   * @returns {Promise<number | null>} A promise that resolves to the comment ID if found, otherwise null.
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
        (c: { id: number; body?: string | null; user: { login?: string | null; } | null; }) => 
          c.user?.login === 'github-actions[bot]' && c.body?.includes(HIDDEN_MARKER)
      )?.id || null
    );
  }

  /**
   * Posts a new comment to the current PR/issue.
   * The comment body will include a hidden marker for future identification.
   * @param {string} body The main content of the comment.
   * @returns {Promise<string | undefined>} A promise that resolves to the HTML URL of the created comment, or undefined if an error occurs.
   */
  async postNewComment(body: string): Promise<string | undefined> {
    const { owner, repo } = this.context.repo;
    const issue_number = this.context.issue.number;
    const response = await this.octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number,
      body: body + '\n' + HIDDEN_MARKER,
    });
    return response.data.html_url;
  }

  /**
   * Updates an existing comment on the current PR/issue.
   * The comment body will include a hidden marker for future identification.
   * @param {number} commentId The ID of the comment to update.
   * @param {string} body The new main content for the comment.
   * @returns {Promise<string | undefined>} A promise that resolves to the HTML URL of the updated comment, or undefined if an error occurs.
   */
  async updateExistingComment(commentId: number, body: string): Promise<string | undefined> {
    const { owner, repo } = this.context.repo;
    const response = await this.octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: commentId,
      body: body + '\n' + HIDDEN_MARKER,
    });
    return response.data.html_url;
  }

  /**
   * Deletes a comment from the current PR/issue.
   * @param {number} commentId The ID of the comment to delete.
   * @returns {Promise<void>} A promise that resolves when the comment is deleted.
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
