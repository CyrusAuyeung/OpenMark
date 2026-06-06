# OpenMark

[![CI](https://github.com/CyrusAuyeung/OpenMark/actions/workflows/ci.yml/badge.svg)](https://github.com/CyrusAuyeung/OpenMark/actions/workflows/ci.yml)
[![Release](https://github.com/CyrusAuyeung/OpenMark/actions/workflows/release.yml/badge.svg)](https://github.com/CyrusAuyeung/OpenMark/actions/workflows/release.yml)
[![GitHub release](https://img.shields.io/github/v/release/CyrusAuyeung/OpenMark?display_name=tag&sort=semver)](https://github.com/CyrusAuyeung/OpenMark/releases)
[![License](https://img.shields.io/github/license/CyrusAuyeung/OpenMark)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-lightgrey)](docs/release.md)

OpenMark is a local-first Markdown editor for people who want a calm desktop writing tool without turning their notes into a full knowledge-management system. It focuses on the core loop first: write Markdown, preview safely, save locally, reopen recent files, and keep the workspace exactly where you left it.

![OpenMark editor screenshot](docs/assets/openmark-screenshot.png)

## Download

The latest Windows release is available on the [GitHub Releases page](https://github.com/CyrusAuyeung/OpenMark/releases/latest).

- Windows installer: `OpenMark.Setup.0.3.0.exe`
- Windows portable app: `OpenMark.0.3.0.exe`

Windows builds are currently unsigned, so the first launch may show operating-system warnings.

## Highlights

- Local-first Markdown editing with native desktop open/save dialogs
- Source editor, safe preview, and resizable split view
- Welcome workspace, recent files, saved state, and unsaved-change protection
- Document outline that jumps to headings in the editor
- Editable document file names for new files, downloads, Save As defaults, and HTML exports
- Restored view mode, split balance, and workspace sidebar tab between sessions

## Current Capabilities

- React, TypeScript, and Vite application shell
- CodeMirror Markdown editing experience
- Safe Markdown preview with markdown-it and DOMPurify
- Write, split, and preview modes
- Resizable split view for balancing the editor and preview panes
- Restored view mode, split balance, and workspace sidebar tab between sessions
- Local browser draft autosave
- Open local Markdown files through the browser file picker
- Download Markdown and export standalone HTML
- Light and dark themes
- Document stats and clickable heading outline
- Browser and desktop window title sync with the active document and unsaved state
- Markdown formatting toolbar and editor shortcuts
- First-run welcome workspace and manageable recent files
- Tabbed workspace sidebar for document details, outline, and recent files
- Editable document file names for new documents, downloads, and export defaults
- Electron desktop shell with native open, save, Save As, and HTML export dialogs
- Desktop menu shortcuts for file commands, view modes, and theme switching
- Recent files list and unsaved-change indicator

## Run From Source

Install dependencies and start the browser version:

```bash
npm install
npm run dev
```

Run the desktop shell during development:

```bash
npm run desktop:dev
```

Rust is not required for the current desktop milestone. OpenMark uses a lightweight Electron shell until the project is ready to evaluate Tauri.

If Electron downloads slowly, set a mirror before the first desktop run:

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npm run desktop:dev
```

## Shortcuts

Useful desktop shortcuts:

- `Ctrl+N`: new document
- `Ctrl+O`: open Markdown file
- `Ctrl+S`: save current Markdown file
- `Ctrl+Shift+S`: save as
- `Ctrl+E`: export HTML
- `Ctrl+1`, `Ctrl+2`, `Ctrl+3`: write, split, and preview modes
- `Ctrl+Shift+L`: toggle theme

Useful editor shortcuts:

- `Ctrl+B`: wrap selection in bold Markdown
- `Ctrl+I`: wrap selection in italic Markdown
- `Ctrl+K`: insert a Markdown link

The editor toolbar also exposes common Markdown formatting actions for bold, italic, links, headings, lists, quotes, and code blocks.

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

Windows release files are written to `release/`, including `OpenMark Setup 0.3.0.exe` and `OpenMark 0.3.0.exe`.

See [Release Guide](docs/release.md) for local packaging and GitHub release steps.

## Roadmap Direction

OpenMark should stay simple before it becomes powerful. The near-term goal is a reliable editor core and native desktop shell. The next product milestones are document search, stronger preview/editor navigation, export polish, and cross-platform distribution.

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
