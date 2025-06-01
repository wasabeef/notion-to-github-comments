"use strict";
/**
 * Notion URL extraction functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractNotionURLs = extractNotionURLs;
// Notion URL Specifications:
// Notion URLs can take several forms:
// 1. Standard Notion domain:
//    - https://www.notion.so/page-title-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//    - https://username.notion.site/page-title-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//    - Where xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx is the 32-character page ID (UUID without hyphens).
// 2. Custom domains (Notion Sites feature, paid plans):
//    - https://www.yourcustomdomain.com/page-slug
//    - The structure after the custom domain can vary.
// 3. Workspace-specific subdomains:
//    - https://yourworkspace.notion.site/page-title-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// 4. URLs with or without page titles:
//    - The page title part of the URL is optional for routing; the ID is the canonical identifier.
//    - e.g., https://www.notion.so/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// 5. Database URLs:
//    - Similar to page URLs, but often include a view ID (v=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy).
//    - https://www.notion.so/yourworkspace/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
//    - The database ID (xxxxxxxx...) can be a 32-character UUID (often without hyphens in URLs but sometimes with) or a shorter ID.
// 6. Page/Database IDs:
//    - Page IDs are typically 32-character hexadecimal strings (UUIDs, often presented without hyphens in URLs).
//    - Database IDs can also be 32-character UUIDs or sometimes shorter, more opaque strings.
//    - The API and internal linking often use UUIDs with hyphens. This extractor aims to be flexible.
// Extremely simple approach - find all URLs containing "notion"
const NOTION_URL_REGEX = /https?:\/\/[^\s]+/gi;
function extractNotionURLs(text) {
    const urls = new Set();
    let match;
    // Reset global regex
    NOTION_URL_REGEX.lastIndex = 0;
    while ((match = NOTION_URL_REGEX.exec(text)) !== null) {
        if (match[0]) {
            let url = match[0];
            // Clean trailing punctuation and special characters
            url = url.replace(/[.,;!?)]+$/, '');
            // Special handling for query parameter URLs - stop after the Notion ID
            if (/[?&](?:p|page_id)=([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/.test(url)) {
                const paramMatch = url.match(/^(.*[?&](?:p|page_id)=[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|.*[?&](?:p|page_id)=[a-f0-9]{32})/);
                if (paramMatch) {
                    url = paramMatch[1];
                }
            }
            // Only include if it contains notion.so, notion.site, or has a valid Notion ID
            if (url.includes('notion.so') || url.includes('notion.site') ||
                /[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/.test(url)) {
                urls.add(url);
            }
        }
    }
    return Array.from(urls);
}
