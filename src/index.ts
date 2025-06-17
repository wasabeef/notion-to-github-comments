/**
 * @fileoverview GitHub Action Entry Point
 *
 * This module serves as the main entry point for the notion-to-github-comments GitHub Action.
 * It orchestrates the entire workflow of extracting Notion URLs from PR descriptions,
 * fetching their content via the Notion API, converting to Markdown, and posting the
 * formatted content as PR comments.
 *
 * **Workflow Steps:**
 * 1. Retrieve PR/Issue body from GitHub context
 * 2. Extract all Notion URLs using pattern matching
 * 3. Fetch content from each Notion page/database
 * 4. Convert Notion blocks to GitHub-flavored Markdown
 * 5. Post or update PR comment with formatted content
 *
 * **Required Inputs:**
 * - `notion-token`: Notion integration token with read access
 * - `github-token`: GitHub token with `pull-requests: write` permission
 *
 * **Outputs:**
 * - `comment-url`: URL of the created/updated PR comment
 *
 * **Error Handling:**
 * - Individual URL failures don't stop the entire process
 * - Failed URLs are displayed with error messages in the comment
 * - Action fails only on critical errors (missing tokens, API failures)
 *
 * @module index
 * @requires @actions/core
 * @requires @actions/github
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { extractNotionURLs } from './url-extractor';
import { NotionClient } from './notion-client';
import { GithubClient } from './github-client';

/**
 * Main execution function for the GitHub Action.
 *
 * Processes the workflow of extracting Notion URLs from PR/Issue descriptions
 * and posting their content as formatted comments.
 *
 * **Process Flow:**
 * 1. **Authentication**: Validates and retrieves required tokens
 * 2. **URL Extraction**: Finds all Notion URLs in PR/Issue body
 * 3. **Content Fetching**: Retrieves each Notion page/database content
 * 4. **Comment Management**: Creates new or updates existing PR comment
 * 5. **Cleanup**: Deletes existing comment if no URLs found
 *
 * **Comment Format:**
 * - Header with processing status (X success, Y errors)
 * - Collapsible sections for each Notion URL
 * - Icons indicating page type (📄 page, 🗃️ database, ⚠️ error)
 * - Direct links to original Notion pages
 * - Markdown-formatted content with preserved structure
 *
 * **Error Recovery:**
 * - Continues processing remaining URLs if one fails
 * - Displays error message for failed URLs
 * - Tracks success/error count for status reporting
 *
 * @async
 * @returns {Promise<void>} Completes when comment is posted or action fails
 * @throws {Error} Critical errors are caught and reported via core.setFailed()
 */
async function run() {
  try {
    const notionToken = core.getInput('notion-token', { required: true });
    const githubToken = core.getInput('github-token', { required: true });
    const prBody =
      github.context.payload.pull_request?.body ||
      github.context.payload.issue?.body ||
      '';

    const githubClient = new GithubClient(githubToken);

    const urls = extractNotionURLs(prBody);
    if (urls.length === 0) {
      core.info('No Notion URLs found.');
      const existingCommentId = await githubClient.findExistingComment();
      if (existingCommentId) {
        await githubClient.deleteComment(existingCommentId);
        core.info(
          'Successfully deleted existing comment as no Notion URLs were found.'
        );
      }
      return;
    }

    core.info(`Processing ${urls.length} Notion URL(s)...`);

    const notion = new NotionClient(notionToken);

    // Get title and markdown for each URL
    const sections = [];
    let errorCount = 0;

    for (const url of urls) {
      try {
        const {
          title,
          markdown,
          url: notionPageUrl,
          icon: notionIcon,
        } = await notion.getTitleAndMarkdown(url);

        let iconHtml: string;
        if (
          notionIcon &&
          (notionIcon.startsWith('http://') ||
            notionIcon.startsWith('https://'))
        ) {
          iconHtml = `<img src="${notionIcon}" width="16" height="16" alt="icon">`;
        } else if (notionIcon) {
          // Emoji or other non-URL string
          iconHtml = notionIcon;
        } else {
          // notionIcon is null or empty
          iconHtml = url.includes('/database/') ? '🗃️' : '📄';
        }

        sections.push(
          `<details>\n<summary>&nbsp;&nbsp;${iconHtml} ${title}</summary>\n<a href="${notionPageUrl}" target="_blank" rel="noopener noreferrer">${notionPageUrl}</a>\n<br>\n<br>\n\n${markdown}\n</details>`
        );
        core.info(`✅ Successfully processed: ${title} (${notionPageUrl})`);
      } catch (e) {
        errorCount++;
        const errorMessage = (e as Error).message;
        core.warning(`❌ Failed to process ${url}: ${errorMessage}`);
        sections.push(
          `<details>\n<summary>&nbsp;&nbsp;⚠️ Failed to fetch: ${url}</summary>\n\nCould not retrieve: ${errorMessage}\n</details>`
        );
      }
    }

    const successCount = urls.length - errorCount;
    const statusText =
      errorCount > 0
        ? `${successCount} success, ${errorCount} error(s)`
        : `${urls.length} processed`;

    const commentBody = `### 🤖 Notion Context (${statusText})\n\n${sections.join('\n\n')}`;

    const existingCommentId = await githubClient.findExistingComment();
    let commentUrl: string | undefined;

    if (existingCommentId) {
      commentUrl = await githubClient.updateExistingComment(
        existingCommentId,
        commentBody
      );
    } else {
      commentUrl = await githubClient.postNewComment(commentBody);
    }

    if (commentUrl) {
      core.setOutput('comment-url', commentUrl);
      const actionType = existingCommentId ? 'updated' : 'created';
      core.info(
        `🎉 Successfully ${actionType} comment with Notion context: ${commentUrl}`
      );
      core.info(`📊 Processing summary: ${statusText}`);
    } else {
      core.warning('⚠️ Comment URL not available');
    }
  } catch (error) {
    core.setFailed((error as Error).message);
  }
}

run();
