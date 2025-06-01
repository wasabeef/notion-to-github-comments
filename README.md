# Notion PR AI Context

[![GitHub release](https://img.shields.io/github/release/wasabeef/notion-pr-ai-context.svg)](https://github.com/wasabeef/notion-pr-ai-context/releases)
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

## 📋 Prerequisites

- A Notion workspace with pages/databases you want to reference
- A Notion integration with API access
- GitHub repository with Actions enabled

## 🛠️ Setup

### Step 1: Create Notion Integration

1. Go to [Notion Developers](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Fill in the integration details:
   - **Name**: Your integration name (e.g., "GitHub PR Context")
   - **Workspace**: Select your workspace
   - **Capabilities**: Read content
4. Click "Submit" and copy the **Internal Integration Token**

### Step 2: Share Notion Pages/Databases

For each Notion page or database you want to access:

1. Open the page/database in Notion
2. Click "Share" in the top-right corner
3. Click "Invite" and search for your integration name
4. Select your integration and click "Invite"

### Step 3: Configure GitHub Repository

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secret:
   - **Name**: `NOTION_TOKEN`
   - **Value**: Your Notion integration token from Step 1

### Step 4: Create Workflow File

Create `.github/workflows/notion-pr-ai-context.yml` in your repository:

```yaml
name: Notion PR AI Context

on:
  pull_request:
    types: [opened, edited]

jobs:
  add-notion-context:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      contents: read
    steps:
      - name: Add Notion Context
        uses: wasabeef/notion-pr-ai-context@v1
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

````markdown
### 🤖 Notion AI Context (2 link(s) processed)

<details>
<summary>📄 User Authentication Design</summary>

```markdown
# User Authentication Flow

## Overview

This document outlines the authentication system...
```
````

</details>

<details>
<summary>🗃️ API Documentation Database</summary>

```markdown
| Endpoint     | Method | Description |
| ------------ | ------ | ----------- |
| /auth/login  | POST   | User login  |
| /auth/logout | POST   | User logout |
```

</details>
```

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

## 🤝 Contributing

コントリビューションを歓迎します！詳細な開発ガイド、リリースプロセス、およびタグ管理については [CONTRIBUTING.md](CONTRIBUTING.md) をご覧ください。

### クイックスタート

```bash
git clone https://github.com/wasabeef/notion-pr-ai-context.git
cd notion-pr-ai-context
bun install
bun run test
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues & Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/wasabeef/notion-pr-ai-context/issues) page
2. Create a new issue with detailed information
3. Include relevant logs and configuration

## 🙏 Acknowledgments

- [Notion API](https://developers.notion.com/) for providing the integration platform
- [notion-to-md](https://github.com/souvikinator/notion-to-md) for Markdown conversion
- GitHub Actions community for inspiration and best practices
