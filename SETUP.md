# Notion to GitHub Comments Setup Guide

1. Create a Notion integration and obtain an API token from [Notion Developers](https://www.notion.so/my-integrations).
2. Add `NOTION_TOKEN` as a secret in your GitHub repository (`Settings > Secrets and variables > Actions`).
3. Add `.github/workflows/notion-to-github-comments.yml` to your repository.
4. Simply paste Notion page or database URLs into your PR description, and the Action will automatically post formatted content comments.
