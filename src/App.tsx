import {
  type FormEvent as ReactFormEvent,
  type MouseEvent as ReactMouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import {
  SearchQuery,
  findNext,
  findPrevious,
  replaceAll,
  replaceNext,
  search,
  setSearchQuery,
} from '@codemirror/search'
import { EditorView, keymap } from '@codemirror/view'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import {
  Bold,
  CaseSensitive,
  ChevronDown,
  ChevronUp,
  Code2,
  Columns2,
  Command as CommandIcon,
  Copy,
  Download,
  Eye,
  FileDown,
  FilePlus2,
  FileText,
  FolderOpen,
  Heading2,
  ImagePlus,
  Italic,
  Languages,
  Laptop,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Moon,
  PanelBottom,
  PanelBottomClose,
  PanelRight,
  PanelRightClose,
  Pin,
  Printer,
  Quote,
  RefreshCw,
  Replace,
  ReplaceAll as ReplaceAllIcon,
  RotateCcw,
  Save,
  Search as SearchIcon,
  Settings2,
  Sun,
  Table,
  Table2,
  Type,
  WholeWord,
  X,
  type LucideIcon,
} from 'lucide-react'
import './App.css'
import {
  type AppLocale,
  type LocalePreference,
  type TranslationCatalog,
  getPreferredLocale,
  isLocalePreference,
  translations,
} from './i18n'

type ViewMode = 'write' | 'split' | 'preview'
type ThemeMode = 'light' | 'dark'
type ThemePreference = ThemeMode | 'system'
type SidebarTab = 'document' | 'outline' | 'recent' | 'workspace'
type InlineFormat = 'bold' | 'italic' | 'link'
type BlockFormat = 'heading-2' | 'bullet-list' | 'ordered-list' | 'task-list' | 'quote' | 'code-block' | 'table' | 'horizontal-rule'
type MarkdownFormat = InlineFormat | BlockFormat
type TableEditAction = 'format' | 'insert-row-below' | 'delete-row' | 'insert-column-right' | 'delete-column'
type TableTranslationKey = 'formatTable' | 'addRowBelow' | 'deleteRow' | 'addColumnRight' | 'deleteColumn'
type ClipboardCopyKind = 'markdown' | 'html'
type ExportStyle = 'reader' | 'compact' | 'manuscript'
type WorkspaceSortMode = 'modified-desc' | 'name-asc'

const clipboardWriteTimeoutMs = 1200

type OutlineItem = {
  level: number
  title: string
  lineNumber: number
  lineStart: number
}

type LineJumpTarget = {
  lineNumber: number
  lineStart: number
}

type DocumentStats = {
  words: number
  characters: number
  lines: number
  headings: number
}

type DocumentDiagnosticKind =
  | 'emptyLink'
  | 'unsafeLink'
  | 'missingHeading'
  | 'emptyImage'
  | 'unsavedRelativeImage'
  | 'unsupportedImage'

type DocumentDiagnostic = {
  id: string
  kind: DocumentDiagnosticKind
  lineNumber: number
  lineStart: number
  target: string
}

type EditorPositionState = {
  line: number
  column: number
  progress: number
}

type ExportDocumentMetadata = {
  title: string
  description: string
}

type RecentFile = {
  filePath: string
  fileName: string
  openedAt: number
  pinned?: boolean
  missing?: boolean
}

type QuickOpenItem = {
  id: string
  filePath: string
  title: string
  detail: string
  timestamp: number
  source: 'workspace' | 'recent'
  group: 'workspace' | 'recent'
}

type QuickOpenListEntry =
  | { type: 'group'; id: string; source: QuickOpenItem['group'] }
  | { type: 'item'; item: QuickOpenItem; index: number }

type WorkspaceFolderState = {
  folderPath: string
  folderName: string
  files: OpenMarkWorkspaceFile[]
  truncated: boolean
}

type EditorSessionDocument = {
  filePath: string | null
  fileName: string
}

type EditorSessionState = EditorSessionDocument & {
  selectionAnchor: number
  selectionHead: number
  scrollTop: number
  scrollLeft: number
}

type DocumentOperationStatus = {
  tone: 'success' | 'error'
  message: string
}

type PreviewImageSource = {
  markdownPath: string
  previewSrc: string
  objectUrl?: string
}

type SearchMatch = {
  from: number
  to: number
}

type SearchResult = SearchMatch & {
  index: number
  lineNumber: number
  contextBefore: string
  matchText: string
  contextAfter: string
}

type MarkdownTableContext = {
  from: number
  to: number
  rows: string[][]
  separatorIndex: number
  activeRowIndex: number
  activeColumnIndex: number
  columnCount: number
}

type TableEditingState = {
  isInTable: boolean
  canDeleteRow: boolean
  canDeleteColumn: boolean
}

type MarkdownToolbarTranslationKey = keyof TranslationCatalog['markdownToolbar']

type MarkdownPlaceholderCatalog = TranslationCatalog['markdownPlaceholders']

type MarkdownListMatch = {
  indent: string
  marker: string
  body: string
}

type CommandPaletteItem = {
  id: string
  label: string
  group: string
  shortcut?: string
  keywords?: string[]
  Icon: LucideIcon
  action: () => void
}

const draftStorageKey = 'openmark:draft'
const fileNameStorageKey = 'openmark:file-name'
const activeFilePathStorageKey = 'openmark:active-file-path'
const editorSessionStorageKey = 'openmark:editor-session'
const themeStorageKey = 'openmark:theme'
const localeStorageKey = 'openmark:locale'
const editorFontSizeStorageKey = 'openmark:editor-font-size'
const exportStyleStorageKey = 'openmark:export-style'
const recentFilesStorageKey = 'openmark:recent-files'
const workspaceFolderStorageKey = 'openmark:workspace-folder'
const workspaceSortStorageKey = 'openmark:workspace-sort'
const splitPaneRatioStorageKey = 'openmark:split-pane-ratio'
const viewModeStorageKey = 'openmark:view-mode'
const sidebarTabStorageKey = 'openmark:sidebar-tab'
const maxRecentFiles = 6
const quickOpenResultLimit = 10
const searchResultWindowSize = 12
const outlineResultLimit = 16
const defaultEditorPosition: EditorPositionState = {
  line: 1,
  column: 1,
  progress: 0,
}
const defaultSplitPaneRatio = 50
const minSplitPaneRatio = 30
const maxSplitPaneRatio = 70
const defaultEditorFontSize = 16
const minEditorFontSize = 14
const maxEditorFontSize = 22
const editorSessionSaveDelay = 160
const invalidFileNameCharacters = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*'])
const imageFileExtensions = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'])
const exportDescriptionMaxLength = 180
const libraryItemSelector = '[data-library-item="true"]'
const libraryRowSelector = '[data-library-row="true"]'
const taskListLinePattern = /^(\s*)([-*+])\s+\[([ xX])\]\s*(.*)$/
const bulletListLinePattern = /^(\s*)([-*+])\s+(.*)$/
const orderedListLinePattern = /^(\s*)(\d+)([.)])\s+(.*)$/
const zeroWidthPasteCharactersPattern = /[\u200B-\u200D\uFEFF]/g
const supportedPasteUrlProtocols = new Set(['http:', 'https:'])
const safeLinkProtocols = new Set(['http:', 'https:', 'mailto:', 'tel:', 'file:'])
const markdownReferencePattern = /(!?)\[([^\]\n]*)\]\(([^)\n]*)\)/g

const markdownRenderer = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})

const modeOptions: Array<{
  value: ViewMode
  Icon: LucideIcon
}> = [
  { value: 'write', Icon: Type },
  { value: 'split', Icon: Columns2 },
  { value: 'preview', Icon: Eye },
]

const validViewModes = new Set<ViewMode>(['write', 'split', 'preview'])
const validSidebarTabs = new Set<SidebarTab>(['document', 'outline', 'recent', 'workspace'])
const validThemePreferences = new Set<ThemePreference>(['light', 'dark', 'system'])
const validExportStyles = new Set<ExportStyle>(['reader', 'compact', 'manuscript'])
const validWorkspaceSortModes = new Set<WorkspaceSortMode>(['modified-desc', 'name-asc'])
const defaultTableEditingState: TableEditingState = {
  isInTable: false,
  canDeleteRow: false,
  canDeleteColumn: false,
}

function areTableEditingStatesEqual(left: TableEditingState, right: TableEditingState) {
  return left.isInTable === right.isInTable
    && left.canDeleteRow === right.canDeleteRow
    && left.canDeleteColumn === right.canDeleteColumn
}

const themeOptions: Array<{
  value: ThemePreference
  Icon: LucideIcon
}> = [
  { value: 'light', Icon: Sun },
  { value: 'dark', Icon: Moon },
  { value: 'system', Icon: Laptop },
]

const localeOptions: Array<{
  value: LocalePreference
  Icon: LucideIcon
}> = [
  { value: 'system', Icon: Laptop },
  { value: 'en', Icon: Languages },
  { value: 'zh-CN', Icon: Languages },
]

const exportStyleOptions: Array<{
  value: ExportStyle
  Icon: LucideIcon
}> = [
  { value: 'reader', Icon: FileText },
  { value: 'compact', Icon: Columns2 },
  { value: 'manuscript', Icon: Type },
]

const workspaceSortOptions: Array<{
  value: WorkspaceSortMode
  Icon: LucideIcon
}> = [
  { value: 'modified-desc', Icon: RefreshCw },
  { value: 'name-asc', Icon: List },
]

const defaultUpdateStatus: OpenMarkUpdateStatus = {
  state: 'unsupported',
  message: '',
  version: '0.10.0',
  updateVersion: null,
  progress: null,
  canCheck: false,
  canInstall: false,
  error: null,
}

const markdownToolbarGroups: Array<
  Array<{
    format: MarkdownFormat
    labelKey: MarkdownToolbarTranslationKey
    titleKey: MarkdownToolbarTranslationKey
    Icon: LucideIcon
  }>
> = [
  [
    { format: 'bold', labelKey: 'bold', titleKey: 'boldTitle', Icon: Bold },
    { format: 'italic', labelKey: 'italic', titleKey: 'italicTitle', Icon: Italic },
    { format: 'link', labelKey: 'link', titleKey: 'linkTitle', Icon: LinkIcon },
  ],
  [
    { format: 'heading-2', labelKey: 'heading', titleKey: 'headingTitle', Icon: Heading2 },
    { format: 'bullet-list', labelKey: 'bulletList', titleKey: 'bulletListTitle', Icon: List },
    { format: 'ordered-list', labelKey: 'orderedList', titleKey: 'orderedListTitle', Icon: ListOrdered },
  ],
  [
    { format: 'task-list', labelKey: 'taskList', titleKey: 'taskListTitle', Icon: List },
    { format: 'horizontal-rule', labelKey: 'horizontalRule', titleKey: 'horizontalRuleTitle', Icon: Minus },
  ],
  [
    { format: 'quote', labelKey: 'quote', titleKey: 'quoteTitle', Icon: Quote },
    { format: 'code-block', labelKey: 'codeBlock', titleKey: 'codeBlockTitle', Icon: Code2 },
    { format: 'table', labelKey: 'table', titleKey: 'tableTitle', Icon: Table },
  ],
]

const tableToolbarActions: Array<{
  action: TableEditAction
  translationKey: TableTranslationKey
  Icon: LucideIcon
}> = [
  { action: 'format', translationKey: 'formatTable', Icon: Table2 },
  { action: 'insert-row-below', translationKey: 'addRowBelow', Icon: PanelBottom },
  { action: 'delete-row', translationKey: 'deleteRow', Icon: PanelBottomClose },
  { action: 'insert-column-right', translationKey: 'addColumnRight', Icon: PanelRight },
  { action: 'delete-column', translationKey: 'deleteColumn', Icon: PanelRightClose },
]

function loadStoredValue(key: string, fallback: string) {
  return window.localStorage.getItem(key) ?? fallback
}

function loadStoredFilePath() {
  const storedFilePath = window.localStorage.getItem(activeFilePathStorageKey)
  return window.openmark && storedFilePath ? storedFilePath : null
}

function loadRecentFiles(): RecentFile[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(recentFilesStorageKey) ?? '[]')

    if (!Array.isArray(parsed)) {
      return []
    }

    return normalizeRecentFiles(parsed
      .filter(
        (item): item is RecentFile =>
          typeof item?.filePath === 'string' &&
          typeof item?.fileName === 'string' &&
          typeof item?.openedAt === 'number',
      )
      .map((item) => ({
        filePath: item.filePath,
        fileName: item.fileName,
        openedAt: item.openedAt,
        pinned: item.pinned === true,
        missing: item.missing === true,
      })))
  } catch {
    return []
  }
}

function compareRecentFiles(left: RecentFile, right: RecentFile) {
  if (left.pinned !== right.pinned) {
    return left.pinned ? -1 : 1
  }

  return right.openedAt - left.openedAt
}

function normalizeRecentFiles(recentFiles: RecentFile[]) {
  const filesByPath = new Map<string, RecentFile>()

  recentFiles.forEach((item) => {
    const existingItem = filesByPath.get(item.filePath)

    filesByPath.set(item.filePath, {
      filePath: item.filePath,
      fileName: item.fileName,
      openedAt: Math.max(item.openedAt, existingItem?.openedAt ?? 0),
      pinned: item.pinned === true || existingItem?.pinned === true,
      missing: item.missing === true && existingItem?.missing !== false,
    })
  })

  const sortedFiles = Array.from(filesByPath.values()).sort(compareRecentFiles)
  const pinnedFiles = sortedFiles.filter((item) => item.pinned)
  const unpinnedFiles = sortedFiles.filter((item) => !item.pinned).slice(0, maxRecentFiles)

  return [...pinnedFiles, ...unpinnedFiles]
}

function persistRecentFiles(recentFiles: RecentFile[]) {
  window.localStorage.setItem(recentFilesStorageKey, JSON.stringify(recentFiles))
}

function loadWorkspaceFolder(): WorkspaceFolderState | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(workspaceFolderStorageKey) ?? 'null')

    if (
      !parsed ||
      typeof parsed.folderPath !== 'string' ||
      typeof parsed.folderName !== 'string' ||
      !Array.isArray(parsed.files)
    ) {
      return null
    }

    const files: OpenMarkWorkspaceFile[] = parsed.files
      .filter(
        (item: Partial<OpenMarkWorkspaceFile>): item is OpenMarkWorkspaceFile =>
          typeof item?.filePath === 'string' &&
          typeof item?.fileName === 'string' &&
          typeof item?.relativePath === 'string' &&
          typeof item?.modifiedAt === 'number',
      )
      .map((item: OpenMarkWorkspaceFile) => ({
        filePath: item.filePath,
        fileName: item.fileName,
        relativePath: item.relativePath,
        modifiedAt: item.modifiedAt,
        missing: item.missing === true,
      }))

    return {
      folderPath: parsed.folderPath,
      folderName: parsed.folderName,
      files,
      truncated: parsed.truncated === true,
    }
  } catch {
    return null
  }
}

function persistWorkspaceFolder(workspaceFolder: WorkspaceFolderState | null) {
  if (!workspaceFolder) {
    window.localStorage.removeItem(workspaceFolderStorageKey)
    return
  }

  window.localStorage.setItem(workspaceFolderStorageKey, JSON.stringify(workspaceFolder))
}

function persistActiveFilePath(activeFilePath: string | null) {
  if (!activeFilePath) {
    window.localStorage.removeItem(activeFilePathStorageKey)
    return
  }

  window.localStorage.setItem(activeFilePathStorageKey, activeFilePath)
}

function loadEditorSessionState(): EditorSessionState | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(editorSessionStorageKey) ?? 'null') as Partial<EditorSessionState> | null

    if (!parsed || typeof parsed.fileName !== 'string') {
      return null
    }

    const selectionAnchor = Number(parsed.selectionAnchor)
    const selectionHead = Number(parsed.selectionHead)
    const scrollTop = Number(parsed.scrollTop)
    const scrollLeft = Number(parsed.scrollLeft ?? 0)

    if (
      !Number.isFinite(selectionAnchor) ||
      !Number.isFinite(selectionHead) ||
      !Number.isFinite(scrollTop) ||
      !Number.isFinite(scrollLeft)
    ) {
      return null
    }

    return {
      filePath: typeof parsed.filePath === 'string' ? parsed.filePath : null,
      fileName: parsed.fileName,
      selectionAnchor,
      selectionHead,
      scrollTop: Math.max(0, scrollTop),
      scrollLeft: Math.max(0, scrollLeft),
    }
  } catch {
    return null
  }
}

function persistEditorSessionState(editorSession: EditorSessionState) {
  window.localStorage.setItem(editorSessionStorageKey, JSON.stringify(editorSession))
}

function clearPersistedEditorSessionState() {
  window.localStorage.removeItem(editorSessionStorageKey)
}

function isEditorSessionForDocument(editorSession: EditorSessionState, document: EditorSessionDocument) {
  if (editorSession.filePath || document.filePath) {
    return editorSession.filePath === document.filePath
  }

  return editorSession.fileName === document.fileName
}

function clampEditorPosition(position: number, documentLength: number) {
  return Math.min(documentLength, Math.max(0, Math.round(position)))
}

function restoreEditorScrollPosition(element: HTMLElement, editorSession: EditorSessionState) {
  const maxScrollTop = Math.max(0, element.scrollHeight - element.clientHeight)
  const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth)

  element.scrollTop = Math.min(editorSession.scrollTop, maxScrollTop)
  element.scrollLeft = Math.min(editorSession.scrollLeft, maxScrollLeft)
}

function formatTranslation(template: string, replacements: Record<string, string>) {
  return Object.entries(replacements).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, value),
    template,
  )
}

function clampSplitPaneRatio(value: number) {
  return Math.min(maxSplitPaneRatio, Math.max(minSplitPaneRatio, value))
}

function loadSplitPaneRatio() {
  const storedRatio = Number(window.localStorage.getItem(splitPaneRatioStorageKey))

  return Number.isFinite(storedRatio)
    ? clampSplitPaneRatio(storedRatio)
    : defaultSplitPaneRatio
}

function loadViewMode() {
  const storedMode = window.localStorage.getItem(viewModeStorageKey)
  return validViewModes.has(storedMode as ViewMode) ? storedMode as ViewMode : 'split'
}

function loadSidebarTab() {
  const storedTab = window.localStorage.getItem(sidebarTabStorageKey)
  return validSidebarTabs.has(storedTab as SidebarTab) ? storedTab as SidebarTab : 'document'
}

function loadThemePreference() {
  const storedTheme = window.localStorage.getItem(themeStorageKey)
  return validThemePreferences.has(storedTheme as ThemePreference) ? storedTheme as ThemePreference : 'system'
}

function loadLocalePreference() {
  const storedLocale = window.localStorage.getItem(localeStorageKey)
  return isLocalePreference(storedLocale) ? storedLocale : 'system'
}

function getSystemLocale(): AppLocale {
  return getPreferredLocale(navigator.languages?.length ? navigator.languages : [navigator.language])
}

function getSystemTheme(): ThemeMode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function clampEditorFontSize(value: number) {
  return Math.min(maxEditorFontSize, Math.max(minEditorFontSize, value))
}

function loadEditorFontSize() {
  const storedSize = Number(window.localStorage.getItem(editorFontSizeStorageKey))
  return Number.isFinite(storedSize) ? clampEditorFontSize(storedSize) : defaultEditorFontSize
}

function loadExportStyle() {
  const storedStyle = window.localStorage.getItem(exportStyleStorageKey)
  return validExportStyles.has(storedStyle as ExportStyle) ? storedStyle as ExportStyle : 'reader'
}

function loadWorkspaceSortMode() {
  const storedSortMode = window.localStorage.getItem(workspaceSortStorageKey)
  return validWorkspaceSortModes.has(storedSortMode as WorkspaceSortMode)
    ? storedSortMode as WorkspaceSortMode
    : 'modified-desc'
}

function matchesWorkspaceFileQuery(item: OpenMarkWorkspaceFile, query: string) {
  return item.fileName.toLowerCase().includes(query) ||
    item.relativePath.toLowerCase().includes(query) ||
    item.filePath.toLowerCase().includes(query)
}

function compareWorkspaceFiles(
  left: OpenMarkWorkspaceFile,
  right: OpenMarkWorkspaceFile,
  sortMode: WorkspaceSortMode,
  collator: Intl.Collator,
) {
  if (left.missing !== right.missing) {
    return left.missing ? 1 : -1
  }

  if (sortMode === 'name-asc') {
    return collator.compare(left.relativePath, right.relativePath)
  }

  return right.modifiedAt - left.modifiedAt || collator.compare(left.relativePath, right.relativePath)
}

function getExportStyleCss(style: ExportStyle) {
  const presetCss = {
    reader: `
    @page { margin: 22mm 18mm; }
    body { background: #f7f8f4; color: #1c241d; font: 17px/1.7 ui-serif, Georgia, serif; }
    main { max-width: 780px; padding: 56px 28px; }
    p, ul, ol, blockquote, table, pre { margin-top: 0; margin-bottom: 1.1em; }
    h1 { font-size: 2.2rem; }
    h2 { font-size: 1.45rem; }
`,
    compact: `
    @page { margin: 16mm 14mm; }
    body { background: #ffffff; color: #20251f; font: 15px/1.55 ui-sans-serif, system-ui, sans-serif; }
    main { max-width: 880px; padding: 36px 22px; }
    p, ul, ol, blockquote, table, pre { margin-top: 0; margin-bottom: 0.8em; }
    h1 { font-size: 1.85rem; }
    h2 { font-size: 1.25rem; }
`,
    manuscript: `
    @page { margin: 25mm 22mm; }
    body { background: #ffffff; color: #151915; font: 18px/1.9 ui-serif, Georgia, serif; }
    main { max-width: 720px; padding: 64px 30px; }
    p, ul, ol, blockquote, table, pre { margin-top: 0; margin-bottom: 1.35em; }
    h1 { font-size: 2rem; }
    h2 { font-size: 1.35rem; }
`,
  } satisfies Record<ExportStyle, string>

  return `${presetCss[style]}
    body { margin: 0; }
    main { margin: 0 auto; }
    h1, h2, h3 { margin: 1.4em 0 0.55em; line-height: 1.2; font-family: ui-sans-serif, system-ui, sans-serif; }
    h1:first-child, h2:first-child, h3:first-child { margin-top: 0; }
    a { color: #2f7a5f; }
    pre { overflow: auto; padding: 16px; background: #20251f; color: #f4f7ef; border-radius: 8px; }
    code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
    blockquote { margin-left: 0; padding-left: 18px; border-left: 4px solid #75a88f; color: #59675d; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #d9e2d8; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: rgba(117, 168, 143, 0.12); }
    img { max-width: 100%; height: auto; }
    hr { border: 0; border-top: 1px solid #d9e2d8; margin: 2em 0; }
    @media print {
      body { background: #ffffff; }
      main { max-width: none; padding: 0; }
      pre, blockquote, table, img { break-inside: avoid; }
      a { color: inherit; }
    }
`
}

function getOutline(markdownValue: string): OutlineItem[] {
  const outlineItems: OutlineItem[] = []
  const linePattern = /.*(?:\r\n|\r|\n|$)/g
  let lineNumber = 1

  for (const match of markdownValue.matchAll(linePattern)) {
    const rawLine = match[0]

    if (!rawLine) {
      continue
    }

    const lineText = rawLine.replace(/\r\n|\r|\n$/, '')
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(lineText.trim())

    if (headingMatch) {
      outlineItems.push({
        level: headingMatch[1].length,
        title: headingMatch[2].replace(/[#*_`~]/g, '').trim(),
        lineNumber,
        lineStart: match.index ?? 0,
      })
    }

    lineNumber += 1
  }

  return outlineItems
}

function getDocumentStats(markdownValue: string, outline: OutlineItem[]): DocumentStats {
  const plainText = markdownValue
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/[#>*_`~|[\](){}-]/g, ' ')

  return {
    words: plainText.trim().split(/\s+/).filter(Boolean).length,
    characters: markdownValue.replace(/\s/g, '').length,
    lines: markdownValue.length > 0 ? markdownValue.split(/\r\n|\r|\n/).length : 0,
    headings: outline.length,
  }
}

function getMarkdownCodeFenceRanges(markdownValue: string) {
  const ranges: Array<{ from: number, to: number }> = []
  const fencePattern = /^```.*$/gm
  let fenceStart: number | null = null

  for (const match of markdownValue.matchAll(fencePattern)) {
    const matchIndex = match.index ?? 0
    const lineEnd = markdownValue.indexOf('\n', matchIndex)
    const fenceEnd = lineEnd === -1 ? markdownValue.length : lineEnd + 1

    if (fenceStart === null) {
      fenceStart = matchIndex
    } else {
      ranges.push({ from: fenceStart, to: fenceEnd })
      fenceStart = null
    }
  }

  if (fenceStart !== null) {
    ranges.push({ from: fenceStart, to: markdownValue.length })
  }

  return ranges
}

function isPositionInRanges(position: number, ranges: Array<{ from: number, to: number }>) {
  return ranges.some((range) => position >= range.from && position < range.to)
}

function getHeadingAnchorBase(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[#*_`~[\](){}]/g, '')
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'heading'
}

function getHeadingAnchorIds(outline: OutlineItem[]) {
  const usedIds = new Map<string, number>()

  return outline.map((item) => {
    const baseId = getHeadingAnchorBase(item.title)
    const nextCount = (usedIds.get(baseId) ?? 0) + 1
    usedIds.set(baseId, nextCount)

    return nextCount === 1 ? baseId : `${baseId}-${nextCount}`
  })
}

function normalizeMarkdownReferenceTarget(rawTarget: string) {
  const trimmedTarget = rawTarget.trim()

  if (trimmedTarget.startsWith('<')) {
    const endIndex = trimmedTarget.indexOf('>')
    return endIndex > 0 ? trimmedTarget.slice(1, endIndex).trim() : trimmedTarget.slice(1).trim()
  }

  return trimmedTarget.split(/\s+/)[0] ?? ''
}

function normalizeHeadingLinkTarget(target: string) {
  const hashTarget = target.slice(1)

  try {
    return decodeURIComponent(hashTarget).trim().toLowerCase()
  } catch {
    return hashTarget.trim().toLowerCase()
  }
}

function isUnsafeLinkTarget(target: string) {
  if (isAbsoluteLocalPath(target)) {
    return false
  }

  if (!hasUrlScheme(target)) {
    return false
  }

  try {
    return !safeLinkProtocols.has(new URL(target).protocol)
  } catch {
    const protocol = target.slice(0, target.indexOf(':') + 1).toLowerCase()
    return !safeLinkProtocols.has(protocol)
  }
}

function isExternalResourceTarget(target: string) {
  return /^(https?:|data:|blob:|file:)/i.test(target)
}

function hasRememberedPreviewImage(target: string, previewImageSources: PreviewImageSource[]) {
  const decodedTarget = safeDecodeUri(target)

  return previewImageSources.some((source) => (
    source.markdownPath === target || source.markdownPath === decodedTarget
  ))
}

function getDocumentDiagnostics(
  markdownValue: string,
  headingAnchorIds: string[],
  activeFilePath: string | null,
  previewImageSources: PreviewImageSource[],
): DocumentDiagnostic[] {
  const diagnostics: DocumentDiagnostic[] = []
  const fenceRanges = getMarkdownCodeFenceRanges(markdownValue)
  const headingAnchorIdSet = new Set(headingAnchorIds)

  for (const match of markdownValue.matchAll(markdownReferencePattern)) {
    const matchIndex = match.index ?? 0

    if (isPositionInRanges(matchIndex, fenceRanges)) {
      continue
    }

    const isImage = match[1] === '!'
    const target = normalizeMarkdownReferenceTarget(match[3])
    const lineNumber = getLineNumberAtPosition(markdownValue, matchIndex)
    const lineStart = getLineJumpTarget(markdownValue, lineNumber).lineStart
    const idPrefix = `${isImage ? 'image' : 'link'}-${matchIndex}`

    if (target.length === 0) {
      diagnostics.push({
        id: `${idPrefix}-empty`,
        kind: isImage ? 'emptyImage' : 'emptyLink',
        lineNumber,
        lineStart,
        target,
      })
      continue
    }

    if (isImage) {
      const decodedTarget = safeDecodeUri(target)
      const isExternalTarget = isExternalResourceTarget(decodedTarget)
      const hasUnsupportedImageType = !isExternalTarget && !isSupportedImageFile(decodedTarget)

      if (hasUnsupportedImageType) {
        diagnostics.push({
          id: `${idPrefix}-extension`,
          kind: 'unsupportedImage',
          lineNumber,
          lineStart,
          target,
        })
      }

      if (!hasUnsupportedImageType && !isExternalTarget && !isAbsoluteLocalPath(decodedTarget) && !activeFilePath && !hasRememberedPreviewImage(target, previewImageSources)) {
        diagnostics.push({
          id: `${idPrefix}-relative`,
          kind: 'unsavedRelativeImage',
          lineNumber,
          lineStart,
          target,
        })
      }

      continue
    }

    if (isUnsafeLinkTarget(target)) {
      diagnostics.push({
        id: `${idPrefix}-unsafe`,
        kind: 'unsafeLink',
        lineNumber,
        lineStart,
        target,
      })
      continue
    }

    if (target.startsWith('#') && !headingAnchorIdSet.has(normalizeHeadingLinkTarget(target))) {
      diagnostics.push({
        id: `${idPrefix}-heading`,
        kind: 'missingHeading',
        lineNumber,
        lineStart,
        target,
      })
    }
  }

  return diagnostics
}

function getBaseName(fileName: string) {
  return fileName.replace(/\.(md|markdown|txt|html)$/i, '') || 'document'
}

function getReadableBaseName(fileName: string) {
  return getBaseName(fileName).replace(/[-_]+/g, ' ').trim() || 'document'
}

function sanitizeFileNameInput(fileName: string) {
  return Array.from(fileName)
    .map((character) => (
      invalidFileNameCharacters.has(character) || character.charCodeAt(0) < 32
        ? '-'
        : character
    ))
    .join('')
    .trimStart()
}

function normalizeFileName(fileName: string) {
  return sanitizeFileNameInput(fileName).trim() || 'untitled.md'
}

function withMarkdownExtension(fileName: string) {
  const normalizedFileName = normalizeFileName(fileName)
  return /\.(md|markdown)$/i.test(normalizedFileName) ? normalizedFileName : `${normalizedFileName}.md`
}

function getPathFileName(filePath: string) {
  return filePath.split(/[\\/]/).pop() ?? filePath
}

function getPathDirectory(filePath: string) {
  const separatorIndex = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
  return separatorIndex === -1 ? '' : filePath.slice(0, separatorIndex)
}

function normalizePathSeparators(value: string) {
  return value.replace(/\\/g, '/')
}

function isAbsoluteLocalPath(value: string) {
  return /^[A-Za-z]:[\\/]/.test(value) || value.startsWith('/') || value.startsWith('\\\\')
}

function isExternalImageSource(value: string) {
  return /^(https?:|data:|blob:|file:)/i.test(value)
}

function hasUrlScheme(value: string) {
  return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)
}

function encodePathSegments(value: string) {
  return value
    .split('/')
    .map((segment, index) => (index === 1 && /^[A-Za-z]:$/.test(segment) ? segment : encodeURIComponent(segment)))
    .join('/')
}

function toFileUrl(filePath: string) {
  const normalizedPath = normalizePathSeparators(filePath)
  const pathForUrl = /^[A-Za-z]:\//.test(normalizedPath)
    ? `/${normalizedPath}`
    : normalizedPath.startsWith('/')
      ? normalizedPath
      : `/${normalizedPath}`

  return `file://${encodePathSegments(pathForUrl)}`
}

function getRelativePath(fromDirectory: string, toPath: string) {
  if (!fromDirectory) {
    return normalizePathSeparators(toPath)
  }

  const fromParts = normalizePathSeparators(fromDirectory).split('/').filter(Boolean)
  const toParts = normalizePathSeparators(toPath).split('/').filter(Boolean)
  const fromRoot = fromParts[0]?.toLowerCase()
  const toRoot = toParts[0]?.toLowerCase()

  if (fromRoot && toRoot && /^[a-z]:$/i.test(fromRoot) && fromRoot !== toRoot) {
    return normalizePathSeparators(toPath)
  }

  let sharedCount = 0

  while (
    sharedCount < fromParts.length &&
    sharedCount < toParts.length &&
    fromParts[sharedCount].toLowerCase() === toParts[sharedCount].toLowerCase()
  ) {
    sharedCount += 1
  }

  const upSegments = fromParts.slice(sharedCount).map(() => '..')
  const downSegments = toParts.slice(sharedCount)
  const relativePath = [...upSegments, ...downSegments].join('/')

  return relativePath || getPathFileName(toPath)
}

function getImageAltText(fileName: string) {
  return getBaseName(fileName).replace(/[-_]+/g, ' ').trim() || 'image'
}

function safeDecodeUri(value: string) {
  try {
    return decodeURI(value)
  } catch {
    return value
  }
}

function escapeMarkdownImageAlt(value: string) {
  return value.replace(/[\r\n[\]]/g, ' ').trim() || 'image'
}

function formatMarkdownImagePath(value: string) {
  const normalizedPath = normalizePathSeparators(value).replace(/[<>]/g, '')

  return /[\s()]/.test(normalizedPath) ? `<${normalizedPath}>` : normalizedPath
}

function createMarkdownImage(markdownPath: string, altText: string) {
  return `![${escapeMarkdownImageAlt(altText)}](${formatMarkdownImagePath(markdownPath)})`
}

function createBlockInsertion(markdownValue: string, from: number, to: number, blockText: string) {
  const before = markdownValue.slice(0, from)
  const after = markdownValue.slice(to)
  const prefix = before.length === 0 || before.endsWith('\n\n')
    ? ''
    : before.endsWith('\n')
      ? '\n'
      : '\n\n'
  const suffix = after.length === 0 || after.startsWith('\n\n')
    ? ''
    : after.startsWith('\n')
      ? '\n'
      : '\n\n'

  return `${prefix}${blockText}${suffix}`
}

function isSupportedImageFile(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? ''
  return imageFileExtensions.has(extension)
}

function resolvePreviewImageSource(src: string, activeFilePath: string | null, previewImageSources: PreviewImageSource[]) {
  if (src.startsWith('blob:') || src.startsWith('data:') || /^https?:/i.test(src)) {
    return src
  }

  const decodedSrc = safeDecodeUri(src)
  const rememberedSource = previewImageSources.find((item) => (
    item.markdownPath === src || item.markdownPath === decodedSrc
  ))

  if (rememberedSource) {
    return rememberedSource.previewSrc
  }

  if (src.startsWith('file:')) {
    return src
  }

  if (isAbsoluteLocalPath(decodedSrc)) {
    return toFileUrl(decodedSrc)
  }

  if (activeFilePath) {
    return toFileUrl(`${getPathDirectory(activeFilePath)}/${decodedSrc}`)
  }

  return src
}

function rewritePreviewImageSources(
  html: string,
  activeFilePath: string | null,
  previewImageSources: PreviewImageSource[],
) {
  if (!html.includes('<img')) {
    return html
  }

  const template = document.createElement('template')
  template.innerHTML = html

  template.content.querySelectorAll('img').forEach((image) => {
    const src = image.getAttribute('src')

    if (!src || isExternalImageSource(src)) {
      return
    }

    const decodedSrc = safeDecodeUri(src)

    if (hasUrlScheme(decodedSrc) && !isAbsoluteLocalPath(decodedSrc)) {
      return
    }

    image.setAttribute('src', resolvePreviewImageSource(src, activeFilePath, previewImageSources))
    image.setAttribute('loading', 'lazy')
    image.setAttribute('decoding', 'async')
  })

  return template.innerHTML
}

function addPreviewHeadingNavigation(html: string, outline: OutlineItem[], headingAnchorIds: string[]) {
  if (outline.length === 0 || !/<h[1-6]/i.test(html)) {
    return html
  }

  const template = document.createElement('template')
  template.innerHTML = html
  const headings = Array.from(template.content.querySelectorAll('h1, h2, h3, h4, h5, h6'))

  headings.forEach((heading, index) => {
    const outlineItem = outline[index]

    if (!outlineItem) {
      return
    }

    heading.setAttribute('id', headingAnchorIds[index] ?? getHeadingAnchorBase(outlineItem.title))
    heading.setAttribute('data-outline-index', String(index))
    heading.setAttribute('tabindex', '0')
    heading.setAttribute('role', 'button')
  })

  return template.innerHTML
}

function isSearchWordCharacter(character: string) {
  return /^[A-Za-z0-9_]$/.test(character)
}

function getSearchMatches(
  markdownValue: string,
  searchTerm: string,
  options: { caseSensitive: boolean; wholeWord: boolean },
) {
  if (searchTerm.length === 0) {
    return []
  }

  const source = options.caseSensitive ? markdownValue : markdownValue.toLowerCase()
  const query = options.caseSensitive ? searchTerm : searchTerm.toLowerCase()
  const matches: SearchMatch[] = []
  let index = source.indexOf(query)

  while (index !== -1) {
    const matchEnd = index + query.length
    const startsAtWordBoundary = !isSearchWordCharacter(markdownValue[index - 1] ?? '')
    const endsAtWordBoundary = !isSearchWordCharacter(markdownValue[matchEnd] ?? '')

    if (!options.wholeWord || (startsAtWordBoundary && endsAtWordBoundary)) {
      matches.push({ from: index, to: matchEnd })
    }

    index = source.indexOf(query, Math.max(index + query.length, index + 1))
  }

  return matches
}

function normalizeSearchContext(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function getLineNumberAtPosition(markdownValue: string, position: number) {
  let lineNumber = 1

  for (let index = 0; index < position; index += 1) {
    if (markdownValue[index] === '\n') {
      lineNumber += 1
    }
  }

  return lineNumber
}

function getLineJumpTarget(markdownValue: string, lineNumber: number): LineJumpTarget {
  const lines = markdownValue.split('\n')
  const safeLineNumber = Math.min(Math.max(lineNumber, 1), Math.max(lines.length, 1))
  let lineStart = 0

  for (let index = 0; index < safeLineNumber - 1; index += 1) {
    lineStart += lines[index].length + 1
  }

  return { lineNumber: safeLineNumber, lineStart }
}

function getEditorPositionState(view: EditorView): EditorPositionState {
  const selection = view.state.selection.main
  const line = view.state.doc.lineAt(selection.head)
  const scrollableDistance = view.scrollDOM.scrollHeight - view.scrollDOM.clientHeight
  const progress = scrollableDistance <= 0
    ? 0
    : Math.round((view.scrollDOM.scrollTop / scrollableDistance) * 100)

  return {
    line: line.number,
    column: selection.head - line.from + 1,
    progress: Math.min(100, Math.max(0, progress)),
  }
}

function areEditorPositionsEqual(left: EditorPositionState, right: EditorPositionState) {
  return left.line === right.line &&
    left.column === right.column &&
    left.progress === right.progress
}

function parseLineNumberInput(value: string) {
  const normalizedValue = value.trim()

  if (!/^\d+$/.test(normalizedValue)) {
    return null
  }

  return Number(normalizedValue)
}

function getSearchResults(markdownValue: string, matches: SearchMatch[]): SearchResult[] {
  return matches.map((match, index) => {
    const lineStart = Math.max(markdownValue.lastIndexOf('\n', match.from - 1) + 1, 0)
    const nextLineBreak = markdownValue.indexOf('\n', match.to)
    const lineEnd = nextLineBreak === -1 ? markdownValue.length : nextLineBreak
    const contextStart = Math.max(lineStart, match.from - 42)
    const contextEnd = Math.min(lineEnd, match.to + 58)

    return {
      ...match,
      index,
      lineNumber: getLineNumberAtPosition(markdownValue, match.from),
      contextBefore: normalizeSearchContext(markdownValue.slice(contextStart, match.from)),
      matchText: markdownValue.slice(match.from, match.to),
      contextAfter: normalizeSearchContext(markdownValue.slice(match.to, contextEnd)),
    }
  })
}

function getCommandPaletteSearchScore(item: CommandPaletteItem, query: string) {
  const label = item.label.toLowerCase()
  const group = item.group.toLowerCase()
  const shortcut = item.shortcut?.toLowerCase() ?? ''
  const keywords = item.keywords ?? []

  if (label === query) {
    return 0
  }

  if (label.startsWith(query)) {
    return 1
  }

  if (label.includes(query)) {
    return 2
  }

  if (group.includes(query)) {
    return 3
  }

  if (shortcut.includes(query)) {
    return 4
  }

  if (keywords.some((keyword) => keyword.toLowerCase().startsWith(query))) {
    return 5
  }

  if (keywords.some((keyword) => keyword.toLowerCase().includes(query))) {
    return 6
  }

  return Number.POSITIVE_INFINITY
}

function getQuickOpenSearchScore(item: QuickOpenItem, query: string) {
  const title = item.title.toLowerCase()
  const fileName = getPathFileName(item.filePath).toLowerCase()
  const detail = item.detail.toLowerCase()
  const filePath = item.filePath.toLowerCase()
  const pathSegments = normalizePathSeparators(item.filePath).toLowerCase().split('/').filter(Boolean)

  if (title === query || fileName === query) {
    return 0
  }

  if (title.startsWith(query) || fileName.startsWith(query)) {
    return 1
  }

  if (title.includes(query) || fileName.includes(query)) {
    return 2
  }

  if (pathSegments.some((segment) => segment.startsWith(query))) {
    return 3
  }

  if (detail.includes(query)) {
    return 4
  }

  if (filePath.includes(query)) {
    return 5
  }

  return Number.POSITIVE_INFINITY
}

function getQuickOpenGroupPriority(item: QuickOpenItem) {
  return item.group === 'recent' ? 0 : 1
}

function compareQuickOpenItems(
  left: QuickOpenItem,
  right: QuickOpenItem,
  query: string,
  collator: Intl.Collator,
) {
  if (query.length > 0) {
    const leftScore = getQuickOpenSearchScore(left, query)
    const rightScore = getQuickOpenSearchScore(right, query)

    if (leftScore !== rightScore) {
      return leftScore - rightScore
    }
  }

  const groupPriority = getQuickOpenGroupPriority(left) - getQuickOpenGroupPriority(right)

  if (groupPriority !== 0) {
    return groupPriority
  }

  return right.timestamp - left.timestamp || collator.compare(left.title, right.title)
}

function getQuickOpenListEntries(items: QuickOpenItem[]) {
  const entries: QuickOpenListEntry[] = []
  const seenGroups = new Set<QuickOpenItem['group']>()
  let itemIndex = 0

  for (const item of items) {
    if (!seenGroups.has(item.group)) {
      seenGroups.add(item.group)
      entries.push({ type: 'group', id: `group:${item.group}`, source: item.group })
    }

    entries.push({ type: 'item', item, index: itemIndex })
    itemIndex += 1
  }

  return entries
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }

  return value.replace(/[&<>"']/g, (character) => entities[character])
}

function normalizeMetadataText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function truncateMetadataText(value: string, maxLength = exportDescriptionMaxLength) {
  if (value.length <= maxLength) {
    return value
  }

  const clippedValue = value.slice(0, maxLength + 1)
  const lastSpaceIndex = clippedValue.lastIndexOf(' ')
  const safeClipIndex = lastSpaceIndex >= 90 ? lastSpaceIndex : maxLength

  return `${clippedValue.slice(0, safeClipIndex).trim()}...`
}

function getExportTextCandidates(contentHtml: string, selector: string) {
  if (typeof document === 'undefined') {
    return []
  }

  const template = document.createElement('template')
  template.innerHTML = contentHtml

  return Array.from(template.content.querySelectorAll(selector))
    .map((element) => normalizeMetadataText(element.textContent ?? ''))
    .filter(Boolean)
}

function getExportDocumentMetadata(contentHtml: string, fileName: string): ExportDocumentMetadata {
  const headingTitle = getExportTextCandidates(contentHtml, 'h1, h2, h3, h4, h5, h6')[0]
  const title = truncateMetadataText(headingTitle || getReadableBaseName(fileName), 90)
  const descriptionCandidate = getExportTextCandidates(contentHtml, 'p, blockquote, li, td, th')
    .find((candidate) => candidate !== title)

  return {
    title,
    description: descriptionCandidate ? truncateMetadataText(descriptionCandidate) : '',
  }
}

function getOpenGraphLocale(locale: AppLocale) {
  return locale === 'zh-CN' ? 'zh_CN' : 'en_US'
}

function getExportMetadataTags(metadata: ExportDocumentMetadata, locale: AppLocale) {
  const title = escapeHtml(metadata.title)
  const description = escapeHtml(metadata.description)
  const descriptionTags = description
    ? `
  <meta name="description" content="${description}">
  <meta property="og:description" content="${description}">
  <meta name="twitter:description" content="${description}">`
    : ''

  return `  <meta name="generator" content="OpenMark">
  <meta name="application-name" content="OpenMark">
  <meta name="title" content="${title}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="OpenMark">
  <meta property="og:locale" content="${getOpenGraphLocale(locale)}">
  <meta property="og:title" content="${title}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${title}">${descriptionTags}`
}

function downloadFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = objectUrl
  anchor.download = fileName
  anchor.click()

  URL.revokeObjectURL(objectUrl)
}

function sanitizeMarkdownHtml(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_URI_REGEXP: /^(?:(?:(?:https?|mailto|tel|file|blob):)|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  })
}

function applyInlineFormat(view: EditorView, format: InlineFormat) {
  const selection = view.state.selection.main
  const selectedText = view.state.sliceDoc(selection.from, selection.to)
  let insertText = ''
  let anchor = selection.from
  let head = selection.from

  if (format === 'bold') {
    insertText = `**${selectedText}**`
    anchor = selection.from + 2
    head = anchor + selectedText.length
  }

  if (format === 'italic') {
    insertText = `*${selectedText}*`
    anchor = selection.from + 1
    head = anchor + selectedText.length
  }

  if (format === 'link') {
    const linkText = selectedText || 'link text'
    const url = 'https://'

    insertText = `[${linkText}](${url})`

    if (selectedText) {
      anchor = selection.from + linkText.length + 3
      head = anchor + url.length
    } else {
      anchor = selection.from + 1
      head = anchor + linkText.length
    }
  }

  view.dispatch({
    changes: { from: selection.from, to: selection.to, insert: insertText },
    selection: { anchor, head },
    scrollIntoView: true,
  })
  view.focus()

  return true
}

function isInlineFormat(format: MarkdownFormat): format is InlineFormat {
  return format === 'bold' || format === 'italic' || format === 'link'
}

function applyCodeBlockFormat(view: EditorView) {
  const selection = view.state.selection.main
  const selectedText = view.state.sliceDoc(selection.from, selection.to)
  const codeText = selectedText || 'code'
  const insertText = `\`\`\`\n${codeText}\n\`\`\``
  const anchor = selection.from + 4
  const head = anchor + codeText.length

  view.dispatch({
    changes: { from: selection.from, to: selection.to, insert: insertText },
    selection: { anchor, head },
    scrollIntoView: true,
  })
  view.focus()

  return true
}

function splitTableCells(line: string) {
  const trimmedLine = line.trim()

  if (trimmedLine.includes('|')) {
    return trimmedLine
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim())
  }

  if (trimmedLine.includes('\t')) {
    return trimmedLine.split('\t').map((cell) => cell.trim())
  }

  if (trimmedLine.includes(',')) {
    return trimmedLine.split(',').map((cell) => cell.trim())
  }

  return [trimmedLine]
}

function renderTableRow(cells: string[], columnCount: number) {
  const normalizedCells = Array.from({ length: columnCount }, (_item, index) => cells[index]?.trim() || ' ')
  return `| ${normalizedCells.join(' | ')} |`
}

function isTableSeparatorCell(cell: string) {
  return /^:?-{3,}:?$/.test(cell.trim())
}

function isMarkdownTableRow(line: string) {
  return line.includes('|') && splitTableCells(line).length >= 2
}

function isTableSeparatorRow(line: string) {
  const cells = splitTableCells(line)

  return cells.length >= 2 && cells.every(isTableSeparatorCell)
}

function normalizeTableCells(cells: string[], columnCount: number) {
  return Array.from({ length: columnCount }, (_item, index) => cells[index]?.trim() || ' ')
}

function normalizeTableSeparatorCells(cells: string[], columnCount: number) {
  return Array.from({ length: columnCount }, (_item, index) => {
    const cell = cells[index]?.trim() ?? ''

    return isTableSeparatorCell(cell) ? cell : '---'
  })
}

function renderTableSeparatorRow(cells: string[], columnCount: number) {
  return `| ${normalizeTableSeparatorCells(cells, columnCount).join(' | ')} |`
}

function normalizeTableRows(rows: string[][], separatorIndex: number, columnCount: number) {
  return rows.map((row, rowIndex) => (
    rowIndex === separatorIndex
      ? normalizeTableSeparatorCells(row, columnCount)
      : normalizeTableCells(row, columnCount)
  ))
}

function renderMarkdownTableRows(rows: string[][], separatorIndex: number, columnCount: number) {
  return rows.map((row, rowIndex) => (
    rowIndex === separatorIndex
      ? renderTableSeparatorRow(row, columnCount)
      : renderTableRow(row, columnCount)
  )).join('\n')
}

function getTableColumnIndex(line: string, cursorOffset: number, columnCount: number) {
  const prefix = line.slice(0, Math.max(0, cursorOffset))
  const pipeCount = [...prefix].filter((character) => character === '|').length
  const startsWithPipe = line.trimStart().startsWith('|')
  const columnIndex = startsWithPipe ? pipeCount - 1 : pipeCount

  return Math.max(0, Math.min(columnIndex, columnCount - 1))
}

function getMarkdownTableContext(view: EditorView): MarkdownTableContext | null {
  const selection = view.state.selection.main
  const activeLine = view.state.doc.lineAt(selection.from)

  if (!isMarkdownTableRow(activeLine.text)) {
    return null
  }

  let fromLineNumber = activeLine.number
  let toLineNumber = activeLine.number

  while (fromLineNumber > 1 && isMarkdownTableRow(view.state.doc.line(fromLineNumber - 1).text)) {
    fromLineNumber -= 1
  }

  while (toLineNumber < view.state.doc.lines && isMarkdownTableRow(view.state.doc.line(toLineNumber + 1).text)) {
    toLineNumber += 1
  }

  const tableLines = Array.from({ length: toLineNumber - fromLineNumber + 1 }, (_item, index) => (
    view.state.doc.line(fromLineNumber + index)
  ))
  const separatorIndex = tableLines.findIndex((line) => isTableSeparatorRow(line.text))

  if (separatorIndex <= 0) {
    return null
  }

  const rows = tableLines.map((line) => splitTableCells(line.text))
  const columnCount = Math.max(2, ...rows.map((row) => row.length))
  const activeRowIndex = activeLine.number - fromLineNumber
  const activeColumnIndex = getTableColumnIndex(activeLine.text, selection.from - activeLine.from, columnCount)

  return {
    from: tableLines[0].from,
    to: tableLines[tableLines.length - 1].to,
    rows,
    separatorIndex,
    activeRowIndex,
    activeColumnIndex,
    columnCount,
  }
}

function getRenderedTableCellOffset(
  rows: string[][],
  separatorIndex: number,
  columnCount: number,
  rowIndex: number,
  columnIndex: number,
) {
  const safeRowIndex = Math.max(0, Math.min(rowIndex, rows.length - 1))
  const safeColumnIndex = Math.max(0, Math.min(columnIndex, columnCount - 1))
  const normalizedRows = normalizeTableRows(rows, separatorIndex, columnCount)
  let offset = 0

  for (let index = 0; index < safeRowIndex; index += 1) {
    offset += (index === separatorIndex
      ? renderTableSeparatorRow(normalizedRows[index], columnCount)
      : renderTableRow(normalizedRows[index], columnCount)
    ).length + 1
  }

  offset += 2

  for (let index = 0; index < safeColumnIndex; index += 1) {
    offset += normalizedRows[safeRowIndex][index].length + 3
  }

  return offset
}

function getTableEditingState(view: EditorView): TableEditingState {
  const context = getMarkdownTableContext(view)

  if (!context) {
    return defaultTableEditingState
  }

  return {
    isInTable: true,
    canDeleteRow: context.activeRowIndex > context.separatorIndex,
    canDeleteColumn: context.columnCount > 2,
  }
}

function dispatchTableUpdate(
  view: EditorView,
  context: MarkdownTableContext,
  rows: string[][],
  activeRowIndex: number,
  activeColumnIndex: number,
) {
  const columnCount = Math.max(2, ...rows.map((row) => row.length))
  const normalizedRows = normalizeTableRows(rows, context.separatorIndex, columnCount)
  const insertText = renderMarkdownTableRows(normalizedRows, context.separatorIndex, columnCount)
  const anchor = context.from + getRenderedTableCellOffset(
    normalizedRows,
    context.separatorIndex,
    columnCount,
    activeRowIndex,
    activeColumnIndex,
  )

  view.dispatch({
    changes: { from: context.from, to: context.to, insert: insertText },
    selection: { anchor },
    scrollIntoView: true,
  })
  view.focus()

  return true
}

function applyTableEditAction(view: EditorView, action: TableEditAction) {
  const context = getMarkdownTableContext(view)

  if (!context) {
    return false
  }

  const rows = normalizeTableRows(context.rows, context.separatorIndex, context.columnCount)
  let activeRowIndex = context.activeRowIndex
  let activeColumnIndex = context.activeColumnIndex

  if (action === 'insert-row-below') {
    const insertAfterIndex = activeRowIndex <= context.separatorIndex ? context.separatorIndex : activeRowIndex
    rows.splice(insertAfterIndex + 1, 0, Array.from({ length: context.columnCount }, () => ' '))
    activeRowIndex = insertAfterIndex + 1
  }

  if (action === 'delete-row') {
    if (activeRowIndex <= context.separatorIndex) {
      return false
    }

    rows.splice(activeRowIndex, 1)
    activeRowIndex = Math.min(activeRowIndex, rows.length - 1)
  }

  if (action === 'insert-column-right') {
    rows.forEach((row, rowIndex) => {
      row.splice(activeColumnIndex + 1, 0, rowIndex === context.separatorIndex ? '---' : ' ')
    })
    activeColumnIndex += 1
  }

  if (action === 'delete-column') {
    if (context.columnCount <= 2) {
      return false
    }

    rows.forEach((row) => row.splice(activeColumnIndex, 1))
    activeColumnIndex = Math.min(activeColumnIndex, context.columnCount - 2)
  }

  return dispatchTableUpdate(view, context, rows, activeRowIndex, activeColumnIndex)
}

function createMarkdownTable(selectedText: string, placeholders: MarkdownPlaceholderCatalog) {
  const selectedLines = selectedText
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (selectedLines.length > 0) {
    const rows = selectedLines.map(splitTableCells)
    const columnCount = Math.max(2, ...rows.map((row) => row.length))
    const separator = renderTableRow(Array.from({ length: columnCount }, () => '---'), columnCount)

    return [
      renderTableRow(rows[0], columnCount),
      separator,
      ...rows.slice(1).map((row) => renderTableRow(row, columnCount)),
    ].join('\n')
  }

  const columnCount = Math.max(2, placeholders.tableHeaders.length)

  return [
    renderTableRow(placeholders.tableHeaders, columnCount),
    renderTableRow(Array.from({ length: columnCount }, () => '---'), columnCount),
    ...placeholders.tableRows.map((row) => renderTableRow(row, columnCount)),
  ].join('\n')
}

function applyTableFormat(view: EditorView, placeholders: MarkdownPlaceholderCatalog) {
  const selection = view.state.selection.main
  const selectedText = view.state.sliceDoc(selection.from, selection.to)
  const insertText = createMarkdownTable(selectedText, placeholders)
  const anchor = selection.from
  const head = anchor + insertText.length

  view.dispatch({
    changes: { from: selection.from, to: selection.to, insert: insertText },
    selection: { anchor, head },
    scrollIntoView: true,
  })
  view.focus()

  return true
}

function applyHorizontalRuleFormat(view: EditorView) {
  const selection = view.state.selection.main
  const beforeText = view.state.sliceDoc(0, selection.from)
  const afterText = view.state.sliceDoc(selection.to)
  const prefix = beforeText.length === 0
    ? ''
    : beforeText.endsWith('\n\n')
      ? ''
      : beforeText.endsWith('\n')
        ? '\n'
        : '\n\n'
  const suffix = afterText.length === 0
    ? ''
    : afterText.startsWith('\n\n')
      ? ''
      : afterText.startsWith('\n')
        ? '\n'
        : '\n\n'
  const insertText = `${prefix}---${suffix}`
  const anchor = selection.from + insertText.length

  view.dispatch({
    changes: { from: selection.from, to: selection.to, insert: insertText },
    selection: { anchor },
    scrollIntoView: true,
  })
  view.focus()

  return true
}

function stripListMarker(line: string) {
  return line.replace(/^(-\s+\[[ xX]\]\s+|[-*+]\s+|\d+\.\s+)/, '')
}

function getMarkdownListMatch(line: string): MarkdownListMatch | null {
  const taskMatch = line.match(taskListLinePattern)

  if (taskMatch) {
    return {
      indent: taskMatch[1],
      marker: `${taskMatch[2]} [ ]`,
      body: taskMatch[4],
    }
  }

  const orderedMatch = line.match(orderedListLinePattern)

  if (orderedMatch) {
    return {
      indent: orderedMatch[1],
      marker: `${Number(orderedMatch[2]) + 1}${orderedMatch[3]}`,
      body: orderedMatch[4],
    }
  }

  const bulletMatch = line.match(bulletListLinePattern)

  if (bulletMatch) {
    return {
      indent: bulletMatch[1],
      marker: bulletMatch[2],
      body: bulletMatch[3],
    }
  }

  return null
}

function continueMarkdownList(view: EditorView) {
  const selection = view.state.selection.main

  if (!selection.empty) {
    return false
  }

  const line = view.state.doc.lineAt(selection.from)
  const lineText = line.text
  const listMatch = getMarkdownListMatch(lineText)

  if (!listMatch) {
    return false
  }

  if (listMatch.body.trim().length === 0) {
    const anchor = line.from + listMatch.indent.length

    view.dispatch({
      changes: { from: line.from, to: line.to, insert: listMatch.indent },
      selection: { anchor },
      scrollIntoView: true,
    })

    return true
  }

  const insertText = `\n${listMatch.indent}${listMatch.marker} `

  view.dispatch({
    changes: { from: selection.from, to: selection.to, insert: insertText },
    selection: { anchor: selection.from + insertText.length },
    scrollIntoView: true,
  })

  return true
}

function toggleTaskCheckbox(view: EditorView) {
  const selection = view.state.selection.main
  const lineEndPosition = selection.empty ? selection.to : Math.max(selection.from, selection.to - 1)
  const fromLine = view.state.doc.lineAt(selection.from)
  const toLine = view.state.doc.lineAt(lineEndPosition)
  const changes: Array<{ from: number, to: number, insert: string }> = []

  for (let lineNumber = fromLine.number; lineNumber <= toLine.number; lineNumber += 1) {
    const line = view.state.doc.line(lineNumber)
    const taskMatch = line.text.match(/^(\s*[-*+]\s+\[)([ xX])(\]\s*)/)

    if (!taskMatch) {
      continue
    }

    const checkboxPosition = line.from + taskMatch[1].length
    changes.push({
      from: checkboxPosition,
      to: checkboxPosition + 1,
      insert: taskMatch[2].trim().length === 0 ? 'x' : ' ',
    })
  }

  if (changes.length === 0) {
    return false
  }

  view.dispatch({ changes, scrollIntoView: true })
  view.focus()

  return true
}

function normalizePastedPlainText(text: string) {
  return text
    .replace(/^\uFEFF/, '')
    .replace(zeroWidthPasteCharactersPattern, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2028\u2029]/g, '\n')
    .replace(/\r\n?/g, '\n')
}

function getSinglePastedUrl(text: string) {
  const trimmedText = text.trim()

  if (trimmedText.length === 0 || /\s/.test(trimmedText)) {
    return null
  }

  try {
    const parsedUrl = new URL(trimmedText)
    return supportedPasteUrlProtocols.has(parsedUrl.protocol) ? trimmedText : null
  } catch {
    return null
  }
}

function escapeMarkdownLinkText(text: string) {
  return text.replace(/([\\\]])/g, '\\$1').replace(/\s+/g, ' ').trim()
}

function formatMarkdownLinkDestination(url: string) {
  return `<${url.replace(/</g, '%3C').replace(/>/g, '%3E')}>`
}

function createMarkdownLinkFromPaste(label: string, url: string) {
  return `[${escapeMarkdownLinkText(label) || url}](${formatMarkdownLinkDestination(url)})`
}

function insertPastedText(view: EditorView, text: string) {
  const selection = view.state.selection.main

  view.dispatch({
    changes: { from: selection.from, to: selection.to, insert: text },
    selection: { anchor: selection.from + text.length },
    scrollIntoView: true,
  })
  view.focus()
}

function handleMarkdownPaste(event: ClipboardEvent, view: EditorView) {
  const clipboardText = event.clipboardData?.getData('text/plain') ?? ''

  if (clipboardText.length === 0) {
    return false
  }

  const selection = view.state.selection.main
  const normalizedText = normalizePastedPlainText(clipboardText)
  const pastedUrl = getSinglePastedUrl(normalizedText)

  if (pastedUrl && !selection.empty) {
    const selectedText = view.state.sliceDoc(selection.from, selection.to)
    event.preventDefault()
    insertPastedText(view, createMarkdownLinkFromPaste(selectedText, pastedUrl))
    return true
  }

  if (normalizedText !== clipboardText) {
    event.preventDefault()
    insertPastedText(view, normalizedText)
    return true
  }

  return false
}

function formatBlockLine(
  line: string,
  index: number,
  format: Exclude<BlockFormat, 'code-block' | 'table' | 'horizontal-rule'>,
  placeholders: MarkdownPlaceholderCatalog,
) {
  const trimmedLine = line.trimStart()
  const indent = line.slice(0, line.length - trimmedLine.length)

  if (format === 'heading-2') {
    const body = trimmedLine.replace(/^#{1,6}\s*/, '')
    return `${indent}## ${body || placeholders.heading}`
  }

  if (format === 'bullet-list') {
    const body = stripListMarker(trimmedLine)
    return `${indent}- ${body || placeholders.listItem}`
  }

  if (format === 'ordered-list') {
    const body = stripListMarker(trimmedLine)
    return `${indent}${index + 1}. ${body || placeholders.listItem}`
  }

  if (format === 'task-list') {
    const body = stripListMarker(trimmedLine)
    return `${indent}- [ ] ${body || placeholders.taskItem}`
  }

  const body = trimmedLine.replace(/^>\s?/, '')
  return `${indent}> ${body || placeholders.quote}`
}

function applyBlockFormat(view: EditorView, format: BlockFormat, placeholders: MarkdownPlaceholderCatalog) {
  if (format === 'code-block') {
    return applyCodeBlockFormat(view)
  }

  if (format === 'table') {
    return applyTableFormat(view, placeholders)
  }

  if (format === 'horizontal-rule') {
    return applyHorizontalRuleFormat(view)
  }

  const selection = view.state.selection.main
  const lineEndPosition = selection.empty ? selection.to : Math.max(selection.from, selection.to - 1)
  const fromLine = view.state.doc.lineAt(selection.from)
  const toLine = view.state.doc.lineAt(lineEndPosition)
  const selectedLines = view.state.sliceDoc(fromLine.from, toLine.to).split('\n')
  const insertText = selectedLines
    .map((line, index) => formatBlockLine(line, index, format, placeholders))
    .join('\n')
  const anchor = fromLine.from
  const head = selection.empty ? fromLine.from + insertText.length : anchor + insertText.length

  view.dispatch({
    changes: { from: fromLine.from, to: toLine.to, insert: insertText },
    selection: { anchor, head },
    scrollIntoView: true,
  })
  view.focus()

  return true
}

function applyMarkdownFormat(view: EditorView, format: MarkdownFormat, placeholders: MarkdownPlaceholderCatalog) {
  return isInlineFormat(format)
    ? applyInlineFormat(view, format)
    : applyBlockFormat(view, format, placeholders)
}

function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const editorWorkbenchRef = useRef<HTMLElement | null>(null)
  const previewScrollRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<ReactCodeMirrorRef | null>(null)
  const editorViewRef = useRef<EditorView | null>(null)
  const editorScrollCleanupRef = useRef<(() => void) | null>(null)
  const editorSessionSaveTimerRef = useRef<number | null>(null)
  const editorSessionDocumentRef = useRef<EditorSessionDocument>({ filePath: null, fileName: 'untitled.md' })
  const scheduleEditorSessionPersistRef = useRef<() => void>(() => undefined)
  const flushEditorSessionPersistRef = useRef<() => void>(() => undefined)
  const pendingOutlineJumpRef = useRef<OutlineItem | null>(null)
  const pendingLineJumpRef = useRef<LineJumpTarget | null>(null)
  const scrollSyncSourceRef = useRef<'editor' | 'preview' | null>(null)
  const scrollSyncTimerRef = useRef<number | null>(null)
  const syncPreviewScrollFromEditorRef = useRef<() => void>(() => undefined)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const commandInputRef = useRef<HTMLInputElement | null>(null)
  const quickOpenInputRef = useRef<HTMLInputElement | null>(null)
  const lineNumberInputRef = useRef<HTMLInputElement | null>(null)
  const exportPreviewFrameRef = useRef<HTMLIFrameElement | null>(null)
  const previewImageSourcesRef = useRef<PreviewImageSource[]>([])
  const initialMarkdownValue = useMemo(() => loadStoredValue(draftStorageKey, ''), [])
  const initialEditorSessionState = useMemo(loadEditorSessionState, [])
  const pendingEditorSessionRef = useRef<EditorSessionState | null>(initialEditorSessionState)
  const [markdownValue, setMarkdownValue] = useState(initialMarkdownValue)
  const [fileName, setFileName] = useState(() =>
    loadStoredValue(fileNameStorageKey, 'untitled.md'),
  )
  const [activeFilePath, setActiveFilePath] = useState<string | null>(loadStoredFilePath)
  editorSessionDocumentRef.current = { filePath: activeFilePath, fileName }
  const [savedSnapshot, setSavedSnapshot] = useState(initialMarkdownValue)
  const [recentFiles, setRecentFiles] = useState(loadRecentFiles)
  const [workspaceFolder, setWorkspaceFolder] = useState<WorkspaceFolderState | null>(loadWorkspaceFolder)
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const [documentOperationStatus, setDocumentOperationStatus] = useState<DocumentOperationStatus | null>(null)
  const [isWelcomeVisible, setIsWelcomeVisible] = useState(initialMarkdownValue.trim().length === 0)
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>(loadSidebarTab)
  const [splitPaneRatio, setSplitPaneRatio] = useState(loadSplitPaneRatio)
  const [mode, setMode] = useState<ViewMode>(loadViewMode)
  const [themePreference, setThemePreference] = useState<ThemePreference>(loadThemePreference)
  const [systemTheme, setSystemTheme] = useState<ThemeMode>(getSystemTheme)
  const [localePreference, setLocalePreference] = useState<LocalePreference>(loadLocalePreference)
  const [systemLocale, setSystemLocale] = useState<AppLocale>(getSystemLocale)
  const [editorFontSize, setEditorFontSize] = useState(loadEditorFontSize)
  const [exportStyle, setExportStyle] = useState<ExportStyle>(loadExportStyle)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [activeOutlineLine, setActiveOutlineLine] = useState<number | null>(null)
  const [editorPosition, setEditorPosition] = useState<EditorPositionState>(defaultEditorPosition)
  const [isSearchVisible, setIsSearchVisible] = useState(false)
  const [isReplaceVisible, setIsReplaceVisible] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [outlineQuery, setOutlineQuery] = useState('')
  const [recentFileQuery, setRecentFileQuery] = useState('')
  const [workspaceFileQuery, setWorkspaceFileQuery] = useState('')
  const [workspaceSortMode, setWorkspaceSortMode] = useState<WorkspaceSortMode>(loadWorkspaceSortMode)
  const [replaceTerm, setReplaceTerm] = useState('')
  const [isSearchCaseSensitive, setIsSearchCaseSensitive] = useState(false)
  const [isSearchWholeWord, setIsSearchWholeWord] = useState(false)
  const [activeSearchRange, setActiveSearchRange] = useState<SearchMatch | null>(null)
  const [tableEditingState, setTableEditingState] = useState<TableEditingState>(defaultTableEditingState)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const [activeCommandIndex, setActiveCommandIndex] = useState(0)
  const [isGoToLineOpen, setIsGoToLineOpen] = useState(false)
  const [lineNumberInput, setLineNumberInput] = useState('')
  const [lineNumberError, setLineNumberError] = useState('')
  const [isQuickOpenOpen, setIsQuickOpenOpen] = useState(false)
  const [quickOpenQuery, setQuickOpenQuery] = useState('')
  const [activeQuickOpenIndex, setActiveQuickOpenIndex] = useState(0)
  const [previewImageSources, setPreviewImageSources] = useState<PreviewImageSource[]>([])
  const [isExportPreviewOpen, setIsExportPreviewOpen] = useState(false)
  const [isThemeSettingsOpen, setIsThemeSettingsOpen] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<OpenMarkUpdateStatus>(defaultUpdateStatus)
  const [clipboardCopyKind, setClipboardCopyKind] = useState<ClipboardCopyKind | null>(null)
  const theme = themePreference === 'system' ? systemTheme : themePreference
  const locale = localePreference === 'system' ? systemLocale : localePreference
  const t = translations[locale]
  const nextLocale: AppLocale = locale === 'zh-CN' ? 'en' : 'zh-CN'
  const nextLocaleLabel = nextLocale === 'zh-CN' ? '中' : 'EN'

  const editorExtensions = useMemo(
    () => [
      markdown({ base: markdownLanguage }),
      search({ top: true }),
      EditorView.domEventHandlers({ paste: handleMarkdownPaste }),
      keymap.of([
        { key: 'Enter', run: continueMarkdownList },
        { key: 'Mod-b', run: (view) => applyInlineFormat(view, 'bold') },
        { key: 'Mod-i', run: (view) => applyInlineFormat(view, 'italic') },
        { key: 'Mod-k', run: (view) => applyInlineFormat(view, 'link') },
        { key: 'Mod-Shift-x', run: toggleTaskCheckbox },
      ]),
    ],
    [],
  )

  const rawRenderedHtml = useMemo(
    () => markdownRenderer.render(markdownValue),
    [markdownValue],
  )
  const exportHtml = useMemo(
    () => sanitizeMarkdownHtml(rewritePreviewImageSources(rawRenderedHtml, activeFilePath, previewImageSources)),
    [activeFilePath, previewImageSources, rawRenderedHtml],
  )
  const exportMetadata = useMemo(
    () => getExportDocumentMetadata(exportHtml, fileName),
    [exportHtml, fileName],
  )
  const outline = useMemo(() => getOutline(markdownValue), [markdownValue])
  const headingAnchorIds = useMemo(() => getHeadingAnchorIds(outline), [outline])
  const documentDiagnostics = useMemo(
    () => getDocumentDiagnostics(markdownValue, headingAnchorIds, activeFilePath, previewImageSources),
    [activeFilePath, headingAnchorIds, markdownValue, previewImageSources],
  )
  const renderedHtml = useMemo(
    () => addPreviewHeadingNavigation(
      exportHtml,
      outline,
      headingAnchorIds,
    ),
    [exportHtml, headingAnchorIds, outline],
  )

  const searchMatches = useMemo(
    () => getSearchMatches(markdownValue, searchTerm, {
      caseSensitive: isSearchCaseSensitive,
      wholeWord: isSearchWholeWord,
    }),
    [isSearchCaseSensitive, isSearchWholeWord, markdownValue, searchTerm],
  )
  const searchResults = useMemo(
    () => getSearchResults(markdownValue, searchMatches),
    [markdownValue, searchMatches],
  )
  const stats = useMemo(
    () => getDocumentStats(markdownValue, outline),
    [markdownValue, outline],
  )
  const fileDateFormatter = useMemo(() => new Intl.DateTimeFormat(locale), [locale])
  const workspaceFileCollator = useMemo(
    () => new Intl.Collator(locale, { numeric: true, sensitivity: 'base' }),
    [locale],
  )
  const normalizedRecentFileQuery = recentFileQuery.trim().toLowerCase()
  const filteredRecentFiles = normalizedRecentFileQuery.length === 0
    ? recentFiles
    : recentFiles.filter((item) => (
      item.fileName.toLowerCase().includes(normalizedRecentFileQuery) ||
      item.filePath.toLowerCase().includes(normalizedRecentFileQuery)
    ))
  const normalizedOutlineQuery = outlineQuery.trim().toLowerCase()
  const filteredOutline = normalizedOutlineQuery.length === 0
    ? outline
    : outline.filter((item) => (
      item.title.toLowerCase().includes(normalizedOutlineQuery) ||
      String(item.lineNumber).includes(normalizedOutlineQuery)
    ))
  const visibleOutlineItems = filteredOutline.slice(0, outlineResultLimit)
  const hiddenOutlineCount = Math.max(filteredOutline.length - visibleOutlineItems.length, 0)
  const normalizedQuickOpenQuery = quickOpenQuery.trim().toLowerCase()
  const availableWorkspaceFiles = workspaceFolder?.files.filter((item) => !item.missing) ?? []
  const quickOpenItems = (() => {
    const items: QuickOpenItem[] = []
    const seenFilePaths = new Set<string>()
    const recentFilesByPath = new Map(recentFiles
      .filter((item) => !item.missing)
      .map((item) => [item.filePath, item]))

    for (const item of availableWorkspaceFiles) {
      const recentFile = recentFilesByPath.get(item.filePath)

      items.push({
        id: `workspace:${item.filePath}`,
        filePath: item.filePath,
        title: item.relativePath,
        detail: workspaceFolder?.folderName ?? t.sidebar.workspace,
        timestamp: recentFile?.openedAt ?? item.modifiedAt,
        source: 'workspace',
        group: recentFile ? 'recent' : 'workspace',
      })
      seenFilePaths.add(item.filePath)
    }

    for (const item of recentFiles) {
      if (item.missing || seenFilePaths.has(item.filePath)) {
        continue
      }

      items.push({
        id: `recent:${item.filePath}`,
        filePath: item.filePath,
        title: item.fileName,
        detail: item.filePath,
        timestamp: item.openedAt,
        source: 'recent',
        group: 'recent',
      })
    }

    return items
  })()
  const rankedQuickOpenItems = quickOpenItems
    .filter((item) => (
      normalizedQuickOpenQuery.length === 0 ||
      Number.isFinite(getQuickOpenSearchScore(item, normalizedQuickOpenQuery))
    ))
    .sort((left, right) => compareQuickOpenItems(left, right, normalizedQuickOpenQuery, workspaceFileCollator))
  const visibleQuickOpenItems = rankedQuickOpenItems.slice(0, quickOpenResultLimit)
  const visibleQuickOpenEntries = getQuickOpenListEntries(visibleQuickOpenItems)
  const safeActiveQuickOpenIndex = Math.min(activeQuickOpenIndex, Math.max(visibleQuickOpenItems.length - 1, 0))
  const lineJumpMaxLine = Math.max(stats.lines, 1)
  const activeSearchMatchIndex = activeSearchRange
    ? searchMatches.findIndex((match) => match.from === activeSearchRange.from && match.to === activeSearchRange.to)
    : -1
  const searchResultWindowStart = searchResults.length <= searchResultWindowSize || activeSearchMatchIndex < 0
    ? 0
    : Math.min(
      Math.max(activeSearchMatchIndex - Math.floor(searchResultWindowSize / 2), 0),
      searchResults.length - searchResultWindowSize,
    )
  const visibleSearchResults = searchResults.slice(searchResultWindowStart, searchResultWindowStart + searchResultWindowSize)
  const hiddenSearchResultsBefore = searchResultWindowStart
  const hiddenSearchResultsAfter = Math.max(searchResults.length - searchResultWindowStart - visibleSearchResults.length, 0)
  const searchStatusLabel = searchTerm.length === 0
    ? t.search.noQuery
    : `${activeSearchMatchIndex >= 0 ? activeSearchMatchIndex + 1 : 0} ${t.search.of} ${searchMatches.length}`
  const hasUnsavedChanges = markdownValue !== savedSnapshot
  const showWelcome = isWelcomeVisible && markdownValue.trim().length === 0 && activeFilePath === null
  const appTitle = showWelcome
    ? 'OpenMark'
    : `${hasUnsavedChanges ? '* ' : ''}${withMarkdownExtension(fileName)} - OpenMark`
  const normalizedWorkspaceFileQuery = workspaceFileQuery.trim().toLowerCase()
  const filteredWorkspaceFiles = [...(workspaceFolder?.files ?? [])]
    .filter((item) => (
      normalizedWorkspaceFileQuery.length === 0 || matchesWorkspaceFileQuery(item, normalizedWorkspaceFileQuery)
    ))
    .sort((left, right) => compareWorkspaceFiles(left, right, workspaceSortMode, workspaceFileCollator))
  const workspaceMissingFileCount = workspaceFolder?.files.filter((item) => item.missing).length ?? 0
  const workspaceAvailableFileCount = Math.max((workspaceFolder?.files.length ?? 0) - workspaceMissingFileCount, 0)
  const activeWorkspaceFile = activeFilePath && workspaceFolder
    ? workspaceFolder.files.find((item) => item.filePath === activeFilePath)
    : undefined
  const sidebarTabs: Array<{ value: SidebarTab; label: string; detail: string }> = [
    { value: 'document', label: t.sidebar.document, detail: hasUnsavedChanges ? t.document.unsaved : t.document.saved },
    { value: 'workspace', label: t.sidebar.workspace, detail: workspaceFolder ? String(workspaceFolder.files.length) : '-' },
    { value: 'outline', label: t.sidebar.outline, detail: String(outline.length) },
    { value: 'recent', label: t.sidebar.recent, detail: String(recentFiles.length) },
  ]
  const commandPaletteItems: CommandPaletteItem[] = [
    {
      id: 'new-document',
      label: t.commands.newDocument,
      group: t.groups.file,
      shortcut: 'Ctrl+N',
      Icon: FilePlus2,
      keywords: ['create', 'blank', 'file'],
      action: handleNewDocument,
    },
    {
      id: 'open-document',
      label: t.commands.openMarkdownFile,
      group: t.groups.file,
      shortcut: 'Ctrl+O',
      Icon: FolderOpen,
      keywords: ['load', 'file'],
      action: () => { void handleOpenDocument() },
    },
    {
      id: 'save-document',
      label: t.commands.saveDocument,
      group: t.groups.file,
      shortcut: 'Ctrl+S',
      Icon: Save,
      keywords: ['write', 'file'],
      action: () => { void handleSaveMarkdown() },
    },
    {
      id: 'save-document-as',
      label: t.commands.saveDocumentAs,
      group: t.groups.file,
      shortcut: 'Ctrl+Shift+S',
      Icon: Save,
      keywords: ['rename', 'copy'],
      action: () => { void handleSaveMarkdown({ forceDialog: true }) },
    },
    {
      id: 'preview-export',
      label: t.commands.previewExport,
      group: t.groups.file,
      Icon: Eye,
      keywords: ['print', 'publish', 'html', 'pdf'],
      action: openExportPreview,
    },
    {
      id: 'export-html',
      label: t.commands.exportHtml,
      group: t.groups.file,
      shortcut: 'Ctrl+E',
      Icon: Download,
      keywords: ['publish', 'html'],
      action: () => { void handleExportHtml() },
    },
    {
      id: 'export-pdf',
      label: t.commands.exportPdf,
      group: t.groups.file,
      shortcut: 'Ctrl+Shift+E',
      Icon: FileDown,
      keywords: ['print', 'publish'],
      action: () => { void handleExportPdf() },
    },
    {
      id: 'copy-markdown',
      label: t.commands.copyMarkdown,
      group: t.groups.file,
      Icon: Copy,
      keywords: ['clipboard', 'share', 'source'],
      action: () => { void handleCopyMarkdown() },
    },
    {
      id: 'copy-html',
      label: t.commands.copyHtml,
      group: t.groups.file,
      Icon: Copy,
      keywords: ['clipboard', 'share', 'export', 'html'],
      action: () => { void handleCopyHtml() },
    },
    {
      id: 'find-document',
      label: t.commands.findInDocument,
      group: t.groups.edit,
      shortcut: 'Ctrl+F',
      Icon: SearchIcon,
      keywords: ['search'],
      action: () => openSearchBar('find'),
    },
    {
      id: 'replace-document',
      label: t.commands.replaceInDocument,
      group: t.groups.edit,
      shortcut: 'Ctrl+H',
      Icon: Replace,
      keywords: ['search'],
      action: () => openSearchBar('replace'),
    },
    {
      id: 'go-to-line',
      label: t.commands.goToLine,
      group: t.groups.edit,
      shortcut: 'Ctrl+G',
      Icon: ListOrdered,
      keywords: ['line', 'jump', 'navigate'],
      action: openGoToLineDialog,
    },
    {
      id: 'insert-image',
      label: t.commands.insertImage,
      group: t.groups.edit,
      Icon: ImagePlus,
      keywords: ['markdown', 'photo', 'picture', 'local'],
      action: () => { void handleInsertImage() },
    },
    {
      id: 'insert-table',
      label: t.commands.insertTable,
      group: t.groups.edit,
      Icon: Table,
      keywords: ['markdown', 'columns', 'rows'],
      action: () => handleMarkdownFormat('table'),
    },
    {
      id: 'insert-task-list',
      label: t.commands.insertTaskList,
      group: t.groups.edit,
      Icon: List,
      keywords: ['markdown', 'checkbox', 'todo', 'checklist'],
      action: () => handleMarkdownFormat('task-list'),
    },
    {
      id: 'toggle-task-checkbox',
      label: t.commands.toggleTaskCheckbox,
      group: t.groups.edit,
      shortcut: 'Ctrl+Shift+X',
      Icon: List,
      keywords: ['markdown', 'checkbox', 'todo', 'done', 'checklist'],
      action: handleToggleTaskCheckbox,
    },
    {
      id: 'insert-horizontal-rule',
      label: t.commands.insertHorizontalRule,
      group: t.groups.edit,
      Icon: Minus,
      keywords: ['markdown', 'divider', 'separator', 'rule'],
      action: () => handleMarkdownFormat('horizontal-rule'),
    },
    {
      id: 'format-table',
      label: t.table.formatTable,
      group: t.groups.edit,
      Icon: Table2,
      keywords: ['markdown', 'table', 'align'],
      action: () => handleTableEditAction('format'),
    },
    {
      id: 'add-table-row',
      label: t.table.addRowBelow,
      group: t.groups.edit,
      Icon: PanelBottom,
      keywords: ['markdown', 'table', 'row'],
      action: () => handleTableEditAction('insert-row-below'),
    },
    {
      id: 'delete-table-row',
      label: t.table.deleteRow,
      group: t.groups.edit,
      Icon: PanelBottomClose,
      keywords: ['markdown', 'table', 'row'],
      action: () => handleTableEditAction('delete-row'),
    },
    {
      id: 'add-table-column',
      label: t.table.addColumnRight,
      group: t.groups.edit,
      Icon: PanelRight,
      keywords: ['markdown', 'table', 'column'],
      action: () => handleTableEditAction('insert-column-right'),
    },
    {
      id: 'delete-table-column',
      label: t.table.deleteColumn,
      group: t.groups.edit,
      Icon: PanelRightClose,
      keywords: ['markdown', 'table', 'column'],
      action: () => handleTableEditAction('delete-column'),
    },
    {
      id: 'write-mode',
      label: t.commands.switchToWriteMode,
      group: t.groups.view,
      shortcut: 'Ctrl+1',
      Icon: Type,
      keywords: ['editor', 'source'],
      action: () => setMode('write'),
    },
    {
      id: 'split-mode',
      label: t.commands.switchToSplitMode,
      group: t.groups.view,
      shortcut: 'Ctrl+2',
      Icon: Columns2,
      keywords: ['preview', 'editor'],
      action: () => setMode('split'),
    },
    {
      id: 'preview-mode',
      label: t.commands.switchToPreviewMode,
      group: t.groups.view,
      shortcut: 'Ctrl+3',
      Icon: Eye,
      keywords: ['rendered'],
      action: () => setMode('preview'),
    },
    {
      id: 'document-panel',
      label: t.commands.showDocumentPanel,
      group: t.groups.workspace,
      Icon: FileText,
      keywords: ['sidebar', 'stats'],
      action: () => setActiveSidebarTab('document'),
    },
    {
      id: 'outline-panel',
      label: t.commands.showOutlinePanel,
      group: t.groups.workspace,
      Icon: List,
      keywords: ['headings', 'sidebar'],
      action: () => setActiveSidebarTab('outline'),
    },
    {
      id: 'workspace-panel',
      label: t.commands.showWorkspacePanel,
      group: t.groups.workspace,
      Icon: FolderOpen,
      keywords: ['folder', 'files', 'sidebar'],
      action: () => setActiveSidebarTab('workspace'),
    },
    {
      id: 'open-workspace-folder',
      label: t.commands.openWorkspaceFolder,
      group: t.groups.workspace,
      Icon: FolderOpen,
      keywords: ['folder', 'project', 'library'],
      action: () => { void handleSelectWorkspaceFolder() },
    },
    {
      id: 'quick-open-file',
      label: t.commands.quickOpenFile,
      group: t.groups.workspace,
      shortcut: 'Ctrl+P',
      Icon: SearchIcon,
      keywords: ['quick', 'open', 'file', 'markdown', 'recent', 'workspace'],
      action: openQuickOpen,
    },
    {
      id: 'recent-panel',
      label: t.commands.showRecentFilesPanel,
      group: t.groups.workspace,
      Icon: FolderOpen,
      keywords: ['history', 'sidebar'],
      action: () => setActiveSidebarTab('recent'),
    },
    {
      id: 'toggle-theme',
      label: t.commands.toggleTheme,
      group: t.groups.view,
      shortcut: 'Ctrl+Shift+L',
      Icon: theme === 'dark' ? Sun : Moon,
      keywords: ['dark', 'light'],
      action: toggleTheme,
    },
    {
      id: 'switch-language',
      label: t.commands.switchLanguage,
      group: t.groups.view,
      Icon: Languages,
      keywords: ['language', 'locale', 'english', 'chinese', '中文', '语言'],
      action: toggleLocale,
    },
    {
      id: 'switch-language-english',
      label: t.commands.switchToEnglish,
      group: t.groups.view,
      Icon: Languages,
      keywords: ['language', 'locale', 'english', 'en'],
      action: () => setLocalePreference('en'),
    },
    {
      id: 'switch-language-chinese',
      label: t.commands.switchToSimplifiedChinese,
      group: t.groups.view,
      Icon: Languages,
      keywords: ['language', 'locale', 'chinese', 'zh', '中文', '简体中文'],
      action: () => setLocalePreference('zh-CN'),
    },
    {
      id: 'theme-settings',
      label: t.commands.openSettings,
      group: t.groups.view,
      Icon: Settings2,
      keywords: ['theme', 'appearance', 'font', 'language', 'settings', 'system'],
      action: openThemeSettings,
    },
    {
      id: 'check-for-updates',
      label: t.commands.checkForUpdates,
      group: t.groups.help,
      Icon: RefreshCw,
      keywords: ['release', 'version', 'download'],
      action: () => { void handleCheckForUpdates() },
    },
  ]
  const normalizedCommandQuery = commandQuery.trim().toLowerCase()
  const filteredCommandPaletteItems = normalizedCommandQuery.length === 0
    ? commandPaletteItems
    : commandPaletteItems
      .map((item, index) => ({
        item,
        index,
        score: getCommandPaletteSearchScore(item, normalizedCommandQuery),
      }))
      .filter(({ score }) => Number.isFinite(score))
      .sort((left, right) => left.score - right.score || left.index - right.index)
      .map(({ item }) => item)
  const safeActiveCommandIndex = Math.min(activeCommandIndex, Math.max(filteredCommandPaletteItems.length - 1, 0))

  const lastSavedLabel = useMemo(() => {
    if (!lastSavedAt) {
      return t.status.waitingForDraftSave
    }

    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(lastSavedAt)
  }, [lastSavedAt, locale, t.status.waitingForDraftSave])
  const draftStatusLabel = lastSavedAt
    ? `${t.status.draftSaved} ${lastSavedLabel}`
    : lastSavedLabel
  const clipboardStatusLabel = clipboardCopyKind === null
    ? null
    : clipboardCopyKind === 'markdown'
      ? t.status.copiedMarkdown
      : t.status.copiedHtml
  const footerStatusLabel = documentOperationStatus?.message ?? clipboardStatusLabel ?? draftStatusLabel
  const footerPositionLabel = `${formatTranslation(t.status.editorPosition, {
    line: String(editorPosition.line),
    column: String(editorPosition.column),
  })} · ${formatTranslation(t.status.documentProgress, { progress: String(editorPosition.progress) })}`
  scheduleEditorSessionPersistRef.current = scheduleEditorSessionPersist
  flushEditorSessionPersistRef.current = flushEditorSessionPersist

  useEffect(() => {
    const saveTimer = window.setTimeout(() => {
      window.localStorage.setItem(draftStorageKey, markdownValue)
      window.localStorage.setItem(fileNameStorageKey, fileName)
      setLastSavedAt(new Date())
    }, 250)

    return () => window.clearTimeout(saveTimer)
  }, [fileName, markdownValue])

  useEffect(() => {
    persistRecentFiles(recentFiles)
  }, [recentFiles])

  useEffect(() => {
    persistWorkspaceFolder(workspaceFolder)
  }, [workspaceFolder])

  useEffect(() => {
    persistActiveFilePath(activeFilePath)
  }, [activeFilePath])

  useEffect(() => {
    const editorView = editorViewRef.current ?? editorRef.current?.view

    if (editorView) {
      scheduleEditorSessionPersistRef.current()
    }
  }, [activeFilePath, fileName])

  useEffect(() => {
    if (clipboardCopyKind === null) {
      return undefined
    }

    const clearTimer = window.setTimeout(() => setClipboardCopyKind(null), 2400)

    return () => window.clearTimeout(clearTimer)
  }, [clipboardCopyKind])

  useEffect(() => {
    if (documentOperationStatus === null) {
      return undefined
    }

    const clearTimer = window.setTimeout(
      () => setDocumentOperationStatus(null),
      documentOperationStatus.tone === 'success' ? 4200 : 9000,
    )

    return () => window.clearTimeout(clearTimer)
  }, [documentOperationStatus])

  useEffect(() => {
    window.localStorage.setItem(themeStorageKey, themePreference)
  }, [themePreference])

  useEffect(() => {
    window.localStorage.setItem(localeStorageKey, localePreference)
  }, [localePreference])

  useEffect(() => {
    void window.openmark?.setApplicationLocale(locale)
  }, [locale])

  useEffect(() => {
    window.localStorage.setItem(editorFontSizeStorageKey, editorFontSize.toFixed(0))
  }, [editorFontSize])

  useEffect(() => {
    window.localStorage.setItem(exportStyleStorageKey, exportStyle)
  }, [exportStyle])

  useEffect(() => {
    window.localStorage.setItem(workspaceSortStorageKey, workspaceSortMode)
  }, [workspaceSortMode])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.lang = locale
    document.documentElement.style.setProperty('--editor-font-size', `${editorFontSize}px`)
  }, [editorFontSize, locale, theme])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => setSystemTheme(mediaQuery.matches ? 'dark' : 'light')

    handleSystemThemeChange()
    mediaQuery.addEventListener('change', handleSystemThemeChange)

    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
  }, [])

  useEffect(() => {
    const handleLanguageChange = () => setSystemLocale(getSystemLocale())

    window.addEventListener('languagechange', handleLanguageChange)

    return () => window.removeEventListener('languagechange', handleLanguageChange)
  }, [])

  useEffect(() => {
    document.title = appTitle
  }, [appTitle])

  useEffect(() => {
    window.localStorage.setItem(splitPaneRatioStorageKey, splitPaneRatio.toFixed(2))
  }, [splitPaneRatio])

  useEffect(() => {
    window.localStorage.setItem(viewModeStorageKey, mode)
  }, [mode])

  useEffect(() => {
    window.localStorage.setItem(sidebarTabStorageKey, activeSidebarTab)
  }, [activeSidebarTab])

  useEffect(() => {
    previewImageSourcesRef.current = previewImageSources
  }, [previewImageSources])

  useEffect(() => () => {
    previewImageSourcesRef.current.forEach((source) => {
      if (source.objectUrl) {
        URL.revokeObjectURL(source.objectUrl)
      }
    })
  }, [])

  useEffect(() => () => {
    if (scrollSyncTimerRef.current !== null) {
      window.clearTimeout(scrollSyncTimerRef.current)
    }
  }, [])

  useEffect(() => () => {
    flushEditorSessionPersistRef.current()
  }, [])

  useEffect(() => {
    syncPreviewScrollFromEditorRef.current = syncPreviewScrollFromEditor
  })

  useEffect(() => () => {
    editorScrollCleanupRef.current?.()
  }, [])

  useEffect(() => {
    if (!showWelcome && mode !== 'preview') {
      return
    }

    editorScrollCleanupRef.current?.()
    editorScrollCleanupRef.current = null
    editorViewRef.current = null
    setNextTableEditingState(defaultTableEditingState)
  }, [mode, showWelcome])

  useEffect(() => {
    editorWorkbenchRef.current?.style.setProperty('--editor-pane-size', `${splitPaneRatio}%`)
  }, [splitPaneRatio])

  useEffect(() => {
    const editorView = editorViewRef.current ?? editorRef.current?.view

    if (!editorView) {
      return
    }

    editorView.dispatch({
      effects: setSearchQuery.of(new SearchQuery({
        search: searchTerm,
        replace: replaceTerm,
        caseSensitive: isSearchCaseSensitive,
        wholeWord: isSearchWholeWord,
        literal: true,
      })),
    })
  }, [isSearchCaseSensitive, isSearchWholeWord, replaceTerm, searchTerm])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const usesCommandKey = event.ctrlKey || event.metaKey

      if (!usesCommandKey || event.altKey) {
        return
      }

      if (event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        openCommandPalette()
        return
      }

      if (!event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        openQuickOpen()
        return
      }

      if (event.key === ',') {
        event.preventDefault()
        openThemeSettings()
      }

      if (event.key.toLowerCase() === 'f') {
        event.preventDefault()
        openSearchBar('find')
      }

      if (event.key.toLowerCase() === 'h') {
        event.preventDefault()
        openSearchBar('replace')
      }

      if (event.key.toLowerCase() === 'g') {
        event.preventDefault()
        openGoToLineDialog()
      }
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true })

    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  })

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      flushEditorSessionPersistRef.current()

      if (!hasUnsavedChanges) {
        return
      }

      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  useEffect(() => {
    const pendingOutlineJump = pendingOutlineJumpRef.current
    const pendingLineJump = pendingLineJumpRef.current

    if ((!pendingOutlineJump && !pendingLineJump) || mode === 'preview') {
      return
    }

    window.requestAnimationFrame(() => {
      if (pendingOutlineJump) {
        jumpToEditorLine(pendingOutlineJump)
        pendingOutlineJumpRef.current = null
      }

      if (pendingLineJump) {
        jumpToEditorLine(pendingLineJump)
        pendingLineJumpRef.current = null
      }
    })
  }, [mode])

  useEffect(() => {
    if (!window.openmark) {
      return undefined
    }

    return window.openmark.onCommand((command) => {
      switch (command) {
        case 'new-document':
          handleNewDocument()
          break
        case 'open-document':
          void handleOpenDocument()
          break
        case 'open-workspace-folder':
          void handleSelectWorkspaceFolder()
          break
        case 'save-document':
          void handleSaveMarkdown()
          break
        case 'save-document-as':
          void handleSaveMarkdown({ forceDialog: true })
          break
        case 'preview-export':
          openExportPreview()
          break
        case 'export-html':
          void handleExportHtml()
          break
        case 'export-pdf':
          void handleExportPdf()
          break
        case 'copy-markdown':
          void handleCopyMarkdown()
          break
        case 'copy-html':
          void handleCopyHtml()
          break
        case 'set-write-mode':
          setMode('write')
          break
        case 'set-split-mode':
          setMode('split')
          break
        case 'set-preview-mode':
          setMode('preview')
          break
        case 'toggle-theme':
          toggleTheme()
          break
        case 'toggle-language':
          toggleLocale()
          break
        case 'set-language-en':
          setLocalePreference('en')
          break
        case 'set-language-zh-cn':
          setLocalePreference('zh-CN')
          break
        case 'open-theme-settings':
          openThemeSettings()
          break
        case 'find-document':
          openSearchBar('find')
          break
        case 'replace-document':
          openSearchBar('replace')
          break
        case 'go-to-line':
          openGoToLineDialog()
          break
        case 'open-command-palette':
          openCommandPalette()
          break
        case 'insert-image':
          void handleInsertImage()
          break
        case 'check-for-updates':
          openThemeSettings()
          void handleCheckForUpdates()
          break
      }
    })
  })

  useEffect(() => {
    if (!window.openmark) {
      return undefined
    }

    let isMounted = true

    window.openmark.getUpdateStatus().then((status) => {
      if (isMounted) {
        setUpdateStatus(status)
      }
    }).catch(() => undefined)

    const removeUpdateStatusListener = window.openmark.onUpdateStatus((status) => {
      setUpdateStatus(status)
    })

    return () => {
      isMounted = false
      removeUpdateStatusListener()
    }
  }, [])

  const updateMessage = t.updateStates[updateStatus.state]
  const updateProgressLabel = typeof updateStatus.progress === 'number'
    ? `${Math.round(updateStatus.progress)}%`
    : null

  function clearPreviewImageSources() {
    previewImageSourcesRef.current.forEach((source) => {
      if (source.objectUrl) {
        URL.revokeObjectURL(source.objectUrl)
      }
    })

    previewImageSourcesRef.current = []
    setPreviewImageSources([])
  }

  function rememberPreviewImageSource(source: PreviewImageSource) {
    setPreviewImageSources((currentSources) => {
      const replacedSources = currentSources.filter((currentSource) => currentSource.markdownPath === source.markdownPath)

      replacedSources.forEach((currentSource) => {
        if (currentSource.objectUrl) {
          URL.revokeObjectURL(currentSource.objectUrl)
        }
      })

      return [
        source,
        ...currentSources.filter((currentSource) => currentSource.markdownPath !== source.markdownPath),
      ].slice(0, 24)
    })
  }

  function rememberRecentFile(filePath: string | null | undefined, nextFileName: string | null | undefined) {
    if (!filePath || !nextFileName) {
      return
    }

    setRecentFiles((currentFiles) => {
      const existingFile = currentFiles.find((item) => item.filePath === filePath)

      return normalizeRecentFiles([
        { filePath, fileName: nextFileName, openedAt: Date.now(), pinned: existingFile?.pinned, missing: false },
        ...currentFiles.filter((item) => item.filePath !== filePath),
      ])
    })
  }

  function markRecentFileMissing(filePath: string) {
    setRecentFiles((currentFiles) => normalizeRecentFiles(
      currentFiles.map((item) => (
        item.filePath === filePath
          ? { ...item, missing: true }
          : item
      )),
    ))
  }

  function markWorkspaceFileMissing(filePath: string) {
    setWorkspaceFolder((currentFolder) => currentFolder
      ? {
          ...currentFolder,
          files: currentFolder.files.map((item) => (
            item.filePath === filePath
              ? { ...item, missing: true }
              : item
          )),
        }
      : currentFolder)
  }

  function clearWorkspaceFileMissing(filePath: string | null) {
    if (!filePath) {
      return
    }

    setWorkspaceFolder((currentFolder) => currentFolder
      ? {
          ...currentFolder,
          files: currentFolder.files.map((item) => (
            item.filePath === filePath
              ? { ...item, missing: false }
              : item
          )),
        }
      : currentFolder)
  }

  function markFileMissing(filePath: string) {
    markRecentFileMissing(filePath)
    markWorkspaceFileMissing(filePath)
  }

  function toggleRecentFilePinned(filePath: string) {
    setRecentFiles((currentFiles) => normalizeRecentFiles(
      currentFiles.map((item) => (
        item.filePath === filePath
          ? { ...item, pinned: !item.pinned }
          : item
      )),
    ))
  }

  function removeRecentFile(filePath: string) {
    setRecentFiles((currentFiles) => currentFiles.filter((item) => item.filePath !== filePath))
  }

  function clearRecentFiles() {
    setRecentFileQuery('')
    setRecentFiles([])
  }

  function confirmDiscardChanges(action: string) {
    if (!hasUnsavedChanges) {
      return true
    }

    return window.confirm(`${t.alerts.unsavedChanges} ${action}`)
  }

  function showDocumentOperationStatus(tone: DocumentOperationStatus['tone'], message: string) {
    setDocumentOperationStatus({ tone, message })
  }

  function showOpenedDocumentStatus(nextFileName: string) {
    showDocumentOperationStatus('success', formatTranslation(t.status.openedDocument, { fileName: nextFileName }))
  }

  function showSavedDocumentStatus(nextFileName: string) {
    showDocumentOperationStatus('success', formatTranslation(t.status.savedDocument, { fileName: nextFileName }))
  }

  function showDownloadedDocumentStatus(nextFileName: string) {
    showDocumentOperationStatus('success', formatTranslation(t.status.downloadedDocument, { fileName: nextFileName }))
  }

  function showOpenFailedStatus(message = t.alerts.fileOpenFailed) {
    showDocumentOperationStatus('error', message)
  }

  function showSaveFailedStatus(message = t.alerts.fileSaveFailed) {
    showDocumentOperationStatus('error', message)
  }

  function handleNewDocument() {
    if (!confirmDiscardChanges(t.alerts.startNewDocument)) {
      return
    }

    const nextMarkdown = '# Untitled\n\n'

    clearEditorSessionState()
    setMarkdownValue(nextMarkdown)
    setFileName('untitled.md')
    setActiveFilePath(null)
    setSavedSnapshot(nextMarkdown)
    setDocumentOperationStatus(null)
    setIsWelcomeVisible(false)
    setEditorPosition(defaultEditorPosition)
    clearPreviewImageSources()
  }

  function applyOpenedDocument(content: string, nextFileName: string, nextFilePath: string | null) {
    clearEditorSessionState()
    setMarkdownValue(content)
    setFileName(nextFileName)
    setActiveFilePath(nextFilePath)
    setSavedSnapshot(content)
    rememberRecentFile(nextFilePath, nextFileName)
    clearWorkspaceFileMissing(nextFilePath)
    setLastSavedAt(new Date())
    showOpenedDocumentStatus(nextFileName)
    setIsWelcomeVisible(false)
    setEditorPosition(defaultEditorPosition)
    clearPreviewImageSources()
  }

  async function openDesktopFile() {
    if (!confirmDiscardChanges(t.alerts.openAnotherDocument)) {
      return
    }

    let result

    try {
      result = await window.openmark?.openMarkdownFile()
    } catch {
      showOpenFailedStatus()
      return
    }

    if (!result || result.canceled || typeof result.content !== 'string' || !result.fileName) {
      if (result?.error) {
        showOpenFailedStatus(result.error)
      } else if (result && !result.canceled) {
        showOpenFailedStatus()
      }
      return
    }

    applyOpenedDocument(result.content, result.fileName, result.filePath ?? null)
  }

  async function handleOpenRecentFile(filePath: string) {
    if (!confirmDiscardChanges(t.alerts.openAnotherDocument)) {
      return
    }

    let result

    try {
      result = await window.openmark?.openRecentFile(filePath)
    } catch {
      markFileMissing(filePath)
      showOpenFailedStatus(t.alerts.recentFileOpenFailed)
      return
    }

    if (!result || result.canceled || typeof result.content !== 'string' || !result.fileName) {
      if (result?.error) {
        markFileMissing(filePath)
        showOpenFailedStatus(result.error)
      } else if (result && !result.canceled) {
        showOpenFailedStatus(t.alerts.recentFileOpenFailed)
      }
      return
    }

    applyOpenedDocument(result.content, result.fileName, result.filePath ?? null)
  }

  function applyWorkspaceFolder(result: OpenMarkWorkspaceFolderResult) {
    if (result.canceled || !result.folderPath || !result.folderName || !result.files) {
      if (result.error) {
        setWorkspaceError(result.error)
      }
      return
    }

    setWorkspaceFolder({
      folderPath: result.folderPath,
      folderName: result.folderName,
      files: result.files,
      truncated: result.truncated === true,
    })
    setWorkspaceFileQuery('')
    setWorkspaceError(null)
    setActiveSidebarTab('workspace')
  }

  async function handleSelectWorkspaceFolder() {
    if (!window.openmark) {
      return
    }

    setIsWorkspaceLoading(true)
    setWorkspaceError(null)

    try {
      applyWorkspaceFolder(await window.openmark.selectWorkspaceFolder())
    } catch {
      setWorkspaceError(t.alerts.workspaceFolderOpenFailed)
    } finally {
      setIsWorkspaceLoading(false)
    }
  }

  async function handleRefreshWorkspaceFolder() {
    if (!window.openmark || !workspaceFolder) {
      return
    }

    setIsWorkspaceLoading(true)
    setWorkspaceError(null)

    try {
      applyWorkspaceFolder(await window.openmark.readWorkspaceFolder(workspaceFolder.folderPath))
    } catch {
      setWorkspaceError(t.alerts.workspaceFolderOpenFailed)
    } finally {
      setIsWorkspaceLoading(false)
    }
  }

  function clearWorkspaceFolder() {
    setWorkspaceFolder(null)
    setWorkspaceFileQuery('')
    setWorkspaceError(null)
  }

  async function handleOpenWorkspaceFile(filePath: string) {
    await handleOpenRecentFile(filePath)
  }

  function focusQuickOpenInput() {
    window.requestAnimationFrame(() => {
      quickOpenInputRef.current?.focus()
      quickOpenInputRef.current?.select()
    })
  }

  function openQuickOpen() {
    setQuickOpenQuery('')
    setActiveQuickOpenIndex(0)
    setIsQuickOpenOpen(true)
    focusQuickOpenInput()
  }

  function closeQuickOpen() {
    setIsQuickOpenOpen(false)
    setQuickOpenQuery('')
    setActiveQuickOpenIndex(0)
    getEditorView()?.focus()
  }

  function openQuickOpenFile(item: QuickOpenItem | undefined) {
    if (!item) {
      return
    }

    setIsQuickOpenOpen(false)
    setQuickOpenQuery('')
    setActiveQuickOpenIndex(0)
    void handleOpenRecentFile(item.filePath)
  }

  function handleQuickOpenKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveQuickOpenIndex((currentIndex) => (
        visibleQuickOpenItems.length === 0
          ? 0
          : (currentIndex + 1) % visibleQuickOpenItems.length
      ))
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveQuickOpenIndex((currentIndex) => (
        visibleQuickOpenItems.length === 0
          ? 0
          : (currentIndex - 1 + visibleQuickOpenItems.length) % visibleQuickOpenItems.length
      ))
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      closeQuickOpen()
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      openQuickOpenFile(visibleQuickOpenItems[safeActiveQuickOpenIndex])
    }
  }

  function handleQuickOpenSubmit(event: ReactFormEvent<HTMLFormElement>) {
    event.preventDefault()
    openQuickOpenFile(visibleQuickOpenItems[safeActiveQuickOpenIndex])
  }

  async function handleOpenDocument() {
    if (window.openmark) {
      await openDesktopFile()
      return
    }

    if (!confirmDiscardChanges(t.alerts.openAnotherDocument)) {
      return
    }

    fileInputRef.current?.click()
  }

  async function handleFileOpen(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0]

    if (!selectedFile) {
      return
    }

    let fileText: string

    try {
      fileText = await selectedFile.text()
    } catch {
      showOpenFailedStatus()
      event.target.value = ''
      return
    }

    applyOpenedDocument(fileText, selectedFile.name, null)
    event.target.value = ''
  }

  function insertMarkdownImage(markdownPath: string, fallbackFileName: string) {
    const editorView = mode === 'preview' ? null : getEditorView()
    const selectedText = editorView
      ? editorView.state.sliceDoc(editorView.state.selection.main.from, editorView.state.selection.main.to).trim()
      : ''
    const altText = selectedText || getImageAltText(fallbackFileName)
    const imageText = createMarkdownImage(markdownPath, altText)

    setIsWelcomeVisible(false)

    if (mode === 'preview') {
      setMode('split')
    }

    if (!editorView) {
      setMarkdownValue((currentValue) => {
        return `${currentValue}${createBlockInsertion(currentValue, currentValue.length, currentValue.length, imageText)}`
      })
      return
    }

    const selection = editorView.state.selection.main
    const insertText = createBlockInsertion(
      editorView.state.doc.toString(),
      selection.from,
      selection.to,
      imageText,
    )
    const sanitizedAltText = escapeMarkdownImageAlt(altText)
    const altStart = insertText.indexOf(sanitizedAltText)
    const anchor = altStart >= 0 ? selection.from + altStart : selection.from + insertText.length
    const head = altStart >= 0 ? anchor + sanitizedAltText.length : anchor

    editorView.dispatch({
      changes: { from: selection.from, to: selection.to, insert: insertText },
      selection: { anchor, head },
      scrollIntoView: true,
    })
    editorView.focus()
  }

  async function handleInsertImage() {
    if (window.openmark) {
      const result = await window.openmark.selectImageFile()

      if (!result || result.canceled || !result.filePath) {
        return
      }

      const markdownPath = activeFilePath
        ? getRelativePath(getPathDirectory(activeFilePath), result.filePath)
        : toFileUrl(result.filePath)

      insertMarkdownImage(markdownPath, result.fileName ?? getPathFileName(result.filePath))
      return
    }

    imageInputRef.current?.click()
  }

  function handleImageFileOpen(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0]

    if (!selectedFile) {
      return
    }

    if (!isSupportedImageFile(selectedFile.name)) {
      window.alert(t.alerts.unsupportedImage)
      event.target.value = ''
      return
    }

    const previewSrc = URL.createObjectURL(selectedFile)
    const markdownPath = selectedFile.name

    rememberPreviewImageSource({ markdownPath, previewSrc, objectUrl: previewSrc })
    insertMarkdownImage(markdownPath, selectedFile.name)
    event.target.value = ''
  }

  async function handleSaveMarkdown(options?: { forceDialog?: boolean }) {
    const targetFileName = withMarkdownExtension(fileName)
    const shouldForceDialog = options?.forceDialog || (
      window.openmark &&
      activeFilePath !== null &&
      targetFileName !== getPathFileName(activeFilePath)
    )

    if (window.openmark) {
      let result

      try {
        result = await window.openmark.saveMarkdownFile({
          content: markdownValue,
          filePath: activeFilePath,
          fileName: targetFileName,
          forceDialog: shouldForceDialog,
        })
      } catch {
        showSaveFailedStatus()
        return
      }

      if (result.error) {
        showSaveFailedStatus(result.error)
        return
      }

      if (!result.canceled && result.filePath) {
        setActiveFilePath(result.filePath)
        setFileName(result.fileName ?? targetFileName)
        setSavedSnapshot(markdownValue)
        rememberRecentFile(result.filePath, result.fileName ?? targetFileName)
        setLastSavedAt(new Date())
        showSavedDocumentStatus(result.fileName ?? targetFileName)
      } else if (!result.canceled) {
        showSaveFailedStatus()
      }

      return
    }

    downloadFile(
      markdownValue,
      targetFileName,
      'text/markdown;charset=utf-8',
    )
    setFileName(targetFileName)
    setSavedSnapshot(markdownValue)
    showDownloadedDocumentStatus(targetFileName)
  }

  function buildExportHtml(contentHtml = exportHtml) {
    const metadata = contentHtml === exportHtml
      ? exportMetadata
      : getExportDocumentMetadata(contentHtml, fileName)
    const title = escapeHtml(metadata.title)

    return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
${getExportMetadataTags(metadata, locale)}
  <title>${title}</title>
  <style>
${getExportStyleCss(exportStyle)}
  </style>
</head>
<body data-export-style="${exportStyle}">
  <main>${contentHtml}</main>
</body>
</html>`
  }

  async function handleExportHtml() {
    const htmlFileName = `${getBaseName(fileName)}.html`

    if (window.openmark) {
      await window.openmark.saveHtmlFile({
        content: buildExportHtml(),
        fileName: htmlFileName,
      })
      return
    }

    downloadFile(
      buildExportHtml(),
      htmlFileName,
      'text/html;charset=utf-8',
    )
  }

  async function handleExportPdf() {
    const pdfFileName = `${getBaseName(fileName)}.pdf`
    const htmlContent = buildExportHtml()

    if (window.openmark) {
      const result = await window.openmark.savePdfFile({
        content: htmlContent,
        fileName: pdfFileName,
      })

      if (result.error) {
        window.alert(result.error)
      }

      return
    }

    const printWindow = window.open('', '_blank', 'noopener,noreferrer')

    if (!printWindow) {
      window.alert(t.alerts.allowPopupsForPdf)
      return
    }

    printWindow.document.open()
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.document.title = pdfFileName
    printWindow.focus()

    window.setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  function openExportPreview() {
    setIsCommandPaletteOpen(false)
    setIsExportPreviewOpen(true)
  }

  function closeExportPreview() {
    setIsExportPreviewOpen(false)
    getEditorView()?.focus()
  }

  function handlePrintExportPreview() {
    const exportFrameWindow = exportPreviewFrameRef.current?.contentWindow

    if (!exportFrameWindow) {
      return
    }

    exportFrameWindow.focus()
    exportFrameWindow.print()
  }

  function copyTextWithTextArea(content: string) {
    const textArea = document.createElement('textarea')
    textArea.value = content
    textArea.setAttribute('readonly', '')
    textArea.style.position = 'fixed'
    textArea.style.top = '-1000px'
    document.body.append(textArea)
    textArea.select()
    const didCopy = document.execCommand('copy')
    textArea.remove()

    return didCopy
  }

  async function writeTextWithBrowserClipboard(content: string) {
    if (!navigator.clipboard || !window.isSecureContext) {
      return false
    }

    let timeoutId = 0

    try {
      await Promise.race([
        navigator.clipboard.writeText(content),
        new Promise<never>((_resolve, reject) => {
          timeoutId = window.setTimeout(() => reject(new Error('Clipboard write timed out')), clipboardWriteTimeoutMs)
        }),
      ])

      return true
    } catch {
      return false
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  async function writeClipboardText(content: string) {
    try {
      if (window.openmark) {
        const result = await window.openmark.writeClipboardText(content)
        return result.copied
      }

      if (await writeTextWithBrowserClipboard(content)) {
        return true
      }

      return copyTextWithTextArea(content)
    } catch {
      return false
    }
  }

  async function copyDocumentToClipboard(kind: ClipboardCopyKind, content: string) {
    const didCopy = await writeClipboardText(content)

    if (!didCopy) {
      window.alert(t.alerts.copyFailed)
      return
    }

    setClipboardCopyKind(kind)
  }

  async function handleCopyMarkdown() {
    await copyDocumentToClipboard('markdown', markdownValue)
  }

  async function handleCopyHtml() {
    await copyDocumentToClipboard('html', buildExportHtml())
  }

  function toggleTheme() {
    setThemePreference((currentPreference) => {
      const currentTheme = currentPreference === 'system' ? systemTheme : currentPreference
      return currentTheme === 'dark' ? 'light' : 'dark'
    })
  }

  function toggleLocale() {
    setLocalePreference((currentPreference) => {
      const currentLocale = currentPreference === 'system' ? systemLocale : currentPreference
      return currentLocale === 'zh-CN' ? 'en' : 'zh-CN'
    })
  }

  function openThemeSettings() {
    setIsThemeSettingsOpen(true)
  }

  function closeThemeSettings() {
    setIsThemeSettingsOpen(false)
    getEditorView()?.focus()
  }

  async function handleCheckForUpdates() {
    const nextStatus = await window.openmark?.checkForUpdates()

    if (nextStatus) {
      setUpdateStatus(nextStatus)
    }
  }

  async function handleInstallUpdate() {
    await window.openmark?.installUpdate()
  }

  function handleMarkdownFormat(format: MarkdownFormat) {
    const editorView = editorViewRef.current ?? editorRef.current?.view

    if (!editorView) {
      return
    }

    applyMarkdownFormat(editorView, format, t.markdownPlaceholders)
  }

  function handleToggleTaskCheckbox() {
    const editorView = getEditorView()

    if (!editorView) {
      return
    }

    toggleTaskCheckbox(editorView)
  }

  function handleTableEditAction(action: TableEditAction) {
    const editorView = getEditorView()

    if (!editorView) {
      return
    }

    if (applyTableEditAction(editorView, action)) {
      setNextTableEditingState(getTableEditingState(editorView))
    }
  }

  function setNextTableEditingState(nextState: TableEditingState) {
    setTableEditingState((currentState) => (
      areTableEditingStatesEqual(currentState, nextState) ? currentState : nextState
    ))
  }

  function isTableActionDisabled(action: TableEditAction) {
    if (!tableEditingState.isInTable) {
      return true
    }

    if (action === 'delete-row') {
      return !tableEditingState.canDeleteRow
    }

    if (action === 'delete-column') {
      return !tableEditingState.canDeleteColumn
    }

    return false
  }

  function focusCommandInput() {
    window.requestAnimationFrame(() => {
      commandInputRef.current?.focus()
      commandInputRef.current?.select()
    })
  }

  function openCommandPalette() {
    setCommandQuery('')
    setActiveCommandIndex(0)
    setIsCommandPaletteOpen(true)
    focusCommandInput()
  }

  function closeCommandPalette() {
    setIsCommandPaletteOpen(false)
    setCommandQuery('')
    setActiveCommandIndex(0)
    getEditorView()?.focus()
  }

  function runCommandPaletteItem(item: CommandPaletteItem | undefined) {
    if (!item) {
      return
    }

    setIsCommandPaletteOpen(false)
    setCommandQuery('')
    setActiveCommandIndex(0)
    item.action()
  }

  function openGoToLineDialog() {
    if (showWelcome) {
      setIsWelcomeVisible(false)
    }

    setLineNumberInput('')
    setLineNumberError('')
    setIsCommandPaletteOpen(false)
    setIsQuickOpenOpen(false)
    setIsGoToLineOpen(true)
    window.requestAnimationFrame(() => {
      lineNumberInputRef.current?.focus()
      lineNumberInputRef.current?.select()
    })
  }

  function closeGoToLineDialog() {
    setIsGoToLineOpen(false)
    setLineNumberInput('')
    setLineNumberError('')
    getEditorView()?.focus()
  }

  function jumpToEditorLine(target: LineJumpTarget) {
    const editorView = editorViewRef.current ?? editorRef.current?.view

    if (!editorView) {
      return false
    }

    editorView.dispatch({
      selection: { anchor: target.lineStart },
      effects: EditorView.scrollIntoView(target.lineStart, { y: 'center' }),
      scrollIntoView: true,
    })

    const editorLines = editorView.dom.querySelectorAll('.cm-line')

    editorLines[target.lineNumber - 1]?.scrollIntoView({ block: 'center' })
    editorView.focus()

    return true
  }

  function jumpToDocumentDiagnostic(diagnostic: DocumentDiagnostic) {
    const target = { lineNumber: diagnostic.lineNumber, lineStart: diagnostic.lineStart }

    setActiveSidebarTab('document')
    pendingLineJumpRef.current = target
    setActiveOutlineLine(target.lineNumber)

    if (mode === 'preview') {
      setMode('split')
      return
    }

    jumpToEditorLine(target)
    pendingLineJumpRef.current = null
  }

  function handleGoToLineSubmit(event: ReactFormEvent<HTMLFormElement>) {
    event.preventDefault()

    const lineNumber = parseLineNumberInput(lineNumberInput)

    if (!lineNumber || lineNumber < 1 || lineNumber > lineJumpMaxLine) {
      setLineNumberError(formatTranslation(t.goToLine.invalidLine, { max: String(lineJumpMaxLine) }))
      return
    }

    const target = getLineJumpTarget(markdownValue, lineNumber)

    pendingLineJumpRef.current = target
    setActiveOutlineLine(target.lineNumber)
    setIsGoToLineOpen(false)
    setLineNumberInput('')
    setLineNumberError('')

    if (mode === 'preview') {
      setMode('split')
      return
    }

    jumpToEditorLine(target)
    pendingLineJumpRef.current = null
  }

  function handleCommandPaletteKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveCommandIndex((currentIndex) => (
        filteredCommandPaletteItems.length === 0
          ? 0
          : (currentIndex + 1) % filteredCommandPaletteItems.length
      ))
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveCommandIndex((currentIndex) => (
        filteredCommandPaletteItems.length === 0
          ? 0
          : (currentIndex - 1 + filteredCommandPaletteItems.length) % filteredCommandPaletteItems.length
      ))
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      closeCommandPalette()
    }
  }

  function handleCommandPaletteSubmit(event: ReactFormEvent<HTMLFormElement>) {
    event.preventDefault()
    runCommandPaletteItem(filteredCommandPaletteItems[safeActiveCommandIndex])
  }

  function getEditorView() {
    return editorViewRef.current ?? editorRef.current?.view ?? null
  }

  function syncEditorPosition(view: EditorView) {
    const nextPosition = getEditorPositionState(view)

    setEditorPosition((currentPosition) => (
      areEditorPositionsEqual(currentPosition, nextPosition) ? currentPosition : nextPosition
    ))
  }

  function clearEditorSessionSaveTimer() {
    if (editorSessionSaveTimerRef.current === null) {
      return
    }

    window.clearTimeout(editorSessionSaveTimerRef.current)
    editorSessionSaveTimerRef.current = null
  }

  function getCurrentEditorSessionState(editorView: EditorView): EditorSessionState {
    const selection = editorView.state.selection.main

    return {
      ...editorSessionDocumentRef.current,
      selectionAnchor: selection.anchor,
      selectionHead: selection.head,
      scrollTop: editorView.scrollDOM.scrollTop,
      scrollLeft: editorView.scrollDOM.scrollLeft,
    }
  }

  function persistCurrentEditorSession(editorView: EditorView) {
    persistEditorSessionState(getCurrentEditorSessionState(editorView))
  }

  function scheduleEditorSessionPersist() {
    clearEditorSessionSaveTimer()

    editorSessionSaveTimerRef.current = window.setTimeout(() => {
      editorSessionSaveTimerRef.current = null

      const editorView = getEditorView()

      if (editorView) {
        persistCurrentEditorSession(editorView)
      }
    }, editorSessionSaveDelay)
  }

  function flushEditorSessionPersist() {
    clearEditorSessionSaveTimer()

    const editorView = getEditorView()

    if (editorView) {
      persistCurrentEditorSession(editorView)
    }
  }

  function clearEditorSessionState() {
    pendingEditorSessionRef.current = null
    clearEditorSessionSaveTimer()
    clearPersistedEditorSessionState()
  }

  function restoreEditorSessionState(editorView: EditorView) {
    const editorSession = pendingEditorSessionRef.current
    pendingEditorSessionRef.current = null

    if (!editorSession || !isEditorSessionForDocument(editorSession, editorSessionDocumentRef.current)) {
      return
    }

    const documentLength = editorView.state.doc.length
    const selectionAnchor = clampEditorPosition(editorSession.selectionAnchor, documentLength)
    const selectionHead = clampEditorPosition(editorSession.selectionHead, documentLength)

    editorView.dispatch({
      selection: { anchor: selectionAnchor, head: selectionHead },
    })

    window.requestAnimationFrame(() => {
      restoreEditorScrollPosition(editorView.scrollDOM, editorSession)
      syncEditorPosition(editorView)
    })
  }

  function getScrollableRatio(element: HTMLElement) {
    const scrollableDistance = element.scrollHeight - element.clientHeight

    return scrollableDistance <= 0 ? 0 : element.scrollTop / scrollableDistance
  }

  function setScrollableRatio(element: HTMLElement, ratio: number) {
    const scrollableDistance = element.scrollHeight - element.clientHeight

    element.scrollTop = scrollableDistance <= 0 ? 0 : scrollableDistance * ratio
  }

  function withScrollSyncLock(source: 'editor' | 'preview', syncScroll: () => void) {
    scrollSyncSourceRef.current = source
    syncScroll()

    if (scrollSyncTimerRef.current !== null) {
      window.clearTimeout(scrollSyncTimerRef.current)
    }

    scrollSyncTimerRef.current = window.setTimeout(() => {
      scrollSyncSourceRef.current = null
      scrollSyncTimerRef.current = null
    }, 80)
  }

  function syncPreviewScrollFromEditor() {
    if (mode !== 'split' || scrollSyncSourceRef.current === 'preview') {
      return
    }

    const editorScroller = getEditorView()?.scrollDOM
    const previewScroller = previewScrollRef.current

    if (!editorScroller || !previewScroller) {
      return
    }

    const ratio = getScrollableRatio(editorScroller)
    withScrollSyncLock('editor', () => setScrollableRatio(previewScroller, ratio))
  }

  function syncEditorScrollFromPreview() {
    if (mode !== 'split' || scrollSyncSourceRef.current === 'editor') {
      return
    }

    const editorScroller = getEditorView()?.scrollDOM
    const previewScroller = previewScrollRef.current

    if (!editorScroller || !previewScroller) {
      return
    }

    const ratio = getScrollableRatio(previewScroller)
    withScrollSyncLock('preview', () => setScrollableRatio(editorScroller, ratio))
  }

  function getSelectedSearchRange(editorView: EditorView): SearchMatch | null {
    const selection = editorView.state.selection.main

    return selection.empty ? null : { from: selection.from, to: selection.to }
  }

  function focusSearchInput() {
    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    })
  }

  function openSearchBar(searchMode: 'find' | 'replace') {
    if (showWelcome) {
      setIsWelcomeVisible(false)
    }

    setIsSearchVisible(true)
    setIsReplaceVisible(searchMode === 'replace')

    if (mode === 'preview') {
      setMode((currentMode) => (currentMode === 'preview' ? 'split' : currentMode))
    }

    focusSearchInput()
  }

  function closeSearchBar() {
    setIsSearchVisible(false)
    setIsReplaceVisible(false)
    setActiveSearchRange(null)
    getEditorView()?.focus()
  }

  function syncActiveSearchRange(editorView: EditorView) {
    window.requestAnimationFrame(() => {
      setActiveSearchRange(getSelectedSearchRange(editorView))
    })
  }

  function moveSearchMatch(direction: 'next' | 'previous') {
    const editorView = getEditorView()

    if (!editorView || searchTerm.length === 0) {
      return
    }

    const didMove = direction === 'next' ? findNext(editorView) : findPrevious(editorView)

    if (didMove) {
      syncActiveSearchRange(editorView)
    }
  }

  function jumpToSearchResult(result: SearchResult) {
    const editorView = getEditorView()

    if (!editorView) {
      return
    }

    if (mode === 'preview') {
      setMode('split')
    }

    editorView.dispatch({
      selection: { anchor: result.from, head: result.to },
      effects: EditorView.scrollIntoView(result.from, { y: 'center' }),
      scrollIntoView: true,
    })
    editorView.focus()
    setActiveSearchRange({ from: result.from, to: result.to })
  }

  function replaceCurrentSearchMatch() {
    const editorView = getEditorView()

    if (!editorView || searchTerm.length === 0) {
      return
    }

    const didReplace = replaceNext(editorView)

    if (didReplace) {
      syncActiveSearchRange(editorView)
    }
  }

  function replaceAllSearchMatches() {
    const editorView = getEditorView()

    if (!editorView || searchTerm.length === 0) {
      return
    }

    replaceAll(editorView)
    setActiveSearchRange(null)
  }

  function handleSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      moveSearchMatch(event.shiftKey ? 'previous' : 'next')
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      closeSearchBar()
    }
  }

  function updateSplitPaneRatio(clientX: number) {
    const workbench = editorWorkbenchRef.current

    if (!workbench) {
      return
    }

    const bounds = workbench.getBoundingClientRect()

    if (bounds.width === 0) {
      return
    }

    setSplitPaneRatio(clampSplitPaneRatio(((clientX - bounds.left) / bounds.width) * 100))
  }

  function beginSplitResize(
    clientX: number,
    moveEventName: 'mousemove' | 'pointermove',
    stopEventNames: Array<'mouseup' | 'pointerup' | 'pointercancel'>,
  ) {
    if (mode !== 'split') {
      return
    }

    updateSplitPaneRatio(clientX)
    document.body.classList.add('is-resizing-split')

    const handleMove = (moveEvent: MouseEvent | PointerEvent) => {
      updateSplitPaneRatio(moveEvent.clientX)
    }

    const stopResize = () => {
      document.body.classList.remove('is-resizing-split')
      window.removeEventListener(moveEventName, handleMove)
      stopEventNames.forEach((eventName) => window.removeEventListener(eventName, stopResize))
    }

    window.addEventListener(moveEventName, handleMove)
    stopEventNames.forEach((eventName) => window.addEventListener(eventName, stopResize))
  }

  function handleSplitPointerResizeStart(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.pointerType === 'mouse') {
      return
    }

    event.preventDefault()
    beginSplitResize(event.clientX, 'pointermove', ['pointerup', 'pointercancel'])
  }

  function handleSplitMouseResizeStart(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    beginSplitResize(event.clientX, 'mousemove', ['mouseup'])
  }

  function handleSplitResizeKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setSplitPaneRatio((currentRatio) => clampSplitPaneRatio(currentRatio - 5))
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      setSplitPaneRatio((currentRatio) => clampSplitPaneRatio(currentRatio + 5))
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      setSplitPaneRatio(defaultSplitPaneRatio)
    }
  }

  function handleOutlineJump(item: OutlineItem) {
    setActiveOutlineLine(item.lineNumber)
    pendingOutlineJumpRef.current = item

    if (mode === 'preview') {
      setMode('split')
      return
    }

    window.requestAnimationFrame(() => {
      if (jumpToEditorLine(item)) {
        pendingOutlineJumpRef.current = null
      }
    })
  }

  function handlePreviewClick(event: ReactMouseEvent<HTMLElement>) {
    const heading = (event.target as HTMLElement).closest<HTMLElement>('[data-outline-index]')

    if (!heading) {
      return
    }

    const outlineIndex = Number(heading.dataset.outlineIndex)
    const item = Number.isInteger(outlineIndex) ? outline[outlineIndex] : undefined

    if (item) {
      handleOutlineJump(item)
    }
  }

  function handlePreviewKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    const heading = (event.target as HTMLElement).closest<HTMLElement>('[data-outline-index]')

    if (!heading) {
      return
    }

    event.preventDefault()
    const outlineIndex = Number(heading.dataset.outlineIndex)
    const item = Number.isInteger(outlineIndex) ? outline[outlineIndex] : undefined

    if (item) {
      handleOutlineJump(item)
    }
  }

  function handleLibraryListKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') {
      return
    }

    const container = event.currentTarget
    const libraryItems = Array.from(container.querySelectorAll<HTMLButtonElement>(libraryItemSelector))
      .filter((button) => !button.disabled)

    if (libraryItems.length === 0) {
      return
    }

    const target = event.target as HTMLElement
    const currentItem = target.closest<HTMLButtonElement>(libraryItemSelector)
    const currentRow = target.closest<HTMLElement>(libraryRowSelector)
    const rows = Array.from(container.querySelectorAll<HTMLElement>(libraryRowSelector))
    const currentRowIndex = currentRow ? rows.indexOf(currentRow) : -1
    const currentItemIndex = currentItem ? libraryItems.indexOf(currentItem) : -1
    const currentIndex = currentItemIndex >= 0
      ? currentItemIndex
      : Math.min(Math.max(currentRowIndex, 0), libraryItems.length - 1)
    let nextIndex = currentIndex

    if (event.key === 'ArrowDown') {
      nextIndex = Math.min(currentIndex + 1, libraryItems.length - 1)
    }

    if (event.key === 'ArrowUp') {
      nextIndex = Math.max(currentIndex - 1, 0)
    }

    if (event.key === 'Home') {
      nextIndex = 0
    }

    if (event.key === 'End') {
      nextIndex = libraryItems.length - 1
    }

    event.preventDefault()
    libraryItems[nextIndex]?.focus()
  }

  function renderRecentFiles(items = recentFiles) {
    return (
      <div className="recent-list" aria-label={t.document.recentFileList} onKeyDown={handleLibraryListKeyDown}>
        {items.map((item) => {
          const recentOpenButtonClassName = [
            'recent-open-button',
            item.pinned ? 'pinned' : '',
            item.missing ? 'missing' : '',
          ].filter(Boolean).join(' ')
          const recentMeta = [
            item.missing ? t.document.missing : '',
            item.pinned ? t.document.pinned : '',
            fileDateFormatter.format(item.openedAt),
          ].filter(Boolean).join(' · ')

          return (
          <div className="recent-file-row" key={item.filePath} data-library-row="true">
            <button
              type="button"
              className={item.pinned ? 'recent-pin-button active' : 'recent-pin-button'}
              onClick={() => toggleRecentFilePinned(item.filePath)}
              title={item.pinned ? t.document.unpinRecentFile : t.document.pinRecentFile}
              aria-label={`${item.pinned ? t.document.unpinRecentFile : t.document.pinRecentFile}: ${item.fileName}`}
            >
              <Pin size={14} />
            </button>
            <button
              type="button"
              className={recentOpenButtonClassName}
              data-library-item="true"
              onClick={() => handleOpenRecentFile(item.filePath)}
              title={item.filePath}
            >
              <span>{item.fileName}</span>
              <small>{recentMeta}</small>
            </button>
            <button
              type="button"
              className="recent-remove-button"
              onClick={() => removeRecentFile(item.filePath)}
              title={t.document.removeFromRecent}
              aria-label={`${t.document.removeFromRecent}: ${item.fileName}`}
            >
              <X size={14} />
            </button>
          </div>
          )
        })}
      </div>
    )
  }

  function renderWorkspaceFiles(items = filteredWorkspaceFiles) {
    if (!workspaceFolder) {
      return null
    }

    return (
      <div className="workspace-file-list" aria-label={t.workspace.fileList} onKeyDown={handleLibraryListKeyDown}>
        {items.map((item) => {
          const isActiveWorkspaceFile = item.filePath === activeFilePath
          const workspaceFileButtonClassName = [
            'workspace-file-button',
            isActiveWorkspaceFile ? 'active' : '',
            item.missing ? 'missing' : '',
          ].filter(Boolean).join(' ')
          const workspaceFileMeta = [
            isActiveWorkspaceFile ? t.workspace.current : '',
            item.missing ? t.workspace.missing : fileDateFormatter.format(item.modifiedAt),
          ].filter(Boolean).join(' · ')

          return (
            <button
              type="button"
              className={workspaceFileButtonClassName}
              key={item.filePath}
              data-library-item="true"
              data-library-row="true"
              onClick={() => { void handleOpenWorkspaceFile(item.filePath) }}
              title={item.filePath}
            >
              <FileText size={15} aria-hidden="true" />
              <span>{item.relativePath}</span>
              <small>{workspaceFileMeta}</small>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" aria-label="OpenMark">
          <div className="brand-mark" aria-hidden="true">
            <FileText size={20} />
          </div>
          <div>
            <span className="brand-title">OpenMark</span>
            <span className="brand-subtitle">{t.brand.subtitle}</span>
          </div>
        </div>

        <div className="toolbar" role="toolbar" aria-label={t.toolbar.editorToolbar}>
          <div className="tool-group">
            <button
              type="button"
              className="icon-button"
              onClick={handleNewDocument}
              title={t.toolbar.newDocument}
              aria-label={t.toolbar.newDocument}
            >
              <FilePlus2 size={18} />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={handleOpenDocument}
              title={t.toolbar.openMarkdownFile}
              aria-label={t.toolbar.openMarkdownFile}
            >
              <FolderOpen size={18} />
            </button>
            <button
              type="button"
              className="tool-button"
              onClick={() => handleSaveMarkdown()}
              title={t.toolbar.saveMarkdown}
            >
              <Save size={17} />
              <span>{t.toolbar.save}</span>
            </button>
            <button
              type="button"
              className="tool-button compact-tool"
              onClick={() => handleSaveMarkdown({ forceDialog: true })}
              title={t.toolbar.saveMarkdownAs}
            >
              <Save size={17} />
              <span>{t.toolbar.saveAs}</span>
            </button>
            <button
              type="button"
              className="tool-button"
              onClick={openExportPreview}
              title={t.toolbar.previewExport}
            >
              <Eye size={17} />
              <span>{t.toolbar.preview}</span>
            </button>
            <button
              type="button"
              className="tool-button"
              onClick={handleExportHtml}
              title={t.toolbar.exportHtml}
            >
              <Download size={17} />
              <span>HTML</span>
            </button>
            <button
              type="button"
              className="tool-button"
              onClick={() => { void handleExportPdf() }}
              title={t.toolbar.exportPdf}
            >
              <FileDown size={17} />
              <span>PDF</span>
            </button>
            <button
              type="button"
              className="tool-button compact-tool"
              onClick={() => { void handleCopyMarkdown() }}
              title={t.toolbar.copyMarkdown}
            >
              <Copy size={17} />
              <span>MD</span>
            </button>
            <button
              type="button"
              className="tool-button compact-tool"
              onClick={() => { void handleCopyHtml() }}
              title={t.toolbar.copyHtml}
            >
              <Copy size={17} />
              <span>HTML</span>
            </button>
          </div>

          <div className="tool-group">
            <button
              type="button"
              className="icon-button"
              onClick={() => openSearchBar('find')}
              title={t.toolbar.findInDocument}
              aria-label={t.toolbar.findInDocument}
            >
              <SearchIcon size={18} />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={() => openSearchBar('replace')}
              title={t.toolbar.replaceInDocument}
              aria-label={t.toolbar.replaceInDocument}
            >
              <Replace size={18} />
            </button>
          </div>

          <div className="segmented-control" aria-label={t.toolbar.viewMode}>
            {modeOptions.map(({ value, Icon }) => {
              const label = t.viewModes[value]

              return (
              <button
                type="button"
                key={value}
                className={mode === value ? 'active' : ''}
                onClick={() => setMode(value)}
                aria-label={`${label} ${t.toolbar.modeSuffix}`}
                title={`${label} ${t.toolbar.modeSuffix}`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
              )
            })}
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={toggleTheme}
            title={t.toolbar.toggleTheme}
            aria-label={t.toolbar.toggleTheme}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            type="button"
            className="icon-button"
            onClick={openThemeSettings}
            title={t.toolbar.settings}
            aria-label={t.toolbar.settings}
          >
            <Settings2 size={18} />
          </button>

          <button
            type="button"
            className="language-toggle-button"
            onClick={toggleLocale}
            title={`${t.toolbar.switchLanguage}: ${t.locales[nextLocale]}`}
            aria-label={`${t.toolbar.switchLanguage}: ${t.locales[nextLocale]}`}
          >
            <Languages size={18} />
            <span>{nextLocaleLabel}</span>
          </button>

          <button
            type="button"
            className="icon-button"
            onClick={openCommandPalette}
            title={t.toolbar.commandPalette}
            aria-label={t.toolbar.commandPalette}
          >
            <CommandIcon size={18} />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          title={t.toolbar.openMarkdownFile}
          hidden
          tabIndex={-1}
          aria-hidden="true"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          onChange={handleFileOpen}
        />
        <input
          ref={imageInputRef}
          type="file"
          title={t.toolbar.insertImage}
          hidden
          tabIndex={-1}
          aria-hidden="true"
          accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
          onChange={handleImageFileOpen}
        />
      </header>

      <main className={`workspace mode-${mode}${showWelcome ? ' is-welcome' : ''}`}>
        {!showWelcome && (
        <aside className="inspector" aria-label={t.sidebar.documentInspector}>
          <div className="sidebar-tabs" role="navigation" aria-label={t.sidebar.workspacePanels}>
            {sidebarTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={activeSidebarTab === tab.value ? 'active' : ''}
                onClick={() => setActiveSidebarTab(tab.value)}
              >
                <span>{tab.label}</span>
                <small>{tab.detail}</small>
              </button>
            ))}
          </div>

          <div className="sidebar-panel">
          {activeSidebarTab === 'document' && (
          <section className="inspector-section">
            <h2>{t.sidebar.document}</h2>
            <label className="file-name-field">
              <span>{t.document.fileName}</span>
              <div className="file-name-input-wrap">
                <FileText size={16} aria-hidden="true" />
                <input
                  type="text"
                  value={fileName}
                  spellCheck={false}
                  aria-label={t.document.documentFileName}
                  onChange={(event) => setFileName(sanitizeFileNameInput(event.target.value))}
                  onBlur={() => setFileName(withMarkdownExtension(fileName))}
                />
              </div>
            </label>
            <div className="document-state" aria-live="polite">
              <span className={hasUnsavedChanges ? 'state-dot dirty' : 'state-dot saved'}></span>
              <span>{hasUnsavedChanges ? t.document.unsavedChanges : t.document.saved}</span>
            </div>
            {documentOperationStatus?.tone === 'error' && (
              <p className="operation-status error" role="alert">
                {documentOperationStatus.message}
              </p>
            )}
            {documentOperationStatus?.tone === 'success' && (
              <p className="operation-status success" role="status">
                {documentOperationStatus.message}
              </p>
            )}
            {window.openmark && (
              <p className="file-path" title={activeFilePath ?? t.document.unsavedDesktopDocument}>
                {activeFilePath ?? t.document.unsavedDesktopDocument}
              </p>
            )}
            <div className="metric-list">
              <div>
                <span>{t.document.words}</span>
                <strong>{stats.words}</strong>
              </div>
              <div>
                <span>{t.document.characters}</span>
                <strong>{stats.characters}</strong>
              </div>
              <div>
                <span>{t.document.lines}</span>
                <strong>{stats.lines}</strong>
              </div>
              <div>
                <span>{t.document.headings}</span>
                <strong>{stats.headings}</strong>
              </div>
            </div>
            <section className="diagnostics-section" aria-label={t.diagnostics.title}>
              <div className="diagnostics-heading">
                <h3>{t.diagnostics.title}</h3>
                <small>{formatTranslation(t.diagnostics.count, { count: String(documentDiagnostics.length) })}</small>
              </div>
              {documentDiagnostics.length > 0 ? (
                <ol className="diagnostics-list">
                  {documentDiagnostics.map((diagnostic) => (
                    <li key={diagnostic.id}>
                      <button
                        type="button"
                        className="diagnostic-button"
                        onPointerDown={(event) => {
                          event.preventDefault()
                          jumpToDocumentDiagnostic(diagnostic)
                        }}
                        onClick={(event) => {
                          if (event.detail === 0) {
                            jumpToDocumentDiagnostic(diagnostic)
                          }
                        }}
                      >
                        <span className="diagnostic-line">
                          {formatTranslation(t.diagnostics.line, { line: String(diagnostic.lineNumber) })}
                        </span>
                        <span>{formatTranslation(t.diagnostics.messages[diagnostic.kind], { target: diagnostic.target || t.diagnostics.emptyTarget })}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="muted">{t.diagnostics.none}</p>
              )}
            </section>
          </section>
          )}

          {activeSidebarTab === 'outline' && (
          <section className="inspector-section outline-section">
            <div className="section-heading-row">
              <h2>{t.sidebar.outline}</h2>
              {outline.length > 0 && (
                <small className="outline-count">
                  {filteredOutline.length} {t.workspace.of} {outline.length}
                </small>
              )}
            </div>
            {outline.length > 0 ? (
              <>
                <label className="outline-search">
                  <SearchIcon size={15} aria-hidden="true" />
                  <input
                    type="search"
                    value={outlineQuery}
                    onChange={(event) => setOutlineQuery(event.target.value)}
                    placeholder={t.document.searchOutlinePlaceholder}
                    aria-label={t.document.searchOutline}
                  />
                  {outlineQuery.length > 0 && (
                    <button
                      type="button"
                      className="outline-search-clear"
                      onClick={() => setOutlineQuery('')}
                      aria-label={t.document.clearOutlineSearch}
                      title={t.document.clearOutlineSearch}
                    >
                      <X size={14} />
                    </button>
                  )}
                </label>
                {filteredOutline.length > 0 ? (
                  <>
                    <ol className="outline-list">
                      {visibleOutlineItems.map((item, index) => (
                        <li
                          key={`${item.title}-${item.lineNumber}-${index}`}
                          className={`outline-level-${Math.min(item.level, 3)}`}
                        >
                          <button
                            type="button"
                            className={activeOutlineLine === item.lineNumber ? 'active' : ''}
                            aria-current={activeOutlineLine === item.lineNumber ? 'location' : undefined}
                            onPointerDown={(event) => {
                              event.preventDefault()
                              handleOutlineJump(item)
                            }}
                            onClick={(event) => {
                              if (event.detail === 0) {
                                handleOutlineJump(item)
                              }
                            }}
                            title={`${t.document.goToLine} ${item.lineNumber}`}
                          >
                            <span>{item.title}</span>
                            <small>:{item.lineNumber}</small>
                          </button>
                        </li>
                      ))}
                    </ol>
                    {hiddenOutlineCount > 0 && (
                      <p className="outline-more muted">
                        {t.document.moreOutlineMatches.replace('{count}', String(hiddenOutlineCount))}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="muted">{t.document.noOutlineMatches}</p>
                )}
              </>
            ) : (
              <p className="muted">{t.document.noHeadingsYet}</p>
            )}
          </section>
          )}

          {activeSidebarTab === 'workspace' && (
            <section className="inspector-section workspace-section">
              <div className="section-heading-row">
                <h2>{t.sidebar.workspace}</h2>
                {workspaceFolder && (
                  <button type="button" className="text-action" onClick={clearWorkspaceFolder}>
                    {t.document.clear}
                  </button>
                )}
              </div>
              {window.openmark ? (
                <>
                  <button
                    type="button"
                    className="workspace-folder-button"
                    onClick={() => { void handleSelectWorkspaceFolder() }}
                    disabled={isWorkspaceLoading}
                  >
                    <FolderOpen size={16} aria-hidden="true" />
                    <span>{workspaceFolder ? t.workspace.changeFolder : t.workspace.openFolder}</span>
                  </button>
                  {workspaceFolder ? (
                    <>
                      <div className="workspace-folder-summary">
                        <strong>{workspaceFolder.folderName}</strong>
                        <span title={workspaceFolder.folderPath}>{workspaceFolder.folderPath}</span>
                      </div>
                      <div className="workspace-state-strip" aria-label={t.workspace.fileStates}>
                        <span>{workspaceAvailableFileCount} {t.workspace.available}</span>
                        <span>{workspaceMissingFileCount} {t.workspace.missingFiles}</span>
                        <span>{activeWorkspaceFile?.relativePath ?? t.workspace.noCurrentFile}</span>
                      </div>
                      <div className="workspace-toolbar-row">
                        <span>
                          {filteredWorkspaceFiles.length} {t.workspace.of} {workspaceFolder.files.length} {t.workspace.files}
                        </span>
                        <span className="workspace-toolbar-actions">
                          <button
                            type="button"
                            className="text-action"
                            onClick={openQuickOpen}
                            disabled={quickOpenItems.length === 0}
                          >
                            {t.workspace.quickOpen}
                          </button>
                          <button
                            type="button"
                            className="text-action"
                            onClick={() => { void handleRefreshWorkspaceFolder() }}
                            disabled={isWorkspaceLoading}
                          >
                            {t.workspace.refresh}
                          </button>
                        </span>
                      </div>
                      <div className="workspace-filter-panel">
                        <label className="workspace-search">
                          <SearchIcon size={15} aria-hidden="true" />
                          <input
                            type="search"
                            value={workspaceFileQuery}
                            onChange={(event) => setWorkspaceFileQuery(event.target.value)}
                            placeholder={t.workspace.searchPlaceholder}
                            aria-label={t.workspace.searchFiles}
                          />
                          {workspaceFileQuery.length > 0 && (
                            <button
                              type="button"
                              className="workspace-search-clear"
                              onClick={() => setWorkspaceFileQuery('')}
                              title={t.workspace.clearSearch}
                              aria-label={t.workspace.clearSearch}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </label>
                        <div className="workspace-sort-control" role="group" aria-label={t.workspace.sortFiles}>
                          {workspaceSortOptions.map(({ value, Icon }) => {
                            const label = t.workspace.sortModes[value]

                            return (
                              <button
                                type="button"
                                key={value}
                                className={workspaceSortMode === value ? 'active' : ''}
                                onClick={() => setWorkspaceSortMode(value)}
                                title={label}
                                aria-label={label}
                              >
                                <Icon size={14} />
                                <span>{label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      {workspaceError && <p className="muted">{workspaceError}</p>}
                      {isWorkspaceLoading && <p className="muted">{t.workspace.loading}</p>}
                      {workspaceFolder.truncated && <p className="muted">{t.workspace.truncated}</p>}
                      {workspaceFolder.files.length > 0
                        ? filteredWorkspaceFiles.length > 0
                          ? renderWorkspaceFiles()
                          : <p className="muted">{t.workspace.noFileMatches}</p>
                        : <p className="muted">{t.workspace.noFiles}</p>}
                    </>
                  ) : (
                    <p className="muted">{workspaceError ?? t.workspace.noFolder}</p>
                  )}
                </>
              ) : (
                <p className="muted">{t.workspace.desktopOnly}</p>
              )}
            </section>
          )}

          {activeSidebarTab === 'recent' && (
            <section className="inspector-section recent-section">
              <div className="section-heading-row">
                <h2>{t.sidebar.recent}</h2>
                {recentFiles.length > 0 && (
                  <span className="section-heading-actions">
                    <button type="button" className="text-action" onClick={openQuickOpen} disabled={quickOpenItems.length === 0}>
                      {t.workspace.quickOpen}
                    </button>
                    <button type="button" className="text-action" onClick={clearRecentFiles}>
                      {t.document.clear}
                    </button>
                  </span>
                )}
              </div>
              {window.openmark && recentFiles.length > 0 ? (
                <>
                  <div className="recent-search">
                    <SearchIcon size={15} aria-hidden="true" />
                    <input
                      type="search"
                      value={recentFileQuery}
                      onChange={(event) => setRecentFileQuery(event.target.value)}
                      placeholder={t.document.searchRecentFilesPlaceholder}
                      aria-label={t.document.searchRecentFiles}
                    />
                    {recentFileQuery.length > 0 && (
                      <button
                        type="button"
                        className="recent-search-clear"
                        onClick={() => setRecentFileQuery('')}
                        aria-label={t.document.clearRecentFileSearch}
                        title={t.document.clearRecentFileSearch}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {filteredRecentFiles.length > 0 ? (
                    renderRecentFiles(filteredRecentFiles)
                  ) : (
                    <p className="muted">{t.document.noRecentFileMatches}</p>
                  )}
                </>
              ) : (
                <p className="muted">{t.document.noRecentFiles}</p>
              )}
            </section>
          )}
          </div>
        </aside>
        )}

        <section
          ref={editorWorkbenchRef}
          className="editor-workbench"
          aria-label={t.editor.workspace}
        >
          {showWelcome ? (
            <section className="welcome-panel" aria-label={t.welcome.welcome}>
              <div className="welcome-inner">
                <div className="welcome-mark" aria-hidden="true">
                  <FileText size={28} />
                </div>
                <h1>OpenMark</h1>
                <div className="welcome-actions">
                  <button type="button" className="welcome-action" onClick={handleNewDocument}>
                    <FilePlus2 size={20} />
                    <span>{t.welcome.newDocument}</span>
                  </button>
                  <button type="button" className="welcome-action" onClick={handleOpenDocument}>
                    <FolderOpen size={20} />
                    <span>{t.welcome.openFile}</span>
                  </button>
                </div>
                {window.openmark && recentFiles.length > 0 && (
                  <section className="welcome-recent" aria-label={t.welcome.recentFiles}>
                    <div className="section-heading-row">
                      <h2>{t.sidebar.recent}</h2>
                      <span className="section-heading-actions">
                        <button type="button" className="text-action" onClick={openQuickOpen} disabled={quickOpenItems.length === 0}>
                          {t.workspace.quickOpen}
                        </button>
                        <button type="button" className="text-action" onClick={clearRecentFiles}>
                          {t.document.clear}
                        </button>
                      </span>
                    </div>
                    {renderRecentFiles()}
                  </section>
                )}
              </div>
            </section>
          ) : (
            <>
              {(mode === 'write' || mode === 'split') && (
                <section className="editor-panel panel" aria-label={t.editor.markdownEditor}>
                  <div className="panel-header editor-panel-header">
                    <span>{t.editor.markdown}</span>
                    <div className="format-toolbar" role="toolbar" aria-label={t.toolbar.markdownFormatting}>
                      {markdownToolbarGroups.map((group, groupIndex) => (
                        <div className="format-group" key={`format-group-${groupIndex}`}>
                          {group.map(({ format, labelKey, titleKey, Icon }) => {
                            const label = t.markdownToolbar[labelKey]

                            return (
                              <button
                                key={format}
                                type="button"
                                className="format-button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => handleMarkdownFormat(format)}
                                title={t.markdownToolbar[titleKey]}
                                aria-label={label}
                              >
                                <Icon size={15} />
                              </button>
                            )
                          })}
                        </div>
                      ))}
                      <div className="format-group">
                        <button
                          type="button"
                          className="format-button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => { void handleInsertImage() }}
                          title={t.toolbar.insertImage}
                          aria-label={t.toolbar.insertImage}
                        >
                          <ImagePlus size={15} />
                        </button>
                      </div>
                      <div className="format-group">
                        {tableToolbarActions.map(({ action, translationKey, Icon }) => (
                          <button
                            key={action}
                            type="button"
                            className="format-button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleTableEditAction(action)}
                            title={t.table[translationKey]}
                            aria-label={t.table[translationKey]}
                            disabled={isTableActionDisabled(action)}
                          >
                            <Icon size={15} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <span className="panel-file-name">{withMarkdownExtension(fileName)}</span>
                  </div>
                  {isSearchVisible && (
                    <div className="search-bar" role="search" aria-label={t.search.findAndReplace}>
                      <div className="search-row">
                        <label className="search-field">
                          <SearchIcon size={15} aria-hidden="true" />
                          <input
                            ref={searchInputRef}
                            type="search"
                            value={searchTerm}
                            placeholder={t.search.find}
                            aria-label={t.search.findText}
                            spellCheck={false}
                            onChange={(event) => {
                              setSearchTerm(event.target.value)
                              setActiveSearchRange(null)
                            }}
                            onKeyDown={handleSearchKeyDown}
                          />
                        </label>
                        <span className="search-count" aria-live="polite">{searchStatusLabel}</span>
                        <button
                          type="button"
                          className="search-icon-button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => moveSearchMatch('previous')}
                          title={t.search.previousMatch}
                          aria-label={t.search.previousMatch}
                        >
                          <ChevronUp size={15} />
                        </button>
                        <button
                          type="button"
                          className="search-icon-button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => moveSearchMatch('next')}
                          title={t.search.nextMatch}
                          aria-label={t.search.nextMatch}
                        >
                          <ChevronDown size={15} />
                        </button>
                        <button
                          type="button"
                          className={isSearchCaseSensitive ? 'search-toggle active' : 'search-toggle'}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => setIsSearchCaseSensitive((isEnabled) => !isEnabled)}
                          title={t.search.matchCase}
                          aria-label={t.search.matchCase}
                        >
                          <CaseSensitive size={16} />
                        </button>
                        <button
                          type="button"
                          className={isSearchWholeWord ? 'search-toggle active' : 'search-toggle'}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => setIsSearchWholeWord((isEnabled) => !isEnabled)}
                          title={t.search.matchWholeWord}
                          aria-label={t.search.matchWholeWord}
                        >
                          <WholeWord size={16} />
                        </button>
                        <button
                          type="button"
                          className="search-icon-button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => setIsReplaceVisible((isVisible) => !isVisible)}
                          title={t.search.toggleReplace}
                          aria-label={t.search.toggleReplace}
                        >
                          <Replace size={15} />
                        </button>
                        <button
                          type="button"
                          className="search-icon-button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={closeSearchBar}
                          title={t.search.closeFind}
                          aria-label={t.search.closeFind}
                        >
                          <X size={15} />
                        </button>
                      </div>
                      {isReplaceVisible && (
                        <div className="search-row replace-row">
                          <label className="search-field replace-field">
                            <Replace size={15} aria-hidden="true" />
                            <input
                              type="text"
                              value={replaceTerm}
                              placeholder={t.search.replace}
                              aria-label={t.search.replaceText}
                              spellCheck={false}
                              onChange={(event) => setReplaceTerm(event.target.value)}
                              onKeyDown={handleSearchKeyDown}
                            />
                          </label>
                          <button
                            type="button"
                            className="search-action-button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={replaceCurrentSearchMatch}
                            title={t.search.replaceCurrentMatch}
                          >
                            <Replace size={14} />
                            <span>{t.search.replace}</span>
                          </button>
                          <button
                            type="button"
                            className="search-action-button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={replaceAllSearchMatches}
                            title={t.search.replaceAllMatches}
                          >
                            <ReplaceAllIcon size={14} />
                            <span>{t.search.all}</span>
                          </button>
                        </div>
                      )}
                      {searchTerm.length > 0 && (
                        <div className="search-results" aria-label={t.search.searchResults}>
                          {searchResults.length > 0 ? (
                            <>
                              {hiddenSearchResultsBefore > 0 && (
                                <div className="search-result-more">
                                  {t.search.previousResults.replace('{count}', String(hiddenSearchResultsBefore))}
                                </div>
                              )}
                              {visibleSearchResults.map((result) => {
                                const isActiveResult = activeSearchRange?.from === result.from && activeSearchRange.to === result.to

                                return (
                                  <button
                                    type="button"
                                    key={`${result.from}-${result.to}`}
                                    className={isActiveResult ? 'search-result active' : 'search-result'}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => jumpToSearchResult(result)}
                                  >
                                    <span className="search-result-line">{t.search.line} {result.lineNumber}</span>
                                    <span className="search-result-context">
                                      {result.contextBefore && <span>{result.contextBefore} </span>}
                                      <mark>{result.matchText}</mark>
                                      {result.contextAfter && <span> {result.contextAfter}</span>}
                                    </span>
                                  </button>
                                )
                              })}
                              {hiddenSearchResultsAfter > 0 && (
                                <div className="search-result-more">
                                  {t.search.moreResults.replace('{count}', String(hiddenSearchResultsAfter))}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="search-result-empty">{t.search.noResults}</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="editor-host">
                    <CodeMirror
                      ref={editorRef}
                      value={markdownValue}
                      height="100%"
                      basicSetup={{
                        lineNumbers: false,
                        foldGutter: true,
                        highlightActiveLine: true,
                        autocompletion: true,
                      }}
                      extensions={editorExtensions}
                      theme={theme === 'dark' ? oneDark : 'light'}
                      onCreateEditor={(view) => {
                        editorScrollCleanupRef.current?.()
                        editorViewRef.current = view
                        restoreEditorSessionState(view)
                        syncEditorPosition(view)
                        setNextTableEditingState(getTableEditingState(view))
                        const handleEditorScroll = () => {
                          syncPreviewScrollFromEditorRef.current()
                          syncEditorPosition(view)
                          scheduleEditorSessionPersist()
                        }
                        view.scrollDOM.addEventListener('scroll', handleEditorScroll)
                        editorScrollCleanupRef.current = () => {
                          persistCurrentEditorSession(view)
                          view.scrollDOM.removeEventListener('scroll', handleEditorScroll)
                        }
                      }}
                      onUpdate={(viewUpdate) => {
                        if (viewUpdate.docChanged || viewUpdate.selectionSet) {
                          syncEditorPosition(viewUpdate.view)
                          setNextTableEditingState(getTableEditingState(viewUpdate.view))
                          scheduleEditorSessionPersist()
                        }
                      }}
                      onChange={(value) => setMarkdownValue(value)}
                    />
                  </div>
                </section>
              )}

              {mode === 'split' && (
                <button
                  type="button"
                  className="split-resizer"
                  title={t.editor.resizeSplitView}
                  aria-label={t.editor.resizeSplitView}
                  onPointerDown={handleSplitPointerResizeStart}
                  onMouseDown={handleSplitMouseResizeStart}
                  onKeyDown={handleSplitResizeKeyDown}
                >
                  <span aria-hidden="true"></span>
                </button>
              )}

              {(mode === 'preview' || mode === 'split') && (
            <section className="preview-panel panel" aria-label={t.editor.markdownPreview}>
              <div className="panel-header">
                <span>{t.editor.preview}</span>
                <span>{stats.words} {t.editor.wordCountSuffix}</span>
              </div>
              <div className="preview-scroll" ref={previewScrollRef} onScroll={syncEditorScrollFromPreview}>
                {markdownValue.trim().length > 0 ? (
                  <article
                    className="markdown-preview"
                    onClick={handlePreviewClick}
                    onKeyDown={handlePreviewKeyDown}
                    dangerouslySetInnerHTML={{ __html: renderedHtml }}
                  />
                ) : (
                  <div className="empty-preview">{t.editor.emptyDocument}</div>
                )}
              </div>
            </section>
          )}
            </>
          )}
        </section>
      </main>

      <footer className="status-bar">
        <span>{fileName}</span>
        <span>{t.viewModes[mode]}</span>
        <span className="status-position">{footerPositionLabel}</span>
        <span>{hasUnsavedChanges ? t.document.unsaved : t.document.saved}</span>
        <span className={documentOperationStatus ? `status-message ${documentOperationStatus.tone}` : undefined}>
          {footerStatusLabel}
        </span>
      </footer>

      {isCommandPaletteOpen && (
        <div className="command-palette-backdrop" role="presentation" onMouseDown={closeCommandPalette}>
          <form
            className="command-palette"
            role="dialog"
            aria-label={t.toolbar.commandPalette}
            onSubmit={handleCommandPaletteSubmit}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <label className="command-search-field">
              <CommandIcon size={17} aria-hidden="true" />
              <input
                ref={commandInputRef}
                type="search"
                value={commandQuery}
                placeholder={t.commandPalette.typeCommand}
                aria-label={t.commandPalette.commandSearch}
                spellCheck={false}
                onChange={(event) => {
                  setCommandQuery(event.target.value)
                  setActiveCommandIndex(0)
                }}
                onKeyDown={handleCommandPaletteKeyDown}
              />
            </label>

            <div className="command-list" aria-label={t.commandPalette.availableCommands}>
              {filteredCommandPaletteItems.length > 0 ? (
                filteredCommandPaletteItems.slice(0, 8).map((item, index) => {
                  const Icon = item.Icon

                  return (
                    <button
                      type="button"
                      key={item.id}
                      className={index === safeActiveCommandIndex ? 'command-item active' : 'command-item'}
                      onMouseEnter={() => setActiveCommandIndex(index)}
                      onClick={() => runCommandPaletteItem(item)}
                    >
                      <Icon size={16} aria-hidden="true" />
                      <span className="command-copy">
                        <strong>{item.label}</strong>
                        <small>{item.group}</small>
                      </span>
                      {item.shortcut && <kbd>{item.shortcut}</kbd>}
                    </button>
                  )
                })
              ) : (
                <div className="command-empty">{t.commandPalette.noCommandsFound}</div>
              )}
            </div>
          </form>
        </div>
      )}

      {isGoToLineOpen && (
        <div className="command-palette-backdrop" role="presentation" onMouseDown={closeGoToLineDialog}>
          <form
            className="command-palette go-to-line-dialog"
            role="dialog"
            aria-label={t.goToLine.title}
            onSubmit={handleGoToLineSubmit}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <label className="command-search-field">
              <ListOrdered size={17} aria-hidden="true" />
              <input
                ref={lineNumberInputRef}
                type="text"
                inputMode="numeric"
                value={lineNumberInput}
                placeholder={t.goToLine.placeholder}
                aria-label={t.goToLine.lineNumber}
                aria-describedby="go-to-line-range go-to-line-error"
                spellCheck={false}
                onChange={(event) => {
                  setLineNumberInput(event.target.value)
                  setLineNumberError('')
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    closeGoToLineDialog()
                  }
                }}
              />
            </label>
            <div className="go-to-line-footer">
              <span id="go-to-line-range" className="go-to-line-range">
                {formatTranslation(t.goToLine.range, { max: String(lineJumpMaxLine) })}
              </span>
              <div className="go-to-line-actions">
                <button type="button" className="search-action-button" onClick={closeGoToLineDialog}>
                  <span>{t.goToLine.cancel}</span>
                </button>
                <button type="submit" className="search-action-button primary">
                  <span>{t.goToLine.go}</span>
                </button>
              </div>
            </div>
            {lineNumberError && (
              <p id="go-to-line-error" className="go-to-line-error" role="alert">
                {lineNumberError}
              </p>
            )}
          </form>
        </div>
      )}

      {isQuickOpenOpen && (
        <div className="command-palette-backdrop" role="presentation" onMouseDown={closeQuickOpen}>
          <form
            className="command-palette quick-open"
            role="dialog"
            aria-label={t.workspace.quickOpen}
            onSubmit={handleQuickOpenSubmit}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <label className="command-search-field">
              <SearchIcon size={17} aria-hidden="true" />
              <input
                ref={quickOpenInputRef}
                type="search"
                value={quickOpenQuery}
                placeholder={t.workspace.quickOpenPlaceholder}
                aria-label={t.workspace.quickOpenSearch}
                spellCheck={false}
                onChange={(event) => {
                  setQuickOpenQuery(event.target.value)
                  setActiveQuickOpenIndex(0)
                }}
                onKeyDown={handleQuickOpenKeyDown}
              />
            </label>

            <div className="command-list quick-open-list" aria-label={t.workspace.quickOpenResults}>
              {visibleQuickOpenItems.length > 0 ? (
                visibleQuickOpenEntries.map((entry) => {
                  if (entry.type === 'group') {
                    return (
                      <div key={entry.id} className="quick-open-group-label">
                        {t.workspace.quickOpenSources[entry.source]}
                      </div>
                    )
                  }

                  const { item, index } = entry

                  return (
                    <button
                      type="button"
                      key={item.id}
                      className={index === safeActiveQuickOpenIndex ? 'command-item active' : 'command-item'}
                      onMouseEnter={() => setActiveQuickOpenIndex(index)}
                      onClick={() => openQuickOpenFile(item)}
                      title={item.filePath}
                    >
                      <FileText size={16} aria-hidden="true" />
                      <span className="command-copy">
                        <strong>{item.title}</strong>
                        <small>{item.detail}</small>
                      </span>
                      <span className="quick-open-meta">
                        <small>{t.workspace.quickOpenSources[item.source]}</small>
                        <kbd>{fileDateFormatter.format(item.timestamp)}</kbd>
                      </span>
                    </button>
                  )
                })
              ) : (
                <div className="command-empty">{t.workspace.noQuickOpenMatches}</div>
              )}
            </div>
          </form>
        </div>
      )}

      {isExportPreviewOpen && (
        <div className="export-preview-backdrop" role="presentation" onMouseDown={closeExportPreview}>
          <section
            className="export-preview-dialog"
            role="dialog"
            aria-label={t.exportPreview.preview}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="export-preview-header">
              <div>
                <h2>{t.exportPreview.preview}</h2>
                <span>{t.exportPreview.styleLabel} {t.exportStyles[exportStyle]}</span>
              </div>
              <div className="export-preview-actions">
                <button type="button" className="theme-choice export-preview-action" onClick={handlePrintExportPreview}>
                  <Printer size={16} />
                  <span>{t.exportPreview.print}</span>
                </button>
                <button type="button" className="theme-choice export-preview-action" onClick={() => { void handleExportHtml() }}>
                  <Download size={16} />
                  <span>HTML</span>
                </button>
                <button type="button" className="theme-choice export-preview-action" onClick={() => { void handleExportPdf() }}>
                  <FileDown size={16} />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={closeExportPreview}
                  title={t.exportPreview.close}
                  aria-label={t.exportPreview.close}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <iframe
              ref={exportPreviewFrameRef}
              className="export-preview-frame"
              title={t.exportPreview.documentFrame}
              srcDoc={buildExportHtml()}
            />
          </section>
        </div>
      )}

      {isThemeSettingsOpen && (
        <div className="settings-backdrop" role="presentation" onMouseDown={closeThemeSettings}>
          <section
            className="settings-dialog"
            role="dialog"
            aria-label={t.toolbar.settings}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="settings-header">
              <div>
                <h2>{t.settings.appearance}</h2>
                <span>{themePreference === 'system' ? `${t.themes.system} ${t.themes[systemTheme]}` : t.themes[themePreference]}</span>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={closeThemeSettings}
                title={t.settings.closeSettings}
                aria-label={t.settings.closeSettings}
              >
                <X size={16} />
              </button>
            </div>

            <div className="settings-section">
              <span className="settings-label">{t.settings.theme}</span>
              <div className="theme-choice-group" aria-label={t.settings.themePreference}>
                {themeOptions.map(({ value, Icon }) => {
                  const label = t.themes[value]

                  return (
                  <button
                    type="button"
                    key={value}
                    className={themePreference === value ? 'theme-choice active' : 'theme-choice'}
                    onClick={() => setThemePreference(value)}
                    aria-label={`${label} ${t.settings.themeSuffix}`}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </button>
                  )
                })}
              </div>
            </div>

            <div className="settings-section">
              <span className="settings-label">{t.settings.language}</span>
              <div className="theme-choice-group" aria-label={t.settings.languagePreference}>
                {localeOptions.map(({ value, Icon }) => {
                  const label = t.locales[value]

                  return (
                    <button
                      type="button"
                      key={value}
                      className={localePreference === value ? 'theme-choice active' : 'theme-choice'}
                      onClick={() => setLocalePreference(value)}
                      aria-label={label}
                    >
                      <Icon size={16} />
                      <span>{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <label className="settings-section font-size-setting">
              <span className="settings-label">{t.settings.editorFontSize}</span>
              <div className="range-row">
                <Type size={16} aria-hidden="true" />
                <input
                  type="range"
                  min={minEditorFontSize}
                  max={maxEditorFontSize}
                  step="1"
                  value={editorFontSize}
                  onChange={(event) => setEditorFontSize(clampEditorFontSize(Number(event.target.value)))}
                  aria-label={t.settings.editorFontSize}
                />
                <strong>{editorFontSize}px</strong>
              </div>
            </label>

            <div className="settings-section">
              <span className="settings-label">{t.settings.exportStyle}</span>
              <div className="theme-choice-group export-style-group" aria-label={t.settings.exportStylePreference}>
                {exportStyleOptions.map(({ value, Icon }) => {
                  const label = t.exportStyles[value]

                  return (
                    <button
                      type="button"
                      key={value}
                      className={exportStyle === value ? 'theme-choice active' : 'theme-choice'}
                      onClick={() => setExportStyle(value)}
                      aria-label={`${label} ${t.settings.exportStyleSuffix}`}
                    >
                      <Icon size={16} />
                      <span>{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="settings-section update-setting">
              <span className="settings-label">{t.settings.updates}</span>
              <div className="update-panel">
                <div className="update-copy">
                  <strong>{updateMessage}</strong>
                  <span>
                    {t.settings.currentVersion} {updateStatus.version}
                    {updateStatus.updateVersion ? ` · ${t.settings.latestVersion} ${updateStatus.updateVersion}` : ''}
                  </span>
                  {updateProgressLabel && (
                    <span>{t.settings.updateProgress} {updateProgressLabel}</span>
                  )}
                  {updateStatus.error && <span className="update-error">{updateStatus.error}</span>}
                </div>
                <div className="update-actions">
                  {updateStatus.canInstall && (
                    <button type="button" className="theme-choice update-action" onClick={handleInstallUpdate}>
                      <RotateCcw size={16} />
                      <span>{t.settings.restartToUpdate}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="theme-choice update-action"
                    onClick={handleCheckForUpdates}
                    disabled={!updateStatus.canCheck}
                  >
                    <RefreshCw size={16} />
                    <span>{updateStatus.state === 'checking' ? t.settings.checkingForUpdates : t.settings.checkForUpdates}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
