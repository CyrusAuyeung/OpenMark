import { readFileSync } from 'node:fs'
import { connect as connectSocket } from 'node:net'
import { request } from 'node:https'
import { connect as connectTls } from 'node:tls'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const packageJson = readJson('package.json')
const packageVersion = packageJson.version
const releaseTag = parseTagArgument() ?? `v${packageVersion}`
const releaseVersion = releaseTag.replace(/^v/, '')
const repository = parseRepositoryArgument() ?? process.env.GITHUB_REPOSITORY ?? getRepositoryFromPackageJson()
const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN
const githubApiHostname = 'api.github.com'
const githubApiConnection = createProxyConnection(githubApiHostname)

if (!repository || !repository.includes('/')) {
  throw new Error('Repository must be provided as owner/name through --repo or GITHUB_REPOSITORY.')
}

const expectedAssets = [
  `OpenMark.Setup.${releaseVersion}.exe`,
  `OpenMark.${releaseVersion}.exe`,
  `OpenMark-${releaseVersion}.dmg`,
  `OpenMark-${releaseVersion}-arm64.dmg`,
  `openmark-editor_${releaseVersion}_amd64.deb`,
  'latest.yml',
  'latest-mac.yml',
  'latest-linux.yml',
]

const updateMetadataAssets = [
  'latest.yml',
  'latest-mac.yml',
  'latest-linux.yml',
]

const expectedBodyMarkers = [
  '## Summary',
  '## Highlights',
  '## Downloads',
  '## Verification Checklist',
  '## Full Changelog',
  `- Tag: ${releaseTag}`,
]

const release = await githubRequest(`/repos/${repository}/releases/tags/${encodeURIComponent(releaseTag)}`)
const assetNames = release.assets.map((asset) => asset.name)
const checks = []

expect(release.tag_name === releaseTag, `release tag ${release.tag_name} must match ${releaseTag}`)
expect(release.name === releaseTag, `release name ${release.name} must match ${releaseTag}`)
expect(Boolean(release.body?.trim()), 'release body must not be empty')
expect(release.body.includes(`OpenMark ${releaseVersion}`), `release body must mention OpenMark ${releaseVersion}`)

for (const marker of expectedBodyMarkers) {
  expect(release.body.includes(marker), `release body must contain ${marker}`)
}

for (const assetName of expectedAssets) {
  expect(assetNames.includes(assetName), `release assets must include ${assetName}`)
}

await verifyUpdateMetadataReferences(release.assets, assetNames)

const failedChecks = checks.filter((check) => !check.passed)

if (failedChecks.length > 0) {
  console.error(`GitHub release verification failed for ${repository}@${releaseTag}:`)

  for (const failedCheck of failedChecks) {
    console.error(`- ${failedCheck.message}`)
  }

  process.exit(1)
}

console.log(`GitHub release verification passed for ${repository}@${releaseTag}.`)

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

function parseRepositoryArgument() {
  const repoIndex = process.argv.indexOf('--repo')

  if (repoIndex >= 0) {
    return process.argv[repoIndex + 1]
  }

  const inlineRepoArgument = process.argv.find((argument) => argument.startsWith('--repo='))

  if (inlineRepoArgument) {
    return inlineRepoArgument.slice('--repo='.length)
  }

  return undefined
}

function getRepositoryFromPackageJson() {
  const repositoryUrl = typeof packageJson.repository?.url === 'string' ? packageJson.repository.url : ''
  const repositoryMatch = /github\.com[:/]([^/]+\/[^/.]+)(?:\.git)?$/i.exec(repositoryUrl)

  return repositoryMatch?.[1]
}

function githubRequest(path) {
  return new Promise((resolveRequest, rejectRequest) => {
    const headers = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'OpenMark-release-verify',
      'X-GitHub-Api-Version': '2022-11-28',
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const apiRequest = request(
      {
        createConnection: githubApiConnection,
        hostname: githubApiHostname,
        method: 'GET',
        path,
        port: 443,
        headers,
      },
      (response) => {
        let body = ''

        response.setEncoding('utf8')
        response.on('data', (chunk) => {
          body += chunk
        })
        response.on('end', () => {
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            resolveRequest(JSON.parse(body))
            return
          }

          rejectRequest(new Error(`GitHub API returned ${response.statusCode}: ${body}`))
        })
      },
    )

    apiRequest.on('error', rejectRequest)
    apiRequest.end()
  })
}

async function verifyUpdateMetadataReferences(assets, assetNames) {
  for (const metadataAssetName of updateMetadataAssets) {
    const metadataAsset = assets.find((asset) => asset.name === metadataAssetName)

    if (!metadataAsset) {
      continue
    }

    const metadata = await downloadReleaseAssetText(metadataAsset)
    const referencedAssets = getUpdateMetadataAssetReferences(metadata)

    expect(referencedAssets.length > 0, `${metadataAssetName} must reference at least one update asset`)

    for (const referencedAsset of referencedAssets) {
      expect(
        assetNames.includes(referencedAsset),
        `${metadataAssetName} must reference published asset ${referencedAsset}`,
      )
    }
  }
}

function getUpdateMetadataAssetReferences(metadata) {
  return Array.from(metadata.matchAll(/^\s*(?:url|path):\s*(.+?)\s*$/gm))
    .map((match) => getAssetNameFromMetadataValue(match[1]))
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
}

function getAssetNameFromMetadataValue(value) {
  const cleanedValue = value.trim().replace(/^['"]|['"]$/g, '')

  try {
    const parsedUrl = new URL(cleanedValue)
    return decodeURIComponent(parsedUrl.pathname.split('/').pop() ?? '')
  } catch {
    return cleanedValue.split('/').pop()
  }
}

function downloadReleaseAssetText(asset, redirectCount = 0) {
  const downloadUrl = asset.browser_download_url ?? asset.url

  if (!downloadUrl) {
    throw new Error(`Release asset ${asset.name} does not expose a download URL.`)
  }

  return downloadText(downloadUrl, redirectCount)
}

function downloadText(downloadUrl, redirectCount = 0) {
  if (redirectCount > 5) {
    throw new Error(`Too many redirects while downloading ${downloadUrl}`)
  }

  return new Promise((resolveDownload, rejectDownload) => {
    const parsedUrl = new URL(downloadUrl)
    const headers = {
      Accept: 'application/octet-stream',
      'User-Agent': 'OpenMark-release-verify',
    }

    if (token && parsedUrl.hostname === githubApiHostname) {
      headers.Authorization = `Bearer ${token}`
    }

    const downloadRequest = request(
      {
        createConnection: createProxyConnection(parsedUrl.hostname),
        hostname: parsedUrl.hostname,
        method: 'GET',
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        port: 443,
        headers,
      },
      (response) => {
        const location = response.headers.location

        if (
          response.statusCode &&
          [301, 302, 303, 307, 308].includes(response.statusCode) &&
          location
        ) {
          response.resume()
          resolveDownload(downloadText(new URL(location, parsedUrl).toString(), redirectCount + 1))
          return
        }

        let body = ''
        response.setEncoding('utf8')
        response.on('data', (chunk) => {
          body += chunk
        })
        response.on('end', () => {
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            resolveDownload(body)
            return
          }

          rejectDownload(new Error(`Release asset download returned ${response.statusCode}: ${body}`))
        })
      },
    )

    downloadRequest.on('error', rejectDownload)
    downloadRequest.end()
  })
}

function createProxyConnection(hostname) {
  const proxyUrl = getProxyUrl(hostname)

  return proxyUrl
    ? (options, callback) => createHttpsProxyConnection(proxyUrl, options, callback)
    : undefined
}

function getProxyUrl(hostname) {
  if (shouldBypassProxy(hostname)) {
    return undefined
  }

  return process.env.HTTPS_PROXY ??
    process.env.https_proxy ??
    process.env.HTTP_PROXY ??
    process.env.http_proxy
}

function shouldBypassProxy(hostname) {
  const noProxy = process.env.NO_PROXY ?? process.env.no_proxy

  if (!noProxy) {
    return false
  }

  return noProxy
    .split(',')
    .map((pattern) => pattern.trim().toLowerCase())
    .filter(Boolean)
    .some((pattern) => (
      pattern === '*' ||
      hostname === pattern ||
      hostname.endsWith(`.${pattern.replace(/^\./, '')}`)
    ))
}

function createHttpsProxyConnection(proxyUrl, options, callback) {
  const parsedProxyUrl = new URL(proxyUrl)

  if (parsedProxyUrl.protocol !== 'http:') {
    callback(new Error(`Only HTTP proxy URLs are supported by release verification: ${parsedProxyUrl.protocol}`))
    return undefined
  }

  const targetHost = options.servername ?? options.hostname ?? options.host
  const targetPort = Number(options.port === 80 ? 443 : options.port ?? 443)

  if (!targetHost) {
    callback(new Error('Cannot create proxy tunnel without a target host.'))
    return undefined
  }

  const proxyPort = Number(parsedProxyUrl.port || 80)
  const proxySocket = connectSocket(proxyPort, parsedProxyUrl.hostname)
  const proxyAuthorization = parsedProxyUrl.username
    ? `Proxy-Authorization: Basic ${Buffer.from(`${decodeURIComponent(parsedProxyUrl.username)}:${decodeURIComponent(parsedProxyUrl.password)}`).toString('base64')}`
    : ''
  let proxyResponse = Buffer.alloc(0)
  let settled = false

  const finish = (error, socket) => {
    if (settled) {
      return
    }

    settled = true
    proxySocket.setTimeout(0)

    if (error) {
      proxySocket.destroy()
      callback(error)
      return
    }

    callback(null, socket)
  }

  const handleProxyData = (chunk) => {
    proxyResponse = Buffer.concat([proxyResponse, chunk])

    const headerEnd = proxyResponse.indexOf('\r\n\r\n')

    if (headerEnd === -1) {
      return
    }
    proxySocket.off('data', handleProxyData)

    const header = proxyResponse.slice(0, headerEnd).toString('latin1')
    const statusMatch = /^HTTP\/1\.\d\s+(\d+)/.exec(header)
    const statusCode = Number(statusMatch?.[1])

    if (!statusMatch || statusCode < 200 || statusCode >= 300) {
      finish(new Error(`Proxy CONNECT failed: ${header.split('\r\n')[0] ?? 'unknown response'}`))
      return
    }

    const tunnel = connectTls({
      ALPNProtocols: ['http/1.1'],
      servername: targetHost,
      socket: proxySocket,
    })

    tunnel.once('secureConnect', () => finish(null, tunnel))
    tunnel.once('error', finish)
  }

  proxySocket.setTimeout(30_000, () => finish(new Error(`Proxy CONNECT to ${targetHost}:${targetPort} timed out.`)))
  proxySocket.once('error', finish)
  proxySocket.once('connect', () => {
    const connectHeaders = [
      `CONNECT ${targetHost}:${targetPort} HTTP/1.1`,
      `Host: ${targetHost}:${targetPort}`,
      proxyAuthorization,
      'Connection: keep-alive',
    ].filter((line) => line.length > 0)

    proxySocket.write(`${connectHeaders.join('\r\n')}\r\n\r\n`)
  })
  proxySocket.on('data', handleProxyData)

  return undefined
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(projectRoot, path), 'utf8'))
}

function expect(passed, message) {
  checks.push({ passed, message })
}
