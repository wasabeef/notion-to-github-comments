/**
 * Notion URL extraction functionality
 */

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

// 1. Basic URL extraction - captures any HTTP/HTTPS URL
const ALL_URLS_REGEX = /https?:\/\/[^\s]+/gi;

// 2. Trailing punctuation cleanup - removes common punctuation from URL end
const TRAILING_PUNCTUATION_REGEX = /[.,;!?)]+$/;

// 3. Query parameter detection - checks if URL has ?p= or ?page_id= with valid Notion ID
const QUERY_PARAM_DETECTION_REGEX = /[?&](?:p|page_id)=([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/;

// 4. Query parameter extraction - extracts URL up to and including the Notion ID in query params
const QUERY_PARAM_EXTRACTION_REGEX = /^(.*[?&](?:p|page_id)=[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|.*[?&](?:p|page_id)=[a-f0-9]{32})/;

// 5. Notion ID validation - matches valid Notion IDs (32 hex chars or UUID format)
const NOTION_ID_REGEX = /[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/;

/**
 * Extracts Notion URLs from a given text.
 * It identifies URLs pointing to notion.so, notion.site, or containing a Notion page/database ID.
 * Cleans trailing punctuation from URLs and handles Notion IDs in query parameters.
 * @param {string} text The input text to search for Notion URLs.
 * @returns {string[]} An array of unique Notion URLs found in the text.
 */
export function extractNotionURLs(text: string): string[] {
  const urls = new Set<string>();
  let match;
  
  // Step 1: Extract all URLs from text
  ALL_URLS_REGEX.lastIndex = 0;
  
  while ((match = ALL_URLS_REGEX.exec(text)) !== null) {
    if (match[0]) {
      let url = match[0];
      
      // Step 2: Clean trailing punctuation
      url = url.replace(TRAILING_PUNCTUATION_REGEX, '');
      
      // Step 3: Handle query parameter URLs - truncate after Notion ID
      if (QUERY_PARAM_DETECTION_REGEX.test(url)) {
        const paramMatch = url.match(QUERY_PARAM_EXTRACTION_REGEX);
        if (paramMatch) {
          url = paramMatch[1];
        }
      }
      
      // Step 4: Filter for Notion-related URLs only
      const isNotionDomain = url.includes('notion.so') || url.includes('notion.site');
      const hasNotionId = NOTION_ID_REGEX.test(url);
      
      if (isNotionDomain || hasNotionId) {
        urls.add(url);
      }
    }
  }
  
  return Array.from(urls);
}
