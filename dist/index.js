"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const url_extractor_1 = require("./url-extractor");
const notion_client_1 = require("./notion-client");
const github_client_1 = require("./github-client");
async function run() {
    try {
        const notionToken = core.getInput('notion-token', { required: true });
        const githubToken = core.getInput('github-token', { required: true });
        const prBody = github.context.payload.pull_request?.body || '';
        const urls = (0, url_extractor_1.extractNotionURLs)(prBody);
        if (urls.length === 0) {
            core.info('No Notion URLs found.');
            return;
        }
        const notion = new notion_client_1.NotionClient(notionToken);
        // Get title and markdown for each URL
        const sections = [];
        let errorCount = 0;
        for (const url of urls) {
            try {
                const { title, markdown } = await notion.getTitleAndMarkdown(url);
                const icon = url.includes('/database/') ? '🗃️' : '📄';
                sections.push(`<details>\n<summary>${icon} ${title}</summary>\n\n\`\`\`markdown\n${markdown}\n\`\`\`\n</details>`);
            }
            catch (e) {
                errorCount++;
                sections.push(`<details>\n<summary>⚠️ Failed to fetch: ${url}</summary>\n\nCould not retrieve: ${e.message}\n</details>`);
            }
        }
        const successCount = urls.length - errorCount;
        const statusText = errorCount > 0
            ? `${successCount} success, ${errorCount} error(s)`
            : `${urls.length} processed`;
        const commentBody = `### 🤖 Notion AI Context (${statusText})\n\n${sections.join('\n\n')}`;
        const githubClient = new github_client_1.GithubClient(githubToken);
        const existingCommentId = await githubClient.findExistingComment();
        let commentUrl;
        if (existingCommentId) {
            commentUrl = await githubClient.updateExistingComment(existingCommentId, commentBody);
        }
        else {
            commentUrl = await githubClient.postNewComment(commentBody);
        }
        if (commentUrl) {
            core.setOutput('comment-url', commentUrl);
        }
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
run();
