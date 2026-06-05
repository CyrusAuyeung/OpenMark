# Security Policy

OpenMark is an early local-first Markdown editor. Security reports are welcome, especially around Markdown preview sanitization, file handling, exported HTML, and desktop IPC boundaries.

## Supported Versions

| Version | Supported |
| --- | --- |
| 0.1.x | Yes |

## Reporting a Vulnerability

Please do not open a public issue for a suspected vulnerability.

Until GitHub private vulnerability reporting is enabled for the repository, contact the maintainers through a private GitHub channel or create a minimal public issue that asks for a secure contact path without including exploit details.

Useful reports include:

- Affected OpenMark version or commit.
- Operating system and whether the issue happens in web, desktop, or both.
- Minimal Markdown or file input that reproduces the behavior.
- Expected impact and any known mitigations.

We will acknowledge valid reports as quickly as possible and prioritize fixes that affect local file safety, preview sanitization, or desktop bridge behavior.
