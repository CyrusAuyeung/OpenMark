const { app, BrowserWindow, Menu, dialog, ipcMain, clipboard } = require('electron')
const { autoUpdater } = require('electron-updater')
const fs = require('node:fs/promises')
const path = require('node:path')

const isDev = !app.isPackaged
const canUseAutoUpdater = !isDev && (process.platform !== 'linux' || Boolean(process.env.APPIMAGE))
let mainWindow = null
let hasScheduledInitialUpdateCheck = false
const workspaceFileLimit = 120
const ignoredWorkspaceDirectories = new Set([
  '.git',
  '.next',
  '.vite',
  'build',
  'dist',
  'node_modules',
  'out',
])

const updateStatus = {
  state: canUseAutoUpdater ? 'idle' : 'unsupported',
  message: canUseAutoUpdater
    ? 'Ready to check for updates.'
    : 'Updates are available in packaged installer builds.',
  version: app.getVersion(),
  updateVersion: null,
  progress: null,
  canCheck: canUseAutoUpdater,
  canInstall: false,
  error: null,
}

autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true
autoUpdater.allowPrerelease = app.getVersion().includes('-')

function getUpdateStatus() {
  return { ...updateStatus }
}

function sendUpdateStatus(targetWindow = mainWindow) {
  if (!targetWindow || targetWindow.isDestroyed()) {
    return
  }

  targetWindow.webContents.send('openmark:update-status', getUpdateStatus())
}

function setUpdateStatus(nextStatus) {
  Object.assign(updateStatus, nextStatus)
  updateStatus.version = app.getVersion()
  updateStatus.canCheck = canUseAutoUpdater && !['checking', 'downloading'].includes(updateStatus.state)
  updateStatus.canInstall = updateStatus.state === 'downloaded'

  BrowserWindow.getAllWindows().forEach((targetWindow) => sendUpdateStatus(targetWindow))
}

function getUpdateVersion(updateInfo) {
  return typeof updateInfo?.version === 'string' ? updateInfo.version : null
}

async function checkForUpdates() {
  if (!canUseAutoUpdater) {
    setUpdateStatus({
      state: 'unsupported',
      message: 'Updates are available in packaged installer builds.',
      updateVersion: null,
      progress: null,
      error: null,
    })

    return getUpdateStatus()
  }

  if (updateStatus.state === 'checking' || updateStatus.state === 'downloading') {
    return getUpdateStatus()
  }

  try {
    await autoUpdater.checkForUpdates()
  } catch (error) {
    setUpdateStatus({
      state: 'error',
      message: 'Update check failed.',
      progress: null,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  return getUpdateStatus()
}

autoUpdater.on('checking-for-update', () => {
  setUpdateStatus({
    state: 'checking',
    message: 'Checking for updates...',
    progress: null,
    error: null,
  })
})

autoUpdater.on('update-available', (updateInfo) => {
  setUpdateStatus({
    state: 'available',
    message: 'Update available. Downloading...',
    updateVersion: getUpdateVersion(updateInfo),
    progress: null,
    error: null,
  })
})

autoUpdater.on('update-not-available', () => {
  setUpdateStatus({
    state: 'not-available',
    message: 'OpenMark is up to date.',
    updateVersion: null,
    progress: null,
    error: null,
  })
})

autoUpdater.on('download-progress', (progressInfo) => {
  setUpdateStatus({
    state: 'downloading',
    message: 'Downloading update...',
    progress: typeof progressInfo?.percent === 'number' ? progressInfo.percent : null,
    error: null,
  })
})

autoUpdater.on('update-downloaded', (updateInfo) => {
  setUpdateStatus({
    state: 'downloaded',
    message: 'Update downloaded. Restart to install.',
    updateVersion: getUpdateVersion(updateInfo) ?? updateStatus.updateVersion,
    progress: 100,
    error: null,
  })
})

autoUpdater.on('error', (error) => {
  setUpdateStatus({
    state: 'error',
    message: 'Update check failed.',
    progress: null,
    error: error instanceof Error ? error.message : String(error),
  })
})

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

  mainWindow.webContents.once('did-finish-load', () => {
    sendUpdateStatus(mainWindow)

    if (!hasScheduledInitialUpdateCheck && canUseAutoUpdater) {
      hasScheduledInitialUpdateCheck = true
      setTimeout(() => { void checkForUpdates() }, 5000)
    }
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
        { label: 'Open Folder...', click: () => sendCommand('open-workspace-folder') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => sendCommand('save-document') },
        { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => sendCommand('save-document-as') },
        { type: 'separator' },
        { label: 'Preview Export...', click: () => sendCommand('preview-export') },
        { label: 'Export HTML...', accelerator: 'CmdOrCtrl+E', click: () => sendCommand('export-html') },
        { label: 'Export PDF...', accelerator: 'CmdOrCtrl+Shift+E', click: () => sendCommand('export-pdf') },
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
        { label: 'Appearance Settings...', click: () => sendCommand('open-theme-settings') },
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
        { type: 'separator' },
        { label: 'Copy Markdown', click: () => sendCommand('copy-markdown') },
        { label: 'Copy HTML', click: () => sendCommand('copy-html') },
        { type: 'separator' },
        { label: 'Insert Image...', click: () => sendCommand('insert-image') },
        { type: 'separator' },
        { label: 'Find', accelerator: 'CmdOrCtrl+F', click: () => sendCommand('find-document') },
        { label: 'Replace', accelerator: 'CmdOrCtrl+H', click: () => sendCommand('replace-document') },
        { type: 'separator' },
        { label: 'Command Palette', accelerator: 'CmdOrCtrl+Shift+P', click: () => sendCommand('open-command-palette') },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Check for Updates...', click: () => sendCommand('check-for-updates') },
        { type: 'separator' },
        { role: 'about' },
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

function getFolderName(folderPath) {
  return path.basename(folderPath) || folderPath
}

async function listWorkspaceFolder(folderPath) {
  let folderStats

  try {
    folderStats = await fs.stat(folderPath)
  } catch {
    return { canceled: true, error: 'This folder could not be opened.' }
  }

  if (!folderStats.isDirectory()) {
    return { canceled: true, error: 'This path is not a folder.' }
  }

  const files = []
  const pendingDirectories = [folderPath]
  let truncated = false

  while (pendingDirectories.length > 0 && files.length < workspaceFileLimit) {
    const directoryPath = pendingDirectories.shift()
    let entries

    try {
      entries = await fs.readdir(directoryPath, { withFileTypes: true })
    } catch {
      continue
    }

    entries.sort((left, right) => left.name.localeCompare(right.name))

    for (const entry of entries) {
      const entryPath = path.join(directoryPath, entry.name)

      if (entry.isDirectory()) {
        if (!entry.isSymbolicLink() && !ignoredWorkspaceDirectories.has(entry.name)) {
          pendingDirectories.push(entryPath)
        }

        continue
      }

      if (!entry.isFile() || !isMarkdownLikeFile(entryPath)) {
        continue
      }

      let fileStats

      try {
        fileStats = await fs.stat(entryPath)
      } catch {
        continue
      }

      files.push({
        filePath: entryPath,
        fileName: entry.name,
        relativePath: path.relative(folderPath, entryPath).split(path.sep).join('/'),
        modifiedAt: fileStats.mtimeMs,
      })

      if (files.length >= workspaceFileLimit) {
        truncated = true
        break
      }
    }
  }

  return {
    canceled: false,
    folderPath,
    folderName: getFolderName(folderPath),
    files: files.sort((left, right) => left.relativePath.localeCompare(right.relativePath)),
    truncated: truncated || pendingDirectories.length > 0,
  }
}

async function readMarkdownFile(filePath) {
  if (!isMarkdownLikeFile(filePath)) {
    return { canceled: true, error: 'Unsupported file type' }
  }

  let content

  try {
    content = await fs.readFile(filePath, 'utf8')
  } catch {
    return { canceled: true, error: 'This file could not be opened.' }
  }

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

ipcMain.handle('openmark:select-workspace-folder', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Open Workspace Folder',
    properties: ['openDirectory'],
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true }
  }

  return listWorkspaceFolder(result.filePaths[0])
})

ipcMain.handle('openmark:read-workspace-folder', async (_event, folderPath) => {
  if (typeof folderPath !== 'string' || folderPath.length === 0) {
    return { canceled: true, error: 'Invalid folder path' }
  }

  return listWorkspaceFolder(folderPath)
})

ipcMain.handle('openmark:select-image-file', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Insert image',
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true }
  }

  const filePath = result.filePaths[0]

  return {
    canceled: false,
    filePath,
    fileName: getFileName(filePath),
  }
})

ipcMain.handle('openmark:save-markdown-file', async (_event, payload) => {
  const content = typeof payload?.content === 'string' ? payload.content : ''
  const defaultFileName = typeof payload?.fileName === 'string' ? payload.fileName : 'untitled.md'
  const knownPath = typeof payload?.filePath === 'string' && payload.filePath.length > 0 ? payload.filePath : null
  const defaultPath = knownPath ? path.join(path.dirname(knownPath), defaultFileName) : defaultFileName
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

ipcMain.handle('openmark:save-pdf-file', async (_event, payload) => {
  const content = typeof payload?.content === 'string' ? payload.content : ''
  const defaultPath = typeof payload?.fileName === 'string' ? payload.fileName : 'document.pdf'
  const targetPath = await showSaveDialog(defaultPath, 'PDF', ['pdf'])

  if (!targetPath) {
    return { canceled: true }
  }

  try {
    const pdfBuffer = await renderHtmlToPdf(content)
    await fs.writeFile(targetPath, pdfBuffer)
  } catch {
    return { canceled: true, error: 'This document could not be exported as PDF.' }
  }

  return {
    canceled: false,
    filePath: targetPath,
    fileName: getFileName(targetPath),
  }
})

ipcMain.handle('openmark:write-clipboard-text', (_event, text) => {
  if (typeof text !== 'string') {
    return { copied: false, error: 'Invalid clipboard content.' }
  }

  clipboard.writeText(text)

  return { copied: true }
})

ipcMain.handle('openmark:get-update-status', () => getUpdateStatus())

ipcMain.handle('openmark:check-for-updates', async () => checkForUpdates())

ipcMain.handle('openmark:install-update', () => {
  if (!updateStatus.canInstall) {
    return { accepted: false, error: 'No downloaded update is ready to install.' }
  }

  setImmediate(() => autoUpdater.quitAndInstall(false, true))

  return { accepted: true }
})

async function renderHtmlToPdf(content) {
  const printWindow = new BrowserWindow({
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  try {
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(content)}`)
    await printWindow.webContents.executeJavaScript(`
      Promise.all([
        document.fonts?.ready ?? Promise.resolve(),
        Promise.all(Array.from(document.images).map((image) => (
          image.complete
            ? Promise.resolve()
            : new Promise((resolve) => {
              image.onload = resolve
              image.onerror = resolve
            })
        ))),
      ]).then(() => true)
    `)

    return printWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { marginType: 'default' },
    })
  } finally {
    if (!printWindow.isDestroyed()) {
      printWindow.close()
    }
  }
}

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