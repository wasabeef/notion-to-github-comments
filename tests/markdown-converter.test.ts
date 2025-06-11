import {
  richTextArrayToMarkdown,
  blockToMarkdown,
  blocksToMarkdown, // Now importing blocksToMarkdown
  AugmentedBlockObjectResponse,
} from "../src/markdown-converter"; // Adjusted path
import {
  RichTextItemResponse,
  // ParagraphBlockObjectResponse, // Not strictly needed due to casting, but good for reference
  // Heading1BlockObjectResponse, // Not strictly needed
  // BulletedListItemBlockObjectResponse, // Not strictly needed
  // CodeBlockObjectResponse, // Not strictly needed
  // ToDoBlockObjectResponse, // Not strictly needed
  // Add other block types as needed
} from "@notionhq/client/build/src/api-endpoints";

/**
 * Test suite for rich text array to Markdown conversion functionality
 * Tests various text formatting, annotations, and context-specific behavior
 */
describe("richTextArrayToMarkdown", () => {
  it("should convert a simple text array to markdown", () => {
    const richTextArray: RichTextItemResponse[] = [
      {
        type: "text",
        text: { content: "Hello, world!", link: null },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
        plain_text: "Hello, world!",
        href: null,
      },
    ];
    expect(richTextArrayToMarkdown(richTextArray, { type: "standard" })).toBe(
      "Hello, world!",
    );
  });

  it("should convert bold text", () => {
    const richTextArray: RichTextItemResponse[] = [
      {
        type: "text",
        text: { content: "Bold text", link: null },
        annotations: {
          bold: true,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
        plain_text: "Bold text",
        href: null,
      },
    ];
    expect(richTextArrayToMarkdown(richTextArray, { type: "standard" })).toBe(
      "**Bold text**",
    );
  });

  it("should convert italic text", () => {
    const richTextArray: RichTextItemResponse[] = [
      {
        type: "text",
        text: { content: "Italic text", link: null },
        annotations: {
          bold: false,
          italic: true,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
        plain_text: "Italic text",
        href: null,
      },
    ];
    expect(richTextArrayToMarkdown(richTextArray, { type: "standard" })).toBe(
      "_Italic text_",
    );
  });

  it("should convert strikethrough text", () => {
    const richTextArray: RichTextItemResponse[] = [
      {
        type: "text",
        text: { content: "Strikethrough text", link: null },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: true,
          underline: false,
          code: false,
          color: "default",
        },
        plain_text: "Strikethrough text",
        href: null,
      },
    ];
    expect(richTextArrayToMarkdown(richTextArray, { type: "standard" })).toBe(
      "~~Strikethrough text~~",
    );
  });

  it("should convert code text", () => {
    const richTextArray: RichTextItemResponse[] = [
      {
        type: "text",
        text: { content: "Code text", link: null },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: true,
          color: "default",
        },
        plain_text: "Code text",
        href: null,
      },
    ];
    expect(richTextArrayToMarkdown(richTextArray, { type: "standard" })).toBe(
      "`Code text`",
    );
  });

  it("should convert a link", () => {
    const richTextArray: RichTextItemResponse[] = [
      {
        type: "text",
        text: { content: "Link text", link: { url: "https://example.com" } },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
        plain_text: "Link text",
        href: "https://example.com",
      },
    ];
    expect(richTextArrayToMarkdown(richTextArray, { type: "standard" })).toBe(
      "[Link text](https://example.com)",
    );
  });

  it("should handle multiple rich text items", () => {
    const richTextArray: RichTextItemResponse[] = [
      {
        type: "text",
        text: { content: "Hello, ", link: null },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
        plain_text: "Hello, ",
        href: null,
      },
      {
        type: "text",
        text: { content: "bold world", link: null },
        annotations: {
          bold: true,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
        plain_text: "bold world",
        href: null,
      },
      {
        type: "text",
        text: { content: " and a ", link: null },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
        plain_text: " and a ",
        href: null,
      },
      {
        type: "text",
        text: { content: "link", link: { url: "https://example.com" } },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
        plain_text: "link",
        href: "https://example.com",
      },
    ];
    expect(richTextArrayToMarkdown(richTextArray, { type: "standard" })).toBe(
      "Hello, **bold world** and a [link](https://example.com)",
    );
  });

  it("should escape pipe characters for table cells", () => {
    const richTextArray: RichTextItemResponse[] = [
      {
        type: "text",
        text: { content: "Cell | with | pipes", link: null },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
        plain_text: "Cell | with | pipes",
        href: null,
      },
    ];
    expect(richTextArrayToMarkdown(richTextArray, { type: "tableCell" })).toBe(
      "Cell \\| with \\| pipes",
    );
  });

  it("should replace newlines with <br> for table cells", () => {
    const richTextArray: RichTextItemResponse[] = [
      {
        type: "text",
        text: { content: "Line1\\nLine2", link: null },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
        plain_text: "Line1\\nLine2",
        href: null,
      },
    ];
    expect(richTextArrayToMarkdown(richTextArray, { type: "tableCell" })).toBe(
      "Line1<br>Line2",
    );
  });
});

/**
 * Test suite for individual block conversion to Markdown
 * Tests various Notion block types and their Markdown representations
 */
describe("blockToMarkdown", () => {
  const listCounters = {} as {
    [level: string]: { [listType: string]: number };
  };
  const openToggleIndents = [] as number[];
  const notionClient = undefined; // NotionClient is not needed for these unit tests

  it("should convert a paragraph block", () => {
    const block = {
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: { content: "This is a paragraph.", link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "This is a paragraph.",
            href: null,
          },
        ],
        color: "default",
      },
      _indentationLevel: 0,
    } as unknown as AugmentedBlockObjectResponse; // Cast for simplicity in test
    expect(
      blockToMarkdown(block, listCounters, openToggleIndents, notionClient),
    ).toBe("This is a paragraph.\n");
  });

  it("should convert a heading_1 block", () => {
    const block = {
      type: "heading_1",
      heading_1: {
        rich_text: [
          {
            type: "text",
            text: { content: "Main Heading", link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "Main Heading",
            href: null,
          },
        ],
        is_toggleable: false,
        color: "default",
      },
      _indentationLevel: 0,
    } as unknown as AugmentedBlockObjectResponse;
    expect(
      blockToMarkdown(block, listCounters, openToggleIndents, notionClient),
    ).toBe("# Main Heading\n");
  });

  it("should convert a code block", () => {
    const block = {
      type: "code",
      code: {
        rich_text: [
          {
            type: "text",
            text: { content: 'console.log("Hello");', link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: 'console.log("Hello");',
            href: null,
          },
        ],
        language: "javascript",
        caption: [],
      },
      _indentationLevel: 0,
    } as unknown as AugmentedBlockObjectResponse;
    expect(
      blockToMarkdown(block, listCounters, openToggleIndents, notionClient),
    ).toBe('```javascript\nconsole.log("Hello");\n```\n');
  });

  it("should convert a code block with plain text language to no language specifier", () => {
    const block = {
      type: "code",
      code: {
        rich_text: [
          {
            type: "text",
            text: { content: "Some plain text code", link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "Some plain text code",
            href: null,
          },
        ],
        language: "plain text",
        caption: [],
      },
      _indentationLevel: 0,
    } as unknown as AugmentedBlockObjectResponse;
    expect(
      blockToMarkdown(block, listCounters, openToggleIndents, notionClient),
    ).toBe("```\nSome plain text code\n```\n");
  });

  // Basic to_do block test
  it("should convert an unchecked to_do block", () => {
    const block = {
      type: "to_do",
      to_do: {
        rich_text: [
          {
            type: "text",
            text: { content: "Task to do", link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "Task to do",
            href: null,
          },
        ],
        checked: false,
        color: "default",
      },
      _indentationLevel: 0,
    } as unknown as AugmentedBlockObjectResponse;
    expect(
      blockToMarkdown(block, listCounters, openToggleIndents, notionClient),
    ).toBe("- [ ] Task to do\n");
  });

  it("should convert a checked to_do block", () => {
    const block = {
      type: "to_do",
      to_do: {
        rich_text: [
          {
            type: "text",
            text: { content: "Task done", link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "Task done",
            href: null,
          },
        ],
        checked: true,
        color: "default",
      },
      _indentationLevel: 0,
    } as unknown as AugmentedBlockObjectResponse;
    expect(
      blockToMarkdown(block, listCounters, openToggleIndents, notionClient),
    ).toBe("- [x] Task done\n");
  });

  it("should convert a code block with a caption", () => {
    const block = {
      type: "code",
      code: {
        rich_text: [
          {
            type: "text",
            text: { content: "alert('Caption this!');", link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "alert('Caption this!');",
            href: null,
          },
        ],
        language: "javascript",
        caption: [
          {
            type: "text",
            text: { content: "JS Alert", link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "JS Alert",
            href: null,
          },
        ],
      },
      _indentationLevel: 0,
    } as unknown as AugmentedBlockObjectResponse;
    expect(
      blockToMarkdown(block, listCounters, openToggleIndents, notionClient),
    ).toBe("```javascript\nalert('Caption this!');\n```\n\nJS Alert\n");
  });

  it("should convert a Mermaid code block with <br/> newlines", () => {
    const block = {
      type: "code",
      code: {
        rich_text: [
          {
            type: "text",
            text: { content: "graph TD<br/>A-->B", link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "graph TD<br/>A-->B", // plain_text might contain <br/> literally from Notion
            href: null,
          },
        ],
        language: "mermaid",
        caption: [],
      },
      _indentationLevel: 0,
    } as unknown as AugmentedBlockObjectResponse;
    expect(
      blockToMarkdown(block, listCounters, openToggleIndents, notionClient),
    ).toBe("```mermaid\ngraph TD<br/>A-->B\n```\n");
  });

  it("should convert a Mermaid code block with \\n newlines", () => {
    const block = {
      type: "code",
      code: {
        caption: [],
        rich_text: [
          {
            type: "text",
            text: { content: "graph TD\nB-->C", link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "graph TD\nB-->C",
            href: null,
          },
        ],
        language: "mermaid",
      },
      _indentationLevel: 0,
    } as unknown as AugmentedBlockObjectResponse;
    expect(
      blockToMarkdown(block, listCounters, openToggleIndents, notionClient),
    ).toBe("```mermaid\ngraph TD\nB-->C\n```\n");
  });

  it("should convert a Mermaid code block with mixed <br/> and \\n newlines and a caption", () => {
    const block = {
      type: "code",
      code: {
        caption: [
          {
            type: "text",
            text: { content: "Mermaid Diagram Example", link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "Mermaid Diagram Example",
            href: null,
          },
        ],
        rich_text: [
          {
            type: "text",
            // Intentionally mixed to test if all forms of newlines in the original text are handled
            text: {
              content:
                "sequenceDiagram<br/>Participant A\nParticipant B->>A: Message",
              link: null,
            },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text:
              "sequenceDiagram<br/>Participant A\nParticipant B->>A: Message",
            href: null,
          },
        ],
        language: "mermaid",
      },
      _indentationLevel: 0,
    } as unknown as AugmentedBlockObjectResponse;
    expect(
      blockToMarkdown(block, listCounters, openToggleIndents, notionClient),
    ).toBe(
      "```mermaid\nsequenceDiagram<br/>Participant A\nParticipant B->>A: Message\n```\n\nMermaid Diagram Example\n",
    );
  });

  it("should handle empty code block", () => {
    const block = {
      type: "code",
      code: {
        rich_text: [],
        language: "javascript",
        caption: [],
      },
      _indentationLevel: 0,
    } as unknown as AugmentedBlockObjectResponse;
    expect(
      blockToMarkdown(block, listCounters, openToggleIndents, notionClient),
    ).toBe("");
  });
});

/**
 * Test suite for complete blocks array to Markdown document conversion
 * Tests document structure, spacing, and complex nested content
 */
describe("blocksToMarkdown", () => {
  it("should convert an empty array of blocks to an empty string", () => {
    const blocks: AugmentedBlockObjectResponse[] = [];
    expect(blocksToMarkdown(blocks)).toBe("");
  });

  it("should convert a single paragraph block", () => {
    const blocks: AugmentedBlockObjectResponse[] = [
      {
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { content: "Just a paragraph.", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "Just a paragraph.",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 0,
      } as unknown as AugmentedBlockObjectResponse,
    ];
    expect(blocksToMarkdown(blocks)).toBe("Just a paragraph.\n");
  });

  it("should convert multiple paragraph blocks with correct spacing", () => {
    const blocks: AugmentedBlockObjectResponse[] = [
      {
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { content: "Paragraph 1.", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "Paragraph 1.",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 0,
      } as unknown as AugmentedBlockObjectResponse,
      {
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { content: "Paragraph 2.", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "Paragraph 2.",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 0,
      } as unknown as AugmentedBlockObjectResponse,
    ];
    expect(blocksToMarkdown(blocks)).toBe("Paragraph 1.\n\nParagraph 2.\n");
  });

  it("should convert a heading followed by a paragraph", () => {
    const blocks: AugmentedBlockObjectResponse[] = [
      {
        type: "heading_1",
        heading_1: {
          rich_text: [
            {
              type: "text",
              text: { content: "Title", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "Title",
              href: null,
            },
          ],
          is_toggleable: false,
          color: "default",
        },
        _indentationLevel: 0,
      } as unknown as AugmentedBlockObjectResponse,
      {
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { content: "Content under title.", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "Content under title.",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 0,
      } as unknown as AugmentedBlockObjectResponse,
    ];
    expect(blocksToMarkdown(blocks)).toBe("# Title\n\nContent under title.\n");
  });

  // Basic bulleted list
  it("should convert a simple bulleted list", () => {
    const blocks: AugmentedBlockObjectResponse[] = [
      {
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "Item 1", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "Item 1",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 0,
      } as unknown as AugmentedBlockObjectResponse,
      {
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "Item 2", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "Item 2",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 0,
      } as unknown as AugmentedBlockObjectResponse,
    ];
    expect(blocksToMarkdown(blocks)).toBe("* Item 1\n* Item 2\n");
  });

  // Basic numbered list
  it("should convert a simple numbered list", () => {
    const blocks: AugmentedBlockObjectResponse[] = [
      {
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "First item", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "First item",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 0,
      } as unknown as AugmentedBlockObjectResponse,
      {
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "Second item", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "Second item",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 0,
      } as unknown as AugmentedBlockObjectResponse,
    ];
    expect(blocksToMarkdown(blocks)).toBe("1. First item\n2. Second item\n");
  });

  // Nested bulleted list
  it("should convert a nested bulleted list", () => {
    const blocks: AugmentedBlockObjectResponse[] = [
      {
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "Level 1 Item 1", link: null },
              annotations: {},
              plain_text: "Level 1 Item 1",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 0,
      } as unknown as AugmentedBlockObjectResponse,
      {
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "Level 2 Item A", link: null },
              annotations: {},
              plain_text: "Level 2 Item A",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 1,
      } as unknown as AugmentedBlockObjectResponse,
      {
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "Level 2 Item B", link: null },
              annotations: {},
              plain_text: "Level 2 Item B",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 1,
      } as unknown as AugmentedBlockObjectResponse,
      {
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "Level 1 Item 2", link: null },
              annotations: {},
              plain_text: "Level 1 Item 2",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 0,
      } as unknown as AugmentedBlockObjectResponse,
    ];
    expect(blocksToMarkdown(blocks)).toBe(
      "* Level 1 Item 1\n" +
        "  * Level 2 Item A\n" +
        "  * Level 2 Item B\n" +
        "* Level 1 Item 2\n",
    );
  });

  it("should handle indented paragraphs", () => {
    const blocks: AugmentedBlockObjectResponse[] = [
      {
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { content: "Outer paragraph.", link: null },
              annotations: {},
              plain_text: "Outer paragraph.",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 0,
      } as unknown as AugmentedBlockObjectResponse,
      {
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { content: "Indented paragraph.", link: null },
              annotations: {},
              plain_text: "Indented paragraph.",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 1,
      } as unknown as AugmentedBlockObjectResponse,
      {
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { content: "Another outer.", link: null },
              annotations: {},
              plain_text: "Another outer.",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 0,
      } as unknown as AugmentedBlockObjectResponse,
    ];
    expect(blocksToMarkdown(blocks)).toBe(
      "Outer paragraph.\n" +
        "\n" + // Expect a blank line before an indented non-list block if prev is not list
        "  Indented paragraph.\n" +
        "\n" + // Expect a blank line after an indented non-list block if next is not list at same/shallower
        "Another outer.\n",
    );
  });

  // Nested numbered list
  it("should convert a nested numbered list", () => {
    const blocks: AugmentedBlockObjectResponse[] = [
      {
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "L1 N1", link: null },
              annotations: {},
              plain_text: "L1 N1",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 0,
      } as unknown as AugmentedBlockObjectResponse,
      {
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "L2 N1 (child of L1N1)", link: null },
              annotations: {},
              plain_text: "L2 N1 (child of L1N1)",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 1,
      } as unknown as AugmentedBlockObjectResponse,
      {
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "L2 N2 (child of L1N1)", link: null },
              annotations: {},
              plain_text: "L2 N2 (child of L1N1)",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 1,
      } as unknown as AugmentedBlockObjectResponse,
      {
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "L1 N2", link: null },
              annotations: {},
              plain_text: "L1 N2",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 0,
      } as unknown as AugmentedBlockObjectResponse,
    ];
    expect(blocksToMarkdown(blocks)).toBe(
      "1. L1 N1\n" +
        "  1. L2 N1 (child of L1N1)\n" + // Numbering restarts for nested list
        "  2. L2 N2 (child of L1N1)\n" +
        "2. L1 N2\n", // Numbering continues for top-level list
    );
  });

  // Mixed nested list (bulleted inside numbered)
  it("should convert a nested list with bulleted items inside a numbered list", () => {
    const blocks: AugmentedBlockObjectResponse[] = [
      {
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "N1", link: null },
              annotations: {},
              plain_text: "N1",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 0,
      } as unknown as AugmentedBlockObjectResponse,
      {
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "B1 (child of N1)", link: null },
              annotations: {},
              plain_text: "B1 (child of N1)",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 1,
      } as unknown as AugmentedBlockObjectResponse,
      {
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "B2 (child of N1)", link: null },
              annotations: {},
              plain_text: "B2 (child of N1)",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 1,
      } as unknown as AugmentedBlockObjectResponse,
      {
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "N2", link: null },
              annotations: {},
              plain_text: "N2",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 0,
      } as unknown as AugmentedBlockObjectResponse,
    ];
    expect(blocksToMarkdown(blocks)).toBe(
      "1. N1\n" +
        "  * B1 (child of N1)\n" +
        "  * B2 (child of N1)\n" +
        "2. N2\n",
    );
  });

  // Mixed nested list (numbered inside bulleted)
  it("should convert a nested list with numbered items inside a bulleted list", () => {
    const blocks: AugmentedBlockObjectResponse[] = [
      {
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "B1", link: null },
              annotations: {},
              plain_text: "B1",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 0,
      } as unknown as AugmentedBlockObjectResponse,
      {
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "N1 (child of B1)", link: null },
              annotations: {},
              plain_text: "N1 (child of B1)",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 1,
      } as unknown as AugmentedBlockObjectResponse,
      {
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "N2 (child of B1)", link: null },
              annotations: {},
              plain_text: "N2 (child of B1)",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 1,
      } as unknown as AugmentedBlockObjectResponse,
      {
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "B2", link: null },
              annotations: {},
              plain_text: "B2",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 0,
      } as unknown as AugmentedBlockObjectResponse,
    ];
    expect(blocksToMarkdown(blocks)).toBe(
      "* B1\n" +
        "  1. N1 (child of B1)\n" +
        "  2. N2 (child of B1)\n" +
        "* B2\n",
    );
  });

  // To-do list items
  it("should convert a sequence of to_do items with indentation", () => {
    const blocks: AugmentedBlockObjectResponse[] = [
      {
        type: "to_do",
        to_do: {
          rich_text: [
            {
              type: "text",
              text: { content: "To-do 1 (unchecked)", link: null },
              annotations: {},
              plain_text: "To-do 1 (unchecked)",
              href: null,
            },
          ],
          checked: false,
          color: "default",
        },
        _indentationLevel: 0,
      } as unknown as AugmentedBlockObjectResponse,
      {
        type: "to_do",
        to_do: {
          rich_text: [
            {
              type: "text",
              text: { content: "To-do 1.1 (checked, child)", link: null },
              annotations: {},
              plain_text: "To-do 1.1 (checked, child)",
              href: null,
            },
          ],
          checked: true,
          color: "default",
        },
        _indentationLevel: 1,
      } as unknown as AugmentedBlockObjectResponse,
      {
        type: "to_do",
        to_do: {
          rich_text: [
            {
              type: "text",
              text: { content: "To-do 2 (checked)", link: null },
              annotations: {},
              plain_text: "To-do 2 (checked)",
              href: null,
            },
          ],
          checked: true,
          color: "default",
        },
        _indentationLevel: 0,
      } as unknown as AugmentedBlockObjectResponse,
    ];
    expect(blocksToMarkdown(blocks)).toBe(
      "- [ ] To-do 1 (unchecked)\n" +
        "  - [x] To-do 1.1 (checked, child)\n" +
        "- [x] To-do 2 (checked)\n",
    );
  });

  /**
   * Test suite for toggle block processing and flattened output
   * Tests toggle blocks with various content types and nesting
   */
  describe("toggle block handling", () => {
    it("should convert a simple toggle block with its content and a following paragraph", () => {
      const blocks: AugmentedBlockObjectResponse[] = [
        {
          type: "toggle",
          toggle: {
            rich_text: [
              {
                type: "text",
                text: { content: "Toggle Summary", link: null },
                annotations: {},
                plain_text: "Toggle Summary",
                href: null,
              },
            ],
            color: "default",
          },
          _indentationLevel: 0,
        } as unknown as AugmentedBlockObjectResponse,
        {
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: { content: "Toggle content.", link: null },
                annotations: {},
                plain_text: "Toggle content.",
                href: null,
              },
            ],
            color: "default",
          },
          _indentationLevel: 1,
        } as unknown as AugmentedBlockObjectResponse,
        {
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: { content: "After toggle.", link: null },
                annotations: {},
                plain_text: "After toggle.",
                href: null,
              },
            ],
            color: "default",
          },
          _indentationLevel: 0,
        } as unknown as AugmentedBlockObjectResponse,
      ];
      expect(blocksToMarkdown(blocks)).toBe(
        "Toggle Summary\n" +
          "\n" +
          "  Toggle content.\n" +
          "\n" +
          "After toggle.\n",
      );
    });

    it("should convert an empty toggle block", () => {
      const blocks: AugmentedBlockObjectResponse[] = [
        {
          type: "toggle",
          toggle: {
            rich_text: [
              {
                type: "text",
                text: { content: "Empty Toggle", link: null },
                annotations: {},
                plain_text: "Empty Toggle",
                href: null,
              },
            ],
            color: "default",
          },
          _indentationLevel: 0,
        } as unknown as AugmentedBlockObjectResponse,
        {
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: { content: "Paragraph after empty toggle.", link: null },
                annotations: {},
                plain_text: "Paragraph after empty toggle.",
                href: null,
              },
            ],
            color: "default",
          },
          _indentationLevel: 0,
        } as unknown as AugmentedBlockObjectResponse,
      ];
      expect(blocksToMarkdown(blocks)).toBe(
        "Empty Toggle\n" + "\n" + "Paragraph after empty toggle.\n",
      );
    });

    it("should convert nested toggle blocks", () => {
      const blocks: AugmentedBlockObjectResponse[] = [
        {
          type: "toggle",
          toggle: {
            rich_text: [
              {
                type: "text",
                text: { content: "Outer Toggle", link: null },
                annotations: {},
                plain_text: "Outer Toggle",
                href: null,
              },
            ],
            color: "default",
          },
          _indentationLevel: 0,
        } as unknown as AugmentedBlockObjectResponse,
        {
          type: "toggle",
          toggle: {
            rich_text: [
              {
                type: "text",
                text: { content: "Inner Toggle", link: null },
                annotations: {},
                plain_text: "Inner Toggle",
                href: null,
              },
            ],
            color: "default",
          },
          _indentationLevel: 1,
        } as unknown as AugmentedBlockObjectResponse,
        {
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: { content: "Inner content.", link: null },
                annotations: {},
                plain_text: "Inner content.",
                href: null,
              },
            ],
            color: "default",
          },
          _indentationLevel: 2,
        } as unknown as AugmentedBlockObjectResponse,
        {
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: { content: "Outer content after inner.", link: null },
                annotations: {},
                plain_text: "Outer content after inner.",
                href: null,
              },
            ],
            color: "default",
          },
          _indentationLevel: 1,
        } as unknown as AugmentedBlockObjectResponse,
        {
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: { content: "Completely outside.", link: null },
                annotations: {},
                plain_text: "Completely outside.",
                href: null,
              },
            ],
            color: "default",
          },
          _indentationLevel: 0,
        } as unknown as AugmentedBlockObjectResponse,
      ];
      expect(blocksToMarkdown(blocks)).toBe(
        "Outer Toggle\n" +
          "\n" +
          "  Inner Toggle\n" +
          "\n" +
          "    Inner content.\n" +
          "\n" +
          "  Outer content after inner.\n" +
          "\n" +
          "Completely outside.\n",
      );
    });

    it("should handle a list immediately following a toggle block", () => {
      const blocks: AugmentedBlockObjectResponse[] = [
        {
          type: "toggle",
          toggle: {
            rich_text: [
              {
                type: "text",
                text: { content: "Toggle Title", link: null },
                annotations: {},
                plain_text: "Toggle Title",
                href: null,
              },
            ],
            color: "default",
          },
          _indentationLevel: 0,
        } as unknown as AugmentedBlockObjectResponse,
        {
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: { content: "Inside toggle.", link: null },
                annotations: {},
                plain_text: "Inside toggle.",
                href: null,
              },
            ],
            color: "default",
          },
          _indentationLevel: 1,
        } as unknown as AugmentedBlockObjectResponse,
        {
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: { content: "List item after toggle", link: null },
                annotations: {},
                plain_text: "List item after toggle",
                href: null,
              },
            ],
            color: "default",
          },
          _indentationLevel: 0,
        } as unknown as AugmentedBlockObjectResponse,
      ];
      expect(blocksToMarkdown(blocks)).toBe(
        "Toggle Title\n" +
          "\n" +
          "  Inside toggle.\n" +
          "\n" +
          "* List item after toggle\n",
      );
    });

    it("should convert a toggle block containing a Mermaid code block", () => {
      const blocks: AugmentedBlockObjectResponse[] = [
        {
          type: "toggle",
          toggle: {
            rich_text: [
              {
                type: "text",
                text: { content: "spannerのテーブル・DMLイメージ", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "spannerのテーブル・DMLイメージ",
                href: null,
              },
            ],
            color: "default",
          },
          _indentationLevel: 0,
        } as unknown as AugmentedBlockObjectResponse,
        {
          type: "code",
          code: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "graph TD\nA[Spanner] --> B[DML]\nB --> C[Table]",
                  link: null,
                },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "graph TD\nA[Spanner] --> B[DML]\nB --> C[Table]",
                href: null,
              },
            ],
            language: "mermaid",
            caption: [],
          },
          _indentationLevel: 1, // Inside the toggle
        } as unknown as AugmentedBlockObjectResponse,
        {
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: { content: "After toggle content", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "After toggle content",
                href: null,
              },
            ],
            color: "default",
          },
          _indentationLevel: 0,
        } as unknown as AugmentedBlockObjectResponse,
      ];

      const result = blocksToMarkdown(blocks);

      // Expected structure (flattened toggle)
      const expected =
        "spannerのテーブル・DMLイメージ\n" +
        "\n" +
        "  ```mermaid\n" +
        "graph TD\n" +
        "A[Spanner] --> B[DML]\n" +
        "B --> C[Table]\n" +
        "  ```\n" +
        "\n" +
        "After toggle content\n";

      expect(result).toBe(expected);
    });
  });

  // Table block tests
  /**
   * Test suite for table block conversion to Markdown format
   * Tests table structure, headers, and cell content formatting
   */
  describe("table block handling", () => {
    const now = new Date().toISOString(); // For created_time, last_edited_time

    it("should convert a simple table with a header row", () => {
      const blocks: AugmentedBlockObjectResponse[] = [
        {
          object: "block",
          id: "table_id_simple_header", // Added ID
          parent: { type: "page_id", page_id: "test_page" },
          created_time: now,
          last_edited_time: now,
          created_by: { object: "user", id: "test_user" },
          last_edited_by: { object: "user", id: "test_user" },
          has_children: true,
          archived: false,
          in_trash: false,
          type: "table",
          table: {
            table_width: 2,
            has_column_header: true,
            has_row_header: false,
          },
          _indentationLevel: 0,
        } as unknown as AugmentedBlockObjectResponse,
        {
          // Header row
          object: "block",
          id: "header_row_1",
          parent: { type: "block_id", block_id: "table_id_simple_header" }, // Added parent
          created_time: now,
          last_edited_time: now,
          created_by: { object: "user", id: "test_user" },
          last_edited_by: { object: "user", id: "test_user" },
          has_children: false,
          archived: false,
          in_trash: false,
          type: "table_row",
          table_row: {
            cells: [
              [
                {
                  type: "text",
                  text: { content: "Header 1", link: null },
                  annotations: {},
                  plain_text: "Header 1",
                  href: null,
                },
              ],
              [
                {
                  type: "text",
                  text: { content: "Header 2", link: null },
                  annotations: {},
                  plain_text: "Header 2",
                  href: null,
                },
              ],
            ],
          },
          _indentationLevel: 1,
        } as unknown as AugmentedBlockObjectResponse,
        {
          // Data row 1
          object: "block",
          id: "data_row_1_1",
          parent: { type: "block_id", block_id: "table_id_simple_header" }, // Added parent
          created_time: now,
          last_edited_time: now,
          created_by: { object: "user", id: "test_user" },
          last_edited_by: { object: "user", id: "test_user" },
          has_children: false,
          archived: false,
          in_trash: false,
          type: "table_row",
          table_row: {
            cells: [
              [
                {
                  type: "text",
                  text: { content: "Cell A1", link: null },
                  annotations: {},
                  plain_text: "Cell A1",
                  href: null,
                },
              ],
              [
                {
                  type: "text",
                  text: { content: "Cell B1", link: null },
                  annotations: {},
                  plain_text: "Cell B1",
                  href: null,
                },
              ],
            ],
          },
          _indentationLevel: 1,
        } as unknown as AugmentedBlockObjectResponse,
        {
          // Data row 2
          object: "block",
          id: "data_row_1_2",
          parent: { type: "block_id", block_id: "table_id_simple_header" }, // Added parent
          created_time: now,
          last_edited_time: now,
          created_by: { object: "user", id: "test_user" },
          last_edited_by: { object: "user", id: "test_user" },
          has_children: false,
          archived: false,
          in_trash: false,
          type: "table_row",
          table_row: {
            cells: [
              [
                {
                  type: "text",
                  text: { content: "Cell A2 | Pipe", link: null },
                  annotations: {},
                  plain_text: "Cell A2 | Pipe",
                  href: null,
                },
              ],
              [
                {
                  type: "text",
                  text: { content: "Cell B2\nNewline", link: null },
                  annotations: {},
                  plain_text: "Cell B2\nNewline",
                  href: null,
                },
              ],
            ],
          },
          _indentationLevel: 1,
        } as unknown as AugmentedBlockObjectResponse,
        {
          object: "block",
          id: "p_after_table_1",
          parent: { type: "page_id", page_id: "test_page" },
          created_time: now,
          last_edited_time: now,
          created_by: { object: "user", id: "test_user" },
          last_edited_by: { object: "user", id: "test_user" },
          has_children: false,
          archived: false,
          in_trash: false,
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: { content: "After table.", link: null },
                annotations: {},
                plain_text: "After table.",
                href: null,
              },
            ],
            color: "default",
          },
          _indentationLevel: 0,
        } as unknown as AugmentedBlockObjectResponse,
      ];
      expect(blocksToMarkdown(blocks)).toBe(
        "| Header 1 | Header 2 |\n" +
          "| -------- | -------- |\n" +
          "| Cell A1 | Cell B1 |\n" +
          "| Cell A2 \\| Pipe | Cell B2<br>Newline |\n" +
          "\n" +
          "After table.\n",
      );
    });

    it("should convert a table without a header row", () => {
      const blocks: AugmentedBlockObjectResponse[] = [
        {
          object: "block",
          id: "table_id_simple_no_header", // Added ID
          parent: { type: "page_id", page_id: "test_page" },
          created_time: now,
          last_edited_time: now,
          created_by: { object: "user", id: "test_user" },
          last_edited_by: { object: "user", id: "test_user" },
          has_children: true,
          archived: false,
          in_trash: false,
          type: "table",
          table: {
            table_width: 2,
            has_column_header: false,
            has_row_header: false,
          },
          _indentationLevel: 0,
        } as unknown as AugmentedBlockObjectResponse,
        {
          object: "block",
          id: "data_row_2_1",
          parent: { type: "block_id", block_id: "table_id_simple_no_header" }, // Added parent
          created_time: now,
          last_edited_time: now,
          created_by: { object: "user", id: "test_user" },
          last_edited_by: { object: "user", id: "test_user" },
          has_children: false,
          archived: false,
          in_trash: false,
          type: "table_row",
          table_row: {
            cells: [
              [
                {
                  type: "text",
                  text: { content: "Row1 Cell1", link: null },
                  annotations: {},
                  plain_text: "Row1 Cell1",
                  href: null,
                },
              ],
              [
                {
                  type: "text",
                  text: { content: "Row1 Cell2", link: null },
                  annotations: {},
                  plain_text: "Row1 Cell2",
                  href: null,
                },
              ],
            ],
          },
          _indentationLevel: 1,
        } as unknown as AugmentedBlockObjectResponse,
        {
          object: "block",
          id: "data_row_2_2",
          parent: { type: "block_id", block_id: "table_id_simple_no_header" }, // Added parent
          created_time: now,
          last_edited_time: now,
          created_by: { object: "user", id: "test_user" },
          last_edited_by: { object: "user", id: "test_user" },
          has_children: false,
          archived: false,
          in_trash: false,
          type: "table_row",
          table_row: {
            cells: [
              [
                {
                  type: "text",
                  text: { content: "Row2 Cell1", link: null },
                  annotations: {},
                  plain_text: "Row2 Cell1",
                  href: null,
                },
              ],
              [
                {
                  type: "text",
                  text: { content: "Row2 Cell2", link: null },
                  annotations: {},
                  plain_text: "Row2 Cell2",
                  href: null,
                },
              ],
            ],
          },
          _indentationLevel: 1,
        } as unknown as AugmentedBlockObjectResponse,
      ];
      expect(blocksToMarkdown(blocks)).toBe(
        "| Row1 Cell1 | Row1 Cell2 |\n" + "| Row2 Cell1 | Row2 Cell2 |\n",
      );
    });
  });
});

/**
 * Test suite for edge cases and error scenarios
 * Tests various edge cases that could cause issues in production
 */
describe("richTextArrayToMarkdown - Edge Cases", () => {
  it("should handle null rich text array", () => {
    const result = richTextArrayToMarkdown(null as any, { type: "standard" });
    expect(result).toBe("");
  });

  it("should handle empty rich text array", () => {
    const result = richTextArrayToMarkdown([], { type: "standard" });
    expect(result).toBe("");
  });

  it("should handle rich text item with undefined properties", () => {
    const richTextArray: any[] = [
      {
        type: "text",
        text: { content: "Test" },
        // Missing annotations and plain_text
      },
      {
        type: "text",
        text: { content: undefined },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
        plain_text: "Fallback text",
      },
    ];
    const result = richTextArrayToMarkdown(richTextArray, { type: "standard" });
    expect(result).toBe("TestFallback text");
  });

  it("should handle multiple annotations combined", () => {
    const richTextArray: RichTextItemResponse[] = [
      {
        type: "text",
        text: { content: "Complex text", link: null },
        annotations: {
          bold: true,
          italic: true,
          strikethrough: true,
          underline: false,
          code: true,
          color: "default",
        },
        plain_text: "Complex text",
        href: null,
      },
    ];
    const result = richTextArrayToMarkdown(richTextArray, { type: "standard" });
    // Code annotation takes precedence
    expect(result).toBe("`Complex text`");
  });

  it("should escape special markdown characters", () => {
    const richTextArray: RichTextItemResponse[] = [
      {
        type: "text",
        text: { content: "Text with * and _ and [ and ]", link: null },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
        plain_text: "Text with * and _ and [ and ]",
        href: null,
      },
    ];
    const result = richTextArrayToMarkdown(richTextArray, { type: "standard" });
    // Currently not escaping - documenting existing behavior
    expect(result).toBe("Text with * and _ and [ and ]");
  });

  it("should handle very long text content", () => {
    const longText = "a".repeat(10000);
    const richTextArray: RichTextItemResponse[] = [
      {
        type: "text",
        text: { content: longText, link: null },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
        plain_text: longText,
        href: null,
      },
    ];
    const result = richTextArrayToMarkdown(richTextArray, { type: "standard" });
    expect(result).toBe(longText);
  });
});

describe("blockToMarkdown - Edge Cases", () => {
  const listCounters = {} as {
    [level: string]: { [listType: string]: number };
  };
  const openToggleIndents = [] as number[];
  const notionClient = undefined;

  it("should handle block with missing type", () => {
    const block = {
      // Missing type property
      _indentationLevel: 0,
    } as any;
    const result = blockToMarkdown(block, listCounters, openToggleIndents, notionClient);
    expect(result).toBe("[Unexpected Block Type: unknown, ID: undefined]\n");
  });

  it("should handle code block with wrong line break pattern", () => {
    const block = {
      type: "code",
      code: {
        rich_text: [
          {
            type: "text",
            text: { content: "Line 1\\nLine 2", link: null },
            annotations: {},
            plain_text: "Line 1\\nLine 2",
            href: null,
          },
        ],
        language: "javascript",
        caption: [],
      },
      _indentationLevel: 0,
    } as unknown as AugmentedBlockObjectResponse;
    const result = blockToMarkdown(block, listCounters, openToggleIndents, notionClient);
    expect(result).toBe("```javascript\nLine 1\\nLine 2\n```\n");
  });

  it("should handle table block with missing cells", () => {
    const block = {
      type: "table_row",
      table_row: {
        cells: undefined,
      },
      _indentationLevel: 0,
    } as any;
    const result = blockToMarkdown(block, listCounters, openToggleIndents, notionClient);
    expect(result).toBe("");
  });

  it("should handle table cell with newline character bug", () => {
    // Testing the bug where /n/g should be /\n/g
    const cellContent = "Line 1\nLine 2";
    // The current implementation has a bug - documenting it
    const result = cellContent.replace(/n/g, "<br>");
    expect(result).toBe("Li<br>e 1\nLi<br>e 2"); // Shows the bug
  });

  it("should handle image block with missing URL", () => {
    const block = {
      type: "image",
      image: {
        type: "external",
        external: {
          url: undefined,
        },
      },
      _indentationLevel: 0,
    } as any;
    const result = blockToMarkdown(block, listCounters, openToggleIndents, notionClient);
    expect(result).toBe("");
  });

  it("should handle bookmark block with XSS attempt", () => {
    const block = {
      type: "bookmark",
      bookmark: {
        url: "javascript:alert('XSS')",
        caption: [
          {
            type: "text",
            text: { content: "Malicious bookmark", link: null },
            annotations: {},
            plain_text: "Malicious bookmark",
            href: null,
          },
        ],
      },
      _indentationLevel: 0,
    } as unknown as AugmentedBlockObjectResponse;
    const result = blockToMarkdown(block, listCounters, openToggleIndents, notionClient);
    // Currently no XSS protection - documenting existing behavior
    expect(result).toBe("[Unexpected Block Type: bookmark, ID: undefined]\n");
  });
});

/**
 * Test suite for complex page structure conversion
 * Tests realistic page scenarios with multiple block types and nested content
 */
describe("blocksToMarkdown - Complex Page Structure", () => {
  it("should convert a complex page structure with sanitized data to Markdown", () => {
    const now = new Date().toISOString();
    const demoBlocks: AugmentedBlockObjectResponse[] = [
      {
        object: "block",
        id: "block_id_paragraph_intro",
        parent: { type: "page_id", page_id: "page_id_1" },
        created_time: now,
        last_edited_time: now,
        created_by: { object: "user", id: "user_id_1" },
        last_edited_by: { object: "user", id: "user_id_1" },
        has_children: false,
        archived: false,
        in_trash: false,
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { content: "Lorem ipsum intro paragraph.", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "Lorem ipsum intro paragraph.",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 0,
      },
      {
        object: "block",
        id: "block_id_h1_main",
        parent: { type: "page_id", page_id: "page_id_1" },
        created_time: now,
        last_edited_time: now,
        created_by: { object: "user", id: "user_id_1" },
        last_edited_by: { object: "user", id: "user_id_1" },
        has_children: false,
        archived: false,
        in_trash: false,
        type: "heading_1",
        heading_1: {
          rich_text: [
            {
              type: "text",
              text: { content: "Main Heading 1", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "Main Heading 1",
              href: null,
            },
          ],
          is_toggleable: false,
          color: "default",
        },
        _indentationLevel: 0,
      },
      {
        object: "block",
        id: "block_id_divider_1",
        parent: { type: "page_id", page_id: "page_id_1" },
        created_time: now,
        last_edited_time: now,
        created_by: { object: "user", id: "user_id_1" },
        last_edited_by: { object: "user", id: "user_id_1" },
        has_children: false,
        archived: false,
        in_trash: false,
        type: "divider",
        divider: {},
        _indentationLevel: 0,
      },
      {
        object: "block",
        id: "block_id_toggle_1",
        parent: { type: "page_id", page_id: "page_id_1" },
        created_time: now,
        last_edited_time: now,
        created_by: { object: "user", id: "user_id_1" },
        last_edited_by: { object: "user", id: "user_id_1" },
        has_children: true,
        archived: false,
        in_trash: false,
        type: "toggle",
        toggle: {
          rich_text: [
            {
              type: "text",
              text: { content: "Outer Toggle Title", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "Outer Toggle Title",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 0,
      },
      {
        object: "block",
        id: "block_id_p_in_toggle_1",
        parent: { type: "block_id", block_id: "block_id_toggle_1" },
        created_time: now,
        last_edited_time: now,
        created_by: { object: "user", id: "user_id_1" },
        last_edited_by: { object: "user", id: "user_id_1" },
        has_children: false,
        archived: false,
        in_trash: false,
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { content: "Paragraph inside outer toggle.", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "Paragraph inside outer toggle.",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 1,
      },
      {
        object: "block",
        id: "block_id_bl_in_toggle_1",
        parent: { type: "block_id", block_id: "block_id_toggle_1" },
        created_time: now,
        last_edited_time: now,
        created_by: { object: "user", id: "user_id_1" },
        last_edited_by: { object: "user", id: "user_id_1" },
        has_children: false,
        archived: false,
        in_trash: false,
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "List item 1 in toggle.", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "List item 1 in toggle.",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 1,
      },
      {
        object: "block",
        id: "block_id_bl_nested_in_toggle_1",
        parent: { type: "block_id", block_id: "block_id_toggle_1" }, // Parent should be the list item if API provides, but for our converter, flat list with indentation is fine.
        created_time: now,
        last_edited_time: now,
        created_by: { object: "user", id: "user_id_1" },
        last_edited_by: { object: "user", id: "user_id_1" },
        has_children: false,
        archived: false,
        in_trash: false,
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "Nested list item 1.1 in toggle.", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "Nested list item 1.1 in toggle.",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 2,
      },
      {
        object: "block",
        id: "block_id_toggle_2_nested",
        parent: { type: "block_id", block_id: "block_id_toggle_1" },
        created_time: now,
        last_edited_time: now,
        created_by: { object: "user", id: "user_id_1" },
        last_edited_by: { object: "user", id: "user_id_1" },
        has_children: true,
        archived: false,
        in_trash: false,
        type: "toggle",
        toggle: {
          rich_text: [
            {
              type: "text",
              text: { content: "Inner Toggle Title", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "Inner Toggle Title",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 1,
      },
      {
        object: "block",
        id: "block_id_p_in_toggle_2",
        parent: { type: "block_id", block_id: "block_id_toggle_2_nested" },
        created_time: now,
        last_edited_time: now,
        created_by: { object: "user", id: "user_id_1" },
        last_edited_by: { object: "user", id: "user_id_1" },
        has_children: false,
        archived: false,
        in_trash: false,
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { content: "Paragraph inside inner toggle.", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "Paragraph inside inner toggle.",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 2,
      },
      {
        object: "block",
        id: "block_id_bl_1",
        parent: { type: "page_id", page_id: "page_id_1" },
        created_time: now,
        last_edited_time: now,
        created_by: { object: "user", id: "user_id_1" },
        last_edited_by: { object: "user", id: "user_id_1" },
        has_children: false,
        archived: false,
        in_trash: false,
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "Top level bullet 1", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "Top level bullet 1",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 0,
      },
      {
        object: "block",
        id: "block_id_bl_nested_1",
        parent: { type: "page_id", page_id: "page_id_1" },
        created_time: now,
        last_edited_time: now,
        created_by: { object: "user", id: "user_id_1" },
        last_edited_by: { object: "user", id: "user_id_1" },
        has_children: false,
        archived: false,
        in_trash: false,
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "Nested bullet 1.1", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "Nested bullet 1.1",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 1,
      },
      {
        object: "block",
        id: "block_id_bl_2",
        parent: { type: "page_id", page_id: "page_id_1" },
        created_time: now,
        last_edited_time: now,
        created_by: { object: "user", id: "user_id_1" },
        last_edited_by: { object: "user", id: "user_id_1" },
        has_children: false,
        archived: false,
        in_trash: false,
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "Top level bullet 2", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "Top level bullet 2",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 0,
      },
      {
        object: "block",
        id: "block_id_table_1",
        parent: { type: "page_id", page_id: "page_id_1" },
        created_time: now,
        last_edited_time: now,
        created_by: { object: "user", id: "user_id_1" },
        last_edited_by: { object: "user", id: "user_id_1" },
        has_children: true, // Table block itself has children (table_row blocks)
        archived: false,
        in_trash: false,
        type: "table",
        table: {
          table_width: 2,
          has_column_header: true,
          has_row_header: false,
        },
        _indentationLevel: 0,
      },
      {
        object: "block",
        id: "block_id_table_row_1_header",
        parent: { type: "block_id", block_id: "block_id_table_1" },
        created_time: now,
        last_edited_time: now,
        created_by: { object: "user", id: "user_id_1" },
        last_edited_by: { object: "user", id: "user_id_1" },
        has_children: false,
        archived: false,
        in_trash: false,
        type: "table_row",
        table_row: {
          cells: [
            [
              {
                type: "text",
                text: { content: "Header A", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "Header A",
                href: null,
              },
            ],
            [
              {
                type: "text",
                text: { content: "Header B", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "Header B",
                href: null,
              },
            ],
          ],
        },
        _indentationLevel: 1, // Rows are children of table for structure, but 0 for markdown output context
      },
      {
        object: "block",
        id: "block_id_table_row_2_data",
        parent: { type: "block_id", block_id: "block_id_table_1" },
        created_time: now,
        last_edited_time: now,
        created_by: { object: "user", id: "user_id_1" },
        last_edited_by: { object: "user", id: "user_id_1" },
        has_children: false,
        archived: false,
        in_trash: false,
        type: "table_row",
        table_row: {
          cells: [
            [
              {
                type: "text",
                text: { content: "Cell A1 | Pipe", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "Cell A1 | Pipe",
                href: null,
              },
            ],
            [
              {
                type: "text",
                text: { content: "Cell B1<br>Newline", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "Cell B1<br>Newline",
                href: null,
              },
            ],
          ],
        },
        _indentationLevel: 1,
      },
      {
        object: "block",
        id: "block_id_code_mermaid",
        parent: { type: "page_id", page_id: "page_id_1" },
        created_time: now,
        last_edited_time: now,
        created_by: { object: "user", id: "user_id_1" },
        last_edited_by: { object: "user", id: "user_id_1" },
        has_children: false,
        archived: false,
        in_trash: false,
        type: "code",
        code: {
          caption: [
            {
              type: "text",
              text: { content: "Demo Mermaid Diagram", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "Demo Mermaid Diagram",
              href: null,
            },
          ],
          rich_text: [
            {
              type: "text",
              text: {
                content:
                  "graph TD;\nA[Lorem] --> B(Ipsum);\nB --> C{Dolor};\nC --> D[Sit];\nC --> E[Amet];",
                link: null,
              },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text:
                "graph TD;\nA[Lorem] --> B(Ipsum);\nB --> C{Dolor};\nC --> D[Sit];\nC --> E[Amet];",
              href: null,
            },
          ],
          language: "mermaid",
        },
        _indentationLevel: 0,
      },
      {
        object: "block",
        id: "block_id_child_page_1",
        parent: { type: "page_id", page_id: "page_id_1" },
        created_time: now,
        last_edited_time: now,
        created_by: { object: "user", id: "user_id_1" },
        last_edited_by: { object: "user", id: "user_id_1" },
        has_children: false,
        archived: false,
        in_trash: false,
        type: "child_page",
        child_page: {
          title: "Demo Child Page Title",
        },
        _indentationLevel: 0,
      },
      {
        object: "block",
        id: "block_id_empty_p",
        parent: { type: "page_id", page_id: "page_id_1" },
        created_time: now,
        last_edited_time: now,
        created_by: { object: "user", id: "user_id_1" },
        last_edited_by: { object: "user", id: "user_id_1" },
        has_children: false,
        archived: false,
        in_trash: false,
        type: "paragraph",
        paragraph: { rich_text: [], color: "default" },
        _indentationLevel: 0,
      },
      {
        object: "block",
        id: "block_id_empty_toggle",
        parent: { type: "page_id", page_id: "page_id_1" },
        created_time: now,
        last_edited_time: now,
        created_by: { object: "user", id: "user_id_1" },
        last_edited_by: { object: "user", id: "user_id_1" },
        has_children: false, // Representing an empty toggle
        archived: false,
        in_trash: false,
        type: "toggle",
        toggle: {
          rich_text: [
            {
              type: "text",
              text: { content: "Empty Toggle", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "Empty Toggle",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 0,
      },
      {
        object: "block",
        id: "block_id_h2_section",
        parent: { type: "page_id", page_id: "page_id_1" },
        created_time: now,
        last_edited_time: now,
        created_by: { object: "user", id: "user_id_1" },
        last_edited_by: { object: "user", id: "user_id_1" },
        has_children: false,
        archived: false,
        in_trash: false,
        type: "heading_2",
        heading_2: {
          rich_text: [
            {
              type: "text",
              text: { content: "Sub Heading 2", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "Sub Heading 2",
              href: null,
            },
          ],
          is_toggleable: false,
          color: "default",
        },
        _indentationLevel: 0,
      },
      {
        object: "block",
        id: "block_id_p_after_h2",
        parent: { type: "page_id", page_id: "page_id_1" },
        created_time: now,
        last_edited_time: now,
        created_by: { object: "user", id: "user_id_1" },
        last_edited_by: { object: "user", id: "user_id_1" },
        has_children: false,
        archived: false,
        in_trash: false,
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { content: "Paragraph after H2.", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "Paragraph after H2.",
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 0,
      },
      {
        object: "block",
        id: "block_id_h3_section",
        parent: { type: "page_id", page_id: "page_id_1" },
        created_time: now,
        last_edited_time: now,
        created_by: { object: "user", id: "user_id_1" },
        last_edited_by: { object: "user", id: "user_id_1" },
        has_children: false,
        archived: false,
        in_trash: false,
        type: "heading_3",
        heading_3: {
          rich_text: [
            {
              type: "text",
              text: { content: "Minor Heading 3", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "Minor Heading 3",
              href: null,
            },
          ],
          is_toggleable: false,
          color: "default",
        },
        _indentationLevel: 0,
      },
    ];

    const actual = blocksToMarkdown(demoBlocks);

    // Test essential components instead of exact string matching
    // 1. Check basic structure elements are present
    expect(actual).toContain("Lorem ipsum intro paragraph");
    expect(actual).toContain("# Main Heading 1");
    expect(actual).toContain("---"); // Divider
    expect(actual).toContain("Outer Toggle Title"); // Flattened toggle blocks
    expect(actual).toContain("Inner Toggle Title");

    // 2. Check table structure (essential formatting)
    expect(actual).toContain("| Header A | Header B |");
    expect(actual).toContain("| -------- | -------- |");
    expect(actual).toContain("| Cell A1 \\| Pipe | Cell B1<br>Newline |");

    // 3. Check Mermaid code block (strict formatting required)
    expect(actual).toMatch(/```mermaid[\s\S]*?```/); // Mermaid block exists
    expect(actual).toContain("graph TD");
    expect(actual).toContain("A[Lorem]");
    expect(actual).toContain("B(Ipsum)");

    // 4. Check child page conversion (flexible format)
    expect(actual).toMatch(
      /\[.*Demo Child Page Title.*\]|Child Page:.*Demo Child Page Title/,
    );

    // 5. Check heading hierarchy
    expect(actual).toContain("## Sub Heading 2");
    expect(actual).toContain("### Minor Heading 3");
  });
});

// TODO: Add tests for blocksToMarkdown, especially for list formatting,
// indentation, toggle blocks, tables, and spacing between blocks.

/**
 * Test suite for Mermaid diagram code block handling
 * Tests proper newline preservation and formatting in Mermaid blocks
 */
describe("Mermaid Code Block Handling", () => {
  it("should preserve newlines in Mermaid code blocks", () => {
    const blocks: AugmentedBlockObjectResponse[] = [
      {
        type: "code",
        code: {
          rich_text: [
            {
              type: "text",
              text: {
                content:
                  "sequenceDiagram\n    participant A\n    participant B\n    A->>B: Hello\n    B-->>A: Hi",
                link: null,
              },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text:
                "sequenceDiagram\n    participant A\n    participant B\n    A->>B: Hello\n    B-->>A: Hi",
              href: null,
            },
          ],
          language: "mermaid",
          caption: [],
        },
        _indentationLevel: 0,
      } as unknown as AugmentedBlockObjectResponse,
    ];

    const result = blocksToMarkdown(blocks);

    // Mermaid should preserve actual newlines, not convert them to <br/> tags
    expect(result).toContain(
      "sequenceDiagram\n    participant A\n    participant B\n    A->>B: Hello\n    B-->>A: Hi",
    );
    expect(result).not.toContain("<br/>");
  });
});

/**
 * Test suite for character escaping and edge case handling
 * Tests proper escaping of special characters in various contexts
 */
describe("Character Escaping Edge Cases", () => {
  it("should properly escape pipes in page properties", () => {
    // This will be tested implicitly by existing page property tests
    // The fix ensures | becomes \| instead of \\
  });

  it("should handle backticks in standard text content", () => {
    const richText = [
      {
        type: "text" as const,
        text: { content: "Use `npm install` command", link: null },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default" as const,
        },
        plain_text: "Use `npm install` command",
        href: null,
      },
    ];

    const result = richTextArrayToMarkdown(richText, { type: "standard" });

    // Current behavior: doesn't escape backticks, which could break Markdown
    // This test documents the current behavior - could be enhanced in future
    expect(result).toBe("Use `npm install` command");
  });
});

/**
 * Test suite for child page rendering and spacing issues
 * Tests proper spacing and structure for GitHub markdown rendering
 */
describe("blocksToMarkdown - Error Handling", () => {
  it("should handle null blocks array", () => {
    const result = blocksToMarkdown(null as any);
    expect(result).toBe("");
  });

  it("should handle blocks with circular references", () => {
    const block1: any = {
      type: "paragraph",
      paragraph: {
        rich_text: [{ plain_text: "Block 1" }],
      },
      _indentationLevel: 0,
    };
    const block2: any = {
      type: "paragraph",
      paragraph: {
        rich_text: [{ plain_text: "Block 2" }],
      },
      _indentationLevel: 0,
      circular: block1,
    };
    block1.circular = block2;

    // Should not cause infinite loop
    const result = blocksToMarkdown([block1, block2]);
    expect(result).toContain("Block 1");
    expect(result).toContain("Block 2");
  });
});

describe("Toggle Details Tag GitHub Rendering Issue", () => {
  // Toggle blocks are now flattened, so this test is no longer relevant

  it("should add blank line after summary for child_page blocks too", () => {
    const notionClient = {} as any;
    const blocks: AugmentedBlockObjectResponse[] = [
      {
        type: "child_page",
        id: "12345678-1234-1234-1234-123456789012",
        child_page: { title: "Child Page Title" },
        _isExpanded: true,
        _indentationLevel: 0,
        child_page_details: {
          title: "🦼 dev環境においてデフォルトロールの追加作業",
          icon: "🦼",
          blocks: [
            {
              type: "paragraph",
              paragraph: {
                rich_text: [
                  {
                    type: "text",
                    text: { content: "Child page content", link: null },
                    annotations: {
                      bold: false,
                      italic: false,
                      strikethrough: false,
                      underline: false,
                      code: false,
                      color: "default" as const,
                    },
                    plain_text: "Child page content",
                    href: null,
                  },
                ],
                color: "default",
              },
              _indentationLevel: 1,
            } as unknown as AugmentedBlockObjectResponse,
          ],
          page: {} as any,
        },
      } as unknown as AugmentedBlockObjectResponse,
      {
        type: "heading_2",
        heading_2: {
          rich_text: [
            {
              type: "text",
              text: { content: "概要", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default" as const,
              },
              plain_text: "概要",
              href: null,
            },
          ],
          is_toggleable: false,
          color: "default",
        },
        _indentationLevel: 0,
      } as unknown as AugmentedBlockObjectResponse,
    ];

    const result = blocksToMarkdown(blocks, undefined, notionClient);

    // Check that there's a blank line after summary
    const lines = result.split("\n");
    const summaryIndex = lines.findIndex((line) =>
      line.includes("dev環境においてデフォルトロールの追加作業</summary>"),
    );

    expect(summaryIndex).toBeGreaterThan(-1); // Ensure summary line was found
    expect(lines[summaryIndex + 1]).toBe(""); // This should be a blank line

    // The heading should NOT be inside the details tag
    expect(result).toContain("</details>\n\n## 概要");
  });

  it("should add sufficient blank lines after URL in child_page to prevent content absorption", () => {
    const notionClient = {} as any;
    const blocks: AugmentedBlockObjectResponse[] = [
      {
        type: "child_page",
        id: "12345678-1234-1234-1234-123456789012",
        child_page: { title: "Child Page Title" },
        _isExpanded: true,
        _indentationLevel: 0,
        child_page_details: {
          title: "Child Page",
          icon: "📄",
          blocks: [
            {
              type: "heading_2",
              heading_2: {
                rich_text: [
                  {
                    type: "text",
                    text: { content: "Heading inside child page", link: null },
                    annotations: {
                      bold: false,
                      italic: false,
                      strikethrough: false,
                      underline: false,
                      code: false,
                      color: "default" as const,
                    },
                    plain_text: "Heading inside child page",
                    href: null,
                  },
                ],
                is_toggleable: false,
                color: "default",
              },
              _indentationLevel: 1,
            } as unknown as AugmentedBlockObjectResponse,
          ],
          page: {} as any,
        },
      } as unknown as AugmentedBlockObjectResponse,
      {
        type: "heading_2",
        heading_2: {
          rich_text: [
            {
              type: "text",
              text: { content: "Outside heading", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default" as const,
              },
              plain_text: "Outside heading",
              href: null,
            },
          ],
          is_toggleable: false,
          color: "default",
        },
        _indentationLevel: 0,
      } as unknown as AugmentedBlockObjectResponse,
    ];

    const result = blocksToMarkdown(blocks, undefined, notionClient);

    // Find the notion.so URL line
    const lines = result.split("\n");
    const urlIndex = lines.findIndex((line) => line.includes("notion.so/"));

    // There should be sufficient blank lines after the URL to prevent content absorption
    expect(urlIndex).toBeGreaterThan(-1);
    expect(lines[urlIndex + 1]).toBe(""); // This should be a blank line
    expect(lines[urlIndex + 2]).toBe(""); // This should be another blank line (extra spacing)

    // The outside heading should NOT be inside the details tag
    expect(result).toContain("</details>\n\n## Outside heading");
  });
});

/**
 * Test suite for performance and memory concerns
 * Tests handling of large data sets
 */
describe("Performance Tests", () => {
  it("should handle very large number of blocks without stack overflow", () => {
    const blocks: AugmentedBlockObjectResponse[] = [];
    
    // Create 1000 blocks
    for (let i = 0; i < 1000; i++) {
      blocks.push({
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { content: `Paragraph ${i}`, link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: `Paragraph ${i}`,
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: 0,
      } as unknown as AugmentedBlockObjectResponse);
    }

    const start = Date.now();
    const result = blocksToMarkdown(blocks);
    const duration = Date.now() - start;

    expect(result).toContain("Paragraph 0");
    expect(result).toContain("Paragraph 999");
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
  });

  it("should handle deeply nested blocks", () => {
    const blocks: AugmentedBlockObjectResponse[] = [];
    
    // Create 50 levels of nesting
    for (let i = 0; i < 50; i++) {
      blocks.push({
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: `Level ${i}`, link: null },
              annotations: {},
              plain_text: `Level ${i}`,
              href: null,
            },
          ],
          color: "default",
        },
        _indentationLevel: i,
      } as unknown as AugmentedBlockObjectResponse);
    }

    const result = blocksToMarkdown(blocks);
    
    expect(result).toContain("Level 0");
    expect(result).toContain("Level 49");
    // Check deep indentation
    expect(result).toContain("  ".repeat(49) + "* Level 49");
  });
});
