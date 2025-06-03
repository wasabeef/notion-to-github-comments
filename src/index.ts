import * as core from '@actions/core';
import * as github from '@actions/github';
import { extractNotionURLs } from './url-extractor';
import { NotionClient } from './notion-client';
import { GithubClient } from './github-client';

async function run() {
  try {
    const notionToken = core.getInput('notion-token', { required: true });
    const githubToken = core.getInput('github-token', { required: true });
    const prBody = github.context.payload.pull_request?.body || github.context.payload.issue?.body || '';
    
    const githubClient = new GithubClient(githubToken); // Initialize GithubClient once

    const urls = extractNotionURLs(prBody);
    if (urls.length === 0) {
      core.info('No Notion URLs found.');
      // const githubClient = new GithubClient(githubToken); // Removed: already initialized
      const existingCommentId = await githubClient.findExistingComment();
      if (existingCommentId) {
        await githubClient.deleteComment(existingCommentId);
        core.info('Successfully deleted existing comment as no Notion URLs were found.');
      }
      return;
    }

    const notion = new NotionClient(notionToken);

    // Get title and markdown for each URL
    const sections = [];
    let errorCount = 0;
    
    for (const url of urls) {
      try {
        const { title, markdown, url: notionPageUrl } = await notion.getTitleAndMarkdown(url);
        const icon = url.includes('/database/') ? '🗃️' : '📄';
        sections.push(
          `<details>\n<summary>&nbsp;&nbsp;${icon} ${title}</summary>\n<a href="${notionPageUrl}" target="_blank" rel="noopener noreferrer">${notionPageUrl}</a>\n<br>\n<br>\n\n\`\`\`markdown\n${markdown}\n\`\`\`\n</details>`
        );
      } catch (e) {
        errorCount++;
        sections.push(
          `<details>\n<summary>&nbsp;&nbsp;⚠️ Failed to fetch: ${url}</summary>\n\nCould not retrieve: ${(e as Error).message}\n</details>`
        );
      }
    }

    const successCount = urls.length - errorCount;
    const statusText = errorCount > 0 
      ? `${successCount} success, ${errorCount} error(s)`
      : `${urls.length} processed`;
    
    const commentBody = `### 🤖 Notion Context (${statusText})\n\n${sections.join('\n\n')}`;

    // const githubClient = new GithubClient(githubToken); // Removed: already initialized
    const existingCommentId = await githubClient.findExistingComment();
    let commentUrl: string | undefined;

    if (existingCommentId) {
      commentUrl = await githubClient.updateExistingComment(existingCommentId, commentBody);
    } else {
      commentUrl = await githubClient.postNewComment(commentBody);
    }

    if (commentUrl) {
      core.setOutput('comment-url', commentUrl);
    }
  } catch (error) {
    core.setFailed((error as Error).message);
  }
}

run();
