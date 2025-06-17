# Contributing to Notion to GitHub Comments

🎉 **Contributions are welcome!** Please feel free to submit a Pull Request.

## 🛠️ Development Setup

### Prerequisites

- [Bun](https://bun.sh/) installed
- Node.js 18+ (compatible with Bun)
- Git

### Quick Start

```bash
git clone https://github.com/wasabeef/notion-to-github-comments.git
cd notion-to-github-comments
bun install
bun run test
```

### Development Environment Setup

1. **Clone the repository**:

   ```bash
   git clone https://github.com/wasabeef/notion-to-github-comments.git
   cd notion-to-github-comments
   ```

2. **Install dependencies**:

   ```bash
   bun install
   ```

3. **Build the project**:

   ```bash
   bun run build
   ```

4. **Run tests**:

   ```bash
   bun run test
   ```

5. **Run linter**:

   ```bash
   bun run lint
   ```

## 📁 Project Structure

```text
notion-to-github-comments/
├── src/
│   ├── index.ts           # Main entry point
│   ├── notion-client.ts   # Notion API integration
│   ├── github-client.ts   # GitHub API integration
│   └── url-extractor.ts   # URL parsing utilities
├── tests/
│   └── url-extractor.test.ts  # Unit tests
├── .github/
│   └── workflows/
│       ├── ci.yml         # CI pipeline (test, lint, build)
│       ├── test.yml       # Action testing workflow
│       └── release.yml    # Release automation
├── dist/                  # Built JavaScript files (generated on release)
├── action.yml             # GitHub Action metadata
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md              # Project documentation
```

## 🔄 Development Workflow

### 1. Feature Development

1. **Create branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Develop and test**:

   ```bash
   bun run test     # Run tests
   bun run lint     # Check code quality
   bun run build    # Verify build
   ```

3. **Create Pull Request**: Create PR on GitHub

### 2. Testing

- **Unit Tests**: Test URL extraction logic with `bun run test`
- **Integration Tests**: Test actual Action behavior with `.github/workflows/test.yml`
- **CI Tests**: Automated CI pipeline runs on all pull requests

### 3. Code Quality

- **TypeScript**: Fix type errors to maintain type safety
- **ESLint**: Check code style with `bun run lint`
- **Prettier**: Consistent code formatting

## 🏷️ Release Process & Tagging

This project adopts **release-time automation**.

### Release Flow

1. **Development complete**: Merge changes to `main` branch
2. **Create tag**: Create and push version tag
3. **Automated execution**: GitHub Actions automatically:
   - Build TypeScript and generate `dist/` files
   - Commit `dist/` files to the tag
   - Automatically publish GitHub Release

### Tagging Rules

#### Regular Release

```bash
# Example: v1.2.3
git tag v1.2.3
git push origin v1.2.3
```

#### Pre-release (Auto-detection)

```bash
# Tags containing hyphens are automatically published as pre-releases
git tag v1.2.3-beta.1
git push origin v1.2.3-beta.1

git tag v1.2.3-alpha.2
git push origin v1.2.3-alpha.2
```

#### Major Version Tags

```bash
# For convenience when using GitHub Actions
git tag v1  # Points to latest v1.x.x
git push origin v1
```

### `dist/` Directory Management

- **During development**: `dist/` is excluded by `.gitignore`, not managed
- **During release**: Release workflow automatically builds & commits
- **Benefits**:
  - Avoid merge conflicts during development
  - Simplified CI
  - Follows GitHub Action best practices

### Versioning Rules

Follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (`v2.0.0`): Breaking changes
- **MINOR** (`v1.1.0`): Backward-compatible new features
- **PATCH** (`v1.0.1`): Backward-compatible bug fixes

## 🧪 Testing Guidelines

### Unit Tests

```bash
# URL extraction tests
bun run test
```

### Integration Tests

```bash
# Manual testing with GitHub Actions
gh workflow run test.yml
```

### Testing New Features

1. **Add Unit Tests**: Add appropriate tests in the `tests/` directory
2. **Integration Test**: Verify Action behavior with actual Notion URLs
3. **Edge Cases**: Test error handling scenarios

## 📝 Pull Request Guidelines

### When Creating PRs

1. **Clear description**: Describe changes and reasoning
2. **Related Issues**: Reference related issues if any
3. **Tests**: Include appropriate tests
4. **Breaking Changes**: Clearly mark any breaking changes

### PR Example

```markdown
## Overview

Add support for new Notion URL formats

## Changes

- Add custom domain support
- Improve URL extraction logic
- Add new test cases

## Testing

- [x] Unit tests pass
- [x] Integration tests pass
- [x] Manual testing completed

## Breaking Changes

None
```

## 🐛 Issue Reporting

When reporting bugs or suggesting improvements:

1. **Check existing issues**: Avoid duplicates by checking existing issues
2. **Detailed information**: Include reproduction steps, expected vs actual behavior
3. **Environment details**: OS, Node.js/Bun versions, etc.
4. **Logs**: Include relevant error logs or screenshots

## 🙏 Code of Conduct

To maintain a respectful environment for everyone participating:

- Provide constructive feedback
- Respect diversity
- Communicate kindly and politely
- Foster an environment for learning and growth

## 🎯 Development Roadmap

Planned developments:

- [ ] Support for more Notion block types
- [ ] Performance optimizations
- [ ] Internationalization (i18n) support
- [ ] Custom markdown templates

If you have questions or need support, please feel free to create an [Issue](https://github.com/wasabeef/notion-to-github-comments/issues)!

## 🔗 Development & Testing Builds

### Local Development

```bash
# Run tests (unit tests only)
bun run test

# Run integration tests (requires Notion API setup)
NOTION_INTEGRATION_TOKEN=your_token TEST_NOTION_PAGE_URL=your_test_page_url bun run test

# Build and check output
bun run build:check

# Build and see git changes
bun run build:dev
```

### Integration Testing

For integration tests that use the Notion API, set these environment variables:

- `NOTION_INTEGRATION_TOKEN`: Your Notion integration token
- `TEST_NOTION_PAGE_URL`: A test Notion page URL (optional, defaults to dummy URL)

### GitHub CI/CD

This project uses a streamlined workflow for different scenarios:

- **`ci.yml`**: Runs on every push/PR to main - tests, linting, build, and artifacts upload
- **`build-preview.yml`**: Runs on PRs - creates downloadable build artifacts and posts usage instructions
- **`auto-build.yml`**: Runs on ANY feature branch - auto-commits dist/ changes for testing
- **`release.yml`**: Unified release workflow - creates tags and GitHub releases (manual or auto)
- **`test.yml`**: Manual testing only - runs actual Notion API integration tests

### Simple Development Flow

1. **Create any branch**: `feat-xxx`, `fix-yyy`, `refactor-zzz` - any name works
2. **Push to branch**: `auto-build.yml` automatically builds and commits dist/
3. **Create PR**: `build-preview.yml` shows usage instructions and download links
4. **Test the branch**: Use `@your-branch-name` in other repositories
5. **Merge to main**: After approval and testing
6. **Create release**: Manually run `release.yml` workflow to create tag and release
7. **Done**: Single workflow handles everything!

### Checking Builds on GitHub

1. **For Pull Requests**:

   - The `build-preview.yml` workflow runs automatically
   - Download build artifacts from the Actions tab
   - A bot comment will be posted with build info and download links

2. **For Feature Branches**:

   - Push to `develop`, `feature/*`, or `feat/*` branches
   - The `auto-build.yml` workflow will auto-commit dist/ changes
   - Or manually trigger via GitHub Actions UI

3. **Download Build Artifacts**:

   - Go to Actions tab in GitHub
   - Click on any CI run
   - Download artifacts from the "Artifacts" section

4. **Manual Integration Testing**:

   - Go to Actions tab → "Test Notion to PR Comments Action"
   - Click "Run workflow" button
   - Optionally specify PR number or Notion URL for testing
   - Requires `NOTION_TOKEN` secret to be configured

5. **Create Release**:
   - Go to Actions tab → "Create Release"
   - Click "Run workflow" button
   - Enter version (e.g., `v1.3.0`)
   - Optionally add custom release notes
   - Choose draft/published
   - Creates tag + GitHub release in one step

### Using Development Branches in Other Repositories

When testing unreleased features, you can reference any branch in your workflows:

```yaml
# Use ANY development branch (auto-builds dist/)
- uses: wasabeef/notion-to-github-comments@feat-new-feature
- uses: wasabeef/notion-to-github-comments@fix-bug-123
- uses: wasabeef/notion-to-github-comments@refactor-core

# Use a specific commit SHA
- uses: wasabeef/notion-to-github-comments@a1b2c3d4e5f6789

# Use a PR for testing
- uses: wasabeef/notion-to-github-comments@refs/pull/42/head
```

**The PR comment will show you the exact usage instructions for your branch!**

For detailed examples and best practices, see [docs/usage-examples.md](docs/usage-examples.md).
