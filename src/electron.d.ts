export {}

declare global {
  type OpenMarkCommand =
    | 'new-document'
    | 'open-document'
    | 'save-document'
    | 'save-document-as'
    | 'export-html'
    | 'export-pdf'
    | 'set-write-mode'
    | 'set-split-mode'
    | 'set-preview-mode'
    | 'toggle-theme'
    | 'find-document'
    | 'replace-document'
    | 'open-command-palette'
    | 'insert-image'

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
      onCommand: (callback: (command: OpenMarkCommand) => void) => () => void
    }
  }
}