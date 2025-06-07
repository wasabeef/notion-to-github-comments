import * as github from "@actions/github";
import * as core from "@actions/core";

const HIDDEN_MARKER = "<!-- NOTION_TO_GITHUB_COMMENTS -->";

/**
 * GitHub client for managing pull request comments
 * Handles creating, updating, and deleting comments with Notion context
 */
export class GithubClient {
  private octokit: ReturnType<typeof github.getOctokit>;
  private context: typeof github.context;

  /**
   * Initializes the GitHub client with authentication token
   * @param token GitHub token for API authentication
   */
  constructor(token: string) {
    this.octokit = github.getOctokit(token);
    this.context = github.context;
  }

  /**
   * Searches for existing comment created by this action
   * @returns Comment ID if found, null otherwise
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
   * Creates a new comment on the pull request
   * @param body Comment content in Markdown format
   * @returns URL of the created comment
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
   * Updates an existing comment with new content
   * @param commentId ID of the comment to update
   * @param body New comment content in Markdown format
   * @returns URL of the updated comment
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
   * Deletes a comment from the pull request
   * @param commentId ID of the comment to delete
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
