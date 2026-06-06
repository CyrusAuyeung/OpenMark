const hasWindowsSigningCertificate = Boolean(
  process.env.WIN_CSC_LINK || process.env.CSC_LINK,
)

module.exports = {
  appId: 'dev.openmark.editor',
  productName: 'OpenMark',
  copyright: 'Copyright 2026 OpenMark contributors',
  directories: {
    output: 'release',
  },
  files: [
    'dist/**/*',
    'electron/**/*',
    'package.json',
    'LICENSE',
    'README.md',
  ],
  asar: true,
  win: {
    signAndEditExecutable: hasWindowsSigningCertificate,
    forceCodeSigning: false,
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
      {
        target: 'portable',
        arch: ['x64'],
      },
    ],
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'OpenMark',
  },
}