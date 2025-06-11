/**
 * @fileoverview Notion to Markdown Converter
 * 
 * This module provides comprehensive conversion functionality from Notion's
 * block-based content structure to GitHub-flavored Markdown. It handles
 * all standard Notion block types with proper formatting preservation.
 * 
 * **Key Features:**
 * - Rich text formatting with annotations (bold, italic, code, etc.)
 * - Hierarchical structure preservation with proper indentation
 * - Special handling for tables, code blocks, and nested content
 * - Context-aware conversion for different block types
 * - Child page expansion with configurable depth
 * 
 * **Supported Block Types:**
 * - Text blocks: paragraph, headings (h1-h3), quote, callout
 * - List blocks: bulleted, numbered, todo, toggle
 * - Code blocks with language detection and captions
 * - Tables with proper column alignment
 * - Child pages and databases
 * - Embeds and link previews
 * 
 * **Conversion Strategy:**
 * - Maintains visual hierarchy through indentation
 * - Preserves list continuity and numbering
 * - Handles nested structures (toggles, lists)
 * - Escapes special characters for Markdown compatibility
 * 
 * @module markdown-converter
 * @requires @notionhq/client
 */

import {
  BlockObjectResponse,
  RichTextItemResponse,
  ParagraphBlockObjectResponse,
  Heading1BlockObjectResponse,
  Heading2BlockObjectResponse,
  Heading3BlockObjectResponse,
  BulletedListItemBlockObjectResponse,
  QuoteBlockObjectResponse,
  ToggleBlockObjectResponse,
  ToDoBlockObjectResponse,
  ChildPageBlockObjectResponse,
  ChildDatabaseBlockObjectResponse,
  EmbedBlockObjectResponse,
  CodeBlockObjectResponse,
  NumberedListItemBlockObjectResponse,
  LinkPreviewBlockObjectResponse,
  PageObjectResponse,
  CalloutBlockObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import type { NotionClient } from "./notion-client";

/**
 * Markdown formatting constants used throughout the conversion process.
 * These constants ensure consistent formatting across all conversions.
 * @constant
 */
const MARKDOWN_CONSTANTS = {
  NEWLINE: "\n",
  INDENT: "  ",
  DIVIDER: "---",
  CODE_FENCE: "```",
  BLOCKQUOTE: "> ",
  LIST_BULLET: "* ",
  LIST_HYPHEN: "- ",
  HEADING_1: "# ",
  HEADING_2: "## ",
  HEADING_3: "### ",
  BACKTICK: "`",
  DOUBLE_NEWLINE: "\n\n",
  TRIPLE_NEWLINE: "\n\n\n",
} as const;

/**
 * Conversion context type that determines how rich text is formatted.
 * Different contexts require different handling of special characters and formatting.
 * 
 * @typedef {Object} ConversionContext
 * @property {string} type - The context type identifier
 * 
 * Context Types:
 * - `standard`: Default formatting with full annotation support
 * - `mermaidContent`: Preserves newlines for Mermaid diagrams
 * - `codeBlockContent`: No formatting, preserves raw text
 * - `codeBlockCaption`: Standard formatting for code captions
 * - `tableCell`: Escapes pipes and converts newlines to `<br>`
 */
export type ConversionContext =
  | { type: "standard" }
  | { type: "mermaidContent" }
  | { type: "codeBlockContent" }
  | { type: "codeBlockCaption" }
  | { type: "tableCell" };

/**
 * Converts Notion rich text array to Markdown string with context-aware formatting.
 * 
 * This function is the core text processing unit that handles all rich text
 * conversions throughout the module. It applies different formatting rules
 * based on the conversion context.
 * 
 * **Formatting Rules by Context:**
 * 
 * - **Standard**: Full annotation support (bold, italic, code, etc.)
 * - **Mermaid Content**: Preserves exact newline formatting for diagrams
 * - **Code Block Content**: No formatting applied, raw text only
 * - **Code Block Caption**: Standard formatting for code descriptions
 * - **Table Cell**: Escapes pipes, converts newlines to `<br>` tags
 * 
 * **Annotation Handling:**
 * - Bold: `**text**`
 * - Italic: `_text_`
 * - Strikethrough: `~~text~~`
 * - Code: `` `text` ``
 * - Underline: `<u>text</u>` (HTML tag)
 * - Links: `[text](url)` with escaped underscores
 * 
 * **Special Character Handling:**
 * - Backslash-n (\n) converted to proper newlines or `<br>` based on context
 * - Pipe characters (|) escaped in table cells
 * - Underscores in URLs escaped to prevent italic conflicts
 * 
 * @param {RichTextItemResponse[]} richTextArr - Array of Notion rich text items
 * @param {ConversionContext} context - Conversion context determining formatting rules
 * @returns {string} Formatted Markdown string
 * 
 * @example
 * ```typescript
 * // Standard text with bold
 * richTextArrayToMarkdown([{plain_text: "Hello", annotations: {bold: true}}], {type: "standard"})
 * // Returns: "**Hello**"
 * 
 * // Table cell with special characters
 * richTextArrayToMarkdown([{plain_text: "A|B\nC"}], {type: "tableCell"})
 * // Returns: "A\\|B<br>C"
 * ```
 */
export const richTextArrayToMarkdown = (
  richTextArr: RichTextItemResponse[],
  context: ConversionContext,
): string => {
  if (!richTextArr) return "";
  return richTextArr
    .map((item) => {
      let text = item.plain_text;
      let applyAnnotationsAndLinks = false;

      switch (context.type) {
        case "mermaidContent":
          text = text.replace(/\\n/g, "\n");
          return text;
        case "codeBlockContent":
          return text;
        case "tableCell":
          text = text.replace(/\r\n|\r|\n/g, "<br>");
          text = text.replace(/\\n/g, "<br>");
          text = text.replace(/\|/g, "\\|");
          applyAnnotationsAndLinks = false;
          break;
        case "standard":
        case "codeBlockCaption":
          text = text.replace(/\\n/g, "  \\n");
          applyAnnotationsAndLinks = true;
          break;
      }

      if (applyAnnotationsAndLinks) {
        if (item.annotations.bold) {
          text = `**${text}**`;
        }
        if (item.annotations.italic) {
          text = `_${text}_`;
        }
        if (item.annotations.strikethrough) {
          text = `~~${text}~~`;
        }
        if (item.annotations.code) {
          text = "`" + text + "`";
        }
        if (item.annotations.underline) {
          text = `<u>${text}</u>`;
        }

        if (item.href) {
          const escapedHref = item.href.replace(/_/g, "\\\\_");
          text = `[${text}](${escapedHref})`;
        }
      }
      return text;
    })
    .join("");
};

/**
 * Details of a child page when expanded within parent content.
 * Contains all necessary information to render the child page inline.
 * 
 * @interface ChildPageDetail
 * @property {string} title - The title of the child page
 * @property {string|null} icon - Emoji or image URL for the page icon
 * @property {AugmentedBlockObjectResponse[]} blocks - All blocks within the child page
 * @property {PageObjectResponse} page - Full page object including properties
 */
export interface ChildPageDetail {
  title: string;
  icon: string | null;
  blocks: AugmentedBlockObjectResponse[];
  page: PageObjectResponse;
}

/**
 * Internal context passed during block conversion.
 * Maintains state needed for proper formatting across block types.
 * 
 * @interface BlockConversionContext
 * @property {string} indentText - Precomputed indentation string
 * @property {ConversionContext} standardContext - Default conversion context
 * @property {Object} listCounters - Tracks numbering for ordered lists by level
 * @property {number[]} openToggleIndents - Stack of open toggle indentation levels
 * @property {NotionClient} [notionClient] - Optional client for fetching child pages
 * @private
 */
interface BlockConversionContext {
  indentText: string;
  standardContext: ConversionContext;
  listCounters: { [level: string]: { [listType: string]: number } };
  openToggleIndents: number[];
  notionClient?: NotionClient;
}

/**
 * Augmented Notion block with additional metadata for conversion.
 * Extends the standard block with indentation and expansion tracking.
 * 
 * @typedef {Object} AugmentedBlockObjectResponse
 * @extends BlockObjectResponse
 * @property {number} _indentationLevel - Visual indentation level (0-based)
 * @property {ChildPageDetail} [child_page_details] - Expanded child page content
 * @property {boolean} [_isExpanded] - Whether child page was successfully expanded
 */
export type AugmentedBlockObjectResponse = BlockObjectResponse & {
  _indentationLevel: number;
  child_page_details?: ChildPageDetail;
  _isExpanded?: boolean;
};

/**
 * Converts Notion page properties to a Markdown table.
 * 
 * Creates a two-column table displaying all page properties with their values.
 * Handles various property types with appropriate formatting.
 * 
 * **Property Type Handling:**
 * - Title: Plain text or rich text (supports multiple languages)
 * - Rich Text: Full formatting support
 * - Numbers: Displayed as-is
 * - Select/Multi-select: Single or comma-separated values
 * - Dates: Start date with optional end date (arrow notation)
 * - People: Names or IDs
 * - Files: Comma-separated file names
 * - Checkbox: Visual checkmarks (✅/⬜)
 * - URLs/Email/Phone: Displayed as-is
 * - Formulas/Rollups: Type-specific formatting
 * 
 * **Special Cases:**
 * - Title detection supports multiple languages (English, Japanese)
 * - Empty values result in empty cells
 * - Unknown property types show as `[type]`
 * 
 * @param {PageObjectResponse["properties"]} properties - Page properties from Notion API
 * @returns {string} Markdown table with Property and Value columns
 * 
 * @example
 * ```markdown
 * | Property | Value |
 * | --- | --- |
 * | Title | My Page |
 * | Status | Published |
 * | Date | 2024-01-01 |
 * ```
 */
export const pagePropertiesToMarkdown = (
  properties: PageObjectResponse["properties"],
): string => {
  const markdownRows: string[] = [];
  const tableCellContext: ConversionContext = { type: "tableCell" };

  const titleKeys = ["Name", "Title", "Page", "名前", "タイトル"]; // Japanese: "名前" = name, "タイトル" = title

  Object.entries(properties).forEach(([propName, prop]) => {
    let valueString: string | null = null;
    let valueRichText: RichTextItemResponse[] | null = null;

    if (titleKeys.includes(propName) && prop.type === "title") {
      valueString = prop.title.map((item) => item.plain_text).join("");
      if (!valueString && prop.title.length > 0) {
        valueRichText = prop.title;
      }
    } else {
      switch (prop.type) {
        case "rich_text":
          valueRichText = prop.rich_text;
          break;
        case "number":
          valueString = prop.number !== null ? prop.number.toString() : "";
          break;
        case "select":
          valueString = prop.select ? prop.select.name : "";
          break;
        case "multi_select":
          valueString = prop.multi_select
            .map((option) => option.name)
            .join(", ");
          break;
        case "status":
          valueString = prop.status ? prop.status.name : "";
          break;
        case "date":
          if (prop.date) {
            valueString = prop.date.start;
            if (prop.date.end) {
              valueString += ` -> ${prop.date.end}`;
            }
          } else {
            valueString = "";
          }
          break;
        case "people":
          valueString = prop.people
            .map((person) =>
              "name" in person && person.name ? person.name : person.id,
            )
            .join(", ");
          break;
        case "files":
          valueString = prop.files.map((file) => file.name).join(", ");
          break;
        case "checkbox":
          valueString = prop.checkbox ? "[x]" : "[ ]";
          break;
        case "url":
          valueString = prop.url || "";
          break;
        case "email":
          valueString = prop.email || "";
          break;
        case "phone_number":
          valueString = prop.phone_number || "";
          break;
        case "formula":
          switch (prop.formula.type) {
            case "string":
              valueString = prop.formula.string || "";
              break;
            case "number":
              valueString =
                prop.formula.number !== null
                  ? prop.formula.number.toString()
                  : "";
              break;
            case "boolean":
              valueString = prop.formula.boolean ? "true" : "false";
              break;
            case "date":
              valueString = prop.formula.date ? prop.formula.date.start : "";
              break;
          }
          break;
        case "relation":
          valueString = prop.relation.map((rel) => rel.id).join(", ");
          break;
        case "rollup":
          switch (prop.rollup.type) {
            case "number":
              valueString =
                prop.rollup.number !== null
                  ? prop.rollup.number.toString()
                  : "";
              break;
            case "date":
              valueString = prop.rollup.date ? prop.rollup.date.start : "";
              break;
            case "array":
              valueString = `Array (${prop.rollup.array.length} items)`;
              break;
            default: {
              const rollupAsAny = prop.rollup as any;
              valueString = `Rollup (${rollupAsAny.type || "unknown"})`;
              break;
            }
          }
          break;
        case "title":
          valueRichText = prop.title;
          break;
        case "created_time":
          valueString = new Date(prop.created_time).toLocaleString();
          break;
        case "created_by":
          valueString =
            "name" in prop.created_by && prop.created_by.name
              ? prop.created_by.name
              : prop.created_by.id;
          break;
        case "last_edited_time":
          valueString = new Date(prop.last_edited_time).toLocaleString();
          break;
        case "last_edited_by":
          valueString =
            "name" in prop.last_edited_by && prop.last_edited_by.name
              ? prop.last_edited_by.name
              : prop.last_edited_by.id;
          break;
        default:
          if (propName === "id") {
            valueString = (prop as any).id || "";
          } else if (typeof (prop as any).toString === "function") {
            valueString = (prop as any).toString();
          } else {
            valueString = `Unsupported property type: ${(prop as any).type}`;
          }
      }
    }

    let finalCellValue: string;
    if (valueRichText && valueRichText.length > 0) {
      finalCellValue = richTextArrayToMarkdown(valueRichText, tableCellContext);
    } else if (valueString !== null) {
      finalCellValue = valueString.replace(/\|/g, "\\|");
    } else {
      finalCellValue = "";
    }

    const cellKey = richTextArrayToMarkdown(
      [
        {
          type: "text",
          text: { content: propName, link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: "default",
          },
          plain_text: propName,
          href: null,
        },
      ],
      tableCellContext,
    );
    markdownRows.push(`| ${cellKey} | ${finalCellValue} |`);
  });

  if (markdownRows.length > 0) {
    const header = "| Property | Value |";
    const divider = "|---|---|";
    const table = [header, divider, ...markdownRows].join("\n");
    return table + "\n";
  }
  return "";
};

/**
 * Converts paragraph block to Markdown format
 * @param block Notion paragraph block
 * @param context Block conversion context with indentation and formatting options
 * @returns Markdown representation of the paragraph
 */
const handleParagraphBlock = (
  block: ParagraphBlockObjectResponse,
  context: BlockConversionContext,
): string => {
  let markdown =
    context.indentText +
    richTextArrayToMarkdown(
      block.paragraph.rich_text,
      context.standardContext,
    ) +
    MARKDOWN_CONSTANTS.NEWLINE;
  if (
    markdown.trim() === context.indentText.trim() &&
    !block.paragraph.rich_text.length
  ) {
    markdown = context.indentText + MARKDOWN_CONSTANTS.NEWLINE;
  } else if (
    markdown.trim() === context.indentText.trim() &&
    block.paragraph.rich_text.length > 0 &&
    block.paragraph.rich_text.every((rt) => rt.plain_text === "")
  ) {
    markdown = context.indentText + MARKDOWN_CONSTANTS.NEWLINE;
  }
  return markdown;
};

/**
 * Converts heading block to Markdown format
 * @param block Notion heading block (level 1, 2, or 3)
 * @param context Block conversion context
 * @param level Heading level (1-3)
 * @returns Markdown heading with appropriate level prefix
 */
const handleHeadingBlock = (
  block:
    | Heading1BlockObjectResponse
    | Heading2BlockObjectResponse
    | Heading3BlockObjectResponse,
  context: BlockConversionContext,
  level: 1 | 2 | 3,
): string => {
  const headingPrefix =
    level === 1
      ? MARKDOWN_CONSTANTS.HEADING_1
      : level === 2
        ? MARKDOWN_CONSTANTS.HEADING_2
        : MARKDOWN_CONSTANTS.HEADING_3;
  const richText =
    level === 1
      ? (block as Heading1BlockObjectResponse).heading_1.rich_text
      : level === 2
        ? (block as Heading2BlockObjectResponse).heading_2.rich_text
        : (block as Heading3BlockObjectResponse).heading_3.rich_text;
  return (
    context.indentText +
    headingPrefix +
    richTextArrayToMarkdown(richText, context.standardContext) +
    MARKDOWN_CONSTANTS.NEWLINE
  );
};

/**
 * Converts list item block to Markdown format
 * @param block Notion list item block (bulleted or numbered)
 * @param context Block conversion context with list counters
 * @returns Markdown list item with appropriate prefix
 */
const handleListItemBlock = (
  block:
    | BulletedListItemBlockObjectResponse
    | NumberedListItemBlockObjectResponse,
  context: BlockConversionContext,
): string => {
  if (block.type === "bulleted_list_item") {
    const bulletedBlock = block as BulletedListItemBlockObjectResponse;
    return (
      context.indentText +
      MARKDOWN_CONSTANTS.LIST_BULLET +
      richTextArrayToMarkdown(
        bulletedBlock.bulleted_list_item.rich_text,
        context.standardContext,
      ) +
      MARKDOWN_CONSTANTS.NEWLINE
    );
  } else {
    const numberedBlock = block as NumberedListItemBlockObjectResponse;
    const levelKey = (block as any)._indentationLevel.toString();
    const currentItemNumber = context.listCounters[levelKey]["numbered"];
    return (
      context.indentText +
      `${currentItemNumber}. ` +
      richTextArrayToMarkdown(
        numberedBlock.numbered_list_item.rich_text,
        context.standardContext,
      ) +
      MARKDOWN_CONSTANTS.NEWLINE
    );
  }
};

/**
 * Converts to-do block to Markdown checkbox format
 * @param block Notion to-do block
 * @param context Block conversion context
 * @returns Markdown checkbox with checked/unchecked state
 */
const handleToDoBlock = (
  block: ToDoBlockObjectResponse,
  context: BlockConversionContext,
): string => {
  const checked = block.to_do.checked ? "[x]" : "[ ]";
  return (
    context.indentText +
    MARKDOWN_CONSTANTS.LIST_HYPHEN +
    checked +
    " " +
    richTextArrayToMarkdown(block.to_do.rich_text, context.standardContext) +
    MARKDOWN_CONSTANTS.NEWLINE
  );
};

/**
 * Converts toggle block to Markdown format with HTML entity escaping
 * @param block Notion toggle block
 * @param context Block conversion context
 * @returns Markdown text with escaped HTML characters
 */
const handleToggleBlock = (
  block: ToggleBlockObjectResponse,
  context: BlockConversionContext,
): string => {
  const toggleText = richTextArrayToMarkdown(
    block.toggle.rich_text,
    context.standardContext,
  );
  return (
    context.indentText +
    toggleText.replace(/</g, "&lt;").replace(/>/g, "&gt;") +
    MARKDOWN_CONSTANTS.NEWLINE
  );
};

/**
 * Converts code block to Markdown format with language detection and Mermaid support
 * @param block Notion code block
 * @param context Block conversion context
 * @returns Markdown code block with proper fencing and language specification
 */
const handleCodeBlock = (
  block: CodeBlockObjectResponse,
  context: BlockConversionContext,
): string => {
  const notionLanguage = block.code.language?.toLowerCase();
  const isMermaid = notionLanguage === "mermaid";
  const captionContext: ConversionContext = { type: "codeBlockCaption" };
  const contentContext: ConversionContext = isMermaid
    ? { type: "mermaidContent" }
    : { type: "codeBlockContent" };

  const codeContent = richTextArrayToMarkdown(
    block.code.rich_text,
    contentContext,
  );

  let markdownLanguageString = "";
  if (notionLanguage && notionLanguage !== "plain text") {
    markdownLanguageString = notionLanguage;
  }

  const captionText =
    block.code.caption && block.code.caption.length > 0
      ? richTextArrayToMarkdown(block.code.caption, captionContext)
      : "";

  if (codeContent.trim() === "" && !captionText.trim()) return "";

  const lang = markdownLanguageString;
  const processedCodeContent = codeContent;

  const needsTrailingNewline = !processedCodeContent.endsWith(
    MARKDOWN_CONSTANTS.NEWLINE,
  );
  const codeBlockMarkdownItself =
    context.indentText +
    MARKDOWN_CONSTANTS.CODE_FENCE +
    lang +
    MARKDOWN_CONSTANTS.NEWLINE +
    processedCodeContent +
    (needsTrailingNewline ? MARKDOWN_CONSTANTS.NEWLINE : "") +
    context.indentText +
    MARKDOWN_CONSTANTS.CODE_FENCE;

  if (captionText.trim()) {
    return (
      codeBlockMarkdownItself +
      MARKDOWN_CONSTANTS.NEWLINE +
      MARKDOWN_CONSTANTS.NEWLINE +
      context.indentText +
      captionText.trim() +
      MARKDOWN_CONSTANTS.NEWLINE
    );
  } else {
    return codeBlockMarkdownItself + MARKDOWN_CONSTANTS.NEWLINE;
  }
};

/**
 * Converts quote block to Markdown blockquote format
 * @param block Notion quote block
 * @param context Block conversion context
 * @returns Markdown blockquote with proper line prefixes
 */
const handleQuoteBlock = (
  block: QuoteBlockObjectResponse,
  context: BlockConversionContext,
): string => {
  const content = richTextArrayToMarkdown(
    block.quote.rich_text,
    context.standardContext,
  );
  if (content.trim()) {
    return (
      content
        .split(MARKDOWN_CONSTANTS.NEWLINE)
        .map((line) => {
          const trimmedLine = line.trimRight();
          return (
            context.indentText +
            MARKDOWN_CONSTANTS.BLOCKQUOTE +
            (trimmedLine || " ")
          );
        })
        .join(MARKDOWN_CONSTANTS.NEWLINE) + MARKDOWN_CONSTANTS.NEWLINE
    );
  } else {
    return (
      context.indentText +
      MARKDOWN_CONSTANTS.BLOCKQUOTE +
      MARKDOWN_CONSTANTS.NEWLINE
    );
  }
};

/**
 * Converts child page block to Markdown format with collapsible details
 * @param block Notion child page block
 * @param context Block conversion context
 * @returns Markdown details/summary structure or simple link
 */
const handleChildPageBlock = (
  block: ChildPageBlockObjectResponse,
  context: BlockConversionContext,
): string => {
  if ((block as any)._isExpanded && (block as any).child_page_details) {
    const {
      title,
      icon,
      blocks: childBlocks,
      page: childPageObject,
    } = (block as any).child_page_details;
    let summaryIcon = icon || "📄";
    if (icon && (icon.startsWith("http://") || icon.startsWith("https://"))) {
      summaryIcon = `<img src="${icon}" width="16" height="16" alt="icon"> `;
    }

    let markdown = `${context.indentText}<details>${MARKDOWN_CONSTANTS.NEWLINE}`;
    markdown += `${context.indentText}  <summary>${summaryIcon} ${title}</summary>${MARKDOWN_CONSTANTS.NEWLINE}${MARKDOWN_CONSTANTS.NEWLINE}`;
    markdown += `${context.indentText}  <a href="https://notion.so/${(block as any).id.replace(/-/g, "")}" target="_blank" rel="noopener noreferrer">https://notion.so/${(block as any).id.replace(/-/g, "")}</a>${MARKDOWN_CONSTANTS.NEWLINE}${MARKDOWN_CONSTANTS.NEWLINE}${MARKDOWN_CONSTANTS.NEWLINE}`;

    const childContent = blocksToMarkdown(
      childBlocks,
      childPageObject,
      context.notionClient,
      (block as any)._indentationLevel + 1 + context.openToggleIndents.length,
    );
    markdown += childContent;
    markdown += `${context.indentText}</details>${MARKDOWN_CONSTANTS.NEWLINE}${MARKDOWN_CONSTANTS.NEWLINE}`;
    return markdown;
  } else {
    return `${context.indentText}[${block.child_page.title}](https://notion.so/${(block as any).id.replace(/-/g, "")})${MARKDOWN_CONSTANTS.NEWLINE}`;
  }
};

/**
 * Converts child database block to Markdown link format
 * @param block Notion child database block
 * @param context Block conversion context
 * @returns Markdown link to the database
 */
const handleChildDatabaseBlock = (
  block: ChildDatabaseBlockObjectResponse,
  context: BlockConversionContext,
): string => {
  const title = block.child_database.title;
  const dbId = (block as any).id.replace(/-/g, "");
  return `${context.indentText}[Database: ${title}](https://www.notion.so/${dbId})`;
};

/**
 * Converts callout block to Markdown blockquote with icon
 * @param block Notion callout block
 * @param context Block conversion context
 * @returns Markdown blockquote with emoji or image icon
 */
const handleCalloutBlock = (
  block: CalloutBlockObjectResponse,
  context: BlockConversionContext,
): string => {
  let markdown = context.indentText + MARKDOWN_CONSTANTS.BLOCKQUOTE;
  if (block.callout.icon) {
    if (block.callout.icon.type === "emoji") {
      markdown += block.callout.icon.emoji + " ";
    } else if (
      block.callout.icon.type === "external" &&
      block.callout.icon.external
    ) {
      markdown += `![icon](${block.callout.icon.external.url}) `;
    }
  }
  markdown +=
    richTextArrayToMarkdown(block.callout.rich_text, context.standardContext) +
    MARKDOWN_CONSTANTS.NEWLINE;
  return markdown;
};

/**
 * Converts embed block to HTML iframe format
 * @param block Notion embed block
 * @param context Block conversion context
 * @returns HTML iframe element or empty string
 */
const handleEmbedBlock = (
  block: EmbedBlockObjectResponse,
  context: BlockConversionContext,
): string => {
  if (block.embed.url) {
    return (
      context.indentText +
      `<iframe src="${block.embed.url}"></iframe>` +
      MARKDOWN_CONSTANTS.NEWLINE
    );
  }
  return "";
};

/**
 * Converts link preview block to Markdown link format
 * @param block Notion link preview block
 * @param context Block conversion context
 * @returns Markdown link
 */
const handleLinkPreviewBlock = (
  block: LinkPreviewBlockObjectResponse,
  context: BlockConversionContext,
): string => {
  return (
    context.indentText +
    `[${block.link_preview.url}](${block.link_preview.url})` +
    MARKDOWN_CONSTANTS.NEWLINE
  );
};

/**
 * Converts divider block to Markdown horizontal rule
 * @param context Block conversion context
 * @returns Markdown horizontal rule
 */
const handleDividerBlock = (context: BlockConversionContext): string => {
  return (
    context.indentText + MARKDOWN_CONSTANTS.DIVIDER + MARKDOWN_CONSTANTS.NEWLINE
  );
};

/**
 * Processes table blocks and converts them to Markdown table format
 * @param tableBlock Notion table block with configuration
 * @param currentBlocks Array of all blocks being processed
 * @param startIndex Starting index in the blocks array
 * @param effectiveIndentLevel Current indentation level
 * @returns Object containing table markdown and next processing index
 */
const processTableBlocks = (
  tableBlock: AugmentedBlockObjectResponse & {
    type: "table";
    table: {
      has_column_header: boolean;
      table_width: number;
      children?: AugmentedBlockObjectResponse[];
    };
  },
  currentBlocks: AugmentedBlockObjectResponse[],
  startIndex: number,
  effectiveIndentLevel: number,
): { tableMarkdown: string; nextIndex: number } => {
  const tableRows: AugmentedBlockObjectResponse[] = [];
  let j = startIndex + 1;
  const tableIndentText =
    MARKDOWN_CONSTANTS.INDENT.repeat(effectiveIndentLevel);

  while (
    j < currentBlocks.length &&
    currentBlocks[j].type === "table_row" &&
    currentBlocks[j]._indentationLevel >= tableBlock._indentationLevel
  ) {
    if (
      currentBlocks[j]._indentationLevel ===
      tableBlock._indentationLevel + 1
    ) {
      tableRows.push(currentBlocks[j] as AugmentedBlockObjectResponse);
    } else if (
      currentBlocks[j]._indentationLevel >
      tableBlock._indentationLevel + 1
    ) {
      // Skip blocks that are too deeply nested
    } else {
      break;
    }
    j++;
  }

  if (tableRows.length === 0) {
    return { tableMarkdown: "", nextIndex: startIndex };
  }

  const tableMarkdownParts: string[] = [];
  const headerRow = tableBlock.table.has_column_header ? tableRows[0] : null;
  const dataRows = tableBlock.table.has_column_header
    ? tableRows.slice(1)
    : tableRows;
  const numCols = headerRow
    ? (headerRow as any).table_row.cells.length
    : dataRows[0]
      ? (dataRows[0] as any).table_row.cells.length
      : 0;

  if (headerRow && numCols > 0) {
    const headerCells = (headerRow as any).table_row.cells.map(
      (cell: RichTextItemResponse[][]) =>
        richTextArrayToMarkdown(cell.flat(), { type: "tableCell" }).trim(),
    );
    tableMarkdownParts.push(
      tableIndentText + "| " + headerCells.join(" | ") + " |",
    );
    tableMarkdownParts.push(
      tableIndentText +
        "| " +
        Array(numCols).fill("--------").join(" | ") +
        " |",
    );
  }

  for (const row of dataRows) {
    const cells = (row as any).table_row.cells.map(
      (cell: RichTextItemResponse[][]) =>
        richTextArrayToMarkdown(cell.flat(), { type: "tableCell" }).trim(),
    );
    const currentRowCols = cells.length;
    if (currentRowCols < numCols) {
      for (let k = 0; k < numCols - currentRowCols; k++) cells.push("");
    } else if (currentRowCols > numCols && numCols > 0) {
      cells.splice(numCols);
    }
    tableMarkdownParts.push(tableIndentText + "| " + cells.join(" | ") + " |");
  }

  const tableMarkdown =
    tableMarkdownParts.join(MARKDOWN_CONSTANTS.NEWLINE) +
    MARKDOWN_CONSTANTS.NEWLINE;
  return { tableMarkdown, nextIndex: j - 1 };
};

/**
 * Adds appropriate spacing between blocks based on their types
 * @param parts Array of markdown parts being built
 * @param prevBlock Previous block in the sequence
 * @param currentBlock Current block being processed
 */
const addBlockSpacing = (
  parts: string[],
  prevBlock: AugmentedBlockObjectResponse | null,
  currentBlock: AugmentedBlockObjectResponse,
): void => {
  if (parts.length === 0 || !prevBlock) return;

  const prevType = prevBlock.type;
  const currentType = currentBlock.type;

  let needsExtraNewline = true;

  if (
    (prevType === "bulleted_list_item" ||
      prevType === "numbered_list_item" ||
      prevType === "to_do") &&
    (currentType === "bulleted_list_item" ||
      currentType === "numbered_list_item" ||
      currentType === "to_do")
  ) {
    needsExtraNewline = false;
  }

  if (needsExtraNewline) {
    if (
      parts.length > 0 &&
      !parts[parts.length - 1].endsWith(MARKDOWN_CONSTANTS.DOUBLE_NEWLINE) &&
      !parts[parts.length - 1].endsWith(
        "</summary>" + MARKDOWN_CONSTANTS.NEWLINE,
      )
    ) {
      if (parts[parts.length - 1].endsWith(MARKDOWN_CONSTANTS.NEWLINE)) {
        parts.push(MARKDOWN_CONSTANTS.NEWLINE);
      } else {
        parts.push(MARKDOWN_CONSTANTS.DOUBLE_NEWLINE);
      }
    }
  }
};

/**
 * Converts a single Notion block to its Markdown representation.
 * 
 * This is the main block conversion dispatcher that routes each block type
 * to its appropriate handler. Maintains conversion state across blocks.
 * 
 * **Block Type Support:**
 * - Text: paragraph, headings, quote, callout
 * - Lists: bulleted, numbered, todo, toggle
 * - Code: with language detection and captions
 * - Structure: divider, child pages, databases
 * - Media: embeds, link previews (images excluded)
 * - Special: tables handled separately
 * 
 * **State Management:**
 * - Tracks numbered list counters per indentation level
 * - Maintains toggle expansion state
 * - Preserves indentation hierarchy
 * 
 * **Unsupported Blocks:**
 * - Synced blocks: Show as `[Unsupported Block Type]`
 * - Unknown types: Show as `[Unexpected Block Type]`
 * - Images: Silently skipped (empty string)
 * 
 * @param {AugmentedBlockObjectResponse} block - Block with indentation metadata
 * @param {Object} listCounters - Numbered list counters by level and type
 * @param {number[]} openToggleIndents - Stack of open toggle indentation levels
 * @param {NotionClient} [notionClient] - Optional client for child page expansion
 * @returns {string} Markdown representation of the block
 * 
 * @example
 * ```typescript
 * // Convert a heading block
 * const block = {type: "heading_1", heading_1: {rich_text: [...]}}
 * blockToMarkdown(block, {}, [], client)
 * // Returns: "# Heading Text\n"
 * ```
 */
export const blockToMarkdown = (
  block: AugmentedBlockObjectResponse,
  listCounters: { [level: string]: { [listType: string]: number } },
  openToggleIndents: number[],
  notionClient?: NotionClient,
): string => {
  const indentText = MARKDOWN_CONSTANTS.INDENT.repeat(block._indentationLevel);
  const standardContext: ConversionContext = { type: "standard" };

  const context: BlockConversionContext = {
    indentText,
    standardContext,
    listCounters,
    openToggleIndents,
    notionClient,
  };

  if (block.type === "numbered_list_item") {
    const levelKey = block._indentationLevel.toString();
    const listType = "numbered";
    if (!listCounters[levelKey] || !listCounters[levelKey][listType]) {
      if (!listCounters[levelKey]) listCounters[levelKey] = {};
      listCounters[levelKey][listType] = 1;
    } else {
      listCounters[levelKey][listType]++;
    }
  }

  switch (block.type) {
    case "paragraph":
      return handleParagraphBlock(
        block as ParagraphBlockObjectResponse,
        context,
      );

    case "heading_1":
      return handleHeadingBlock(
        block as Heading1BlockObjectResponse,
        context,
        1,
      );
    case "heading_2":
      return handleHeadingBlock(
        block as Heading2BlockObjectResponse,
        context,
        2,
      );
    case "heading_3":
      return handleHeadingBlock(
        block as Heading3BlockObjectResponse,
        context,
        3,
      );

    case "bulleted_list_item":
    case "numbered_list_item":
      return handleListItemBlock(
        block as
          | BulletedListItemBlockObjectResponse
          | NumberedListItemBlockObjectResponse,
        context,
      );

    case "to_do":
      return handleToDoBlock(block as ToDoBlockObjectResponse, context);

    case "code":
      return handleCodeBlock(block as CodeBlockObjectResponse, context);

    case "quote":
      return handleQuoteBlock(block as QuoteBlockObjectResponse, context);

    case "toggle":
      return handleToggleBlock(block as ToggleBlockObjectResponse, context);

    case "child_page":
      return handleChildPageBlock(
        block as ChildPageBlockObjectResponse,
        context,
      );

    case "child_database":
      return handleChildDatabaseBlock(
        block as ChildDatabaseBlockObjectResponse,
        context,
      );

    case "embed":
      return handleEmbedBlock(block as EmbedBlockObjectResponse, context);

    case "callout":
      return handleCalloutBlock(block as CalloutBlockObjectResponse, context);

    case "divider":
      return handleDividerBlock(context);

    case "link_preview":
      return handleLinkPreviewBlock(
        block as LinkPreviewBlockObjectResponse,
        context,
      );

    case "image":
      return "";

    case "table":
      return "";

    case "table_row":
      return "";

    case "synced_block":
      return `${context.indentText}[Unsupported Block Type: ${block.type}, ID: ${block.id}]${MARKDOWN_CONSTANTS.NEWLINE}`;

    default: {
      const unknownBlock = block as any;
      const type = unknownBlock.type || "unknown";
      // Note: Unexpected block type encountered
      return `${context.indentText}[Unexpected Block Type: ${type}, ID: ${block.id}]${MARKDOWN_CONSTANTS.NEWLINE}`;
    }
  }
};

/**
 * Converts an array of Notion blocks to a complete Markdown document.
 * 
 * This is the main entry point for full document conversion. It orchestrates
 * the conversion of all blocks while maintaining document structure and state.
 * 
 * **Document Structure:**
 * 1. Page properties table (if provided and at root level)
 * 2. Block content with proper spacing and indentation
 * 3. Recursive processing of nested structures
 * 
 * **Special Processing:**
 * - **Tables**: Detected and processed as groups with their rows
 * - **Lists**: Maintains continuity and proper numbering
 * - **Spacing**: Intelligent spacing between different block types
 * - **Indentation**: Preserves visual hierarchy
 * 
 * **State Management:**
 * - List counters persist across the document
 * - Toggle states tracked for proper nesting
 * - Block spacing rules applied consistently
 * 
 * **Error Handling:**
 * - Returns error message on conversion failure
 * - Continues processing despite individual block errors
 * 
 * @param {AugmentedBlockObjectResponse[]} blocks - Array of blocks to convert
 * @param {PageObjectResponse} [page] - Optional page object for properties
 * @param {NotionClient} [notionClient] - Optional client for child pages
 * @param {number} [initialIndentLevel=0] - Starting indentation offset
 * @returns {string} Complete Markdown document with proper formatting
 * 
 * @example
 * ```typescript
 * const blocks = await notionClient.getAllBlockChildren(pageId);
 * const markdown = blocksToMarkdown(blocks, pageObject, notionClient);
 * // Returns complete formatted document
 * ```
 */
export function blocksToMarkdown(
  blocks: AugmentedBlockObjectResponse[],
  page?: PageObjectResponse,
  notionClient?: NotionClient,
  initialIndentLevel = 0,
): string {
  try {
    const markdownParts: string[] = [];
    const listCounters: { [level: string]: { [listType: string]: number } } =
      {};
    const openToggleIndents: number[] = [];

    if (page && page.properties && initialIndentLevel === 0) {
      const propertiesTable = pagePropertiesToMarkdown(page.properties);
      if (propertiesTable) {
        markdownParts.push(propertiesTable);
        markdownParts.push(MARKDOWN_CONSTANTS.NEWLINE);
      }
    }

    function blocksToMarkdownRecursive(
      currentBlocks: AugmentedBlockObjectResponse[],
      currentIndentOffset: number,
      counters: { [level: string]: { [listType: string]: number } },
      toggleIndents: number[],
    ): string {
      const parts: string[] = [];
      let prevBlockForRecursive: AugmentedBlockObjectResponse | null = null;

      for (let i = 0; i < currentBlocks.length; i++) {
        const block = currentBlocks[i];
        const effectiveIndentLevel =
          block._indentationLevel + currentIndentOffset;
        const tempAugmentedBlock = {
          ...block,
          _indentationLevel: effectiveIndentLevel,
        };
        const currType = tempAugmentedBlock.type;

        addBlockSpacing(parts, prevBlockForRecursive, tempAugmentedBlock);

        if (currType !== "numbered_list_item") {
          if (
            counters[effectiveIndentLevel.toString()] &&
            counters[effectiveIndentLevel.toString()]["numbered"]
          ) {
            counters[effectiveIndentLevel.toString()]["numbered"] = 0;
          }
        }

        if (block.type === "table") {
          const tableBlock = block as AugmentedBlockObjectResponse & {
            type: "table";
            table: {
              has_column_header: boolean;
              table_width: number;
              children?: AugmentedBlockObjectResponse[];
            };
          };
          const { tableMarkdown, nextIndex } = processTableBlocks(
            tableBlock,
            currentBlocks,
            i,
            effectiveIndentLevel,
          );

          if (tableMarkdown) {
            parts.push(tableMarkdown);
          }
          i = nextIndex;
          prevBlockForRecursive = block;
          continue;
        }

        const blockContent = blockToMarkdown(
          tempAugmentedBlock,
          counters,
          toggleIndents,
          notionClient,
        );

        if (blockContent) {
          parts.push(blockContent);
        }
        prevBlockForRecursive = tempAugmentedBlock;
      }

      let result = "";
      for (let k = 0; k < parts.length; k++) {
        result += parts[k];
      }
      if (result) {
        while (result.endsWith(MARKDOWN_CONSTANTS.DOUBLE_NEWLINE)) {
          result = result.substring(
            0,
            result.length - MARKDOWN_CONSTANTS.NEWLINE.length,
          );
        }
      }
      return result;
    }

    markdownParts.push(
      blocksToMarkdownRecursive(
        blocks,
        initialIndentLevel,
        listCounters,
        openToggleIndents,
      ),
    );

    let finalMarkdown = markdownParts.join("").trimEnd();
    if (finalMarkdown) {
      finalMarkdown += MARKDOWN_CONSTANTS.NEWLINE;
    }
    return finalMarkdown;
  } catch {
    // Error occurred during markdown conversion
    return "Error converting blocks to Markdown.";
  }
}
