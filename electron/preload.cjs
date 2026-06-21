const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('openmark', {
  openMarkdownFile: () => ipcRenderer.invoke('openmark:open-markdown-file'),
  openRecentFile: (filePath) => ipcRenderer.invoke('openmark:open-recent-file', filePath),
  selectWorkspaceFolder: () => ipcRenderer.invoke('openmark:select-workspace-folder'),
  readWorkspaceFolder: (folderPath) => ipcRenderer.invoke('openmark:read-workspace-folder', folderPath),
  searchWorkspaceFiles: (payload) => ipcRenderer.invoke('openmark:search-workspace-files', payload),
  selectImageFile: () => ipcRenderer.invoke('openmark:select-image-file'),
  copyImageToDocumentAssets: (payload) => ipcRenderer.invoke('openmark:copy-image-to-document-assets', payload),
  checkImageResources: (payload) => ipcRenderer.invoke('openmark:check-image-resources', payload),
  saveMarkdownFile: (payload) => ipcRenderer.invoke('openmark:save-markdown-file', payload),
  saveHtmlFile: (payload) => ipcRenderer.invoke('openmark:save-html-file', payload),
  savePdfFile: (payload) => ipcRenderer.invoke('openmark:save-pdf-file', payload),
  writeClipboardText: (text) => ipcRenderer.invoke('openmark:write-clipboard-text', text),
  getUpdateStatus: () => ipcRenderer.invoke('openmark:get-update-status'),
  setApplicationLocale: (locale) => ipcRenderer.invoke('openmark:set-application-locale', locale),
  checkForUpdates: () => ipcRenderer.invoke('openmark:check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('openmark:install-update'),
  onUpdateStatus: (callback) => {
    const listener = (_event, status) => callback(status)
    ipcRenderer.on('openmark:update-status', listener)

    return () => ipcRenderer.removeListener('openmark:update-status', listener)
  },
  onCommand: (callback) => {
    const listener = (_event, command) => callback(command)
    ipcRenderer.on('openmark:command', listener)

    return () => ipcRenderer.removeListener('openmark:command', listener)
  },
})
