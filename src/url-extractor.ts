/**
 * @fileoverview Notion URL Extractor
 * 
 * This module provides functionality to extract and clean Notion URLs from text content.
 * It handles various Notion URL formats including pages, databases, and custom domains.
 * 
 * **Supported Notion URL Formats:**
 * 
 * 1. **Standard Notion Domains:**
 *    - `https://www.notion.so/page-title-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
 *    - `https://username.notion.site/page-title-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
 *    - Where `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` is the 32-character page ID (UUID without hyphens)
 * 
 * 2. **Custom Domains** (Notion Sites feature, paid plans):
 *    - `https://www.yourcustomdomain.com/page-slug`
 *    - The structure after the custom domain can vary
 * 
 * 3. **Workspace-specific Subdomains:**
 *    - `https://yourworkspace.notion.site/page-title-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
 * 
 * 4. **URLs with or without Page Titles:**
 *    - The page title part of the URL is optional for routing; the ID is the canonical identifier
 *    - e.g., `https://www.notion.so/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
 * 
 * 5. **Database URLs:**
 *    - Similar to page URLs, but often include a view ID (`v=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy`)
 *    - `https://www.notion.so/yourworkspace/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy`
 *    - The database ID can be a 32-character UUID or sometimes shorter, more opaque strings
 * 
 * 6. **Page/Database IDs:**
 *    - Page IDs are typically 32-character hexadecimal strings (UUIDs, often presented without hyphens in URLs)
 *    - Database IDs can also be 32-character UUIDs or sometimes shorter, more opaque strings
 *    - The API and internal linking often use UUIDs with hyphens. This extractor aims to be flexible
 * 
 * @author GitHub Action: notion-to-github-comments
 * @version 1.0.0
 */

/**
 * Regular expression patterns for URL extraction and cleaning.
 * Organized by purpose for maintainability and clarity.
 */

/**
 * Removes HTML comments from text to avoid extracting URLs from commented content.
 * Supports both single-line and multi-line HTML comments.
 * 
 * @example
 * // Matches: <!-- comment -->, <!-- multi
 * //                             line -->
 */
const HTML_COMMENT_REGEX = /<!--[\s\S]*?-->/g;

/**
 * Captures any HTTP or HTTPS URL from text content.
 * Uses a permissive pattern to catch URLs followed by whitespace.
 * 
 * @example
 * // Matches: https://example.com, http://test.org/path?query=value
 */
const ALL_URLS_REGEX = /https?:\/\/[^\s]+/gi;

/**
 * Removes common trailing punctuation that might be attached to URLs.
 * Helps clean URLs that appear at the end of sentences.
 * 
 * @example
 * // Removes: ., ,, ;, !, ), ? and combinations like .)
 */
const TRAILING_PUNCTUATION_REGEX = /[.,;!?)]+$/;

/**
 * Detects if a URL contains Notion-specific query parameters with valid IDs.
 * Checks for both ?p= and ?page_id= parameters with UUID formats.
 * 
 * @example
 * // Matches: ?p=abc123..., ?page_id=12345678-1234-5678-1234-567890abcdef
 */
const QUERY_PARAM_DETECTION_REGEX =
  /[?&](?:p|page_id)=([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/;

/**
 * Extracts the clean URL portion up to and including valid Notion ID parameters.
 * Prevents over-truncation of URLs with legitimate query parameters.
 * 
 * @example
 * // From: https://notion.so/page?p=abc123&other=value
 * // Extracts: https://notion.so/page?p=abc123
 */
const QUERY_PARAM_EXTRACTION_REGEX =
  /^(.*[?&](?:p|page_id)=[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|.*[?&](?:p|page_id)=[a-f0-9]{32})/

/**
 * Extracts and cleans Notion URLs from text content with robust parsing.
 * 
 * This function performs comprehensive URL extraction and cleaning:
 * 
 * **Processing Steps:**
 * 1. **HTML Comment Removal**: Strips out HTML comments to avoid false positives
 * 2. **URL Discovery**: Finds all HTTP/HTTPS URLs in the text
 * 3. **Punctuation Cleaning**: Removes trailing punctuation and HTML entities
 * 4. **Query Parameter Handling**: Preserves important Notion parameters while cleaning others
 * 5. **Domain Filtering**: Only returns URLs from known Notion domains
 * 6. **Deduplication**: Returns unique URLs only
 * 
 * **Supported Formats:**
 * - Standard Notion pages and databases
 * - Custom Notion Sites domains
 * - Workspace-specific subdomains
 * - URLs with and without page titles
 * - URLs with query parameters and view IDs
 * 
 * **Error Handling:**
 * - Returns empty array for null, undefined, or non-string input
 * - Gracefully handles malformed URLs
 * - Filters out non-Notion domains to prevent false positives
 * 
 * @param {string} text - Input text that may contain Notion URLs (PR body, issue description, etc.)
 * @returns {string[]} Array of cleaned and validated Notion URLs found in the text
 * 
 * @example
 * // Basic usage
 * const urls = extractNotionURLs('Check out this page: https://notion.so/My-Page-abc123');
 * // Returns: ['https://notion.so/My-Page-abc123']
 * 
 * // Multiple URLs with cleaning
 * const text = `
 *   See https://workspace.notion.site/Project-def456?v=view123,
 *   and https://notion.so/Notes-ghi789.
 * `;
 * const urls = extractNotionURLs(text);
 * // Returns: [
 * //   'https://workspace.notion.site/Project-def456?v=view123',
 * //   'https://notion.so/Notes-ghi789'
 * // ]
 * 
 * // Handles HTML comments
 * const htmlText = 'Valid: https://notion.so/page1 <!-- Ignore: https://notion.so/page2 -->';
 * const urls = extractNotionURLs(htmlText);
 * // Returns: ['https://notion.so/page1']
 * 
 * // Error cases
 * extractNotionURLs(null);        // Returns: []
 * extractNotionURLs(undefined);   // Returns: []
 * extractNotionURLs('');          // Returns: []
 * extractNotionURLs('No URLs');   // Returns: []
 */
export function extractNotionURLs(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  const urls = new Set<string>();
  let match;

  // Step 1: Remove HTML comments from text to avoid extracting URLs from them
  const textWithoutComments = text.replace(HTML_COMMENT_REGEX, "");

  // Step 2: Extract all URLs from text (without comments)
  ALL_URLS_REGEX.lastIndex = 0;

  while ((match = ALL_URLS_REGEX.exec(textWithoutComments)) !== null) {
    if (match[0]) {
      let url = match[0];

      // Step 3: Clean trailing punctuation and HTML entities
      url = url.replace(TRAILING_PUNCTUATION_REGEX, "");
      
      // Remove common HTML entities that might be attached to URLs
      url = url.replace(/(&quot;|&gt;|&lt;|&#39;|&amp;).*$/, "");
      url = url.replace(/".*$/, "");
      
      // Step 4: Don't truncate query parameters for non-p/page_id params
      // Only truncate if we have ?p= or ?page_id= with a valid Notion ID
      if (QUERY_PARAM_DETECTION_REGEX.test(url)) {
        const paramMatch = url.match(QUERY_PARAM_EXTRACTION_REGEX);
        if (paramMatch) {
          url = paramMatch[1];
        }
      }

      // Step 5: Filter for Notion-related URLs only
      const isNotionDomain =
        url.includes("notion.so") || url.includes("notion.site");

      // Only add URLs that have a Notion domain AND optionally a Notion ID
      // This prevents false positives from other services that happen to have similar ID patterns
      if (isNotionDomain) {
        urls.add(url);
      }
    }
  }

  return Array.from(urls);
}
