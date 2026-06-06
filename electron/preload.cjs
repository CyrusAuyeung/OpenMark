const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('openmark', {
  openMarkdownFile: () => ipcRenderer.invoke('openmark:open-markdown-file'),
  openRecentFile: (filePath) => ipcRenderer.invoke('openmark:open-recent-file', filePath),
  selectImageFile: () => ipcRenderer.invoke('openmark:select-image-file'),
  saveMarkdownFile: (payload) => ipcRenderer.invoke('openmark:save-markdown-file', payload),
  saveHtmlFile: (payload) => ipcRenderer.invoke('openmark:save-html-file', payload),
  onCommand: (callback) => {
    const listener = (_event, command) => callback(command)
    ipcRenderer.on('openmark:command', listener)

    return () => ipcRenderer.removeListener('openmark:command', listener)
  },
})