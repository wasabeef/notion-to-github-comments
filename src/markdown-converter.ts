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

// Type definitions for missing block types
type ImageBlockObjectResponse = BlockObjectResponse & {
  type: "image";
  image: {
    type: "external";
    external?: { url: string };
    caption: RichTextItemResponse[];
  };
};

type TableRowBlockObjectResponse = BlockObjectResponse & {
  type: "table_row";
  table_row?: {
    cells: RichTextItemResponse[][];
  };
};
import type { NotionClient } from "./notion-client";

/**
 * Constants for Markdown formatting.
 * Centralized to ensure consistency across all conversion functions.
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
 * Context type for determining how text should be formatted during conversion.
 * Different contexts apply different formatting rules:
 * - standard: Normal text with full formatting (bold, italic, links, etc.)
 * - mermaidContent: Code content with newline preservation for Mermaid diagrams
 * - codeBlockContent: Raw code content without any formatting
 * - codeBlockCaption: Code block captions with basic formatting
 * - tableCell: Table cell content with pipe escaping and <br> for newlines
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
 * This is the core text conversion function that handles:
 * - Text formatting (bold, italic, strikethrough, underline, code)
 * - Links and URLs
 * - Context-specific formatting rules
 * - Newline handling based on context
 * - HTML entity escaping for table cells
 * 
 * @param {RichTextItemResponse[]} richTextArr - Array of Notion rich text items
 * @param {ConversionContext} context - Conversion context that determines formatting behavior
 * @returns {string} Formatted Markdown string
 * 
 * @example
 * // Standard formatting with all features
 * const markdown = richTextArrayToMarkdown(richText, { type: "standard" });
 * 
 * // Table cell formatting with pipe escaping
 * const cellContent = richTextArrayToMarkdown(richText, { type: "tableCell" });
 * 
 * // Raw code content without formatting
 * const code = richTextArrayToMarkdown(richText, { type: "codeBlockContent" });
 */
export const richTextArrayToMarkdown = (
  richTextArr: RichTextItemResponse[],
  context: ConversionContext,
): string => {
  if (!richTextArr) return "";
  return richTextArr
    .map((item) => {
      let text = item.plain_text || (item as any).text?.content || "";
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

      if (applyAnnotationsAndLinks && item.annotations) {
        // Code annotation takes precedence over other formatting
        if (item.annotations.code) {
          text = "`" + text + "`";
        } else {
          // Apply other annotations only if not code
          if (item.annotations.bold) {
            text = `**${text}**`;
          }
          if (item.annotations.italic) {
            text = `_${text}_`;
          }
          if (item.annotations.strikethrough) {
            text = `~~${text}~~`;
          }
          if (item.annotations.underline) {
            text = `<u>${text}</u>`;
          }
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
 * Details of a child page that has been expanded during conversion.
 * Contains all necessary information to render the child page content.
 */
export interface ChildPageDetail {
  /** Title of the child page */
  title: string;
  /** Page icon (emoji or URL), if available */
  icon: string | null;
  /** Array of blocks from the child page */
  blocks: AugmentedBlockObjectResponse[];
  /** Full page object for accessing properties */
  page: PageObjectResponse;
}

/**
 * Context object passed to block conversion functions.
 * Contains all necessary state for proper formatting and nesting.
 */
interface BlockConversionContext {
  /** Indentation text for the current block */
  indentText: string;
  /** Standard conversion context for text formatting */
  standardContext: ConversionContext;
  /** Counters for numbered lists at different nesting levels */
  listCounters: { [level: string]: { [listType: string]: number } };
  /** Array of toggle block indentation levels currently open */
  openToggleIndents: number[];
  /** Optional Notion client for fetching child content */
  notionClient?: NotionClient;
}

/**
 * Enhanced block object with additional metadata for conversion.
 * Extends the standard Notion block response with formatting information.
 */
export type AugmentedBlockObjectResponse = BlockObjectResponse & {
  /** Indentation level for nested content */
  _indentationLevel: number;
  /** Expanded child page details, if applicable */
  child_page_details?: ChildPageDetail;
  /** Whether this block has been expanded to show child content */
  _isExpanded?: boolean;
};

/**
 * Converts Notion page properties to Markdown table format.
 * 
 * Creates a standardized table showing all page properties and their values.
 * Handles various property types including:
 * - Title, rich text, number, select, multi-select
 * - Dates, people, files, checkboxes, URLs, email, phone
 * - Formulas, relations, rollups, timestamps
 * 
 * @param {PageObjectResponse["properties"]} properties - Page properties object from Notion API
 * @returns {string} Markdown table representation of properties
 * 
 * @example
 * // Input: { "Status": { type: "select", select: { name: "Done" } } }
 * // Output:
 * // | Property | Value |
 * // |----------|-------|
 * // | Status   | Done  |
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
 * Converts a Notion paragraph block to Markdown format.
 * 
 * This function handles:
 * - Rich text formatting within the paragraph
 * - Empty paragraphs (preserves spacing)
 * - Proper indentation for nested content
 * - Special handling for paragraphs with only empty rich text items
 * 
 * @param {ParagraphBlockObjectResponse} block - Notion paragraph block object
 * @param {BlockConversionContext} context - Conversion context with indentation and formatting
 * @returns {string} Markdown representation of the paragraph with proper newlines
 * 
 * @example
 * // Regular paragraph
 * handleParagraphBlock(paragraphBlock, context)
 * // Output: "  This is a paragraph with **bold** text\n"
 * 
 * // Empty paragraph
 * handleParagraphBlock(emptyBlock, context)
 * // Output: "  \n"
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
 * Converts a Notion heading block to Markdown format with appropriate level prefix.
 * 
 * Supports all three heading levels supported by Notion:
 * - Level 1: # Heading (largest)
 * - Level 2: ## Heading (medium)
 * - Level 3: ### Heading (smallest)
 * 
 * @param {Heading1BlockObjectResponse | Heading2BlockObjectResponse | Heading3BlockObjectResponse} block - Notion heading block
 * @param {BlockConversionContext} context - Conversion context with indentation settings
 * @param {1 | 2 | 3} level - Heading level determining the number of # prefixes
 * @returns {string} Markdown heading with proper level prefix and formatting
 * 
 * @example
 * // Level 1 heading
 * handleHeadingBlock(heading1Block, context, 1)
 * // Output: "  # Main Title\n"
 * 
 * // Level 3 heading with formatting
 * handleHeadingBlock(heading3Block, context, 3)
 * // Output: "  ### **Bold** Subtitle\n"
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
 * Converts a Notion list item block to Markdown format with appropriate prefix.
 * 
 * Handles two types of list items:
 * - Bulleted list items: Use '* ' prefix
 * - Numbered list items: Use '1. ', '2. ', etc. with automatic counter management
 * 
 * The function automatically manages numbering for nested numbered lists
 * using the list counters from the conversion context.
 * 
 * @param {BulletedListItemBlockObjectResponse | NumberedListItemBlockObjectResponse} block - Notion list item block
 * @param {BlockConversionContext} context - Context with list counters and indentation
 * @returns {string} Markdown list item with proper prefix and formatting
 * 
 * @example
 * // Bulleted list item
 * handleListItemBlock(bulletedBlock, context)
 * // Output: "  * This is a bullet point\n"
 * 
 * // Numbered list item (first item)
 * handleListItemBlock(numberedBlock, context)
 * // Output: "  1. This is item number one\n"
 * 
 * // Numbered list item (third item)
 * handleListItemBlock(numberedBlock, context)
 * // Output: "  3. This is the third item\n"
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
 * Converts a Notion to-do block to Markdown checkbox format.
 * 
 * Creates GitHub-flavored Markdown checkboxes that can be toggled
 * in supported Markdown renderers. The checkbox state is preserved
 * from the original Notion to-do block.
 * 
 * @param {ToDoBlockObjectResponse} block - Notion to-do block object
 * @param {BlockConversionContext} context - Conversion context with indentation
 * @returns {string} Markdown checkbox with proper state and formatting
 * 
 * @example
 * // Unchecked to-do
 * handleToDoBlock(uncheckedBlock, context)
 * // Output: "  - [ ] This task is not done\n"
 * 
 * // Checked to-do
 * handleToDoBlock(checkedBlock, context)
 * // Output: "  - [x] This task is completed\n"
 * 
 * // To-do with rich text formatting
 * handleToDoBlock(formattedBlock, context)
 * // Output: "  - [ ] This task has **bold** text\n"
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
 * Converts a Notion toggle block to Markdown format with HTML entity escaping.
 * 
 * Toggle blocks in Notion allow collapsible content. Since Markdown doesn't
 * have native toggle support, this function converts the toggle text to
 * regular text while safely escaping any HTML characters that might
 * interfere with Markdown rendering.
 * 
 * @param {ToggleBlockObjectResponse} block - Notion toggle block object
 * @param {BlockConversionContext} context - Conversion context with indentation
 * @returns {string} Markdown text with HTML entities escaped for safety
 * 
 * @example
 * // Toggle with plain text
 * handleToggleBlock(toggleBlock, context)
 * // Output: "  Click to expand\n"
 * 
 * // Toggle with HTML characters
 * handleToggleBlock(htmlToggleBlock, context)
 * // Output: "  Code: &lt;div&gt;content&lt;/div&gt;\n"
 * 
 * // Toggle with rich text formatting
 * handleToggleBlock(richToggleBlock, context)
 * // Output: "  **Important** information &lt;here&gt;\n"
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
 * Converts a Notion code block to Markdown format with language detection and Mermaid support.
 * 
 * This function provides comprehensive code block handling:
 * - Language detection and specification in code fence
 * - Special handling for Mermaid diagrams (preserves newlines)
 * - Caption support (displayed below the code block)
 * - Proper code fencing with triple backticks
 * - Content-specific formatting based on language type
 * 
 * @param {CodeBlockObjectResponse} block - Notion code block object
 * @param {BlockConversionContext} context - Conversion context with indentation
 * @returns {string} Markdown code block with proper fencing and language
 * 
 * @example
 * // JavaScript code block
 * handleCodeBlock(jsBlock, context)
 * // Output:
 * // ```javascript
 * // console.log('Hello World');
 * // ```
 * 
 * // Mermaid diagram (special newline handling)
 * handleCodeBlock(mermaidBlock, context)
 * // Output:
 * // ```mermaid
 * // graph TD
 * //   A --> B
 * // ```
 * 
 * // Code block with caption
 * handleCodeBlock(captionedBlock, context)
 * // Output:
 * // ```python
 * // print("Hello")
 * // ```
 * //
 * // This is the caption text
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
 * Converts a Notion quote block to Markdown blockquote format.
 * 
 * Creates properly formatted blockquotes using the '> ' prefix.
 * Handles multi-line quotes by prefixing each line individually,
 * ensuring proper rendering in all Markdown parsers.
 * 
 * @param {QuoteBlockObjectResponse} block - Notion quote block object
 * @param {BlockConversionContext} context - Conversion context with indentation
 * @returns {string} Markdown blockquote with proper line prefixes
 * 
 * @example
 * // Single line quote
 * handleQuoteBlock(singleLineBlock, context)
 * // Output: "  > This is a quote\n"
 * 
 * // Multi-line quote
 * handleQuoteBlock(multiLineBlock, context)
 * // Output:
 * // "  > First line of quote\n"
 * // "  > Second line of quote\n"
 * 
 * // Empty quote
 * handleQuoteBlock(emptyBlock, context)
 * // Output: "  > \n"
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
 * Converts a Notion child page block to Markdown format with collapsible details.
 * 
 * This function handles child page embedding in two ways:
 * 1. Expanded: Full content in HTML <details> collapsible section
 * 2. Collapsed: Simple link to the child page
 * 
 * When expanded, includes:
 * - Page title with icon in summary
 * - Direct link to the Notion page
 * - Full recursive content from the child page
 * - Proper indentation for nested content
 * 
 * @param {ChildPageBlockObjectResponse} block - Notion child page block
 * @param {BlockConversionContext} context - Conversion context with indentation and client
 * @returns {string} HTML details structure or simple Markdown link
 * 
 * @example
 * // Expanded child page
 * handleChildPageBlock(expandedBlock, context)
 * // Output:
 * // <details>
 * //   <summary>📄 Child Page Title</summary>
 * //   <a href="https://notion.so/pageid">https://notion.so/pageid</a>
 * //   
 * //   [Child page content here]
 * // </details>
 * 
 * // Collapsed child page
 * handleChildPageBlock(collapsedBlock, context)
 * // Output: "  [Child Page Title](https://notion.so/pageid)\n"
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
 * Converts a Notion child database block to Markdown link format.
 * 
 * Child databases are embedded database views within pages.
 * Since full database rendering can be complex, this function
 * creates a simple link to the database for easy access.
 * 
 * @param {ChildDatabaseBlockObjectResponse} block - Notion child database block
 * @param {BlockConversionContext} context - Conversion context with indentation
 * @returns {string} Markdown link to the database with descriptive text
 * 
 * @example
 * handleChildDatabaseBlock(databaseBlock, context)
 * // Output: "  [Database: Project Tasks](https://www.notion.so/abc123)\n"
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
 * Converts a Notion callout block to Markdown blockquote with icon.
 * 
 * Callout blocks are highlighted text sections with icons in Notion.
 * This function converts them to blockquotes while preserving the icon
 * and formatting. Supports both emoji icons and external image icons.
 * 
 * @param {CalloutBlockObjectResponse} block - Notion callout block object
 * @param {BlockConversionContext} context - Conversion context with indentation
 * @returns {string} Markdown blockquote with icon and formatted content
 * 
 * @example
 * // Callout with emoji icon
 * handleCalloutBlock(emojiCalloutBlock, context)
 * // Output: "  > 💡 This is an important note\n"
 * 
 * // Callout with image icon
 * handleCalloutBlock(imageCalloutBlock, context)
 * // Output: "  > ![icon](https://example.com/icon.png) Warning message\n"
 * 
 * // Callout without icon
 * handleCalloutBlock(plainCalloutBlock, context)
 * // Output: "  > Important information here\n"
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
 * Converts a Notion embed block to HTML iframe format.
 * 
 * Embed blocks allow embedding external content (videos, web pages, etc.)
 * in Notion pages. This function creates an HTML iframe to display
 * the embedded content in Markdown environments that support HTML.
 * 
 * @param {EmbedBlockObjectResponse} block - Notion embed block object
 * @param {BlockConversionContext} context - Conversion context with indentation
 * @returns {string} HTML iframe element or empty string if no URL
 * 
 * @example
 * handleEmbedBlock(embedBlock, context)
 * // Output: "  <iframe src=\"https://example.com/video\"></iframe>\n"
 * 
 * // Block without URL
 * handleEmbedBlock(emptyEmbedBlock, context)
 * // Output: ""
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
 * Converts a Notion link preview block to Markdown link format.
 * 
 * Link preview blocks show a preview card for URLs in Notion.
 * Since Markdown doesn't support rich previews, this function
 * converts them to simple clickable links.
 * 
 * @param {LinkPreviewBlockObjectResponse} block - Notion link preview block
 * @param {BlockConversionContext} context - Conversion context with indentation
 * @returns {string} Markdown link using the URL as both text and destination
 * 
 * @example
 * handleLinkPreviewBlock(linkBlock, context)
 * // Output: "  [https://example.com](https://example.com)\n"
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
 * Converts a Notion divider block to Markdown horizontal rule.
 * 
 * Divider blocks create visual separation between content sections.
 * This function converts them to Markdown horizontal rules using
 * three hyphens (---) which is widely supported.
 * 
 * @param {BlockConversionContext} context - Conversion context with indentation
 * @returns {string} Markdown horizontal rule with proper indentation
 * 
 * @example
 * handleDividerBlock(context)
 * // Output: "  ---\n"
 */
const handleDividerBlock = (context: BlockConversionContext): string => {
  return (
    context.indentText + MARKDOWN_CONSTANTS.DIVIDER + MARKDOWN_CONSTANTS.NEWLINE
  );
};

/**
 * Processes a Notion table block and its rows to create Markdown table format.
 * 
 * This function handles the complex process of converting Notion tables:
 * - Collects all table_row blocks that belong to the table
 * - Handles header rows (when has_column_header is true)
 * - Creates properly formatted Markdown table with alignment
 * - Manages cell content conversion and escaping
 * - Returns the next index to continue processing from
 * 
 * @param {AugmentedBlockObjectResponse & {type: "table"}} tableBlock - Notion table block with config
 * @param {AugmentedBlockObjectResponse[]} currentBlocks - All blocks being processed
 * @param {number} startIndex - Current position in the blocks array
 * @param {number} effectiveIndentLevel - Current indentation level
 * @returns {{tableMarkdown: string, nextIndex: number}} Table content and next processing position
 * 
 * @example
 * const {tableMarkdown, nextIndex} = processTableBlocks(
 *   tableBlock,
 *   allBlocks,
 *   5,
 *   0
 * );
 * // tableMarkdown:
 * // | Name | Status |
 * // |------|--------|
 * // | Task 1 | Done |
 * // | Task 2 | In Progress |
 * // nextIndex: 8
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
 * Adds appropriate spacing between blocks based on their types.
 * 
 * This function manages the visual spacing in the final Markdown output
 * by determining when extra newlines are needed between different block types.
 * List items are kept together without extra spacing, while other blocks
 * get additional spacing for better readability.
 * 
 * @param {string[]} parts - Array of markdown parts being built
 * @param {AugmentedBlockObjectResponse | null} prevBlock - Previous block in sequence
 * @param {AugmentedBlockObjectResponse} currentBlock - Current block being processed
 * @returns {void} Modifies the parts array in place
 * 
 * @example
 * // Between heading and paragraph - adds extra space
 * addBlockSpacing(parts, headingBlock, paragraphBlock);
 * 
 * // Between list items - no extra space
 * addBlockSpacing(parts, listItemBlock, anotherListItemBlock);
 * 
 * // After code block - adds extra space
 * addBlockSpacing(parts, codeBlock, paragraphBlock);
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
 * Converts a single Notion block to Markdown format.
 * 
 * This is the main block conversion function that handles all supported
 * Notion block types. It manages:
 * - Block type detection and routing to specific handlers
 * - List counter management for numbered lists
 * - Indentation and context propagation
 * - Error handling for unsupported block types
 * 
 * Supported block types include:
 * - Text blocks: paragraph, headings (1-3), quote
 * - List blocks: bulleted_list_item, numbered_list_item, to_do
 * - Media blocks: code, image, embed, link_preview
 * - Structure blocks: toggle, divider, callout
 * - Nested blocks: child_page, child_database, table, table_row
 * 
 * @param {AugmentedBlockObjectResponse} block - Block with indentation metadata
 * @param {Object} listCounters - Counters for numbered lists by nesting level
 * @param {number[]} openToggleIndents - Array of open toggle indentation levels
 * @param {NotionClient} [notionClient] - Optional client for fetching child content
 * @returns {string} Markdown representation of the block
 * 
 * @example
 * const markdown = blockToMarkdown(
 *   augmentedBlock,
 *   { "0": { "numbered": 1 } },
 *   [],
 *   notionClient
 * );
 * // Returns: "  1. This is a numbered list item\n"
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
      const imageBlock = block as ImageBlockObjectResponse;
      if (imageBlock.image.type === "external" && imageBlock.image.external?.url) {
        const caption = imageBlock.image.caption.length > 0
          ? richTextArrayToMarkdown(imageBlock.image.caption, context.standardContext)
          : "";
        return `${context.indentText}![${caption}](${imageBlock.image.external.url})${MARKDOWN_CONSTANTS.NEWLINE}`;
      }
      return "";

    case "table":
      return "";

    case "table_row":
      const tableRowBlock = block as TableRowBlockObjectResponse;
      if (!tableRowBlock.table_row?.cells) {
        return "";
      }
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
 * This is the main entry point for converting Notion content to Markdown.
 * It orchestrates the entire conversion process:
 * 
 * 1. **Page Properties**: Converts page properties to a table (if page provided)
 * 2. **Block Processing**: Recursively processes all blocks with proper nesting
 * 3. **Table Handling**: Special processing for table blocks and their rows
 * 4. **Spacing Management**: Adds appropriate spacing between block types
 * 5. **Error Handling**: Gracefully handles conversion errors
 * 6. **Output Cleanup**: Ensures proper formatting and trailing newlines
 * 
 * Features:
 * - Recursive processing with depth control
 * - List counter management across nesting levels
 * - Toggle block state tracking
 * - Child page expansion support
 * - Table row collection and formatting
 * - Context-aware indentation
 * 
 * @param {AugmentedBlockObjectResponse[]} blocks - Array of blocks with indentation metadata
 * @param {PageObjectResponse} [page] - Optional page object for properties table
 * @param {NotionClient} [notionClient] - Optional client for child page fetching
 * @param {number} [initialIndentLevel=0] - Starting indentation level for nested calls
 * @returns {string} Complete Markdown document with proper formatting
 * 
 * @throws {Error} Logs conversion errors but returns error message instead of throwing
 * 
 * @example
 * // Convert page with properties table
 * const markdown = blocksToMarkdown(blocks, pageObject, notionClient);
 * 
 * // Convert child page content (nested call)
 * const childMarkdown = blocksToMarkdown(childBlocks, null, notionClient, 1);
 * 
 * // Simple block conversion without extras
 * const simpleMarkdown = blocksToMarkdown(blocks);
 */
export function blocksToMarkdown(
  blocks: AugmentedBlockObjectResponse[],
  page?: PageObjectResponse,
  notionClient?: NotionClient,
  initialIndentLevel = 0,
): string {
  try {
    if (!blocks || !Array.isArray(blocks)) {
      return "";
    }
    
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
  } catch (error) {
    // Error occurred during markdown conversion
    console.error("Error converting blocks to Markdown:", error);
    return "Error converting blocks to Markdown.";
  }
}
