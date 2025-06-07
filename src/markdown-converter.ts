import {
  BlockObjectResponse,
  // GetBlockResponse, // Unused - will be removed
  // ListBlockChildrenResponse, // Removed
  // PartialBlockObjectResponse, // Unused - will be removed
  RichTextItemResponse,
  ParagraphBlockObjectResponse,
  Heading1BlockObjectResponse,
  Heading2BlockObjectResponse,
  Heading3BlockObjectResponse,
  BulletedListItemBlockObjectResponse,
  QuoteBlockObjectResponse,
  // ImageBlockObjectResponse, // Removed
  // CalloutBlockObjectResponse, // Removed
  // DividerBlockObjectResponse, // Unused - will be removed
  ToggleBlockObjectResponse,
  ToDoBlockObjectResponse,
  ChildPageBlockObjectResponse,
  ChildDatabaseBlockObjectResponse,
  EmbedBlockObjectResponse,
  // TableBlockObjectResponse, // Removed
  // TableRowBlockObjectResponse, // Removed
  CodeBlockObjectResponse, // Ensure this is correctly imported and used
  NumberedListItemBlockObjectResponse, // Explicitly import for casting
  // EquationBlockObjectResponse, // Removed
  // VideoBlockObjectResponse, // Removed
  // BookmarkBlockObjectResponse, // Removed
  LinkPreviewBlockObjectResponse, // Added
  // LinkToPageBlockObjectResponse, // Removed
  // FileBlockObjectResponse, // Removed
  PageObjectResponse, // Added for page properties
  // PartialPageObjectResponse, // Removed
  // PartialDatabaseObjectResponse, // Removed
  // GetPagePropertyResponse, // Removed
  CalloutBlockObjectResponse, // Added
  // UserObjectResponse, // Not directly used for conversion output, but might be in properties
  // PartialUserObjectResponse, // Same as above
} from "@notionhq/client/build/src/api-endpoints";
// import { BlockObjectResponse_Code } from "./notion-types"; // Removed incorrect import
import type { NotionClient } from './notion-client'; // For type annotation

// Define a type for the context of rich text conversion
export type ConversionContext =
  | { type: 'standard' } // For paragraphs, headings, list items, etc.
  | { type: 'mermaidContent' } // For the content of a Mermaid code block
  | { type: 'codeBlockContent' } // For the content of a non-Mermaid code block
  | { type: 'codeBlockCaption' } // For the caption of any code block
  | { type: 'tableCell' }; // For text within table cells

// Helper function to extract plain text from RichTextItemResponse array
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
        case 'mermaidContent':
          // For Mermaid, preserve newlines as they are essential for syntax
          // Only handle literal \n (escaped newlines from Notion)
          text = text.replace(/\\n/g, "\n");
          // No need to escape pipes in Mermaid content
          return text;
        case 'codeBlockContent':
          return text; // No annotations or links for general code blocks
        case 'tableCell':
          text = text.replace(/\r\n|\r|\n/g, "<br>");
          text = text.replace(/\\n/g, "<br>"); // Handle literal \n
          text = text.replace(/\|/g, "\\|"); // Pipe escaping for tables
          applyAnnotationsAndLinks = false; // No annotations for table cells
          break;
        case 'standard':
        case 'codeBlockCaption':
          text = text.replace(/\\n/g, "  \\n");
          applyAnnotationsAndLinks = true;
          break;
      }

      if (applyAnnotationsAndLinks) {
        if (item.annotations.bold) { text = `**${text}**`; }
        if (item.annotations.italic) { text = `_${text}_`; }
        if (item.annotations.strikethrough) { text = `~~${text}~~`; }
        if (item.annotations.code) { text = "`" + text + "`"; }
        if (item.annotations.underline) { text = `<u>${text}</u>`; }

        if (item.href) {
          const escapedHref = item.href.replace(/_/g, "\\\\_");
          text = `[${text}](${escapedHref})`;
        }
      }
      return text;
    })
    .join("");
};

export interface ChildPageDetail {
  title: string;
  icon: string | null;
  blocks: AugmentedBlockObjectResponse[];
  page: PageObjectResponse; // Include the full page object for properties
}

// Enhance BlockObjectResponse with indentation level and potentially pre-fetched children
// Changed from interface extends to type intersection for better compatibility with discriminated unions
export type AugmentedBlockObjectResponse = BlockObjectResponse & {
  _indentationLevel: number;
  child_page_details?: ChildPageDetail; // For expanded child pages
  _isExpanded?: boolean;               // Flag if child page is expanded
  // We expect children to be flattened or handled via child_page_details by NotionClient
  // children?: AugmentedBlockObjectResponse[];
};

// Function to convert page properties to a Markdown table
export const pagePropertiesToMarkdown = (
  properties: PageObjectResponse['properties'],
): string => {
  const markdownRows: string[] = [];
  const tableCellContext: ConversionContext = { type: 'tableCell' };

  // Common keys for page titles
  const titleKeys = ['Name', 'Title', 'Page', '名前', 'タイトル']; // Add other common keys if needed

  Object.entries(properties).forEach(([propName, prop]) => {
    let valueString: string | null = null;
    let valueRichText: RichTextItemResponse[] | null = null; // Initialize/reset for each property

    // Prioritize handling for page title properties to ensure clean extraction
    if (titleKeys.includes(propName) && prop.type === 'title') {
      valueString = prop.title.map(item => item.plain_text).join('');
      // If plain_text joining results in an empty string, but there are title items,
      // then fall back to processing them as rich text. Otherwise, keep valueRichText as null.
      if (!valueString && prop.title.length > 0) {
        valueRichText = prop.title; // Fallback for titles that might only have mentions, equations etc.
      }
      // Crucially, if valueString is valid, valueRichText should remain null here.
    } else {
      // Existing logic for other property types
      switch (prop.type) {
        case 'rich_text':
          valueRichText = prop.rich_text;
          break;
        case 'number':
          valueString = prop.number !== null ? prop.number.toString() : "";
          break;
        case 'select':
          valueString = prop.select ? prop.select.name : "";
          break;
        case 'multi_select':
          valueString = prop.multi_select.map(option => option.name).join(', ');
          break;
        case 'status':
          valueString = prop.status ? prop.status.name : "";
          break;
        case 'date':
          if (prop.date) {
            valueString = prop.date.start;
            if (prop.date.end) {
              valueString += ` -> ${prop.date.end}`;
            }
          } else {
            valueString = "";
          }
          break;
        case 'people':
          valueString = prop.people.map(person => ('name' in person && person.name) ? person.name : person.id).join(', ');
          break;
        case 'files':
          valueString = prop.files.map(file => file.name).join(', ');
          break;
        case 'checkbox':
          valueString = prop.checkbox ? '[x]' : '[ ]';
          break;
        case 'url':
          valueString = prop.url || "";
          break;
        case 'email':
          valueString = prop.email || "";
          break;
        case 'phone_number':
          valueString = prop.phone_number || "";
          break;
        case 'formula':
          // Formula results can be string, number, boolean, or date
          switch (prop.formula.type) {
            case 'string': valueString = prop.formula.string || ""; break;
            case 'number': valueString = prop.formula.number !== null ? prop.formula.number.toString() : ""; break;
            case 'boolean': valueString = prop.formula.boolean ? 'true' : 'false'; break;
            case 'date': valueString = prop.formula.date ? prop.formula.date.start : ""; break; // Simplified
          }
          break;
        case 'relation':
          // For relations, we might just list IDs or a count, as fetching related page titles is complex here.
          // For simplicity, join IDs. A more advanced version might fetch titles.
          valueString = prop.relation.map(rel => rel.id).join(', ');
          break;
        case 'rollup':
          // Rollup can be complex, show type and a summary if possible
          // This is a simplified representation
          switch (prop.rollup.type) {
            case 'number': valueString = prop.rollup.number !== null ? prop.rollup.number.toString() : ""; break;
            case 'date': valueString = prop.rollup.date ? prop.rollup.date.start : ""; break; // Simplified
            case 'array': valueString = `Array (${prop.rollup.array.length} items)`; break; // Placeholder
            default: {
              // Handle cases where rollup.type might be 'unsupported' or 'incomplete'
              // or any other unexpected type by trying to access a 'type' property if it exists.
              const rollupAsAny = prop.rollup as any;
              valueString = `Rollup (${rollupAsAny.type || 'unknown'})`;
              break; // Added break for clarity within the inner switch
            }
          }
          break;
        case 'title': // Fallback for title type if not caught by titleKeys
          valueRichText = prop.title;
          break;
        case 'created_time':
          valueString = new Date(prop.created_time).toLocaleString();
          break;
        case 'created_by':
          valueString = "name" in prop.created_by && prop.created_by.name ? prop.created_by.name : prop.created_by.id;
          break;
        case 'last_edited_time':
          valueString = new Date(prop.last_edited_time).toLocaleString();
          break;
        case 'last_edited_by':
          valueString = "name" in prop.last_edited_by && prop.last_edited_by.name ? prop.last_edited_by.name : prop.last_edited_by.id;
          break;
        default:
          if (propName === 'id') {
              valueString = (prop as any).id || "";
          } else if (typeof (prop as any).toString === 'function') {
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
      // Directly use valueString, escaping pipes for table cells
      finalCellValue = valueString.replace(/\|/g, "\\|");
    } else {
      finalCellValue = "";
    }

    
    const cellKey = richTextArrayToMarkdown([{ type: 'text', text: { content: propName, link: null }, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default'}, plain_text: propName, href: null }], tableCellContext);
    markdownRows.push(`| ${cellKey} | ${finalCellValue} |`);
  });

  if (markdownRows.length > 0) {
    const header = "| Property | Value |"; // Keep this as Property/Value for now
    const divider = "|---|---|";
    const table = [header, divider, ...markdownRows].join('\n');
    return table + '\n';
  }
  return "";
};

// Main function to convert a single block to Markdown
export const blockToMarkdown = (
  block: AugmentedBlockObjectResponse,
  listCounters: { [level: string]: { [listType: string]: number } }, 
  openToggleIndents: number[], 
  notionClient?: NotionClient, 
): string => {
  let markdown = '';
  const nl = '\n';
  const indentText = "  ".repeat(block._indentationLevel);
  const standardContext: ConversionContext = { type: 'standard' };

  if (block.type === "numbered_list_item") {
    const levelKey = block._indentationLevel.toString();
    const listType = 'numbered';
    if (!listCounters[levelKey] || !listCounters[levelKey][listType]) {
        if (!listCounters[levelKey]) listCounters[levelKey] = {};
        listCounters[levelKey][listType] = 1;
    } else {
        listCounters[levelKey][listType]++;
    }
  }

  switch (block.type) {
    case "paragraph": {
      const pBlock = block as ParagraphBlockObjectResponse;
      markdown = indentText + richTextArrayToMarkdown(pBlock.paragraph.rich_text, standardContext) + nl;
      if (markdown.trim() === indentText.trim() && !pBlock.paragraph.rich_text.length) { // Check if rich_text is actually empty
        markdown = indentText + nl; // Keep truly empty paragraphs as newlines with indent
      } else if (markdown.trim() === indentText.trim() && pBlock.paragraph.rich_text.length > 0 && pBlock.paragraph.rich_text.every(rt => rt.plain_text === '')) {
        markdown = indentText + nl; // Also treat paragraphs with only empty rich text items as empty
      }
      break;
    }
    case "heading_1": {
      const headingBlock = block as Heading1BlockObjectResponse;
      markdown = indentText + "# " + richTextArrayToMarkdown(headingBlock.heading_1.rich_text, standardContext) + nl;
      break;
    }
    case "heading_2": {
      const headingBlock = block as Heading2BlockObjectResponse;
      markdown = indentText + "## " + richTextArrayToMarkdown(headingBlock.heading_2.rich_text, standardContext) + nl;
      break;
    }
    case "heading_3": {
      const headingBlock = block as Heading3BlockObjectResponse;
      markdown = indentText + "### " + richTextArrayToMarkdown(headingBlock.heading_3.rich_text, standardContext) + nl;
      break;
    }
    case "bulleted_list_item": {
      const bulletedListItemBlock = block as BulletedListItemBlockObjectResponse;
      markdown = indentText + '* ' + richTextArrayToMarkdown(bulletedListItemBlock.bulleted_list_item.rich_text, standardContext) + nl;
      break;
    }
    case "numbered_list_item": {
      const listItemBlock = block as NumberedListItemBlockObjectResponse;
      const levelKey = block._indentationLevel.toString();
      const currentItemNumber = listCounters[levelKey]['numbered'];
      markdown =
        indentText +
        `${currentItemNumber}. ` +
        richTextArrayToMarkdown(listItemBlock.numbered_list_item.rich_text, standardContext) + nl;
      break;
    }
    case "to_do": {
      const toDoBlock = block as ToDoBlockObjectResponse;
      const checked = toDoBlock.to_do.checked ? '[x]' : '[ ]';
      markdown = indentText + '- ' + checked + ' ' + richTextArrayToMarkdown(toDoBlock.to_do.rich_text, standardContext) + nl;
      break;
    }
    case "code": {
      const codeBlock = block as CodeBlockObjectResponse;
      const notionLanguage = codeBlock.code.language?.toLowerCase();
      const isMermaid = notionLanguage === "mermaid";
      const captionContext: ConversionContext = { type: 'codeBlockCaption' };
      const contentContext: ConversionContext = isMermaid ? { type: 'mermaidContent' } : { type: 'codeBlockContent' };

      const codeContent = richTextArrayToMarkdown(
        codeBlock.code.rich_text,
        contentContext,
      );
      
      let markdownLanguageString = "";
      if (notionLanguage && notionLanguage !== "plain text") {
        markdownLanguageString = notionLanguage;
      }
      
      const captionText = codeBlock.code.caption && codeBlock.code.caption.length > 0
        ? richTextArrayToMarkdown(codeBlock.code.caption, captionContext)
        : "";

      if (codeContent.trim() === "" && !captionText.trim()) return ""; // Empty code block with no caption

      const lang = markdownLanguageString; 
      
      const processedCodeContent = codeContent; 
      
      // For all code blocks, ensure proper newline formatting
      let codeBlockMarkdownItself: string;
      // Ensure content ends with newline before closing backticks
      const needsTrailingNewline = !processedCodeContent.endsWith("\n");
      codeBlockMarkdownItself = indentText + "```" + lang + nl + processedCodeContent + (needsTrailingNewline ? nl : "") + indentText + "```";
      
      if (captionText.trim()) {
        markdown = codeBlockMarkdownItself + nl + nl + indentText + captionText.trim() + nl;
      } else {
        markdown = codeBlockMarkdownItself + nl;
      }
      return markdown; // Return early as newlining is handled within this block
    }
    case "quote": {
      const quoteBlock = block as QuoteBlockObjectResponse;
      const content = richTextArrayToMarkdown(quoteBlock.quote.rich_text, standardContext);
      if (content.trim()) {
        markdown = content.split("\n").map(line => {
          const trimmedLine = line.trimRight(); // Remove trailing spaces from "  \n"
          return indentText + "> " + (trimmedLine || " "); // Add a space if line becomes empty after trim
        }).join("\n") + nl;
      } else {
        markdown = indentText + "> " + nl; // Empty quote
      }
      break;
    }
    case "toggle": {
      const toggleBlock = block as ToggleBlockObjectResponse;
      markdown = indentText + '<details>' + nl;
      markdown += indentText + '  <summary>' + richTextArrayToMarkdown(toggleBlock.toggle.rich_text, standardContext) + '</summary>' + nl + nl;
      // Content will be added by blocksToMarkdownRecursive, then </details>
      openToggleIndents.push(block._indentationLevel);
      // Return just the opening part, the rest is handled by blocksToMarkdownRecursive
      return markdown; // Important: Return early!
    }
    case "child_page":
      if (block._isExpanded && block.child_page_details) {
        const { title, icon, blocks: childBlocks, page: childPageObject } = block.child_page_details;
        let summaryIcon = icon || '📄';
        if (icon && (icon.startsWith('http://') || icon.startsWith('https://'))) {
          summaryIcon = `<img src="${icon}" width="16" height="16" alt="icon"> `;
        }
        
        markdown += `${indentText}<details>${nl}`;
        markdown += `${indentText}  <summary>${summaryIcon} ${title}</summary>${nl}${nl}`;
        markdown += `${indentText}  <a href="https://notion.so/${block.id.replace(/-/g, '')}" target="_blank" rel="noopener noreferrer">https://notion.so/${block.id.replace(/-/g, '')}</a>${nl}${nl}${nl}`; 
        
        // Pass the parent's current indent + 1 (for summary) as the new base for the child page content
        // The content from blocksToMarkdown will have its own newlines.
        const childContent = blocksToMarkdown(childBlocks, childPageObject, notionClient, block._indentationLevel + 1 + openToggleIndents.length);
        markdown += childContent; 
        markdown += `${indentText}</details>${nl}`;
      } else {
        const childPageBlock = block as ChildPageBlockObjectResponse;
        markdown = `${indentText}[${childPageBlock.child_page.title}](https://notion.so/${block.id.replace(/-/g, '')})${nl}`;
      }
      break;
    case "child_database": {
      const title = (block as ChildDatabaseBlockObjectResponse).child_database.title;
      const dbId = block.id.replace(/-/g, "");
      markdown = `${indentText}[Database: ${title}](https://www.notion.so/${dbId})`;
      break;
    }
    case "embed": {
      const embedBlock = block as EmbedBlockObjectResponse;
      if (embedBlock.embed.url) {
        markdown = indentText + `<iframe src="${embedBlock.embed.url}"></iframe>` + nl;
      }
      break;
    }
    case "image": {
      // Implementation for image block
      break;
    }
    case "callout": {
      const calloutBlock = block as CalloutBlockObjectResponse;
      // Simple blockquote for now, could be enhanced with custom styling or emoji
      markdown = indentText + '> ';
      if (calloutBlock.callout.icon) {
        if (calloutBlock.callout.icon.type === 'emoji') {
          markdown += calloutBlock.callout.icon.emoji + ' ';
        } else if (calloutBlock.callout.icon.type === 'external' && calloutBlock.callout.icon.external) {
          markdown += `![icon](${calloutBlock.callout.icon.external.url}) `; // Added space after icon
        }
      }
      markdown += richTextArrayToMarkdown(calloutBlock.callout.rich_text, standardContext) + nl;
      break;
    }
    case "divider":
      markdown = indentText + "---" + nl;
      break;
    case "link_preview": {
      const linkPreviewBlock = block as LinkPreviewBlockObjectResponse;
      markdown = indentText + `[${linkPreviewBlock.link_preview.url}](${linkPreviewBlock.link_preview.url})` + nl;
      break;
    }
    case "table": {
      // Tables are handled by blocksToMarkdown due to their multi-block nature (table -> table_row -> cells)
      markdown = ""; // blockToMarkdown returns nothing, blocksToMarkdown will see 'table' and consume rows.
      return markdown; // Explicitly return here to bypass common newline logic for table itself
    }
    case "table_row": {
      // Table rows are handled by blocksToMarkdown as part of table processing
      markdown = ""; // blockToMarkdown returns nothing for a row alone.
      return markdown; // Explicitly return here
    }
    case "synced_block": // Potentially complex, could show original_block_id or content if not too deep
        // For now, just indicate the block type and ID
        return `${indentText}[Unsupported Block Type: ${block.type}, ID: ${block.id}]${nl}`;
    default: {
      // This case should ideally not be reached if all block types are handled
      // However, to be safe, provide a fallback.
      // Using 'as any' because 'type' might not be a valid key after exhaustion.
      const unknownBlock = block as any;
      const type = unknownBlock.type || 'unknown';
      // eslint-disable-next-line no-console
      console.warn(`Encountered an unexpected block type: ${type}`);
      return `${indentText}[Unexpected Block Type: ${type}, ID: ${block.id}]${nl}`;
    }
  }

  // General trailing newline logic for blocks that don't return early
  // Ensure a single newline at the end of the block's content, if there is content.
  if (markdown) {
    // Remove all trailing newlines first
    while(markdown.endsWith("\n")) {
        markdown = markdown.substring(0, markdown.length -1);
    }
    // Add back a single newline
    return markdown + "\n";
  }
  return ""; // If markdown is empty, return empty string
};

// Function to convert an array of blocks to a complete Markdown string
export function blocksToMarkdown(
  blocks: AugmentedBlockObjectResponse[],
  page?: PageObjectResponse, // Optionally pass the page object for properties
  notionClient?: NotionClient, // For fetching children if not pre-loaded (e.g. for tables or future uses)
  initialIndentLevel = 0, // Used by recursive calls for child page content
): string {
  try {
    const markdownParts: string[] = [];
    const listCounters: { [level: string]: { [listType: string]: number } } = {};
    const openToggleIndents: number[] = [];
    const nl = '\n';

    if (page && page.properties && initialIndentLevel === 0) { // Only add for top-level page
      const propertiesTable = pagePropertiesToMarkdown(page.properties);
      if (propertiesTable) {
        markdownParts.push(propertiesTable);
        markdownParts.push(nl); // Ensure a blank line after the properties table
      }
    }
    
    // Internal recursive helper
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
            const effectiveIndentLevel = block._indentationLevel + currentIndentOffset;
            const tempAugmentedBlock = { ...block, _indentationLevel: effectiveIndentLevel };
            const currType = tempAugmentedBlock.type; 
            
            // Manage toggle closures based on indentation
            while (
                toggleIndents.length > 0 &&
                effectiveIndentLevel < toggleIndents[toggleIndents.length - 1]
            ) {
                const closingIndentLevel = toggleIndents.pop();
                if (closingIndentLevel !== undefined) {
                    parts.push("  ".repeat(closingIndentLevel + currentIndentOffset) + "</details>" + nl);
                }
            }
            if (toggleIndents.length > 0 && effectiveIndentLevel === toggleIndents[toggleIndents.length-1]) {
                 const closingIndentLevel = toggleIndents.pop();
                 if (closingIndentLevel !== undefined) {
                    parts.push("  ".repeat(closingIndentLevel + currentIndentOffset) + "</details>" + nl);
                 }
            }


            // Add appropriate spacing between blocks
            if (parts.length > 0 && prevBlockForRecursive) {
                const prevType = prevBlockForRecursive.type;

                let needsExtraNewline = true;

                if (
                    (prevType === 'bulleted_list_item' || prevType === 'numbered_list_item' || prevType === 'to_do') &&
                    (tempAugmentedBlock.type === 'bulleted_list_item' || tempAugmentedBlock.type === 'numbered_list_item' || tempAugmentedBlock.type === 'to_do')
                ) {
                    // No extra newline between any list items
                    needsExtraNewline = false;
                }
                if (prevBlockForRecursive.type === 'toggle' && tempAugmentedBlock._indentationLevel > prevBlockForRecursive._indentationLevel) {
                    needsExtraNewline = false;
                }
                
                // If we just closed a toggle, handle spacing specially
                if (parts.length > 0 && parts[parts.length - 1].endsWith("</details>" + nl)) {
                    // If there are no more open toggles, add extra spacing
                    if (toggleIndents.length === 0) {
                        needsExtraNewline = true;
                    } else {
                        // If there are still open toggles, don't add extra spacing
                        needsExtraNewline = false;
                    }
                }
                
                if (needsExtraNewline) {
                    if (parts.length > 0 && !parts[parts.length - 1].endsWith(nl+nl) && !parts[parts.length - 1].endsWith("</summary>" + nl)) {
                         if (parts[parts.length - 1].endsWith(nl)) { 
                            parts.push(nl); 
                         } else { 
                            parts.push(nl + nl);
                         }
                    }
                }
            }

            if (currType !== 'numbered_list_item') {
                 if (counters[effectiveIndentLevel.toString()] && counters[effectiveIndentLevel.toString()]['numbered']) {
                    counters[effectiveIndentLevel.toString()]['numbered'] = 0; 
                }
            }
            

            // Special handling for tables
            if (block.type === 'table') {
                const tableBlock = block as unknown as BlockObjectResponse & { type: 'table', table: { has_column_header: boolean, table_width: number, children?: AugmentedBlockObjectResponse[] }};
                const tableRows: AugmentedBlockObjectResponse[] = [];
                let j = i + 1;
                const tableIndentText = "  ".repeat(effectiveIndentLevel); // Define indentText for table scope

                // Collect all subsequent table_row blocks that belong to this table
                while (j < currentBlocks.length && currentBlocks[j].type === 'table_row' && currentBlocks[j]._indentationLevel >= block._indentationLevel) {
                    // Ensure row belongs to this table (same or deeper indent, typically table_row is child_indent + 1 of table)
                    if (currentBlocks[j]._indentationLevel === block._indentationLevel + 1) { // Direct child row
                        tableRows.push(currentBlocks[j] as AugmentedBlockObjectResponse);
                    } else if (currentBlocks[j]._indentationLevel > block._indentationLevel + 1) {
                        // This might be content within a cell of a row that itself is complex,
                        // but our current model flattens table_rows directly under table.
                        // So, we only collect direct child rows.
                    } else { // Row is less indented, belongs to an outer table or is not part of this table
                        break;
                    }
                    j++;
                }

                if (tableRows.length > 0) {
                    const tableMarkdownParts: string[] = [];
                    const headerRow = tableBlock.table.has_column_header ? tableRows[0] : null;
                    const dataRows = tableBlock.table.has_column_header ? tableRows.slice(1) : tableRows;
                    const numCols = headerRow ? (headerRow as any).table_row.cells.length : (dataRows[0] ? (dataRows[0] as any).table_row.cells.length : 0);

                    // Process header row
                    if (headerRow && numCols > 0) {
                        const headerCells = (headerRow as any).table_row.cells.map((cell: RichTextItemResponse[][]) => 
                            richTextArrayToMarkdown(cell.flat(), { type: 'tableCell' }).trim()
                        );
                        tableMarkdownParts.push(tableIndentText + "| " + headerCells.join(" | ") + " |");
                        tableMarkdownParts.push(tableIndentText + "| " + Array(numCols).fill("--------").join(" | ") + " |");
                    }

                    // Process data rows
                    for (const row of dataRows) {
                        const cells = (row as any).table_row.cells.map((cell: RichTextItemResponse[][]) => 
                            richTextArrayToMarkdown(cell.flat(), { type: 'tableCell' }).trim()
                        );
                         // Ensure all rows have the same number of columns as header or first data row if no header
                        const currentRowCols = cells.length;
                        if (currentRowCols < numCols) {
                            for(let k=0; k < numCols - currentRowCols; k++) cells.push(''); // pad with empty strings
                        } else if (currentRowCols > numCols && numCols > 0) {
                            cells.splice(numCols); // truncate to numCols
                        }
                        tableMarkdownParts.push(tableIndentText + "| " + cells.join(" | ") + " |");
                    }
                    parts.push(tableMarkdownParts.join(nl) + nl);
                    i = j - 1; // Advance the main loop counter past the consumed table rows
                }
                prevBlockForRecursive = block; // The table block itself
                continue; // Skip the generic blockToMarkdown call for 'table' type
            }

            // Standard block processing
            const blockContent = blockToMarkdown(tempAugmentedBlock, counters, toggleIndents, notionClient);
            
            if (blockContent) { 
                parts.push(blockContent);
            }
            prevBlockForRecursive = tempAugmentedBlock;
        }

        // Close any remaining open toggles at the very end of these blocks
        while (toggleIndents.length > 0) {
            const closingIndentLevel = toggleIndents.pop();
            if (closingIndentLevel !== undefined) {
                 parts.push("  ".repeat(closingIndentLevel + currentIndentOffset) + "</details>" + nl);
            }
        }
        
        // Join parts, ensuring proper newlines between them
        // This is tricky; blockToMarkdown is supposed to end with one \n.
        // The logic for adding \n\n between blocks should handle this.
        // Let's refine the joining:
        let result = "";
        for(let k=0; k < parts.length; k++) {
            result += parts[k];
            // If blockToMarkdown ensures a single trailing \n, and we need \n\n between certain blocks,
            // that logic should be handled before pushing to `parts` or by inspecting `parts[k-1]` and `parts[k]`.
            // The current inter-block spacing logic above tries to add an extra `nl` where needed.
        }
        // Remove potentially double newlines at the very end of the recursive call's output, but ensure at least one if content exists.
        if (result) {
            while(result.endsWith(nl + nl)) {
                result = result.substring(0, result.length - nl.length);
            }
        }
        return result;
    }

    markdownParts.push(blocksToMarkdownRecursive(blocks, initialIndentLevel, listCounters, openToggleIndents));
    
    // Final cleanup of newlines for the entire document
    let finalMarkdown = markdownParts.join("").trimEnd(); // Remove all trailing newlines first
    if (finalMarkdown) { // Add back a single newline if there's content
        finalMarkdown += "\n";
    }
    return finalMarkdown;

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in blocksToMarkdown:", error);
    return "Error converting blocks to Markdown.";
  }
}

// const indent = (char: string, count: number): string => char.repeat(count); // Removed unused function

// Helper function to handle closing of toggle blocks (commented out or removed)
// function handleToggleBlockClose(
//   openToggleIndents: number[],
//   nextBlockIndentation: number,
//   markdownParts: string[],
//   nl: string,
// ) {
//   while (
//     openToggleIndents.length > 0 &&
//     nextBlockIndentation < openToggleIndents[openToggleIndents.length - 1]
//   ) {
//     const closingIndent = openToggleIndents.pop();
//     if (closingIndent !== undefined) {
//       if (markdownParts.length > 0 && !markdownParts[markdownParts.length-1].endsWith(nl)) {
//           markdownParts.push(nl);
//       }
//       markdownParts.push("  ".repeat(closingIndent) + "</details>" + nl);
//     }
//   }
// }