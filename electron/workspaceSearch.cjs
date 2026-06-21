const path = require('node:path')

const workspaceSearchLinePreviewLength = 240
const markdownLikeFileExtensions = new Set(['.md', '.markdown', '.mdown', '.txt'])

function isMarkdownLikeFile(filePath) {
  return markdownLikeFileExtensions.has(path.extname(filePath).toLowerCase())
}

function getWorkspaceSearchLinePreview(line, matchIndex, matchLength) {
  if (line.length <= workspaceSearchLinePreviewLength) {
    return {
      lineText: line,
      matchStart: matchIndex,
      matchEnd: matchIndex + matchLength,
    }
  }

  const matchEnd = matchIndex + matchLength
  const idealStart = Math.max(0, matchIndex - 80)
  const maxStart = Math.max(0, line.length - workspaceSearchLinePreviewLength)
  let previewStart = Math.min(idealStart, maxStart)
  let previewEnd = Math.min(line.length, previewStart + workspaceSearchLinePreviewLength)

  if (matchEnd > previewEnd) {
    previewEnd = Math.min(line.length, matchEnd + 80)
    previewStart = Math.max(0, previewEnd - workspaceSearchLinePreviewLength)
  }

  const prefix = previewStart > 0 ? '...' : ''
  const suffix = previewEnd < line.length ? '...' : ''

  return {
    lineText: `${prefix}${line.slice(previewStart, previewEnd)}${suffix}`,
    matchStart: prefix.length + matchIndex - previewStart,
    matchEnd: prefix.length + matchEnd - previewStart,
  }
}

function findWorkspaceSearchMatchesInContent(file, content, query) {
  if (typeof query !== 'string' || query.length === 0) {
    return []
  }

  const normalizedQuery = query.toLowerCase()
  const lines = content.split(/\r\n|\r|\n/)
  const matches = []

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex]
    const matchIndex = line.toLowerCase().indexOf(normalizedQuery)

    if (matchIndex < 0) {
      continue
    }

    const preview = getWorkspaceSearchLinePreview(line, matchIndex, query.length)

    matches.push({
      filePath: file.filePath,
      fileName: file.fileName,
      relativePath: file.relativePath,
      modifiedAt: file.modifiedAt,
      lineNumber: lineIndex + 1,
      lineText: preview.lineText,
      matchStart: preview.matchStart,
      matchEnd: preview.matchEnd,
    })
  }

  return matches
}

module.exports = {
  findWorkspaceSearchMatchesInContent,
  getWorkspaceSearchLinePreview,
  isMarkdownLikeFile,
  workspaceSearchLinePreviewLength,
}
