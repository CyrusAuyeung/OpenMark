# Changelog

All notable changes to OpenMark will be documented in this file.

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
