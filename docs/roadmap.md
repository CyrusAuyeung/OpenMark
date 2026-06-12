# Roadmap

## Milestone 1: Reliable Web MVP

- Markdown editor and live preview
- Local draft autosave
- File open and Markdown download
- HTML export
- Responsive app layout
- README, architecture notes, and contribution guide

## Milestone 2: Desktop Shell

- Add Electron application shell
- Native open, save, Save As, and HTML export dialogs
- Recent files and saved/unsaved state
- Window menu and keyboard shortcuts
- Cross-platform release artifacts

## Milestone 3: Writing Experience

- Command palette
- Better table editing
- Image insert and path handling ✅
- Search and replace ✅
- PDF export ✅
- Theme settings ✅

## Milestone 4: Open Source Growth

- Issue templates ✅
- Automated release workflow ✅
- Demo screenshots and short video ✅
- Plugin API design ✅
- Localization foundation ✅

## Milestone 5: Distribution Polish

- Windows code signing ✅
- macOS and Linux package targets ✅
- Auto-update channel ✅
- Download page and release notes template ✅

## Milestone 6: Search & Navigation

- Current-document search result list with line numbers and context ✅
- Clickable search results that jump to the editor selection ✅
- Preview-to-editor heading navigation ✅
- Editor and preview scroll synchronization ✅
- Stronger table editing controls ✅
- v0.5.0 screenshots, changelog, and release notes ✅

## Milestone 7: Export & Sharing Polish

- Copy Markdown and export-ready HTML to the clipboard ✅
- Export preset polish ✅
- Printable preview improvements ✅
- Share-friendly document metadata ✅

## Milestone 8: Document Library & Workspace Polish

- Pinned recent files ✅
- Searchable recent files ✅
- Local folder workspace browser ✅
- Quick open for Markdown files ✅
- Missing-file state for unavailable recent files ✅

## Milestone 9: Release Reliability

- Release metadata consistency check ✅
- Version-aware release notes generation ✅
- Automated post-release verification for GitHub Releases ✅
- Safer dependency update cadence ✅

## Milestone 10: Workspace Search & Library Polish

- Workspace panel filtering and sorting ✅
- Richer workspace file states ✅
- Recent/workspace unified quick open polish ✅
- Library keyboard navigation refinements ✅

## Milestone 11: Editor Workflow Polish

- Restore active desktop file path between sessions ✅
- Restore editor cursor and scroll position between sessions ✅
- Improve save/open error visibility ✅
- Refine quick open ranking and grouping ✅

## Milestone 12: Long Document Navigation

- Add Go to Line command and shortcut ✅
- Improve search result navigation feedback ✅
- Add outline filtering for dense documents ✅
- Add document position indicators ✅

## Milestone 13: Markdown Editing Quality

- Add repeated Markdown syntax helpers ✅
- Improve list continuation and checkbox editing ✅
- Improve paste handling for URLs and plain text ✅
- Add lightweight document diagnostics for broken links and images ✅

## Milestone 14: Product UI Polish

- Refine the app shell visual hierarchy for a more finished desktop-product feel ✅
- Polish toolbar, panels, and inspector spacing, density, and active states ✅
- Improve empty, loading, error, and unsaved states with clearer product-grade presentation ✅
- Refresh light and dark theme surfaces, borders, shadows, and focus states for consistency ✅

## Milestone 15: Search & Replace

- Add document find and replace panel with replace current and replace all actions ✅
- Support match case and whole-word search options during replacement ✅
- Expose find and replace through toolbar buttons, keyboard shortcuts, command palette, and desktop menus ✅
- Improve replacement feedback and disabled states when no matches are available ✅

## Milestone 16: Document Safety & Recovery

- Add local recovery snapshots for unsaved document changes ✅
- Show a welcome-screen recovery entry for available snapshots ✅
- Restore or discard recovery snapshots without touching saved files ✅
- Surface recovery snapshot status in the footer ✅
- Warn before saving over files changed outside OpenMark ✅

## Milestone 17: Bundle & Startup Polish

- Split large renderer dependencies into stable build chunks ✅
- Add a build budget check for renderer JavaScript chunks ✅
- Lazy-load Markdown preview and export rendering dependencies ✅
- Keep the first editor screen responsive while heavy editor tooling loads ✅
- Review remaining editor dependencies for future lazy-loading boundaries ✅

## Milestone 18: Writing Insight & Review

- Add estimated reading time to document statistics and the status bar ✅
- Add selection-aware statistics for focused edits ✅
- Add document goal tracking for longer writing sessions ✅
- Add lightweight review markers for drafts ✅

## Milestone 19: Preview Alignment & Editor Chrome

- Add preview-side cursor position alignment for easier split-view editing ✅
- Remove redundant editor header text and show formatting toolbar buttons without horizontal scrolling ✅
- Remove the brand subtitle from the top bar ✅
- Refresh the product mark and favicon for a more polished OpenMark identity ✅

## Milestone 20: Markdown Fidelity & Editing Parity

- Preserve soft line breaks in rendered preview paragraphs ✅
- Keep the inline preview caret aligned with preserved visual line breaks ✅
- Synchronize editor and preview caret blink timing ✅
- Replace green editor selection and active-line accents with neutral highlighting ✅
- Make bold and italic toolbar actions toggle formatted selections off ✅
- Hide active-line highlighting while a text selection is visible ✅
- Normalize combined bold/italic marker toggles for repeated asterisk runs ✅
