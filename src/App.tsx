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
  Link as LinkIcon,
  List,
  ListOrdered,
  Moon,
  Quote,
  Replace,
  ReplaceAll as ReplaceAllIcon,
  Save,
  Search as SearchIcon,
  Sun,
  Table,
  Type,
  WholeWord,
  X,
  type LucideIcon,
} from 'lucide-react'
import './App.css'

type ViewMode = 'write' | 'split' | 'preview'
type ThemeMode = 'light' | 'dark'
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
const recentFilesStorageKey = 'openmark:recent-files'
const splitPaneRatioStorageKey = 'openmark:split-pane-ratio'
const viewModeStorageKey = 'openmark:view-mode'
const sidebarTabStorageKey = 'openmark:sidebar-tab'
const maxRecentFiles = 6
const defaultSplitPaneRatio = 50
const minSplitPaneRatio = 30
const maxSplitPaneRatio = 70
const invalidFileNameCharacters = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*'])
const imageFileExtensions = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'])

const markdownRenderer = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})

const modeOptions: Array<{
  value: ViewMode
  label: string
  Icon: LucideIcon
}> = [
  { value: 'write', label: 'Write', Icon: Type },
  { value: 'split', label: 'Split', Icon: Columns2 },
  { value: 'preview', label: 'Preview', Icon: Eye },
]

const validViewModes = new Set<ViewMode>(['write', 'split', 'preview'])
const validSidebarTabs = new Set<SidebarTab>(['document', 'outline', 'recent'])

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
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const storedTheme = window.localStorage.getItem(themeStorageKey)
    return storedTheme === 'dark' ? 'dark' : 'light'
  })
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
    ? 'No query'
    : `${activeSearchMatchIndex >= 0 ? activeSearchMatchIndex + 1 : 0} of ${searchMatches.length}`
  const hasUnsavedChanges = markdownValue !== savedSnapshot
  const showWelcome = isWelcomeVisible && markdownValue.trim().length === 0 && activeFilePath === null
  const appTitle = showWelcome
    ? 'OpenMark'
    : `${hasUnsavedChanges ? '* ' : ''}${withMarkdownExtension(fileName)} - OpenMark`
  const sidebarTabs: Array<{ value: SidebarTab; label: string; detail: string }> = [
    { value: 'document', label: 'Document', detail: hasUnsavedChanges ? 'Unsaved' : 'Saved' },
    { value: 'outline', label: 'Outline', detail: String(outline.length) },
    { value: 'recent', label: 'Recent', detail: String(recentFiles.length) },
  ]
  const commandPaletteItems: CommandPaletteItem[] = [
    {
      id: 'new-document',
      label: 'New document',
      group: 'File',
      shortcut: 'Ctrl+N',
      Icon: FilePlus2,
      keywords: ['create', 'blank', 'file'],
      action: handleNewDocument,
    },
    {
      id: 'open-document',
      label: 'Open Markdown file',
      group: 'File',
      shortcut: 'Ctrl+O',
      Icon: FolderOpen,
      keywords: ['load', 'file'],
      action: () => { void handleOpenDocument() },
    },
    {
      id: 'save-document',
      label: 'Save document',
      group: 'File',
      shortcut: 'Ctrl+S',
      Icon: Save,
      keywords: ['write', 'file'],
      action: () => { void handleSaveMarkdown() },
    },
    {
      id: 'save-document-as',
      label: 'Save document as',
      group: 'File',
      shortcut: 'Ctrl+Shift+S',
      Icon: Save,
      keywords: ['rename', 'copy'],
      action: () => { void handleSaveMarkdown({ forceDialog: true }) },
    },
    {
      id: 'export-html',
      label: 'Export HTML',
      group: 'File',
      shortcut: 'Ctrl+E',
      Icon: Download,
      keywords: ['publish', 'html'],
      action: () => { void handleExportHtml() },
    },
    {
      id: 'export-pdf',
      label: 'Export PDF',
      group: 'File',
      shortcut: 'Ctrl+Shift+E',
      Icon: FileDown,
      keywords: ['print', 'publish'],
      action: () => { void handleExportPdf() },
    },
    {
      id: 'find-document',
      label: 'Find in document',
      group: 'Edit',
      shortcut: 'Ctrl+F',
      Icon: SearchIcon,
      keywords: ['search'],
      action: () => openSearchBar('find'),
    },
    {
      id: 'replace-document',
      label: 'Replace in document',
      group: 'Edit',
      shortcut: 'Ctrl+H',
      Icon: Replace,
      keywords: ['search'],
      action: () => openSearchBar('replace'),
    },
    {
      id: 'insert-image',
      label: 'Insert image',
      group: 'Edit',
      Icon: ImagePlus,
      keywords: ['markdown', 'photo', 'picture', 'local'],
      action: () => { void handleInsertImage() },
    },
    {
      id: 'insert-table',
      label: 'Insert or convert table',
      group: 'Edit',
      Icon: Table,
      keywords: ['markdown', 'columns', 'rows'],
      action: () => handleMarkdownFormat('table'),
    },
    {
      id: 'write-mode',
      label: 'Switch to write mode',
      group: 'View',
      shortcut: 'Ctrl+1',
      Icon: Type,
      keywords: ['editor', 'source'],
      action: () => setMode('write'),
    },
    {
      id: 'split-mode',
      label: 'Switch to split mode',
      group: 'View',
      shortcut: 'Ctrl+2',
      Icon: Columns2,
      keywords: ['preview', 'editor'],
      action: () => setMode('split'),
    },
    {
      id: 'preview-mode',
      label: 'Switch to preview mode',
      group: 'View',
      shortcut: 'Ctrl+3',
      Icon: Eye,
      keywords: ['rendered'],
      action: () => setMode('preview'),
    },
    {
      id: 'document-panel',
      label: 'Show document panel',
      group: 'Workspace',
      Icon: FileText,
      keywords: ['sidebar', 'stats'],
      action: () => setActiveSidebarTab('document'),
    },
    {
      id: 'outline-panel',
      label: 'Show outline panel',
      group: 'Workspace',
      Icon: List,
      keywords: ['headings', 'sidebar'],
      action: () => setActiveSidebarTab('outline'),
    },
    {
      id: 'recent-panel',
      label: 'Show recent files panel',
      group: 'Workspace',
      Icon: FolderOpen,
      keywords: ['history', 'sidebar'],
      action: () => setActiveSidebarTab('recent'),
    },
    {
      id: 'toggle-theme',
      label: 'Toggle theme',
      group: 'View',
      shortcut: 'Ctrl+Shift+L',
      Icon: theme === 'dark' ? Sun : Moon,
      keywords: ['dark', 'light'],
      action: toggleTheme,
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
      return 'Waiting for draft save'
    }

    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(lastSavedAt)
  }, [lastSavedAt])

  useEffect(() => {
    const saveTimer = window.setTimeout(() => {
      window.localStorage.setItem(draftStorageKey, markdownValue)
      window.localStorage.setItem(fileNameStorageKey, fileName)
      window.localStorage.setItem(themeStorageKey, theme)
      persistRecentFiles(recentFiles)
      setLastSavedAt(new Date())
    }, 250)

    return () => window.clearTimeout(saveTimer)
  }, [fileName, markdownValue, recentFiles, theme])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

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
      }
    })
  })

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

    return window.confirm(`You have unsaved changes. ${action}?`)
  }

  function handleNewDocument() {
    if (!confirmDiscardChanges('Start a new document and discard them')) {
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
    if (!confirmDiscardChanges('Open another document and discard them')) {
      return
    }

    const result = await window.openmark?.openMarkdownFile()

    if (!result || result.canceled || typeof result.content !== 'string' || !result.fileName) {
      return
    }

    applyOpenedDocument(result.content, result.fileName, result.filePath ?? null)
  }

  async function handleOpenRecentFile(filePath: string) {
    if (!confirmDiscardChanges('Open another document and discard them')) {
      return
    }

    let result

    try {
      result = await window.openmark?.openRecentFile(filePath)
    } catch {
      window.alert('This recent file could not be opened.')
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

    if (!confirmDiscardChanges('Open another document and discard them')) {
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
      window.alert('Choose a PNG, JPG, GIF, WebP, or SVG image.')
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
<html lang="en">
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
      window.alert('Allow pop-ups to open the print view, then choose Save as PDF.')
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
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
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
              aria-label={`Remove ${item.fileName} from recent`}
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
            <span className="brand-subtitle">Local-first Markdown editor</span>
          </div>
        </div>

        <div className="toolbar" role="toolbar" aria-label="Editor toolbar">
          <div className="tool-group">
            <button
              type="button"
              className="icon-button"
              onClick={handleNewDocument}
              title="New document"
              aria-label="New document"
            >
              <FilePlus2 size={18} />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={handleOpenDocument}
              title="Open Markdown file"
              aria-label="Open Markdown file"
            >
              <FolderOpen size={18} />
            </button>
            <button
              type="button"
              className="tool-button"
              onClick={() => handleSaveMarkdown()}
              title="Save Markdown"
            >
              <Save size={17} />
              <span>Save</span>
            </button>
            <button
              type="button"
              className="tool-button compact-tool"
              onClick={() => handleSaveMarkdown({ forceDialog: true })}
              title="Save Markdown as a new file"
            >
              <Save size={17} />
              <span>As</span>
            </button>
            <button
              type="button"
              className="tool-button"
              onClick={handleExportHtml}
              title="Export HTML"
            >
              <Download size={17} />
              <span>HTML</span>
            </button>
            <button
              type="button"
              className="tool-button"
              onClick={() => { void handleExportPdf() }}
              title="Export PDF"
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
              title="Find in document"
              aria-label="Find in document"
            >
              <SearchIcon size={18} />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={() => openSearchBar('replace')}
              title="Replace in document"
              aria-label="Replace in document"
            >
              <Replace size={18} />
            </button>
          </div>

          <div className="segmented-control" aria-label="View mode">
            {modeOptions.map(({ value, label, Icon }) => (
              <button
                type="button"
                key={value}
                className={mode === value ? 'active' : ''}
                onClick={() => setMode(value)}
                aria-label={`${label} mode`}
                title={`${label} mode`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={toggleTheme}
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            type="button"
            className="icon-button"
            onClick={openCommandPalette}
            title="Command palette"
            aria-label="Command palette"
          >
            <CommandIcon size={18} />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          title="Open Markdown file"
          hidden
          tabIndex={-1}
          aria-hidden="true"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          onChange={handleFileOpen}
        />
        <input
          ref={imageInputRef}
          type="file"
          title="Insert image"
          hidden
          tabIndex={-1}
          aria-hidden="true"
          accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
          onChange={handleImageFileOpen}
        />
      </header>

      <main className={`workspace mode-${mode}${showWelcome ? ' is-welcome' : ''}`}>
        {!showWelcome && (
        <aside className="inspector" aria-label="Document inspector">
          <div className="sidebar-tabs" role="navigation" aria-label="Workspace panels">
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
            <h2>Document</h2>
            <label className="file-name-field">
              <span>File name</span>
              <div className="file-name-input-wrap">
                <FileText size={16} aria-hidden="true" />
                <input
                  type="text"
                  value={fileName}
                  spellCheck={false}
                  aria-label="Document file name"
                  onChange={(event) => setFileName(sanitizeFileNameInput(event.target.value))}
                  onBlur={() => setFileName(withMarkdownExtension(fileName))}
                />
              </div>
            </label>
            <div className="document-state" aria-live="polite">
              <span className={hasUnsavedChanges ? 'state-dot dirty' : 'state-dot saved'}></span>
              <span>{hasUnsavedChanges ? 'Unsaved changes' : 'Saved'}</span>
            </div>
            {window.openmark && (
              <p className="file-path" title={activeFilePath ?? 'Unsaved desktop document'}>
                {activeFilePath ?? 'Unsaved desktop document'}
              </p>
            )}
            <div className="metric-list">
              <div>
                <span>Words</span>
                <strong>{stats.words}</strong>
              </div>
              <div>
                <span>Characters</span>
                <strong>{stats.characters}</strong>
              </div>
              <div>
                <span>Lines</span>
                <strong>{stats.lines}</strong>
              </div>
              <div>
                <span>Headings</span>
                <strong>{stats.headings}</strong>
              </div>
            </div>
          </section>
          )}

          {activeSidebarTab === 'outline' && (
          <section className="inspector-section outline-section">
            <h2>Outline</h2>
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
                      title={`Go to line ${item.lineNumber}`}
                    >
                      <span>{item.title}</span>
                      <small>:{item.lineNumber}</small>
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">No headings yet</p>
            )}
          </section>
          )}

          {activeSidebarTab === 'recent' && (
            <section className="inspector-section recent-section">
              <div className="section-heading-row">
                <h2>Recent</h2>
                {recentFiles.length > 0 && (
                  <button type="button" className="text-action" onClick={clearRecentFiles}>
                    Clear
                  </button>
                )}
              </div>
              {window.openmark && recentFiles.length > 0 ? (
                renderRecentFiles()
              ) : (
                <p className="muted">No recent files</p>
              )}
            </section>
          )}
          </div>
        </aside>
        )}

        <section
          ref={editorWorkbenchRef}
          className="editor-workbench"
          aria-label="Editor workspace"
        >
          {showWelcome ? (
            <section className="welcome-panel" aria-label="Welcome">
              <div className="welcome-inner">
                <div className="welcome-mark" aria-hidden="true">
                  <FileText size={28} />
                </div>
                <h1>OpenMark</h1>
                <div className="welcome-actions">
                  <button type="button" className="welcome-action" onClick={handleNewDocument}>
                    <FilePlus2 size={20} />
                    <span>New document</span>
                  </button>
                  <button type="button" className="welcome-action" onClick={handleOpenDocument}>
                    <FolderOpen size={20} />
                    <span>Open file</span>
                  </button>
                </div>
                {window.openmark && recentFiles.length > 0 && (
                  <section className="welcome-recent" aria-label="Recent files">
                    <div className="section-heading-row">
                      <h2>Recent</h2>
                      <button type="button" className="text-action" onClick={clearRecentFiles}>
                        Clear
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
                <section className="editor-panel panel" aria-label="Markdown editor">
                  <div className="panel-header editor-panel-header">
                    <span>Markdown</span>
                    <div className="format-toolbar" role="toolbar" aria-label="Markdown formatting">
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
                          title="Insert image"
                          aria-label="Insert image"
                        >
                          <ImagePlus size={15} />
                        </button>
                      </div>
                    </div>
                    <span className="panel-file-name">{withMarkdownExtension(fileName)}</span>
                  </div>
                  {isSearchVisible && (
                    <div className="search-bar" role="search" aria-label="Find and replace">
                      <div className="search-row">
                        <label className="search-field">
                          <SearchIcon size={15} aria-hidden="true" />
                          <input
                            ref={searchInputRef}
                            type="search"
                            value={searchTerm}
                            placeholder="Find"
                            aria-label="Find text"
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
                          title="Previous match"
                          aria-label="Previous match"
                        >
                          <ChevronUp size={15} />
                        </button>
                        <button
                          type="button"
                          className="search-icon-button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => moveSearchMatch('next')}
                          title="Next match"
                          aria-label="Next match"
                        >
                          <ChevronDown size={15} />
                        </button>
                        <button
                          type="button"
                          className={isSearchCaseSensitive ? 'search-toggle active' : 'search-toggle'}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => setIsSearchCaseSensitive((isEnabled) => !isEnabled)}
                          title="Match case"
                          aria-label="Match case"
                        >
                          <CaseSensitive size={16} />
                        </button>
                        <button
                          type="button"
                          className={isSearchWholeWord ? 'search-toggle active' : 'search-toggle'}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => setIsSearchWholeWord((isEnabled) => !isEnabled)}
                          title="Match whole word"
                          aria-label="Match whole word"
                        >
                          <WholeWord size={16} />
                        </button>
                        <button
                          type="button"
                          className="search-icon-button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => setIsReplaceVisible((isVisible) => !isVisible)}
                          title="Toggle replace"
                          aria-label="Toggle replace"
                        >
                          <Replace size={15} />
                        </button>
                        <button
                          type="button"
                          className="search-icon-button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={closeSearchBar}
                          title="Close find"
                          aria-label="Close find"
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
                              placeholder="Replace"
                              aria-label="Replace text"
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
                            title="Replace current match"
                          >
                            <Replace size={14} />
                            <span>Replace</span>
                          </button>
                          <button
                            type="button"
                            className="search-action-button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={replaceAllSearchMatches}
                            title="Replace all matches"
                          >
                            <ReplaceAllIcon size={14} />
                            <span>All</span>
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
                  title="Resize split view"
                  aria-label="Resize split view"
                  onPointerDown={handleSplitPointerResizeStart}
                  onMouseDown={handleSplitMouseResizeStart}
                  onKeyDown={handleSplitResizeKeyDown}
                >
                  <span aria-hidden="true"></span>
                </button>
              )}

              {(mode === 'preview' || mode === 'split') && (
            <section className="preview-panel panel" aria-label="Markdown preview">
              <div className="panel-header">
                <span>Preview</span>
                <span>{stats.words} words</span>
              </div>
              <div className="preview-scroll">
                {markdownValue.trim().length > 0 ? (
                  <article
                    className="markdown-preview"
                    dangerouslySetInnerHTML={{ __html: renderedHtml }}
                  />
                ) : (
                  <div className="empty-preview">Empty document</div>
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
        <span>{mode}</span>
        <span>{hasUnsavedChanges ? 'Unsaved' : 'Saved'}</span>
        <span>Draft saved {lastSavedLabel}</span>
      </footer>

      {isCommandPaletteOpen && (
        <div className="command-palette-backdrop" role="presentation" onMouseDown={closeCommandPalette}>
          <form
            className="command-palette"
            role="dialog"
            aria-label="Command palette"
            onSubmit={handleCommandPaletteSubmit}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <label className="command-search-field">
              <CommandIcon size={17} aria-hidden="true" />
              <input
                ref={commandInputRef}
                type="search"
                value={commandQuery}
                placeholder="Type a command"
                aria-label="Command search"
                spellCheck={false}
                onChange={(event) => {
                  setCommandQuery(event.target.value)
                  setActiveCommandIndex(0)
                }}
                onKeyDown={handleCommandPaletteKeyDown}
              />
            </label>

            <div className="command-list" aria-label="Available commands">
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
                <div className="command-empty">No commands found</div>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default App
