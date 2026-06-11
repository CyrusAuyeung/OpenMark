import { readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const assetsDirectory = resolve(projectRoot, 'dist', 'assets')
const maxJavaScriptChunkBytes = 500 * 1024

let assetNames

try {
  assetNames = readdirSync(assetsDirectory)
} catch {
  console.error('Build budget check failed: dist/assets was not found. Run npm run build first.')
  process.exit(1)
}

const javascriptAssets = assetNames
  .filter((assetName) => assetName.endsWith('.js'))
  .map((assetName) => {
    const filePath = resolve(assetsDirectory, assetName)

    return {
      name: assetName,
      size: statSync(filePath).size,
    }
  })
  .sort((left, right) => right.size - left.size)

const oversizedAssets = javascriptAssets.filter((asset) => asset.size > maxJavaScriptChunkBytes)

if (oversizedAssets.length > 0) {
  console.error(`Build budget check failed: JavaScript chunks must be at most ${formatSize(maxJavaScriptChunkBytes)}.`)

  for (const asset of oversizedAssets) {
    console.error(`- ${asset.name}: ${formatSize(asset.size)}`)
  }

  process.exit(1)
}

const largestAsset = javascriptAssets[0]

if (!largestAsset) {
  console.error('Build budget check failed: no JavaScript assets were found in dist/assets.')
  process.exit(1)
}

console.log(`Build budget check passed. Largest JavaScript chunk: ${largestAsset.name} (${formatSize(largestAsset.size)}).`)

function formatSize(sizeInBytes) {
  return `${(sizeInBytes / 1024).toFixed(1)} kB`
}