# Changelog

All notable changes to OpenMark will be documented in this file.

## Unreleased

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
