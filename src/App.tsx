import {
  type FormEvent as ReactFormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
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
  Moon,
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
  Type,
  WholeWord,
  X,
  type LucideIcon,
} from 'lucide-react'
import './App.css'
import {
  type AppLocale,
  type LocalePreference,
  getPreferredLocale,
  isLocalePreference,
  translations,
} from './i18n'

type ViewMode = 'write' | 'split' | 'preview'
type ThemeMode = 'light' | 'dark'
type ThemePreference = ThemeMode | 'system'
type SidebarTab = 'document' | 'outline' | 'recent'
type InlineFormat = 'bold' | 'italic' | 'link'
type BlockFormat = 'heading-2' | 'bullet-list' | 'ordered-list' | 'quote' | 'code-block' | 'table'
type MarkdownFormat = InlineFormat | BlockFormat

type OutlineItem = {
  level: number
  title: string
  lineNumber: number
  lineStart: number
}

type DocumentStats = {
  words: number
  characters: number
  lines: number
  headings: number
}

type RecentFile = {
  filePath: string
  fileName: string
  openedAt: number
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
const themeStorageKey = 'openmark:theme'
const localeStorageKey = 'openmark:locale'
const editorFontSizeStorageKey = 'openmark:editor-font-size'
const recentFilesStorageKey = 'openmark:recent-files'
const splitPaneRatioStorageKey = 'openmark:split-pane-ratio'
const viewModeStorageKey = 'openmark:view-mode'
const sidebarTabStorageKey = 'openmark:sidebar-tab'
const maxRecentFiles = 6
const defaultSplitPaneRatio = 50
const minSplitPaneRatio = 30
const maxSplitPaneRatio = 70
const defaultEditorFontSize = 16
const minEditorFontSize = 14
const maxEditorFontSize = 22
const invalidFileNameCharacters = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*'])
const imageFileExtensions = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'])

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
const validSidebarTabs = new Set<SidebarTab>(['document', 'outline', 'recent'])
const validThemePreferences = new Set<ThemePreference>(['light', 'dark', 'system'])

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

const defaultUpdateStatus: OpenMarkUpdateStatus = {
  state: 'unsupported',
  message: '',
  version: '0.3.0',
  updateVersion: null,
  progress: null,
  canCheck: false,
  canInstall: false,
  error: null,
}

const markdownToolbarGroups: Array<
  Array<{
    format: MarkdownFormat
    label: string
    title: string
    Icon: LucideIcon
  }>
> = [
  [
    { format: 'bold', label: 'Bold', title: 'Bold (Ctrl+B)', Icon: Bold },
    { format: 'italic', label: 'Italic', title: 'Italic (Ctrl+I)', Icon: Italic },
    { format: 'link', label: 'Link', title: 'Insert link (Ctrl+K)', Icon: LinkIcon },
  ],
  [
    { format: 'heading-2', label: 'Heading', title: 'Format as heading', Icon: Heading2 },
    { format: 'bullet-list', label: 'Bullet list', title: 'Format as bullet list', Icon: List },
    { format: 'ordered-list', label: 'Numbered list', title: 'Format as numbered list', Icon: ListOrdered },
  ],
  [
    { format: 'quote', label: 'Quote', title: 'Format as quote', Icon: Quote },
    { format: 'code-block', label: 'Code block', title: 'Insert code block', Icon: Code2 },
    { format: 'table', label: 'Table', title: 'Insert or convert table', Icon: Table },
  ],
]

function loadStoredValue(key: string, fallback: string) {
  return window.localStorage.getItem(key) ?? fallback
}

function loadRecentFiles(): RecentFile[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(recentFilesStorageKey) ?? '[]')

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter(
        (item): item is RecentFile =>
          typeof item?.filePath === 'string' &&
          typeof item?.fileName === 'string' &&
          typeof item?.openedAt === 'number',
      )
      .slice(0, maxRecentFiles)
  } catch {
    return []
  }
}

function persistRecentFiles(recentFiles: RecentFile[]) {
  window.localStorage.setItem(recentFilesStorageKey, JSON.stringify(recentFiles))
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

function getBaseName(fileName: string) {
  return fileName.replace(/\.(md|markdown|txt|html)$/i, '') || 'document'
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

function createMarkdownTable(selectedText: string) {
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

  return [
    '| Column 1 | Column 2 | Column 3 |',
    '| --- | --- | --- |',
    '| Value 1 | Value 2 | Value 3 |',
    '| Value 4 | Value 5 | Value 6 |',
  ].join('\n')
}

function applyTableFormat(view: EditorView) {
  const selection = view.state.selection.main
  const selectedText = view.state.sliceDoc(selection.from, selection.to)
  const insertText = createMarkdownTable(selectedText)
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

function formatBlockLine(line: string, index: number, format: Exclude<BlockFormat, 'code-block' | 'table'>) {
  const trimmedLine = line.trimStart()
  const indent = line.slice(0, line.length - trimmedLine.length)

  if (format === 'heading-2') {
    const body = trimmedLine.replace(/^#{1,6}\s*/, '')
    return `${indent}## ${body || 'Heading'}`
  }

  if (format === 'bullet-list') {
    const body = trimmedLine.replace(/^([-*+]\s+|\d+\.\s+)/, '')
    return `${indent}- ${body || 'List item'}`
  }

  if (format === 'ordered-list') {
    const body = trimmedLine.replace(/^([-*+]\s+|\d+\.\s+)/, '')
    return `${indent}${index + 1}. ${body || 'List item'}`
  }

  const body = trimmedLine.replace(/^>\s?/, '')
  return `${indent}> ${body || 'Quote'}`
}

function applyBlockFormat(view: EditorView, format: BlockFormat) {
  if (format === 'code-block') {
    return applyCodeBlockFormat(view)
  }

  if (format === 'table') {
    return applyTableFormat(view)
  }

  const selection = view.state.selection.main
  const lineEndPosition = selection.empty ? selection.to : Math.max(selection.from, selection.to - 1)
  const fromLine = view.state.doc.lineAt(selection.from)
  const toLine = view.state.doc.lineAt(lineEndPosition)
  const selectedLines = view.state.sliceDoc(fromLine.from, toLine.to).split('\n')
  const insertText = selectedLines
    .map((line, index) => formatBlockLine(line, index, format))
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

function applyMarkdownFormat(view: EditorView, format: MarkdownFormat) {
  return isInlineFormat(format)
    ? applyInlineFormat(view, format)
    : applyBlockFormat(view, format)
}

function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const editorWorkbenchRef = useRef<HTMLElement | null>(null)
  const editorRef = useRef<ReactCodeMirrorRef | null>(null)
  const editorViewRef = useRef<EditorView | null>(null)
  const pendingOutlineJumpRef = useRef<OutlineItem | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const commandInputRef = useRef<HTMLInputElement | null>(null)
  const previewImageSourcesRef = useRef<PreviewImageSource[]>([])
  const initialMarkdownValue = useMemo(() => loadStoredValue(draftStorageKey, ''), [])
  const [markdownValue, setMarkdownValue] = useState(initialMarkdownValue)
  const [fileName, setFileName] = useState(() =>
    loadStoredValue(fileNameStorageKey, 'untitled.md'),
  )
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState(initialMarkdownValue)
  const [recentFiles, setRecentFiles] = useState(loadRecentFiles)
  const [isWelcomeVisible, setIsWelcomeVisible] = useState(initialMarkdownValue.trim().length === 0)
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>(loadSidebarTab)
  const [splitPaneRatio, setSplitPaneRatio] = useState(loadSplitPaneRatio)
  const [mode, setMode] = useState<ViewMode>(loadViewMode)
  const [themePreference, setThemePreference] = useState<ThemePreference>(loadThemePreference)
  const [systemTheme, setSystemTheme] = useState<ThemeMode>(getSystemTheme)
  const [localePreference, setLocalePreference] = useState<LocalePreference>(loadLocalePreference)
  const [systemLocale, setSystemLocale] = useState<AppLocale>(getSystemLocale)
  const [editorFontSize, setEditorFontSize] = useState(loadEditorFontSize)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [activeOutlineLine, setActiveOutlineLine] = useState<number | null>(null)
  const [isSearchVisible, setIsSearchVisible] = useState(false)
  const [isReplaceVisible, setIsReplaceVisible] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [replaceTerm, setReplaceTerm] = useState('')
  const [isSearchCaseSensitive, setIsSearchCaseSensitive] = useState(false)
  const [isSearchWholeWord, setIsSearchWholeWord] = useState(false)
  const [activeSearchRange, setActiveSearchRange] = useState<SearchMatch | null>(null)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const [activeCommandIndex, setActiveCommandIndex] = useState(0)
  const [previewImageSources, setPreviewImageSources] = useState<PreviewImageSource[]>([])
  const [isThemeSettingsOpen, setIsThemeSettingsOpen] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<OpenMarkUpdateStatus>(defaultUpdateStatus)
  const theme = themePreference === 'system' ? systemTheme : themePreference
  const locale = localePreference === 'system' ? systemLocale : localePreference
  const t = translations[locale]

  const editorExtensions = useMemo(
    () => [
      markdown({ base: markdownLanguage }),
      search({ top: true }),
      keymap.of([
        { key: 'Mod-b', run: (view) => applyInlineFormat(view, 'bold') },
        { key: 'Mod-i', run: (view) => applyInlineFormat(view, 'italic') },
        { key: 'Mod-k', run: (view) => applyInlineFormat(view, 'link') },
      ]),
    ],
    [],
  )

  const rawRenderedHtml = useMemo(
    () => markdownRenderer.render(markdownValue),
    [markdownValue],
  )
  const exportHtml = useMemo(
    () => sanitizeMarkdownHtml(rawRenderedHtml),
    [rawRenderedHtml],
  )
  const renderedHtml = useMemo(
    () => sanitizeMarkdownHtml(rewritePreviewImageSources(rawRenderedHtml, activeFilePath, previewImageSources)),
    [activeFilePath, previewImageSources, rawRenderedHtml],
  )

  const outline = useMemo(() => getOutline(markdownValue), [markdownValue])
  const searchMatches = useMemo(
    () => getSearchMatches(markdownValue, searchTerm, {
      caseSensitive: isSearchCaseSensitive,
      wholeWord: isSearchWholeWord,
    }),
    [isSearchCaseSensitive, isSearchWholeWord, markdownValue, searchTerm],
  )
  const stats = useMemo(
    () => getDocumentStats(markdownValue, outline),
    [markdownValue, outline],
  )
  const activeSearchMatchIndex = activeSearchRange
    ? searchMatches.findIndex((match) => match.from === activeSearchRange.from && match.to === activeSearchRange.to)
    : -1
  const searchStatusLabel = searchTerm.length === 0
    ? t.search.noQuery
    : `${activeSearchMatchIndex >= 0 ? activeSearchMatchIndex + 1 : 0} ${t.search.of} ${searchMatches.length}`
  const hasUnsavedChanges = markdownValue !== savedSnapshot
  const showWelcome = isWelcomeVisible && markdownValue.trim().length === 0 && activeFilePath === null
  const appTitle = showWelcome
    ? 'OpenMark'
    : `${hasUnsavedChanges ? '* ' : ''}${withMarkdownExtension(fileName)} - OpenMark`
  const sidebarTabs: Array<{ value: SidebarTab; label: string; detail: string }> = [
    { value: 'document', label: t.sidebar.document, detail: hasUnsavedChanges ? t.document.unsaved : t.document.saved },
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
      id: 'theme-settings',
      label: t.commands.openAppearanceSettings,
      group: t.groups.view,
      Icon: Settings2,
      keywords: ['theme', 'appearance', 'font', 'system'],
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

  useEffect(() => {
    const saveTimer = window.setTimeout(() => {
      window.localStorage.setItem(draftStorageKey, markdownValue)
      window.localStorage.setItem(fileNameStorageKey, fileName)
      persistRecentFiles(recentFiles)
      setLastSavedAt(new Date())
    }, 250)

    return () => window.clearTimeout(saveTimer)
  }, [fileName, markdownValue, recentFiles])

  useEffect(() => {
    window.localStorage.setItem(themeStorageKey, themePreference)
  }, [themePreference])

  useEffect(() => {
    window.localStorage.setItem(localeStorageKey, localePreference)
  }, [localePreference])

  useEffect(() => {
    window.localStorage.setItem(editorFontSizeStorageKey, editorFontSize.toFixed(0))
  }, [editorFontSize])

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
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
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
    const pendingJump = pendingOutlineJumpRef.current

    if (!pendingJump || mode === 'preview') {
      return
    }

    window.requestAnimationFrame(() => {
      jumpToEditorLine(pendingJump)
      pendingOutlineJumpRef.current = null
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
        case 'save-document':
          void handleSaveMarkdown()
          break
        case 'save-document-as':
          void handleSaveMarkdown({ forceDialog: true })
          break
        case 'export-html':
          void handleExportHtml()
          break
        case 'export-pdf':
          void handleExportPdf()
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
        case 'open-theme-settings':
          openThemeSettings()
          break
        case 'find-document':
          openSearchBar('find')
          break
        case 'replace-document':
          openSearchBar('replace')
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

    setRecentFiles((currentFiles) => [
      { filePath, fileName: nextFileName, openedAt: Date.now() },
      ...currentFiles.filter((item) => item.filePath !== filePath),
    ].slice(0, maxRecentFiles))
  }

  function removeRecentFile(filePath: string) {
    setRecentFiles((currentFiles) => currentFiles.filter((item) => item.filePath !== filePath))
  }

  function clearRecentFiles() {
    setRecentFiles([])
  }

  function confirmDiscardChanges(action: string) {
    if (!hasUnsavedChanges) {
      return true
    }

    return window.confirm(`${t.alerts.unsavedChanges} ${action}`)
  }

  function handleNewDocument() {
    if (!confirmDiscardChanges(t.alerts.startNewDocument)) {
      return
    }

    const nextMarkdown = '# Untitled\n\n'

    setMarkdownValue(nextMarkdown)
    setFileName('untitled.md')
    setActiveFilePath(null)
    setSavedSnapshot(nextMarkdown)
    setIsWelcomeVisible(false)
    clearPreviewImageSources()
  }

  function applyOpenedDocument(content: string, nextFileName: string, nextFilePath: string | null) {
    setMarkdownValue(content)
    setFileName(nextFileName)
    setActiveFilePath(nextFilePath)
    setSavedSnapshot(content)
    rememberRecentFile(nextFilePath, nextFileName)
    setLastSavedAt(new Date())
    setIsWelcomeVisible(false)
    clearPreviewImageSources()
  }

  async function openDesktopFile() {
    if (!confirmDiscardChanges(t.alerts.openAnotherDocument)) {
      return
    }

    const result = await window.openmark?.openMarkdownFile()

    if (!result || result.canceled || typeof result.content !== 'string' || !result.fileName) {
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
      window.alert(t.alerts.recentFileOpenFailed)
      removeRecentFile(filePath)
      return
    }

    if (!result || result.canceled || typeof result.content !== 'string' || !result.fileName) {
      if (result?.error) {
        window.alert(result.error)
        removeRecentFile(filePath)
      }
      return
    }

    applyOpenedDocument(result.content, result.fileName, result.filePath ?? null)
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

    const fileText = await selectedFile.text()

    setMarkdownValue(fileText)
    setFileName(selectedFile.name)
    setActiveFilePath(null)
    setSavedSnapshot(fileText)
    setLastSavedAt(new Date())
    setIsWelcomeVisible(false)
    clearPreviewImageSources()
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
      const result = await window.openmark.saveMarkdownFile({
        content: markdownValue,
        filePath: activeFilePath,
        fileName: targetFileName,
        forceDialog: shouldForceDialog,
      })

      if (!result.canceled && result.filePath) {
        setActiveFilePath(result.filePath)
        setFileName(result.fileName ?? targetFileName)
        setSavedSnapshot(markdownValue)
        rememberRecentFile(result.filePath, result.fileName ?? targetFileName)
        setLastSavedAt(new Date())
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
  }

  function buildExportHtml(contentHtml = exportHtml) {
    const title = escapeHtml(getBaseName(fileName))

    return `<!doctype html>
  <html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    @page { margin: 22mm 18mm; }
    body { margin: 0; background: #f7f8f4; color: #1c241d; font: 17px/1.7 ui-serif, Georgia, serif; }
    main { max-width: 780px; margin: 0 auto; padding: 56px 28px; }
    h1, h2, h3 { line-height: 1.2; font-family: ui-sans-serif, system-ui, sans-serif; }
    pre { overflow: auto; padding: 16px; background: #20251f; color: #f4f7ef; border-radius: 8px; }
    code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
    blockquote { margin-left: 0; padding-left: 18px; border-left: 4px solid #75a88f; color: #59675d; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #d9e2d8; padding: 8px 10px; }
    img { max-width: 100%; }
    @media print {
      body { background: #ffffff; }
      main { max-width: none; padding: 0; }
      pre, blockquote, table, img { break-inside: avoid; }
      a { color: inherit; }
    }
  </style>
</head>
<body>
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
    const htmlContent = buildExportHtml(renderedHtml)

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

  function toggleTheme() {
    setThemePreference((currentPreference) => {
      const currentTheme = currentPreference === 'system' ? systemTheme : currentPreference
      return currentTheme === 'dark' ? 'light' : 'dark'
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

    applyMarkdownFormat(editorView, format)
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

  function jumpToEditorLine(item: OutlineItem) {
    const editorView = editorViewRef.current ?? editorRef.current?.view

    if (!editorView) {
      return false
    }

    editorView.dispatch({
      selection: { anchor: item.lineStart },
      effects: EditorView.scrollIntoView(item.lineStart, { y: 'center' }),
      scrollIntoView: true,
    })

    const editorLines = editorView.dom.querySelectorAll('.cm-line')

    editorLines[item.lineNumber - 1]?.scrollIntoView({ block: 'center' })
    editorView.focus()

    return true
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

  function renderRecentFiles() {
    return (
      <div className="recent-list">
        {recentFiles.map((item) => (
          <div className="recent-file-row" key={item.filePath}>
            <button
              type="button"
              className="recent-open-button"
              onClick={() => handleOpenRecentFile(item.filePath)}
              title={item.filePath}
            >
              <span>{item.fileName}</span>
              <small>{new Date(item.openedAt).toLocaleDateString()}</small>
            </button>
            <button
              type="button"
              className="recent-remove-button"
              onClick={() => removeRecentFile(item.filePath)}
              title="Remove from recent"
              aria-label={`${t.document.removeFromRecent}: ${item.fileName}`}
            >
              <X size={14} />
            </button>
          </div>
        ))}
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
            title={t.toolbar.appearanceSettings}
            aria-label={t.toolbar.appearanceSettings}
          >
            <Settings2 size={18} />
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
          </section>
          )}

          {activeSidebarTab === 'outline' && (
          <section className="inspector-section outline-section">
            <h2>{t.sidebar.outline}</h2>
            {outline.length > 0 ? (
              <ol className="outline-list">
                {outline.slice(0, 12).map((item, index) => (
                  <li
                    key={`${item.title}-${index}`}
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
            ) : (
              <p className="muted">{t.document.noHeadingsYet}</p>
            )}
          </section>
          )}

          {activeSidebarTab === 'recent' && (
            <section className="inspector-section recent-section">
              <div className="section-heading-row">
                <h2>{t.sidebar.recent}</h2>
                {recentFiles.length > 0 && (
                  <button type="button" className="text-action" onClick={clearRecentFiles}>
                    {t.document.clear}
                  </button>
                )}
              </div>
              {window.openmark && recentFiles.length > 0 ? (
                renderRecentFiles()
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
                      <button type="button" className="text-action" onClick={clearRecentFiles}>
                        {t.document.clear}
                      </button>
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
                          {group.map(({ format, label, title, Icon }) => (
                            <button
                              key={format}
                              type="button"
                              className="format-button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handleMarkdownFormat(format)}
                              title={title}
                              aria-label={label}
                            >
                              <Icon size={15} />
                            </button>
                          ))}
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
                        editorViewRef.current = view
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
              <div className="preview-scroll">
                {markdownValue.trim().length > 0 ? (
                  <article
                    className="markdown-preview"
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
        <span>{hasUnsavedChanges ? t.document.unsaved : t.document.saved}</span>
        <span>{draftStatusLabel}</span>
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

      {isThemeSettingsOpen && (
        <div className="settings-backdrop" role="presentation" onMouseDown={closeThemeSettings}>
          <section
            className="settings-dialog"
            role="dialog"
            aria-label={t.toolbar.appearanceSettings}
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
                title={t.settings.closeAppearanceSettings}
                aria-label={t.settings.closeAppearanceSettings}
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
