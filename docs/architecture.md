# Architecture

OpenMark starts as a renderer-first MVP so the editing experience can be validated quickly. The current desktop milestone uses Electron because the local machine does not have Rust/Cargo installed for Tauri yet.

## Runtime Layers

```text
Application Shell
  React app layout, commands, themes, view modes

Editor Core
  CodeMirror Markdown editor, document state, shortcuts

Markdown Pipeline
  markdown-it parsing, DOMPurify sanitization, HTML export

Localization Layer
  Typed UI dictionaries, locale preference storage, export language metadata

Extension Layer
  Future plugin host, contribution registry, sandboxed commands and transforms

Persistence Layer
  Browser draft storage, native file IO, recent file metadata

Distribution Layer
  Vite web build, Electron desktop shell, future Tauri evaluation
```

## Current Structure

```text
src/App.tsx       Main editor workflow and UI state
src/App.css       App-specific layout and editor styling
src/index.css     Global design tokens and reset
src/i18n.ts       Typed translation catalogs and locale preference helpers
docs/             Architecture, roadmap, contribution notes
```

## Desktop Phase

The current milestone adds an Electron native shell so OpenMark can run as a desktop app without requiring Rust setup. Tauri remains a future option because it can keep release size low.

Native shell responsibilities:

- Open and save local Markdown files
- Save As and export HTML through native dialogs
- Track recent files and unsaved document state
- Export PDF through a native or browser-backed pipeline
- Manage application menu and keyboard accelerators
- Package Windows, macOS, and Linux releases

## Editor Core Direction

The MVP uses source-first Markdown editing because it is reliable and fast. A WYSIWYG layer should be introduced after the Markdown AST pipeline is separated into a package.

Recommended future package split:

```text
packages/editor-core
packages/markdown-pipeline
packages/plugin-api
packages/export-engine
packages/theme-system
apps/desktop
```

The plugin layer should remain separate from the editor core. See [Plugin API Design](plugin-api.md) for the proposed manifest, permission model, lifecycle, and initial extension points.

The localization layer starts with typed dictionaries in the renderer and should stay independent from Markdown parsing. See [Localization](localization.md) for supported locales, contribution rules, and next targets.
