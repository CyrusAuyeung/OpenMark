import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const packageJson = readJson('package.json')
const version = packageJson.version
const targetVersion = parseVersionArgument() ?? version
const expectedTag = `v${targetVersion}`
const changelogEntry = getChangelogEntry(targetVersion)
const sections = parseChangelogSections(changelogEntry.body)
const releaseNotes = buildReleaseNotes(targetVersion, expectedTag, changelogEntry.date, sections)

if (process.argv.includes('--check')) {
  const currentTemplate = readText('.github/RELEASE_TEMPLATE/release-notes.md')

  if (normalizeLineEndings(currentTemplate).trim() !== normalizeLineEndings(releaseNotes).trim()) {
    console.error(`Release notes template is out of date for ${expectedTag}.`)
    console.error('Run npm run release:notes to regenerate .github/RELEASE_TEMPLATE/release-notes.md.')
    process.exit(1)
  }

  console.log(`Release notes template is current for ${expectedTag}.`)
} else {
  writeFileSync(resolve(projectRoot, '.github/RELEASE_TEMPLATE/release-notes.md'), `${releaseNotes}\n`, 'utf8')
  console.log(`Generated release notes for ${expectedTag}.`)
}

function parseVersionArgument() {
  const versionIndex = process.argv.indexOf('--version')

  if (versionIndex >= 0) {
    return normalizeVersion(process.argv[versionIndex + 1])
  }

  const inlineVersionArgument = process.argv.find((argument) => argument.startsWith('--version='))

  if (inlineVersionArgument) {
    return normalizeVersion(inlineVersionArgument.slice('--version='.length))
  }

  if (process.env.RELEASE_VERSION) {
    return normalizeVersion(process.env.RELEASE_VERSION)
  }

  if (process.env.RELEASE_TAG) {
    return normalizeVersion(process.env.RELEASE_TAG)
  }

  if (process.env.GITHUB_REF_NAME?.startsWith('v')) {
    return normalizeVersion(process.env.GITHUB_REF_NAME)
  }

  return undefined
}

function normalizeVersion(value) {
  return value?.replace(/^v/, '')
}

function getChangelogEntry(targetVersion) {
  const changelog = readText('CHANGELOG.md')
  const lines = changelog.split(/\r?\n/)
  const headingPattern = new RegExp(`^## ${escapeRegExp(targetVersion)} - (.+)$`)
  const startIndex = lines.findIndex((line) => headingPattern.test(line))

  if (startIndex === -1) {
    throw new Error(`CHANGELOG.md does not contain an entry for ${targetVersion}.`)
  }

  const headingMatch = headingPattern.exec(lines[startIndex])
  const bodyLines = []

  for (const line of lines.slice(startIndex + 1)) {
    if (line.startsWith('## ')) {
      break
    }

    bodyLines.push(line)
  }

  return {
    date: headingMatch[1].trim(),
    body: bodyLines.join('\n').trim(),
  }
}

function parseChangelogSections(entryBody) {
  const sections = []
  const sectionPattern = /^### (.+)$/gm
  const matches = Array.from(entryBody.matchAll(sectionPattern))

  if (matches.length === 0) {
    return [{ title: 'Highlights', items: parseListItems(entryBody) }]
  }

  for (let index = 0; index < matches.length; index += 1) {
    const currentMatch = matches[index]
    const nextMatch = matches[index + 1]
    const sectionBody = entryBody.slice(
      (currentMatch.index ?? 0) + currentMatch[0].length,
      nextMatch?.index ?? entryBody.length,
    )

    sections.push({
      title: currentMatch[1].trim(),
      items: parseListItems(sectionBody),
    })
  }

  return sections
}

function parseListItems(sectionBody) {
  return sectionBody
    .split(/\r?\n/)
    .map((line) => /^-\s+(.+)$/.exec(line.trim())?.[1])
    .filter(Boolean)
}

function buildReleaseNotes(targetVersion, expectedTag, releaseDate, sections) {
  const assetRows = getAssetRows(targetVersion)
  const summary = getSummary(targetVersion, sections)
  const highlightLines = sections.flatMap((section) => [
    `### ${section.title}`,
    '',
    ...section.items.map((item) => `- ${item}`),
    '',
  ])

  return [
    '# Release Notes',
    '',
    '## Summary',
    '',
    summary,
    '',
    '## Highlights',
    '',
    ...highlightLines,
    '## Downloads',
    '',
    'Choose the package for your operating system from the assets below.',
    '',
    '| Platform | Asset | Notes |',
    '| --- | --- | --- |',
    ...assetRows,
    '',
    'Keep these auto-update metadata files attached when generated:',
    '',
    '- `latest.yml`',
    '- `latest-mac.yml`',
    '- Linux update metadata `*.yml`',
    '',
    '## Upgrade Notes',
    '',
    '- Packaged builds can check for updates from **Help > Check for Updates...** or **Settings > Updates**.',
    '- Windows and macOS builds may show operating-system warnings until signed releases are published.',
    '',
    '## Verification Checklist',
    '',
    '- [ ] `npm run lint`',
    '- [ ] `npm run release:notes -- --check`',
    '- [ ] `npm run release:check`',
    '- [ ] `npm run build`',
    '- [ ] Windows artifacts built and smoke checked',
    '- [ ] macOS artifacts built and smoke checked',
    '- [ ] Linux artifacts built and smoke checked',
    '- [ ] `latest*.yml` update metadata attached when generated',
    '- [ ] Draft release reviewed before publishing',
    '',
    '## Known Limitations',
    '',
    '- Windows code signing is optional until signing secrets are configured.',
    '- macOS builds are currently unsigned and not notarized.',
    '- Linux AppImage support is planned after the `.deb` release path is stable.',
    '- Large renderer bundle warning is expected while CodeMirror is bundled eagerly.',
    '',
    '## Full Changelog',
    '',
    `- Release date: ${releaseDate}`,
    `- Tag: ${expectedTag}`,
  ].join('\n')
}

function getSummary(targetVersion, sections) {
  const sectionNames = sections.map((section) => section.title)
  const focusText = formatList(sectionNames.map(toSummaryFocusText))
  const firstItems = sections.flatMap((section) => section.items).slice(0, 3)
  const upgradeText = firstItems.length > 0 ? ` It includes ${formatList(firstItems.map(toSummaryPhrase))}.` : ''

  return `OpenMark ${targetVersion} focuses on ${focusText}.${upgradeText}`
}

function toSummaryFocusText(sectionName) {
  return sectionName
    .toLowerCase()
    .replace(/\bui\b/g, 'UI')
}

function toSummaryPhrase(item) {
  return item
    .replace(/^Added\s+/i, '')
    .replace(/^Fixed\s+/i, 'fixes for ')
    .replace(/^Polished\s+/i, 'polished ')
    .replace(/^Restored\s+/i, 'restoring ')
    .replace(/^Supported\s+/i, 'support for ')
    .replace(/^Exposed\s+/i, 'access to ')
    .replace(/^Improved\s+/i, 'improvements to ')
    .replace(/^Refined\s+/i, 'refinements to ')
    .replace(/\.$/, '')
}

function getAssetRows(targetVersion) {
  return [
    `| Windows | \`OpenMark.Setup.${targetVersion}.exe\` | Recommended installer. |`,
    `| Windows | \`OpenMark.${targetVersion}.exe\` | Portable app. |`,
    `| macOS Intel | \`OpenMark-${targetVersion}.dmg\` | Unsigned/not notarized for now. |`,
    `| macOS Apple Silicon | \`OpenMark-${targetVersion}-arm64.dmg\` | Unsigned/not notarized for now. |`,
    `| Linux Debian/Ubuntu | \`openmark-editor_${targetVersion}_amd64.deb\` | System package install. |`,
  ]
}

function formatList(items) {
  if (items.length === 0) {
    return 'release updates'
  }

  if (items.length === 1) {
    return items[0]
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`
  }

  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`
}

function readJson(path) {
  return JSON.parse(readText(path))
}

function readText(path) {
  return readFileSync(resolve(projectRoot, path), 'utf8')
}

function normalizeLineEndings(value) {
  return value.replace(/\r\n/g, '\n')
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}