# OpenMark

[![CI](https://github.com/CyrusAuyeung/OpenMark/actions/workflows/ci.yml/badge.svg)](https://github.com/CyrusAuyeung/OpenMark/actions/workflows/ci.yml)
[![Release](https://github.com/CyrusAuyeung/OpenMark/actions/workflows/release.yml/badge.svg)](https://github.com/CyrusAuyeung/OpenMark/actions/workflows/release.yml)
[![GitHub release](https://img.shields.io/github/v/release/CyrusAuyeung/OpenMark?display_name=tag&sort=semver)](https://github.com/CyrusAuyeung/OpenMark/releases)
[![License](https://img.shields.io/github/license/CyrusAuyeung/OpenMark)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-lightgrey)](docs/release.md)

OpenMark is a local-first Markdown editor MVP for building toward a polished open-source desktop writing tool. The first milestone focuses on the smallest useful core: fast Markdown editing, live preview, local draft persistence, and export.

![OpenMark editor screenshot](docs/assets/openmark-screenshot.png)

## Current MVP

- React, TypeScript, and Vite application shell
- CodeMirror Markdown editing experience
- Safe Markdown preview with markdown-it and DOMPurify
- Write, split, and preview modes
- Local browser draft autosave
- Open local Markdown files through the browser file picker
- Download Markdown and export standalone HTML
- Light and dark themes
- Document stats and clickable heading outline
- Markdown formatting toolbar and editor shortcuts
- First-run welcome workspace and manageable recent files
- Tabbed workspace sidebar for document details, outline, and recent files
- Electron desktop shell with native open, save, Save As, and HTML export dialogs
- Desktop menu shortcuts for file commands, view modes, and theme switching
- Recent files list and unsaved-change indicator

## Getting Started

```bash
npm install
npm run dev
```

## Desktop App

Rust is not required for the current desktop milestone. OpenMark uses a lightweight Electron shell until the project is ready to evaluate Tauri.

```bash
npm run desktop:dev
```

The desktop shell adds native Markdown open/save dialogs while keeping the browser MVP available through `npm run dev`.

Useful desktop shortcuts:

- `Ctrl+N`: new document
- `Ctrl+O`: open Markdown file
- `Ctrl+S`: save current Markdown file
- `Ctrl+Shift+S`: save as
- `Ctrl+E`: export HTML
- `Ctrl+1`, `Ctrl+2`, `Ctrl+3`: write, split, and preview modes
- `Ctrl+Shift+L`: toggle theme

Useful editor shortcuts:

The editor toolbar also exposes common Markdown formatting actions for bold, italic, links, headings, lists, quotes, and code blocks.

- `Ctrl+B`: wrap selection in bold Markdown
- `Ctrl+I`: wrap selection in italic Markdown
- `Ctrl+K`: insert a Markdown link

If Electron downloads slowly, set a mirror before the first desktop run:

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npm run desktop:dev
```

## Quality Checks

```bash
npm run lint
npm run build
```

## Packaging

```bash
npm run package
npm run dist:win
```

Windows release files are written to `release/`, including `OpenMark Setup 0.2.1.exe` and `OpenMark 0.2.1.exe`.

See [Release Guide](docs/release.md) for local packaging and GitHub release steps.

## Project Direction

OpenMark should stay simple before it becomes powerful. The near-term goal is a reliable editor core and a native desktop shell. The long-term goal is a calm open-source alternative for people who want a focused Markdown editor without turning their notes into a full knowledge-management system.

## Documentation

- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Contributing](docs/contributing.md)
- [Release Guide](docs/release.md)
- [Changelog](CHANGELOG.md)

## Community

- Report bugs through [GitHub Issues](https://github.com/CyrusAuyeung/OpenMark/issues/new?template=bug_report.yml).
- Suggest focused features with the [feature request form](https://github.com/CyrusAuyeung/OpenMark/issues/new?template=feature_request.yml).
- Open pull requests with `npm run lint` and `npm run build` results.
- Read the [Security Policy](SECURITY.md) before reporting vulnerabilities.

## License

MIT
