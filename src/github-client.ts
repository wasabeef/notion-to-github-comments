/**
 * @fileoverview GitHub API Client for Comment Management
 *
 * This module provides a specialized GitHub API client for managing
 * pull request comments containing Notion content. It handles the
 * complete lifecycle of comments including creation, updates, and deletion.
 *
 * **Key Features:**
 * - Automatic detection of existing comments using hidden markers
 * - Idempotent comment updates (prevents duplicates)
 * - Clean comment deletion when no Notion URLs are found
 * - Full GitHub Actions context integration
 *
 * **Comment Identification:**
 * Uses HTML comments as hidden markers to identify comments created
 * by this action, allowing reliable updates without duplicates.
 *
 * @module github-client
 * @requires @actions/github
 * @requires @actions/core
 */

import * as github from "@actions/github";
import * as core from "@actions/core";

/**
 * Hidden HTML comment marker used to identify comments created by this action.
 * This marker is appended to all comments and used for finding existing comments
 * to update rather than creating duplicates.
 * @constant {string}
 */
const HIDDEN_MARKER = "<!-- NOTION_TO_GITHUB_COMMENTS -->";

/**
 * GitHub API client for managing PR comments with Notion content.
 *
 * This class encapsulates all GitHub API interactions for comment management,
 * providing methods to create, update, find, and delete comments on pull requests.
 *
 * **Authentication:**
 * Requires a GitHub token with `pull-requests: write` permission.
 *
 * **Comment Management Strategy:**
 * - Uses hidden HTML markers to track comments
 * - Updates existing comments instead of creating new ones
 * - Deletes comments when no Notion content is available
 *
 * @class
 * @example
 * ```typescript
 * const client = new GithubClient(process.env.GITHUB_TOKEN);
 * const existingId = await client.findExistingComment();
 * if (existingId) {
 *   await client.updateExistingComment(existingId, newContent);
 * } else {
 *   await client.postNewComment(newContent);
 * }
 * ```
 */
export class GithubClient {
  private octokit: ReturnType<typeof github.getOctokit>;
  private context: typeof github.context;

  /**
   * Initializes the GitHub API client with authentication.
   *
   * Creates an authenticated Octokit instance and captures the current
   * GitHub Actions context for repository and issue information.
   *
   * **Required Token Permissions:**
   * - `pull-requests: write` - To create and update PR comments
   * - `issues: write` - For issue comment operations (PRs are issues)
   *
   * @param {string} token - GitHub personal access token or GITHUB_TOKEN
   * @constructor
   */
  constructor(token: string) {
    this.octokit = github.getOctokit(token);
    this.context = github.context;
  }

  /**
   * Searches for an existing comment created by this action.
   *
   * Scans through all comments on the current PR/issue to find one that:
   * 1. Was created by the github-actions bot
   * 2. Contains the hidden marker identifying it as a Notion comment
   *
   * This prevents duplicate comments by allowing updates to existing ones.
   *
   * **Search Criteria:**
   * - User: `github-actions[bot]`
   * - Body contains: `<!-- NOTION_TO_GITHUB_COMMENTS -->`
   *
   * @returns {Promise<number|null>} Comment ID if found, null if no existing comment
   * @async
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
   * Creates a new comment on the pull request.
   *
   * Posts a new comment with the provided Markdown content and appends
   * the hidden marker for future identification. The comment appears
   * immediately on the PR.
   *
   * **Comment Structure:**
   * - User-visible content (Markdown formatted)
   * - Hidden HTML marker (invisible to users)
   *
   * @param {string} body - Comment content in GitHub-flavored Markdown
   * @returns {Promise<string|undefined>} URL of the created comment
   * @async
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
   * Replaces the entire content of an existing comment while preserving
   * the comment ID and position in the PR timeline. The hidden marker
   * is re-appended to maintain identification.
   *
   * **Use Case:**
   * When Notion URLs change in the PR description, this method updates
   * the existing comment instead of creating a new one.
   *
   * @param {number} commentId - ID of the comment to update
   * @param {string} body - New comment content in GitHub-flavored Markdown
   * @returns {Promise<string|undefined>} URL of the updated comment
   * @async
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
   * Deletes a comment from the pull request.
   *
   * Permanently removes a comment from the PR. Used when no Notion URLs
   * are found in the PR description to clean up outdated comments.
   *
   * **Deletion Scenarios:**
   * - All Notion URLs removed from PR description
   * - PR description cleared or replaced
   * - Manual cleanup requested
   *
   * @param {number} commentId - ID of the comment to delete
   * @returns {Promise<void>} Resolves when deletion is complete
   * @async
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
