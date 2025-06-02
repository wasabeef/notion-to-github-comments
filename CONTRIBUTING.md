# Contributing to Notion to GitHub Comments

🎉 **Contributions are welcome!** Please feel free to submit a Pull Request.

## 🛠️ Development Setup

### Prerequisites

- [Bun](https://bun.sh/) installed
- Node.js 18+ (compatible with Bun)
- Git

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