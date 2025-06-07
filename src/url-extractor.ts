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

// Regex patterns organized by purpose

// 1. HTML comment detection and removal - removes HTML comments (including multiline)
const HTML_COMMENT_REGEX = /<!--[\s\S]*?-->/g;

// 2. Basic URL extraction - captures any HTTP/HTTPS URL
const ALL_URLS_REGEX = /https?:\/\/[^\s]+/gi;

// 3. Trailing punctuation cleanup - removes common punctuation from URL end
const TRAILING_PUNCTUATION_REGEX = /[.,;!?)]+$/;

// 4. Query parameter detection - checks if URL has ?p= or ?page_id= with valid Notion ID
const QUERY_PARAM_DETECTION_REGEX =
  /[?&](?:p|page_id)=([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/;

// 5. Query parameter extraction - extracts URL up to and including the Notion ID in query params
const QUERY_PARAM_EXTRACTION_REGEX =
  /^(.*[?&](?:p|page_id)=[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|.*[?&](?:p|page_id)=[a-f0-9]{32})/;

// 6. Notion ID validation - matches valid Notion IDs (32 hex chars or UUID format)
const NOTION_ID_REGEX =
  /[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/;

/**
 * Extracts Notion URLs from text content with robust parsing
 * Handles various Notion URL formats including pages, databases, and custom domains
 * @param text Input text that may contain Notion URLs
 * @returns Array of cleaned Notion URLs found in the text
 */
export function extractNotionURLs(text: string): string[] {
  const urls = new Set<string>();
  let match;

  // Step 1: Remove HTML comments from text to avoid extracting URLs from them
  const textWithoutComments = text.replace(HTML_COMMENT_REGEX, "");

  // Step 2: Extract all URLs from text (without comments)
  ALL_URLS_REGEX.lastIndex = 0;

  while ((match = ALL_URLS_REGEX.exec(textWithoutComments)) !== null) {
    if (match[0]) {
      let url = match[0];

      // Step 3: Clean trailing punctuation
      url = url.replace(TRAILING_PUNCTUATION_REGEX, "");

      // Step 4: Handle query parameter URLs - truncate after Notion ID
      if (QUERY_PARAM_DETECTION_REGEX.test(url)) {
        const paramMatch = url.match(QUERY_PARAM_EXTRACTION_REGEX);
        if (paramMatch) {
          url = paramMatch[1];
        }
      }

      // Step 5: Filter for Notion-related URLs only
      const isNotionDomain =
        url.includes("notion.so") || url.includes("notion.site");
      const hasNotionId = NOTION_ID_REGEX.test(url);

      if (isNotionDomain || hasNotionId) {
        urls.add(url);
      }
    }
  }

  return Array.from(urls);
}
