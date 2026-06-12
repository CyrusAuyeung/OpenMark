const { app, BrowserWindow, Menu, dialog, ipcMain, clipboard } = require('electron')
const { autoUpdater } = require('electron-updater')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { fileURLToPath } = require('node:url')

const isDev = !app.isPackaged
const canUseAutoUpdater = !isDev && (process.platform !== 'linux' || Boolean(process.env.APPIMAGE))
let mainWindow = null
let hasScheduledInitialUpdateCheck = false
let applicationLocale = 'en'
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

const applicationStrings = {
  en: {
    menu: {
      file: 'File',
      newDocument: 'New Document',
      open: 'Open...',
      openFolder: 'Open Folder...',
      save: 'Save',
      saveAs: 'Save As...',
      previewExport: 'Preview Export...',
      exportHtml: 'Export HTML...',
      exportPdf: 'Export PDF...',
      view: 'View',
      writeMode: 'Write Mode',
      splitMode: 'Split Mode',
      previewMode: 'Preview Mode',
      toggleTheme: 'Toggle Theme',
      language: 'Language',
      english: 'English',
      simplifiedChinese: 'Simplified Chinese',
      toggleLanguage: 'Switch Language',
      settings: 'Settings...',
      edit: 'Edit',
      undo: 'Undo',
      redo: 'Redo',
      cut: 'Cut',
      copy: 'Copy',
      paste: 'Paste',
      selectAll: 'Select All',
      copyMarkdown: 'Copy Markdown',
      copyHtml: 'Copy HTML',
      insertImage: 'Insert Image...',
      find: 'Find',
      replace: 'Replace',
      goToLine: 'Go to Line...',
      commandPalette: 'Command Palette',
      reload: 'Reload',
      toggleDevTools: 'Developer Tools',
      close: 'Close Window',
      quit: 'Quit OpenMark',
      help: 'Help',
      checkForUpdates: 'Check for Updates...',
      about: 'About OpenMark',
    },
    dialogs: {
      discardChanges: 'Discard changes',
      keepEditing: 'Keep editing',
      unsavedTitle: 'Unsaved changes',
      unsavedMessage: 'This document has unsaved changes.',
      unsavedDetail: 'Close OpenMark and discard the current changes?',
      openMarkdownFile: 'Open Markdown file',
      openWorkspaceFolder: 'Open Workspace Folder',
      insertImage: 'Insert image',
      saveFile: 'Save {type} file',
    },
    fileTypes: {
      markdown: 'Markdown',
      text: 'Text',
      html: 'HTML',
      pdf: 'PDF',
      images: 'Images',
      allFiles: 'All Files',
    },
    errors: {
      folderOpenFailed: 'This folder could not be opened.',
      pathNotFolder: 'This path is not a folder.',
      unsupportedFileType: 'Unsupported file type',
      fileOpenFailed: 'This file could not be opened.',
      invalidFilePath: 'Invalid file path',
      invalidFolderPath: 'Invalid folder path',
      fileModifiedExternally: 'This file changed on disk. Save again to overwrite it.',
      assetCopyFailed: 'This image could not be copied into the document assets folder.',
      pdfExportFailed: 'This document could not be exported as PDF.',
      invalidClipboardContent: 'Invalid clipboard content.',
      noDownloadedUpdate: 'No downloaded update is ready to install.',
    },
  },
  'zh-CN': {
    menu: {
      file: '文件',
      newDocument: '新建文档',
      open: '打开...',
      openFolder: '打开文件夹...',
      save: '保存',
      saveAs: '另存为...',
      previewExport: '预览导出...',
      exportHtml: '导出 HTML...',
      exportPdf: '导出 PDF...',
      view: '视图',
      writeMode: '编写模式',
      splitMode: '分屏模式',
      previewMode: '预览模式',
      toggleTheme: '切换主题',
      language: '语言',
      english: 'English',
      simplifiedChinese: '简体中文',
      toggleLanguage: '切换语言',
      settings: '设置...',
      edit: '编辑',
      undo: '撤销',
      redo: '重做',
      cut: '剪切',
      copy: '复制',
      paste: '粘贴',
      selectAll: '全选',
      copyMarkdown: '复制 Markdown',
      copyHtml: '复制 HTML',
      insertImage: '插入图片...',
      find: '查找',
      replace: '替换',
      goToLine: '跳转到行...',
      commandPalette: '命令面板',
      reload: '重新加载',
      toggleDevTools: '开发者工具',
      close: '关闭窗口',
      quit: '退出 OpenMark',
      help: '帮助',
      checkForUpdates: '检查更新...',
      about: '关于 OpenMark',
    },
    dialogs: {
      discardChanges: '丢弃更改',
      keepEditing: '继续编辑',
      unsavedTitle: '未保存更改',
      unsavedMessage: '当前文档有未保存的更改。',
      unsavedDetail: '要关闭 OpenMark 并丢弃当前更改吗？',
      openMarkdownFile: '打开 Markdown 文件',
      openWorkspaceFolder: '打开工作区文件夹',
      insertImage: '插入图片',
      saveFile: '保存 {type} 文件',
    },
    fileTypes: {
      markdown: 'Markdown',
      text: '文本',
      html: 'HTML',
      pdf: 'PDF',
      images: '图片',
      allFiles: '所有文件',
    },
    errors: {
      folderOpenFailed: '无法打开这个文件夹。',
      pathNotFolder: '这个路径不是文件夹。',
      unsupportedFileType: '不支持的文件类型',
      fileOpenFailed: '无法打开这个文件。',
      invalidFilePath: '无效的文件路径',
      invalidFolderPath: '无效的文件夹路径',
      fileModifiedExternally: '这个文件已在磁盘上被其他程序修改。再次保存将覆盖它。',
      assetCopyFailed: '无法将这张图片复制到文档资源文件夹。',
      pdfExportFailed: '无法将当前文档导出为 PDF。',
      invalidClipboardContent: '无效的剪贴板内容。',
      noDownloadedUpdate: '没有可安装的已下载更新。',
    },
  },
}

function getApplicationStrings() {
  return applicationStrings[applicationLocale] ?? applicationStrings.en
}

function isApplicationLocale(value) {
  return value === 'en' || value === 'zh-CN'
}

function setApplicationLocale(value) {
  if (!isApplicationLocale(value)) {
    return { accepted: false }
  }

  applicationLocale = value
  createApplicationMenu()

  return { accepted: true }
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
    autoHideMenuBar: true,
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

  mainWindow.setMenuBarVisibility(false)

  mainWindow.webContents.once('did-finish-load', () => {
    sendUpdateStatus(mainWindow)

    if (!hasScheduledInitialUpdateCheck && canUseAutoUpdater) {
      hasScheduledInitialUpdateCheck = true
      setTimeout(() => { void checkForUpdates() }, 5000)
    }
  })

  mainWindow.webContents.on('will-prevent-unload', (event) => {
    const { dialogs } = getApplicationStrings()
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'question',
      buttons: [dialogs.discardChanges, dialogs.keepEditing],
      defaultId: 1,
      cancelId: 1,
      title: dialogs.unsavedTitle,
      message: dialogs.unsavedMessage,
      detail: dialogs.unsavedDetail,
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
  const { menu } = getApplicationStrings()
  const template = [
    {
      label: menu.file,
      submenu: [
        { label: menu.newDocument, accelerator: 'CmdOrCtrl+N', click: () => sendCommand('new-document') },
        { label: menu.open, accelerator: 'CmdOrCtrl+O', click: () => sendCommand('open-document') },
        { label: menu.openFolder, click: () => sendCommand('open-workspace-folder') },
        { type: 'separator' },
        { label: menu.save, accelerator: 'CmdOrCtrl+S', click: () => sendCommand('save-document') },
        { label: menu.saveAs, accelerator: 'CmdOrCtrl+Shift+S', click: () => sendCommand('save-document-as') },
        { type: 'separator' },
        { label: menu.previewExport, click: () => sendCommand('preview-export') },
        { label: menu.exportHtml, accelerator: 'CmdOrCtrl+E', click: () => sendCommand('export-html') },
        { label: menu.exportPdf, accelerator: 'CmdOrCtrl+Shift+E', click: () => sendCommand('export-pdf') },
        { type: 'separator' },
        process.platform === 'darwin'
          ? { label: menu.close, role: 'close' }
          : { label: menu.quit, role: 'quit' },
      ],
    },
    {
      label: menu.view,
      submenu: [
        { label: menu.writeMode, accelerator: 'CmdOrCtrl+1', click: () => sendCommand('set-write-mode') },
        { label: menu.splitMode, accelerator: 'CmdOrCtrl+2', click: () => sendCommand('set-split-mode') },
        { label: menu.previewMode, accelerator: 'CmdOrCtrl+3', click: () => sendCommand('set-preview-mode') },
        { type: 'separator' },
        { label: menu.toggleTheme, accelerator: 'CmdOrCtrl+Shift+L', click: () => sendCommand('toggle-theme') },
        {
          label: menu.language,
          submenu: [
            { label: menu.english, type: 'radio', checked: applicationLocale === 'en', click: () => sendCommand('set-language-en') },
            { label: menu.simplifiedChinese, type: 'radio', checked: applicationLocale === 'zh-CN', click: () => sendCommand('set-language-zh-cn') },
            { type: 'separator' },
            { label: menu.toggleLanguage, click: () => sendCommand('toggle-language') },
          ],
        },
        { label: menu.settings, accelerator: 'CmdOrCtrl+,', click: () => sendCommand('open-theme-settings') },
        { type: 'separator' },
        { label: menu.reload, role: 'reload' },
        { label: menu.toggleDevTools, role: 'toggleDevTools' },
      ],
    },
    {
      label: menu.edit,
      submenu: [
        { label: menu.undo, role: 'undo' },
        { label: menu.redo, role: 'redo' },
        { type: 'separator' },
        { label: menu.cut, role: 'cut' },
        { label: menu.copy, role: 'copy' },
        { label: menu.paste, role: 'paste' },
        { label: menu.selectAll, role: 'selectAll' },
        { type: 'separator' },
        { label: menu.copyMarkdown, click: () => sendCommand('copy-markdown') },
        { label: menu.copyHtml, click: () => sendCommand('copy-html') },
        { type: 'separator' },
        { label: menu.insertImage, click: () => sendCommand('insert-image') },
        { type: 'separator' },
        { label: menu.find, accelerator: 'CmdOrCtrl+F', click: () => sendCommand('find-document') },
        { label: menu.replace, accelerator: 'CmdOrCtrl+H', click: () => sendCommand('replace-document') },
        { label: menu.goToLine, accelerator: 'CmdOrCtrl+G', click: () => sendCommand('go-to-line') },
        { type: 'separator' },
        { label: menu.commandPalette, accelerator: 'CmdOrCtrl+Shift+P', click: () => sendCommand('open-command-palette') },
      ],
    },
    {
      label: menu.help,
      submenu: [
        { label: menu.checkForUpdates, click: () => sendCommand('check-for-updates') },
        { type: 'separator' },
        { label: menu.about, role: 'about' },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function getFileName(filePath) {
  return path.basename(filePath)
}

function getImageMimeType(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.gif':
      return 'image/gif'
    case '.webp':
      return 'image/webp'
    case '.svg':
      return 'image/svg+xml'
    default:
      return null
  }
}

function sanitizeAssetFileName(fileName) {
  const extension = path.extname(fileName)
  const baseName = path.basename(fileName, extension)
  const safeBaseName = baseName
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim()
  const safeExtension = extension.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '').toLowerCase()

  return `${safeBaseName || 'image'}${safeExtension}`
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function safeDecodeUri(value) {
  try {
    return decodeURI(value)
  } catch {
    return value
  }
}

function resolveImageResourcePath(target, documentPath) {
  const decodedTarget = safeDecodeUri(target.trim())

  if (/^(https?:|data:|blob:)/i.test(decodedTarget)) {
    return null
  }

  if (/^file:/i.test(decodedTarget)) {
    try {
      return fileURLToPath(decodedTarget)
    } catch {
      return null
    }
  }

  if (path.isAbsolute(decodedTarget) || /^[A-Za-z]:[\/]/.test(decodedTarget)) {
    return path.resolve(decodedTarget)
  }

  if (documentPath) {
    return path.resolve(path.dirname(documentPath), decodedTarget)
  }

  return null
}

async function getAvailableAssetPath(assetDirectoryPath, fileName, sourcePath) {
  const safeFileName = sanitizeAssetFileName(fileName)
  const extension = path.extname(safeFileName)
  const baseName = path.basename(safeFileName, extension)
  const normalizedSourcePath = path.resolve(sourcePath)

  for (let index = 1; index < 1000; index += 1) {
    const candidateFileName = index === 1 ? safeFileName : `${baseName}-${index}${extension}`
    const candidatePath = path.join(assetDirectoryPath, candidateFileName)

    if (path.resolve(candidatePath) === normalizedSourcePath || !(await pathExists(candidatePath))) {
      return { filePath: candidatePath, fileName: candidateFileName }
    }
  }

  const fallbackFileName = `${baseName}-${Date.now()}${extension}`

  return { filePath: path.join(assetDirectoryPath, fallbackFileName), fileName: fallbackFileName }
}

async function readImageDataUrl(filePath) {
  const mimeType = getImageMimeType(filePath)

  if (!mimeType) {
    return null
  }

  let imageBuffer

  try {
    imageBuffer = await fs.readFile(filePath)
  } catch {
    return null
  }

  return `data:${mimeType};base64,${imageBuffer.toString('base64')}`
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
    return { canceled: true, error: getApplicationStrings().errors.folderOpenFailed }
  }

  if (!folderStats.isDirectory()) {
    return { canceled: true, error: getApplicationStrings().errors.pathNotFolder }
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
    return { canceled: true, error: getApplicationStrings().errors.unsupportedFileType }
  }

  let content
  let fileStats

  try {
    fileStats = await fs.stat(filePath)
    content = await fs.readFile(filePath, 'utf8')
  } catch {
    return { canceled: true, error: getApplicationStrings().errors.fileOpenFailed }
  }

  return {
    canceled: false,
    content,
    filePath,
    fileName: getFileName(filePath),
    modifiedAt: fileStats.mtimeMs,
  }
}

ipcMain.handle('openmark:open-markdown-file', async () => {
  const { dialogs, fileTypes } = getApplicationStrings()
  const result = await dialog.showOpenDialog({
    title: dialogs.openMarkdownFile,
    properties: ['openFile'],
    filters: [
      { name: fileTypes.markdown, extensions: ['md', 'markdown', 'mdown'] },
      { name: fileTypes.text, extensions: ['txt'] },
      { name: fileTypes.allFiles, extensions: ['*'] },
    ],
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true }
  }

  return readMarkdownFile(result.filePaths[0])
})

ipcMain.handle('openmark:open-recent-file', async (_event, filePath) => {
  if (typeof filePath !== 'string' || filePath.length === 0) {
    return { canceled: true, error: getApplicationStrings().errors.invalidFilePath }
  }

  return readMarkdownFile(filePath)
})

ipcMain.handle('openmark:select-workspace-folder', async () => {
  const result = await dialog.showOpenDialog({
    title: getApplicationStrings().dialogs.openWorkspaceFolder,
    properties: ['openDirectory'],
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true }
  }

  return listWorkspaceFolder(result.filePaths[0])
})

ipcMain.handle('openmark:read-workspace-folder', async (_event, folderPath) => {
  if (typeof folderPath !== 'string' || folderPath.length === 0) {
    return { canceled: true, error: getApplicationStrings().errors.invalidFolderPath }
  }

  return listWorkspaceFolder(folderPath)
})

ipcMain.handle('openmark:select-image-file', async () => {
  const { dialogs, fileTypes } = getApplicationStrings()
  const result = await dialog.showOpenDialog({
    title: dialogs.insertImage,
    properties: ['openFile'],
    filters: [
      { name: fileTypes.images, extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] },
      { name: fileTypes.allFiles, extensions: ['*'] },
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
    previewSrc: await readImageDataUrl(filePath),
  }
})

ipcMain.handle('openmark:copy-image-to-document-assets', async (_event, payload) => {
  const sourcePath = typeof payload?.sourcePath === 'string' && payload.sourcePath.length > 0 ? payload.sourcePath : null
  const documentPath = typeof payload?.documentPath === 'string' && payload.documentPath.length > 0 ? payload.documentPath : null

  if (!sourcePath || !documentPath) {
    return { canceled: true, error: getApplicationStrings().errors.invalidFilePath }
  }

  if (!getImageMimeType(sourcePath)) {
    return { canceled: true, error: getApplicationStrings().errors.assetCopyFailed }
  }

  const documentDirectoryPath = path.dirname(documentPath)
  const assetDirectoryPath = path.join(documentDirectoryPath, 'assets')

  try {
    await fs.mkdir(assetDirectoryPath, { recursive: true })

    const asset = await getAvailableAssetPath(assetDirectoryPath, getFileName(sourcePath), sourcePath)

    if (path.resolve(asset.filePath) !== path.resolve(sourcePath)) {
      await fs.copyFile(sourcePath, asset.filePath)
    }

    const relativePath = path.relative(documentDirectoryPath, asset.filePath).split(path.sep).join('/')

    return {
      canceled: false,
      filePath: asset.filePath,
      fileName: asset.fileName,
      relativePath,
      previewSrc: await readImageDataUrl(asset.filePath),
    }
  } catch (error) {
    console.error('Image asset copy failed:', error)
    return { canceled: true, error: getApplicationStrings().errors.assetCopyFailed }
  }
})

ipcMain.handle('openmark:check-image-resources', async (_event, payload) => {
  const documentPath = typeof payload?.documentPath === 'string' && payload.documentPath.length > 0
    ? payload.documentPath
    : null
  const targets = Array.isArray(payload?.targets)
    ? [...new Set(payload.targets.filter((target) => typeof target === 'string' && target.trim().length > 0))].slice(0, 500)
    : []

  const resources = await Promise.all(targets.map(async (target) => {
    const filePath = resolveImageResourcePath(target, documentPath)

    if (!filePath) {
      return { target, exists: false, skipped: true }
    }

    return {
      target,
      filePath,
      exists: await pathExists(filePath),
      skipped: false,
    }
  }))

  return { resources }
})

ipcMain.handle('openmark:save-markdown-file', async (_event, payload) => {
  const content = typeof payload?.content === 'string' ? payload.content : ''
  const defaultFileName = typeof payload?.fileName === 'string' ? payload.fileName : 'untitled.md'
  const knownPath = typeof payload?.filePath === 'string' && payload.filePath.length > 0 ? payload.filePath : null
  const expectedModifiedAt = typeof payload?.expectedModifiedAt === 'number' && Number.isFinite(payload.expectedModifiedAt)
    ? payload.expectedModifiedAt
    : null
  const allowOverwrite = payload?.allowOverwrite === true
  const defaultPath = knownPath ? path.join(path.dirname(knownPath), defaultFileName) : defaultFileName
  const targetPath = payload?.forceDialog
    ? await showSaveDialog(defaultPath, 'markdown', ['md', 'markdown'])
    : knownPath ?? (await showSaveDialog(defaultPath, 'markdown', ['md', 'markdown']))

  if (!targetPath) {
    return { canceled: true }
  }

  if (knownPath && targetPath === knownPath && expectedModifiedAt !== null && !allowOverwrite) {
    let fileStats

    try {
      fileStats = await fs.stat(targetPath)
    } catch {
      return { canceled: true, error: getApplicationStrings().errors.fileOpenFailed }
    }

    if (Math.abs(fileStats.mtimeMs - expectedModifiedAt) > 2) {
      return {
        canceled: true,
        conflict: true,
        error: getApplicationStrings().errors.fileModifiedExternally,
        modifiedAt: fileStats.mtimeMs,
      }
    }
  }

  await fs.writeFile(targetPath, content, 'utf8')
  const savedStats = await fs.stat(targetPath)

  return {
    canceled: false,
    filePath: targetPath,
    fileName: getFileName(targetPath),
    modifiedAt: savedStats.mtimeMs,
  }
})

ipcMain.handle('openmark:save-html-file', async (_event, payload) => {
  const content = typeof payload?.content === 'string' ? payload.content : ''
  const defaultPath = typeof payload?.fileName === 'string' ? payload.fileName : 'document.html'
  const targetPath = await showSaveDialog(defaultPath, 'html', ['html'])

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
  const targetPath = await showSaveDialog(defaultPath, 'pdf', ['pdf'])

  if (!targetPath) {
    return { canceled: true }
  }

  try {
    const pdfBuffer = await renderHtmlToPdf(content)
    await fs.writeFile(targetPath, pdfBuffer)
  } catch (error) {
    console.error('PDF export failed:', error)
    return { canceled: true, error: getApplicationStrings().errors.pdfExportFailed }
  }

  return {
    canceled: false,
    filePath: targetPath,
    fileName: getFileName(targetPath),
  }
})

ipcMain.handle('openmark:write-clipboard-text', (_event, text) => {
  if (typeof text !== 'string') {
    return { copied: false, error: getApplicationStrings().errors.invalidClipboardContent }
  }

  clipboard.writeText(text)

  return { copied: true }
})

ipcMain.handle('openmark:get-update-status', () => getUpdateStatus())

ipcMain.handle('openmark:set-application-locale', (_event, locale) => setApplicationLocale(locale))

ipcMain.handle('openmark:check-for-updates', async () => checkForUpdates())

ipcMain.handle('openmark:install-update', () => {
  if (!updateStatus.canInstall) {
    return { accepted: false, error: getApplicationStrings().errors.noDownloadedUpdate }
  }

  setImmediate(() => autoUpdater.quitAndInstall(false, true))

  return { accepted: true }
})

async function renderHtmlToPdf(content) {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'openmark-pdf-'))
  const tempHtmlPath = path.join(tempDirectory, 'document.html')

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
    await fs.writeFile(tempHtmlPath, content, 'utf8')
    await printWindow.loadFile(tempHtmlPath)
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

    return await printWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { marginType: 'default' },
    })
  } finally {
    if (!printWindow.isDestroyed()) {
      printWindow.close()
    }

    await fs.rm(tempDirectory, { recursive: true, force: true })
  }
}

async function showSaveDialog(defaultPath, fileType, extensions) {
  const { dialogs, fileTypes } = getApplicationStrings()
  const fileTypeName = fileTypes[fileType] ?? fileType
  const result = await dialog.showSaveDialog({
    title: dialogs.saveFile.replace('{type}', fileTypeName),
    defaultPath,
    filters: [
      { name: fileTypeName, extensions },
      { name: fileTypes.allFiles, extensions: ['*'] },
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