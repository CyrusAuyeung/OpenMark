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
  publish: [
    {
      provider: 'github',
      owner: 'CyrusAuyeung',
      repo: 'OpenMark',
    },
  ],
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
  mac: {
    category: 'public.app-category.productivity',
    identity: null,
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64'],
      },
      {
        target: 'zip',
        arch: ['x64', 'arm64'],
      },
    ],
  },
  linux: {
    category: 'Office',
    maintainer: 'OpenMark contributors <CyrusAuyeung@users.noreply.github.com>',
    target: [
      {
        target: 'deb',
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