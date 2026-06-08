export {}

declare global {
  type OpenMarkCommand =
    | 'new-document'
    | 'open-document'
    | 'save-document'
    | 'save-document-as'
    | 'preview-export'
    | 'export-html'
    | 'export-pdf'
    | 'copy-markdown'
    | 'copy-html'
    | 'set-write-mode'
    | 'set-split-mode'
    | 'set-preview-mode'
    | 'toggle-theme'
    | 'open-theme-settings'
    | 'find-document'
    | 'replace-document'
    | 'open-command-palette'
    | 'insert-image'
    | 'check-for-updates'

  type OpenMarkUpdateState =
    | 'idle'
    | 'checking'
    | 'available'
    | 'downloading'
    | 'downloaded'
    | 'not-available'
    | 'unsupported'
    | 'error'

  type OpenMarkUpdateStatus = {
    state: OpenMarkUpdateState
    message: string
    version: string
    updateVersion: string | null
    progress: number | null
    canCheck: boolean
    canInstall: boolean
    error: string | null
  }

  interface Window {
    openmark?: {
      openMarkdownFile: () => Promise<{
        canceled: boolean
        content?: string
        fileName?: string
        filePath?: string
        error?: string
      }>
      openRecentFile: (filePath: string) => Promise<{
        canceled: boolean
        content?: string
        fileName?: string
        filePath?: string
        error?: string
      }>
      selectImageFile: () => Promise<{
        canceled: boolean
        fileName?: string
        filePath?: string
      }>
      saveMarkdownFile: (payload: {
        content: string
        filePath?: string | null
        fileName: string
        forceDialog?: boolean
      }) => Promise<{
        canceled: boolean
        filePath?: string
        fileName?: string
      }>
      saveHtmlFile: (payload: {
        content: string
        fileName: string
      }) => Promise<{
        canceled: boolean
        filePath?: string
        fileName?: string
      }>
      savePdfFile: (payload: {
        content: string
        fileName: string
      }) => Promise<{
        canceled: boolean
        filePath?: string
        fileName?: string
        error?: string
      }>
      writeClipboardText: (text: string) => Promise<{
        copied: boolean
        error?: string
      }>
      getUpdateStatus: () => Promise<OpenMarkUpdateStatus>
      checkForUpdates: () => Promise<OpenMarkUpdateStatus>
      installUpdate: () => Promise<{
        accepted: boolean
        error?: string
      }>
      onUpdateStatus: (callback: (status: OpenMarkUpdateStatus) => void) => () => void
      onCommand: (callback: (command: OpenMarkCommand) => void) => () => void
    }
  }
}