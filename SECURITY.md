# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within this GitHub Action, please send an email to the maintainer. All security vulnerabilities will be promptly addressed.

**Please do not report security vulnerabilities through public GitHub issues.**

### What to include in your report

- A description of the vulnerability
- Steps to reproduce the issue
- Possible impact of the vulnerability
- Any suggested fixes (if available)

### Response timeline

- **Initial response**: Within 48 hours
- **Status update**: Within 7 days
- **Resolution**: Varies based on complexity

## Security Considerations

This GitHub Action:

- Only reads from Notion API (no write operations)
- Requires explicit permission to access Notion pages/databases
- Uses GitHub's built-in token for repository operations
- Does not store or transmit sensitive data beyond the PR comment

## Best Practices

When using this action:

1. **Notion Token**: Store as a repository secret, never in plain text
2. **Permissions**: Only grant access to necessary Notion pages/databases
3. **Repository Access**: Ensure proper repository permissions are set
4. **Regular Updates**: Keep the action updated to the latest version 