import * as core from '@actions/core';
import * as github from '@actions/github';
import { extractNotionURLs } from './url-extractor';
import { NotionClient } from './notion-client';
import { GithubClient } from './github-client';

async function run() {
  try {
    const notionToken = core.getInput('notion-token', { required: true });
    const githubToken = core.getInput('github-token', { required: true });
    const prBody = github.context.payload.pull_request?.body || '';

    const urls = extractNotionURLs(prBody);
    if (urls.length === 0) {
      core.info('No Notion URLs found.');
      return;
    }

    const notion = new NotionClient(notionToken);

    // Get title and markdown for each URL
    const sections = [];
    let errorCount = 0;
    
    for (const url of urls) {
      try {
        const { title, markdown } = await notion.getTitleAndMarkdown(url);
        const icon = url.includes('/database/') ? '🗃️' : '📄';
        sections.push(
          `<details>\n<summary>${icon} ${title}</summary>\n\n\`\`\`markdown\n${markdown}\n\`\`\`\n</details>`
        );
      } catch (e) {
        errorCount++;
        sections.push(
          `<details>\n<summary>⚠️ Failed to fetch: ${url}</summary>\n\nCould not retrieve: ${(e as Error).message}\n</details>`
        );
      }
    }

    const successCount = urls.length - errorCount;
    const statusText = errorCount > 0 
      ? `${successCount} success, ${errorCount} error(s)`
      : `${urls.length} processed`;
    
    const commentBody = `### 🤖 Notion Context (${statusText})\n\n${sections.join('\n\n')}`;

    const githubClient = new GithubClient(githubToken);
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
