import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))

const packageJson = readJson('package.json')
const packageLockJson = readJson('package-lock.json')
const version = packageJson.version
const expectedTag = parseTagArgument() ?? `v${version}`
const expectedVersion = expectedTag.replace(/^v/, '')

const expectedAssets = [
  `OpenMark.Setup.${expectedVersion}.exe`,
  `OpenMark.${expectedVersion}.exe`,
  `OpenMark-${expectedVersion}.dmg`,
  `OpenMark-${expectedVersion}-arm64.dmg`,
  `openmark-editor_${expectedVersion}_amd64.deb`,
]

const checks = []

expect(
  /^v\d+\.\d+\.\d+([-.][A-Za-z0-9.]+)?$/.test(expectedTag),
  `Release tag must be semantic and start with v: ${expectedTag}`,
)
expect(version === expectedVersion, `package.json version ${version} must match ${expectedTag}`)
expect(packageLockJson.version === version, `package-lock.json version ${packageLockJson.version} must match package.json`)
expect(
  packageLockJson.packages?.['']?.version === version,
  `package-lock root package version ${packageLockJson.packages?.['']?.version} must match package.json`,
)

const readme = readText('README.md')
const downloadGuide = readText('docs/download.md')
const releaseGuide = readText('docs/release.md')
const releaseTemplate = readText('.github/RELEASE_TEMPLATE/release-notes.md')

expectIncludes(readme, expectedTag, 'README release badge')
expectIncludes(releaseTemplate, `OpenMark ${expectedVersion}`, 'release notes summary')

for (const assetName of expectedAssets) {
  expectIncludes(readme, assetName, 'README downloads')
  expectIncludes(downloadGuide, assetName, 'download guide')
  expectIncludes(releaseGuide, assetName, 'release guide')
  expectIncludes(releaseTemplate, assetName, 'release notes template')
}

expectIncludes(releaseGuide, `git tag ${expectedTag}`, 'release guide tag command')
expectIncludes(releaseGuide, `git push origin ${expectedTag}`, 'release guide push command')

const failedChecks = checks.filter((check) => !check.passed)

if (failedChecks.length > 0) {
  console.error('Release consistency check failed:')

  for (const failedCheck of failedChecks) {
    console.error(`- ${failedCheck.message}`)
  }

  process.exit(1)
}

console.log(`Release consistency check passed for ${expectedTag}.`)

function parseTagArgument() {
  const tagIndex = process.argv.indexOf('--tag')

  if (tagIndex >= 0) {
    return process.argv[tagIndex + 1]
  }

  const inlineTagArgument = process.argv.find((argument) => argument.startsWith('--tag='))

  if (inlineTagArgument) {
    return inlineTagArgument.slice('--tag='.length)
  }

  if (process.env.RELEASE_TAG) {
    return process.env.RELEASE_TAG
  }

  if (process.env.GITHUB_REF_NAME?.startsWith('v')) {
    return process.env.GITHUB_REF_NAME
  }

  return undefined
}

function readJson(path) {
  return JSON.parse(readText(path))
}

function readText(path) {
  return readFileSync(resolve(projectRoot, path), 'utf8')
}

function expectIncludes(text, expectedText, context) {
  expect(text.includes(expectedText), `${context} must contain ${expectedText}`)
}

function expect(passed, message) {
  checks.push({ passed, message })
}