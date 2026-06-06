import {
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
import { EditorView, keymap } from '@codemirror/view'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import {
  Bold,
  Code2,
  Columns2,
  Download,
  Eye,
  FilePlus2,
  FileText,
  FolderOpen,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Moon,
  Quote,
  Save,
  Sun,
  Type,
  X,
  type LucideIcon,
} from 'lucide-react'
import './App.css'

type ViewMode = 'write' | 'split' | 'preview'
type ThemeMode = 'light' | 'dark'
type SidebarTab = 'document' | 'outline' | 'recent'
type InlineFormat = 'bold' | 'italic' | 'link'
type BlockFormat = 'heading-2' | 'bullet-list' | 'ordered-list' | 'quote' | 'code-block'
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

const draftStorageKey = 'openmark:draft'
const fileNameStorageKey = 'openmark:file-name'
const themeStorageKey = 'openmark:theme'
const recentFilesStorageKey = 'openmark:recent-files'
const splitPaneRatioStorageKey = 'openmark:split-pane-ratio'
const maxRecentFiles = 6
const defaultSplitPaneRatio = 50
const minSplitPaneRatio = 30
const maxSplitPaneRatio = 70
const invalidFileNameCharacters = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*'])

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

function formatBlockLine(line: string, index: number, format: Exclude<BlockFormat, 'code-block'>) {
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
  const editorWorkbenchRef = useRef<HTMLElement | null>(null)
  const editorRef = useRef<ReactCodeMirrorRef | null>(null)
  const editorViewRef = useRef<EditorView | null>(null)
  const pendingOutlineJumpRef = useRef<OutlineItem | null>(null)
  const initialMarkdownValue = useMemo(() => loadStoredValue(draftStorageKey, ''), [])
  const [markdownValue, setMarkdownValue] = useState(initialMarkdownValue)
  const [fileName, setFileName] = useState(() =>
    loadStoredValue(fileNameStorageKey, 'untitled.md'),
  )
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState(initialMarkdownValue)
  const [recentFiles, setRecentFiles] = useState(loadRecentFiles)
  const [isWelcomeVisible, setIsWelcomeVisible] = useState(initialMarkdownValue.trim().length === 0)
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('document')
  const [splitPaneRatio, setSplitPaneRatio] = useState(loadSplitPaneRatio)
  const [mode, setMode] = useState<ViewMode>('split')
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const storedTheme = window.localStorage.getItem(themeStorageKey)
    return storedTheme === 'dark' ? 'dark' : 'light'
  })
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [activeOutlineLine, setActiveOutlineLine] = useState<number | null>(null)

  const editorExtensions = useMemo(
    () => [
      markdown({ base: markdownLanguage }),
      keymap.of([
        { key: 'Mod-b', run: (view) => applyInlineFormat(view, 'bold') },
        { key: 'Mod-i', run: (view) => applyInlineFormat(view, 'italic') },
        { key: 'Mod-k', run: (view) => applyInlineFormat(view, 'link') },
      ]),
    ],
    [],
  )

  const renderedHtml = useMemo(
    () => DOMPurify.sanitize(markdownRenderer.render(markdownValue)),
    [markdownValue],
  )

  const outline = useMemo(() => getOutline(markdownValue), [markdownValue])
  const stats = useMemo(
    () => getDocumentStats(markdownValue, outline),
    [markdownValue, outline],
  )
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
    editorWorkbenchRef.current?.style.setProperty('--editor-pane-size', `${splitPaneRatio}%`)
  }, [splitPaneRatio])

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
      }
    })
  })

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
  }

  function applyOpenedDocument(content: string, nextFileName: string, nextFilePath: string | null) {
    setMarkdownValue(content)
    setFileName(nextFileName)
    setActiveFilePath(nextFilePath)
    setSavedSnapshot(content)
    rememberRecentFile(nextFilePath, nextFileName)
    setLastSavedAt(new Date())
    setIsWelcomeVisible(false)
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

  function buildExportHtml() {
    const title = escapeHtml(getBaseName(fileName))

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body { margin: 0; background: #f7f8f4; color: #1c241d; font: 17px/1.7 ui-serif, Georgia, serif; }
    main { max-width: 780px; margin: 0 auto; padding: 56px 28px; }
    h1, h2, h3 { line-height: 1.2; font-family: ui-sans-serif, system-ui, sans-serif; }
    pre { overflow: auto; padding: 16px; background: #20251f; color: #f4f7ef; border-radius: 8px; }
    code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
    blockquote { margin-left: 0; padding-left: 18px; border-left: 4px solid #75a88f; color: #59675d; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #d9e2d8; padding: 8px 10px; }
    img { max-width: 100%; }
  </style>
</head>
<body>
  <main>${renderedHtml}</main>
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
                    </div>
                    <span className="panel-file-name">{withMarkdownExtension(fileName)}</span>
                  </div>
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
    </div>
  )
}

export default App
