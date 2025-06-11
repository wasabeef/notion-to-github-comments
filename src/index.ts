import * as core from "@actions/core";
import * as github from "@actions/github";
import { extractNotionURLs } from "./url-extractor";
import { NotionClient } from "./notion-client";
import { GitHubClient } from "./github-client";

/**
 * Main entry point for the GitHub Action that syncs Notion content to GitHub comments.
 * 
 * This function performs the following steps:
 * 1. Validates required input tokens (github-token and notion-token)
 * 2. Extracts Notion URLs from PR/issue body text
 * 3. Fetches content from each Notion page/database
 * 4. Converts Notion blocks to GitHub-flavored Markdown
 * 5. Creates or updates a comment with the formatted content
 * 6. Handles errors gracefully with appropriate logging
 * 
 * @async
 * @function run
 * @returns {Promise<void>} Resolves when the action completes
 * @throws {Error} May throw errors that are caught and logged via core.setFailed
 * 
 * @example
 * // This function is typically called automatically by GitHub Actions
 * // But can also be invoked programmatically:
 * import { run } from './index';
 * await run();
 */
export async function run() {
  try {
    const notionToken = core.getInput("notion-token", { required: true });
    const githubToken = core.getInput("github-token", { required: true });
    const prBody =
      github.context.payload.pull_request?.body ||
      github.context.payload.issue?.body ||
      "";

    const githubClient = new GitHubClient(githubToken);

    const urls = extractNotionURLs(prBody);
    if (urls.length === 0) {
      core.info("No Notion URLs found.");
      const existingCommentId = await githubClient.findExistingComment();
      if (existingCommentId) {
        await githubClient.deleteComment(existingCommentId);
        core.info(
          "Successfully deleted existing comment as no Notion URLs were found.",
        );
      }
      return;
    }

    core.info(`Processing ${urls.length} Notion URL(s)...`);

    const notion = new NotionClient(notionToken);

    // Process each Notion URL to fetch and convert content
    // Each URL is processed independently to handle partial failures gracefully
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
          (notionIcon.startsWith("http://") ||
            notionIcon.startsWith("https://"))
        ) {
          iconHtml = `<img src="${notionIcon}" width="16" height="16" alt="icon">`;
        } else if (notionIcon) {
          // Emoji or other non-URL string
          iconHtml = notionIcon;
        } else {
          // notionIcon is null or empty
          iconHtml = url.includes("/database/") ? "🗃️" : "📄";
        }

        sections.push(
          `<details>\n<summary>&nbsp;&nbsp;${iconHtml} ${title}</summary>\n<a href="${notionPageUrl}" target="_blank" rel="noopener noreferrer">${notionPageUrl}</a>\n<br>\n<br>\n\n${markdown}\n</details>`,
        );
        core.info(`✅ Successfully processed: ${title} (${notionPageUrl})`);
      } catch (e) {
        errorCount++;
        const errorMessage = (e as Error).message;
        core.warning(`❌ Failed to process ${url}: ${errorMessage}`);
        sections.push(
          `<details>\n<summary>&nbsp;&nbsp;⚠️ Failed to fetch: ${url}</summary>\n\nCould not retrieve: ${errorMessage}\n</details>`,
        );
      }
    }

    const successCount = urls.length - errorCount;
    const statusText =
      errorCount > 0
        ? `${successCount} success, ${errorCount} error(s)`
        : `${urls.length} processed`;

    // Format the final comment with proper structure and metadata
    const commentBody = `### 🤖 Notion Context (${statusText})\n\n${sections.join("\n\n")}`;

    // Check for existing comment to determine whether to update or create new one
    const existingCommentId = await githubClient.findExistingComment();
    let commentUrl: string | undefined;

    if (existingCommentId) {
      commentUrl = await githubClient.updateExistingComment(
        existingCommentId,
        commentBody,
      );
    } else {
      commentUrl = await githubClient.postNewComment(commentBody);
    }

    if (commentUrl) {
      core.setOutput("comment-url", commentUrl);
      const actionType = existingCommentId ? "updated" : "created";
      core.info(
        `🎉 Successfully ${actionType} comment with Notion context: ${commentUrl}`,
      );
      core.info(`📊 Processing summary: ${statusText}`);
    } else {
      core.warning("⚠️ Comment URL not available");
    }
  } catch (error) {
    // Log the error and fail the action to notify users of issues
    core.setFailed((error as Error).message);
  }
}

/**
 * Auto-execution guard for GitHub Actions.
 * This ensures the action runs automatically when invoked by GitHub Actions,
 * but not when imported as a module (e.g., during testing).
 */
if (require.main === module) {
  run();
}
