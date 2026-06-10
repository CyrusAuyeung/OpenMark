# Changelog

All notable changes to OpenMark will be documented in this file.

## 0.13.0 - 2026-06-10

### Product UI Polish

- Refined the app shell visual hierarchy with more consistent desktop-product surfaces, borders, shadows, and density.
- Polished toolbar, panel, inspector, and library active states for clearer interaction feedback.
- Improved empty, loading, warning, error, and update states with product-grade state panels and clearer status presentation.
- Fixed Windows auto-update metadata so installer builds download the published GitHub Release asset, and tightened release verification for update metadata references.

## 0.12.0 - 2026-06-10

### Markdown Editing Quality

- Added repeated Markdown syntax helpers for task lists and dividers in the toolbar and command palette.
- Improved list continuation and checkbox editing with smart Enter handling and a task checkbox toggle shortcut.
- Improved paste handling for URLs and plain text with selected-text link creation and conservative text cleanup.
- Added lightweight document diagnostics for broken links and images with click-to-jump issue navigation.

## 0.11.0 - 2026-06-10

### Long Document Navigation

- Added a Go to Line command and shortcut for jumping directly to a Markdown line.
- Improved search result navigation feedback with active result context and hidden-result counts.
- Added outline filtering for dense documents with result counts, clear actions, and empty states.
- Added document position indicators for current line, column, and editor scroll progress.

## 0.10.0 - 2026-06-09

### Editor Workflow Polish

- Restored the active desktop file path between sessions so saved documents reopen with their local identity intact.
- Restored editor cursor and scroll position between sessions for the active document.
- Improved save and open error visibility with clearer document status and footer feedback.
- Refined quick open ranking and grouping across recent and workspace files.

## 0.9.0 - 2026-06-09

### Workspace Search & Library Polish

- Added workspace panel filtering with search, clear, and recent/name sorting controls.
- Added a workspace file state summary with available, missing, and current-file status.
- Added unified quick open results across workspace and recent files with source labels and duplicate-path handling.
- Improved recent and workspace file list keyboard navigation with arrow, Home, and End movement.

## 0.8.0 - 2026-06-09

### Release Reliability

- Added release metadata consistency checks for package versions, tags, public docs, release notes, and expected asset names.
- Added version-aware release notes generation from `CHANGELOG.md`.
- Added GitHub Release verification for published release bodies and attached assets.
- Tightened Dependabot update cadence to monthly grouped pull requests.

### PDF Export

- Fixed desktop PDF export by waiting for Electron `printToPDF` to finish before closing the hidden print window.
- Switched desktop PDF rendering to a temporary HTML file for more reliable export document loading.

## 0.7.0 - 2026-06-08

### Workspace

- Added pinned recent files so important local documents stay at the top of the recent list.
- Added search for recent files by name or path.
- Added a local workspace folder browser for Markdown files.
- Added quick open for Markdown files in the active workspace.
- Added missing-file states for unavailable recent and workspace files.

### Localization

- Added a visible English/Chinese language switcher in the toolbar, command palette, settings, and desktop menu.

## 0.6.0 - 2026-06-08

### Export & Sharing

- Added toolbar, command palette, and desktop menu actions for copying Markdown or export-ready HTML to the clipboard.
- Added Reader, Compact, and Manuscript export style presets for HTML export, PDF export, and Copy HTML output.
- Added an export preview dialog with print, HTML export, and PDF export actions using the current export style.
- Added share-friendly export metadata, including derived titles, descriptions, Open Graph, and Twitter summary tags.

## 0.5.0 - 2026-06-08

### Search & Navigation

- Added current-document search results with line numbers, context snippets, and click-to-jump navigation.
- Added preview heading navigation so headings in the rendered preview can jump back to the matching editor line.
- Added editor and preview scroll synchronization in split mode for long Markdown documents.

### Table Editing

- Added contextual Markdown table controls for formatting the current table.
- Added table row controls for adding a row below the current position and deleting the current data row.
- Added table column controls for adding a column to the right and deleting the current column.

### Layout

- Locked the app shell to the viewport so long documents scroll inside the editor and preview panes instead of stretching the whole page.

## 0.4.0 - 2026-06-06

### Distribution Polish

- Added optional Windows code-signing configuration for local and GitHub Actions builds.
- Added macOS package targets and a Linux Debian package alongside Windows installer and portable artifacts.
- Added a desktop auto-update channel backed by GitHub Releases and Electron update metadata.
- Added the public download guide and expanded the GitHub release notes template.
- Updated release documentation for cross-platform artifacts, update metadata, and release verification.

### Appearance Settings

- Added appearance settings for light, dark, and system theme preferences.
- Added persistent editor font size control.
- Added toolbar, command palette, keyboard shortcut, and desktop menu access to appearance settings.

### PDF Export

- Added PDF export from the toolbar, command palette, and desktop File menu.
- Added desktop PDF generation through Electron and browser print-to-PDF support.

### Image Handling

- Added local image insertion from the toolbar, command palette, and desktop Edit menu.
- Added desktop relative-path insertion for saved Markdown files and local image preview path resolution.
- Added browser image insertion with current-session preview support.

### Table Editing

- Added a Markdown table toolbar action and command palette command.
- Added selected text conversion for comma, tab, and pipe-separated rows into Markdown tables.

### Command Palette

- Added a keyboard-first command palette for file, edit, view, workspace, search, and theme actions.
- Added desktop and browser shortcuts for opening the command palette (`Ctrl+Shift+P`).

### Search and Replace

- Added in-document find and replace with match navigation, match case, and whole-word options.
- Added desktop and browser shortcuts for Find (`Ctrl+F`) and Replace (`Ctrl+H`).

## 0.3.0 - 2026-06-06

### Editor Layout

- Added a draggable split-view divider that remembers the editor and preview pane balance.
- Remembered the last selected view mode and sidebar tab between launches.

### Document Status

- Updated the browser and desktop window title to show the current document name and unsaved marker.

### File Workflow

- Added a first-run welcome workspace with new/open actions.
- Added recent-file removal and clearing controls.
- Reworked the left inspector into Document, Outline, and Recent tabs.
- Added editable document file names for new documents, downloads, Save As defaults, and HTML exports.
- Improved recent-file error handling and support for opening empty Markdown files.

## 0.2.1 - 2026-06-06

### Fixed

- Fixed the packaged Windows app opening to a blank window by using relative Vite asset paths for Electron's `file://` renderer load.

## 0.2.0 - 2026-06-06

### Writing Experience

- Clickable document outline entries that jump to the matching Markdown heading.
- Markdown shortcuts for bold, italic, and link insertion in the editor.
- Unsaved-change prompts before replacing or closing the current document.
- Compact Markdown formatting toolbar for inline styles and common block formats.

## 0.1.0 - 2026-06-06

### Added

- Vite, React, and TypeScript application shell.
- CodeMirror Markdown editing with live safe preview.
- Write, split, and preview modes.
- Browser draft autosave and Markdown/HTML export.
- Electron desktop shell with native open, save, Save As, and HTML export dialogs.
- Recent files list, saved/unsaved state, and desktop menu shortcuts.
- Electron Builder packaging for Windows installer and portable artifacts.
- GitHub Actions workflow for tagged Windows releases.

### Known Notes

- Windows release artifacts are unsigned.
- Renderer bundle size warning is expected until editor dependencies are split.
