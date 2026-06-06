const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron')
const fs = require('node:fs/promises')
const path = require('node:path')

const isDev = !app.isPackaged
let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'OpenMark',
    backgroundColor: '#f7f8f4',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.on('will-prevent-unload', (event) => {
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'question',
      buttons: ['Discard changes', 'Keep editing'],
      defaultId: 1,
      cancelId: 1,
      title: 'Unsaved changes',
      message: 'This document has unsaved changes.',
      detail: 'Close OpenMark and discard the current changes?',
    })

    if (choice === 0) {
      event.preventDefault()
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173')
    return
  }

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

function sendCommand(command) {
  const targetWindow = BrowserWindow.getFocusedWindow() ?? mainWindow
  targetWindow?.webContents.send('openmark:command', command)
}

function createApplicationMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'New Document', accelerator: 'CmdOrCtrl+N', click: () => sendCommand('new-document') },
        { label: 'Open...', accelerator: 'CmdOrCtrl+O', click: () => sendCommand('open-document') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => sendCommand('save-document') },
        { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => sendCommand('save-document-as') },
        { label: 'Export HTML...', accelerator: 'CmdOrCtrl+E', click: () => sendCommand('export-html') },
        { type: 'separator' },
        { role: process.platform === 'darwin' ? 'close' : 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Write Mode', accelerator: 'CmdOrCtrl+1', click: () => sendCommand('set-write-mode') },
        { label: 'Split Mode', accelerator: 'CmdOrCtrl+2', click: () => sendCommand('set-split-mode') },
        { label: 'Preview Mode', accelerator: 'CmdOrCtrl+3', click: () => sendCommand('set-preview-mode') },
        { type: 'separator' },
        { label: 'Toggle Theme', accelerator: 'CmdOrCtrl+Shift+L', click: () => sendCommand('toggle-theme') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function getFileName(filePath) {
  return path.basename(filePath)
}

function isMarkdownLikeFile(filePath) {
  return ['.md', '.markdown', '.mdown', '.txt'].includes(path.extname(filePath).toLowerCase())
}

async function readMarkdownFile(filePath) {
  if (!isMarkdownLikeFile(filePath)) {
    return { canceled: true, error: 'Unsupported file type' }
  }

  const content = await fs.readFile(filePath, 'utf8')

  return {
    canceled: false,
    content,
    filePath,
    fileName: getFileName(filePath),
  }
}

ipcMain.handle('openmark:open-markdown-file', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Open Markdown file',
    properties: ['openFile'],
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown', 'mdown'] },
      { name: 'Text', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true }
  }

  return readMarkdownFile(result.filePaths[0])
})

ipcMain.handle('openmark:open-recent-file', async (_event, filePath) => {
  if (typeof filePath !== 'string' || filePath.length === 0) {
    return { canceled: true, error: 'Invalid file path' }
  }

  return readMarkdownFile(filePath)
})

ipcMain.handle('openmark:save-markdown-file', async (_event, payload) => {
  const content = typeof payload?.content === 'string' ? payload.content : ''
  const defaultPath = typeof payload?.fileName === 'string' ? payload.fileName : 'untitled.md'
  const knownPath = typeof payload?.filePath === 'string' && payload.filePath.length > 0 ? payload.filePath : null
  const targetPath = payload?.forceDialog
    ? await showSaveDialog(defaultPath, 'Markdown', ['md', 'markdown'])
    : knownPath ?? (await showSaveDialog(defaultPath, 'Markdown', ['md', 'markdown']))

  if (!targetPath) {
    return { canceled: true }
  }

  await fs.writeFile(targetPath, content, 'utf8')

  return {
    canceled: false,
    filePath: targetPath,
    fileName: getFileName(targetPath),
  }
})

ipcMain.handle('openmark:save-html-file', async (_event, payload) => {
  const content = typeof payload?.content === 'string' ? payload.content : ''
  const defaultPath = typeof payload?.fileName === 'string' ? payload.fileName : 'document.html'
  const targetPath = await showSaveDialog(defaultPath, 'HTML', ['html'])

  if (!targetPath) {
    return { canceled: true }
  }

  await fs.writeFile(targetPath, content, 'utf8')

  return {
    canceled: false,
    filePath: targetPath,
    fileName: getFileName(targetPath),
  }
})

async function showSaveDialog(defaultPath, name, extensions) {
  const result = await dialog.showSaveDialog({
    title: `Save ${name} file`,
    defaultPath,
    filters: [
      { name, extensions },
      { name: 'All Files', extensions: ['*'] },
    ],
  })

  if (result.canceled || !result.filePath) {
    return null
  }

  return result.filePath
}

app.whenReady().then(() => {
  createApplicationMenu()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})