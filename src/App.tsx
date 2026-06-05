import { useEffect, useMemo, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import {
  Columns2,
  Download,
  Eye,
  FilePlus2,
  FileText,
  FolderOpen,
  Moon,
  Save,
  Sun,
  Type,
  type LucideIcon,
} from 'lucide-react'
import './App.css'

type ViewMode = 'write' | 'split' | 'preview'
type ThemeMode = 'light' | 'dark'

type OutlineItem = {
  level: number
  title: string
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
const maxRecentFiles = 6

const defaultMarkdown = `# OpenMark draft

OpenMark is a local-first Markdown editor prototype for focused writing.

## What works today

- Markdown source editing
- Live preview
- Write, split, and preview modes
- Browser draft autosave
- Markdown and HTML export

## Release note

This first milestone keeps the editor simple on purpose. The next step is a desktop shell with native file access and a cleaner WYSIWYG layer.

> Ship the small reliable core first, then earn the fancy parts.
`

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

function getOutline(markdownValue: string): OutlineItem[] {
  return markdownValue
    .split(/\r?\n/)
    .reduce<OutlineItem[]>((outlineItems, line) => {
      const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line.trim())

      if (!headingMatch) {
        return outlineItems
      }

      outlineItems.push({
        level: headingMatch[1].length,
        title: headingMatch[2].replace(/[#*_`~]/g, '').trim(),
      })

      return outlineItems
    }, [])
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

function withMarkdownExtension(fileName: string) {
  return /\.(md|markdown)$/i.test(fileName) ? fileName : `${fileName}.md`
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

function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [markdownValue, setMarkdownValue] = useState(() =>
    loadStoredValue(draftStorageKey, defaultMarkdown),
  )
  const [fileName, setFileName] = useState(() =>
    loadStoredValue(fileNameStorageKey, 'openmark-draft.md'),
  )
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)
  const [recentFiles, setRecentFiles] = useState(loadRecentFiles)
  const [mode, setMode] = useState<ViewMode>('split')
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const storedTheme = window.localStorage.getItem(themeStorageKey)
    return storedTheme === 'dark' ? 'dark' : 'light'
  })
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  const editorExtensions = useMemo(
    () => [markdown({ base: markdownLanguage })],
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
  const hasUnsavedChanges = savedSnapshot !== null && markdownValue !== savedSnapshot

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

  function handleNewDocument() {
    const shouldReset = window.confirm(
      'Start a new document? The current browser draft will be replaced.',
    )

    if (!shouldReset) {
      return
    }

    setMarkdownValue('# Untitled\n\n')
    setFileName('untitled.md')
    setActiveFilePath(null)
    setSavedSnapshot(null)
  }

  function applyOpenedDocument(content: string, nextFileName: string, nextFilePath: string | null) {
    setMarkdownValue(content)
    setFileName(nextFileName)
    setActiveFilePath(nextFilePath)
    setSavedSnapshot(content)
    rememberRecentFile(nextFilePath, nextFileName)
    setLastSavedAt(new Date())
  }

  async function openDesktopFile() {
    const result = await window.openmark?.openMarkdownFile()

    if (!result || result.canceled || !result.content || !result.fileName) {
      return
    }

    applyOpenedDocument(result.content, result.fileName, result.filePath ?? null)
  }

  async function handleOpenRecentFile(filePath: string) {
    const result = await window.openmark?.openRecentFile(filePath)

    if (!result || result.canceled || !result.content || !result.fileName) {
      if (result?.error) {
        window.alert(result.error)
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
    event.target.value = ''
  }

  async function handleSaveMarkdown(options?: { forceDialog?: boolean }) {
    if (window.openmark) {
      const result = await window.openmark.saveMarkdownFile({
        content: markdownValue,
        filePath: activeFilePath,
        fileName: withMarkdownExtension(fileName),
        forceDialog: options?.forceDialog,
      })

      if (!result.canceled && result.filePath) {
        setActiveFilePath(result.filePath)
        setFileName(result.fileName ?? withMarkdownExtension(fileName))
        setSavedSnapshot(markdownValue)
        rememberRecentFile(result.filePath, result.fileName ?? withMarkdownExtension(fileName))
        setLastSavedAt(new Date())
      }

      return
    }

    downloadFile(
      markdownValue,
      withMarkdownExtension(fileName),
      'text/markdown;charset=utf-8',
    )
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

      <main className={`workspace mode-${mode}`}>
        <aside className="inspector" aria-label="Document inspector">
          <section className="inspector-section">
            <h2>Document</h2>
            <div className="file-chip" title={fileName}>
              <FileText size={16} />
              <span>{fileName}</span>
            </div>
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

          <section className="inspector-section outline-section">
            <h2>Outline</h2>
            {outline.length > 0 ? (
              <ol className="outline-list">
                {outline.slice(0, 12).map((item, index) => (
                  <li
                    key={`${item.title}-${index}`}
                    className={`outline-level-${Math.min(item.level, 3)}`}
                  >
                    {item.title}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">No headings yet</p>
            )}
          </section>

          {window.openmark && (
            <section className="inspector-section recent-section">
              <h2>Recent</h2>
              {recentFiles.length > 0 ? (
                <div className="recent-list">
                  {recentFiles.map((item) => (
                    <button
                      key={item.filePath}
                      type="button"
                      onClick={() => handleOpenRecentFile(item.filePath)}
                      title={item.filePath}
                    >
                      <span>{item.fileName}</span>
                      <small>{new Date(item.openedAt).toLocaleDateString()}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted">No recent files</p>
              )}
            </section>
          )}
        </aside>

        <section className="editor-workbench" aria-label="Editor workspace">
          {(mode === 'write' || mode === 'split') && (
            <section className="editor-panel panel" aria-label="Markdown editor">
              <div className="panel-header">
                <span>Markdown</span>
                <span>{withMarkdownExtension(fileName)}</span>
              </div>
              <div className="editor-host">
                <CodeMirror
                  value={markdownValue}
                  height="100%"
                  basicSetup={{
                    lineNumbers: false,
                    foldGutter: true,
                    highlightActiveLine: false,
                    autocompletion: true,
                  }}
                  extensions={editorExtensions}
                  theme={theme === 'dark' ? oneDark : 'light'}
                  onChange={(value) => setMarkdownValue(value)}
                />
              </div>
            </section>
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
