export {}

declare global {
  type OpenMarkCommand =
    | 'new-document'
    | 'open-document'
    | 'save-document'
    | 'save-document-as'
    | 'export-html'
    | 'set-write-mode'
    | 'set-split-mode'
    | 'set-preview-mode'
    | 'toggle-theme'

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
      onCommand: (callback: (command: OpenMarkCommand) => void) => () => void
    }
  }
}