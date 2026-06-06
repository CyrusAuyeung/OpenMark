# OpenMark

[![CI](https://github.com/CyrusAuyeung/OpenMark/actions/workflows/ci.yml/badge.svg)](https://github.com/CyrusAuyeung/OpenMark/actions/workflows/ci.yml)
[![Release](https://github.com/CyrusAuyeung/OpenMark/actions/workflows/release.yml/badge.svg)](https://github.com/CyrusAuyeung/OpenMark/actions/workflows/release.yml)
[![GitHub release](https://img.shields.io/github/v/release/CyrusAuyeung/OpenMark?display_name=tag&sort=semver)](https://github.com/CyrusAuyeung/OpenMark/releases)
[![License](https://img.shields.io/github/license/CyrusAuyeung/OpenMark)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-lightgrey)](docs/release.md)

OpenMark is a local-first Markdown editor for people who want a calm desktop writing tool without turning their notes into a full knowledge-management system. It focuses on the core loop first: write Markdown, preview safely, save locally, reopen recent files, and keep the workspace exactly where you left it.

![OpenMark v0.3 workspace with document sidebar, Markdown editor, split preview, and status bar](docs/assets/openmark-screenshot.png)

## Demo

See [Demo Assets](docs/demo.md) for the screenshot gallery, short video script, and capture checklist.

| Command palette | Appearance settings |
| --- | --- |
| ![OpenMark command palette with export actions](docs/assets/openmark-demo-command-palette.png) | ![OpenMark appearance settings in dark theme](docs/assets/openmark-demo-appearance-settings.png) |

## Download

The latest Windows release is available on the [GitHub Releases page](https://github.com/CyrusAuyeung/OpenMark/releases/latest).

- Windows installer: `OpenMark.Setup.0.3.0.exe`
- Windows portable app: `OpenMark.0.3.0.exe`

Windows builds are currently unsigned, so the first launch may show operating-system warnings.

## Highlights

- Local-first Markdown editing with native desktop open/save dialogs
- Source editor, safe preview, and resizable split view
- Command palette for quickly running editor, file, view, and workspace actions
- In-document find and replace with match navigation
- Markdown table insertion and text-to-table conversion
- Image insertion with local preview and desktop relative-path handling
- PDF export for sharing polished rendered documents
- Appearance settings for light, dark, system theme, and editor font size
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
- Command palette for keyboard-first access to file, edit, view, and workspace commands
- In-document find and replace with match case and whole-word options
- Insert Markdown tables or convert selected comma, tab, or pipe-separated lines into tables
- Insert local images from the toolbar or command palette, with saved desktop documents using relative paths
- Preview local desktop image paths and current browser-session image selections safely
- Restored view mode, split balance, and workspace sidebar tab between sessions
- Local browser draft autosave
- Open local Markdown files through the browser file picker
- Download Markdown and export standalone HTML or PDF
- Light, dark, and system theme preferences with adjustable editor font size
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
- `Ctrl+Shift+E`: export PDF
- `Ctrl+F`: find in the current document
- `Ctrl+H`: replace in the current document
- `Ctrl+Shift+P`: open the command palette
- `Ctrl+1`, `Ctrl+2`, `Ctrl+3`: write, split, and preview modes
- `Ctrl+Shift+L`: toggle theme
- `Ctrl+,`: open appearance settings

Useful editor shortcuts:

- `Ctrl+B`: wrap selection in bold Markdown
- `Ctrl+I`: wrap selection in italic Markdown
- `Ctrl+K`: insert a Markdown link

The editor toolbar also exposes common Markdown formatting actions for bold, italic, links, images, headings, lists, quotes, code blocks, and tables.

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
- [Demo Assets](docs/demo.md)
- [Plugin API Design](docs/plugin-api.md)
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
