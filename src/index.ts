import * as core from "@actions/core";
import * as github from "@actions/github";
import { extractNotionURLs } from "./url-extractor";
import { NotionClient } from "./notion-client";
import { GithubClient } from "./github-client";

/**
 * Main entry point for the GitHub Action
 * Extracts Notion URLs from PR descriptions, fetches their content, and posts/updates comments
 * with the converted Markdown content
 */
async function run() {
  try {
    const notionToken = core.getInput("notion-token", { required: true });
    const githubToken = core.getInput("github-token", { required: true });
    const prBody =
      github.context.payload.pull_request?.body ||
      github.context.payload.issue?.body ||
      "";

    const githubClient = new GithubClient(githubToken);

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

    const commentBody = `### 🤖 Notion Context (${statusText})\n\n${sections.join("\n\n")}`;

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
    core.setFailed((error as Error).message);
  }
}

run();
