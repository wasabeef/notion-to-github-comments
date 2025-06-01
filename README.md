# Notion to PR Comments

[![GitHub release](https://img.shields.io/github/release/wasabeef/notion-to-pr-comments.svg)](https://github.com/wasabeef/notion-to-pr-comments/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A GitHub Action that automatically extracts Notion page and database information from Pull Request descriptions, converts them to Markdown format, and posts them as AI-ready context in PR comments.

## 🚀 Features

- **Automatic Detection**: Scans PR descriptions for Notion URLs (supports multiple links)
- **API Integration**: Retrieves content from Notion pages and databases via official API
- **Markdown Conversion**: Converts Notion content to clean, readable Markdown format
- **AI-Ready Output**: Formats content specifically for AI tools and LLMs
- **Collapsible Comments**: Posts content in expandable sections to keep PRs clean
- **Smart Updates**: Automatically updates comments when PR descriptions change
- **Error Handling**: Gracefully handles inaccessible or invalid Notion links

## 💡 Motivation

When using multiple AI agents (Claude, Devin, Cursor, etc.) for code reviews and development, each agent typically needs to fetch Notion documentation independently. This creates **multiplied API costs**, **setup complexity**, and **prompt engineering overhead** - even with MCP available.

This GitHub Action solves these issues by fetching Notion content once and posting it as PR comments, making it instantly available to all AI agents and human reviewers without additional API calls or prompt engineering.

**Key benefits:**

- **Cost Efficient**: One API call instead of multiple per agent
- **Zero Setup**: No per-agent Notion integration required
- **Instant Access**: Pre-fetched content ready for any AI agent
- **Consistent Context**: All agents see identical content

## 📋 Prerequisites

- A Notion workspace with pages/databases you want to reference
- A Notion integration with API access
- GitHub repository with Actions enabled

## 🛠️ Setup

### Step 1: Create Notion Integration

1. Go to [Notion Developers](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Fill in the integration details:
   - **Name**: Your integration name (e.g., "GitHub PR Comments")
   - **Workspace**: Select your workspace
   - **Capabilities**: Check "Read content" (other capabilities are not required)
4. Click "Submit" and copy the **Internal Integration Token**
5. **Important**: Keep this token secure - it will be used in GitHub Secrets

### Step 2: Share Notion Pages/Databases

For each Notion page or database you want to access:

1. Open the page/database in Notion
2. Click "Share" in the top-right corner
3. Click "Invite" and search for your integration name
4. Select your integration and click "Invite"

**📝 Note**: You need to share each page/database individually that you want to reference in PRs. Child pages inherit permissions automatically.

### Step 3: Configure GitHub Repository

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secret:
   - **Name**: `NOTION_TOKEN`
   - **Value**: Your Notion integration token from Step 1

**🔒 Security**: Never commit the Notion token directly to your repository. Always use GitHub Secrets.

### Step 4: Create Workflow File

Create `.github/workflows/notion-to-pr-comments.yml` in your repository:

```yaml
name: Notion to PR Comments

on:
  pull_request:
    types: [opened, edited]

jobs:
  add-notion-comments:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write  # Required to post comments
      contents: read       # Required to read PR descriptions
    steps:
      - name: Add Notion Content to PR
        uses: wasabeef/notion-to-pr-comments@v1,0.0
        with:
          notion-token: ${{ secrets.NOTION_TOKEN }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## 📖 Usage

Once set up, the action will automatically:

1. **Scan PR descriptions** for Notion URLs when PRs are opened or edited
2. **Extract content** from linked Notion pages and databases
3. **Convert to Markdown** with proper formatting
4. **Post as comment** with collapsible sections for each URL

### Example PR Description

```markdown
## Overview

This PR implements the new user authentication flow.

## Related Documentation

- Design specs: https://www.notion.so/yourworkspace/auth-design-123abc
- API documentation: https://notion.so/yourworkspace/api-docs-456def
```

### Generated Comment

The action will create a comment like:

<img width="919" alt="Screenshot 2025-06-01 at 16 38 14" src="https://github.com/user-attachments/assets/19009bcf-7e19-4746-965b-fa606472bcf1" />

```markdown
### 🤖 Notion Context (2 link(s) processed)

<details>
<summary>&nbsp;&nbsp;📄 User Authentication Design</summary>

```markdown
# User Authentication Flow

## Overview

This document outlines the authentication system...
```

</details>

## 🔧 Configuration

### Inputs

| Input          | Description                       | Required | Default                       |
| -------------- | --------------------------------- | -------- | ----------------------------- |
| `notion-token` | Notion API integration token      | ✅       | -                             |
| `github-token` | GitHub token for posting comments | ✅       | `${{ secrets.GITHUB_TOKEN }}` |

### Supported Notion Content

- **Pages**: Full page content with nested blocks
- **Databases**: Table format with all visible properties
- **Nested content**: Child pages and blocks (up to API limits)

## 🔍 Troubleshooting

### Common Issues

1. **"Failed to fetch Notion content"**

   - Ensure the Notion page/database is shared with your integration
   - Verify the `NOTION_TOKEN` secret is correctly set
   - Check that the URL in PR description is accessible

2. **"No Notion URLs found"**

   - Ensure URLs are in the PR description (not just in comments)
   - Check URL format - should be `https://notion.so/...` or `https://www.notion.so/...`

3. **"Insufficient permissions"**
   - Verify GitHub Actions has `pull-requests: write` permission
   - Check if branch protection rules are blocking the action

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed development guide, release process, and tag management.

### Quick Start

```bash
git clone https://github.com/wasabeef/notion-to-pr-comments.git
cd notion-to-pr-comments
bun install
bun run test
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues & Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/wasabeef/notion-to-pr-comments/issues) page
2. Create a new issue with detailed information
3. Include relevant logs and configuration

## 🙏 Acknowledgments

- [Notion API](https://developers.notion.com/) for providing the integration platform
- [notion-to-md](https://github.com/souvikinator/notion-to-md) for Markdown conversion
- GitHub Actions community for inspiration and best practices
