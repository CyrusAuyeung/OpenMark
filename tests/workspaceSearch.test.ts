import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

type WorkspaceSearchFile = {
  filePath: string
  fileName: string
  relativePath: string
  modifiedAt: number
}

type WorkspaceSearchPreview = {
  lineText: string
  matchStart: number
  matchEnd: number
}

type WorkspaceSearchMatch = WorkspaceSearchFile & {
  lineNumber: number
  lineText: string
  matchStart: number
  matchEnd: number
}

const require = createRequire(import.meta.url)
const {
  findWorkspaceSearchMatchesInContent,
  getWorkspaceSearchLinePreview,
  isMarkdownLikeFile,
  workspaceSearchLinePreviewLength,
} = require('../electron/workspaceSearch.cjs') as {
  findWorkspaceSearchMatchesInContent: (
    file: WorkspaceSearchFile,
    content: string,
    query: string,
  ) => WorkspaceSearchMatch[]
  getWorkspaceSearchLinePreview: (line: string, matchIndex: number, matchLength: number) => WorkspaceSearchPreview
  isMarkdownLikeFile: (filePath: string) => boolean
  workspaceSearchLinePreviewLength: number
}

const noteFile: WorkspaceSearchFile = {
  filePath: 'C:\\docs\\note.md',
  fileName: 'note.md',
  relativePath: 'note.md',
  modifiedAt: 1000,
}

describe('findWorkspaceSearchMatchesInContent', () => {
  it('returns case-insensitive first matches with file and line metadata', () => {
    const matches = findWorkspaceSearchMatchesInContent(
      noteFile,
      'Intro\nAlpha beta\nSkipped\nsecond ALPHA hit',
      'alpha',
    )

    expect(matches).toEqual([
      {
        ...noteFile,
        lineNumber: 2,
        lineText: 'Alpha beta',
        matchStart: 0,
        matchEnd: 5,
      },
      {
        ...noteFile,
        lineNumber: 4,
        lineText: 'second ALPHA hit',
        matchStart: 7,
        matchEnd: 12,
      },
    ])
  })

  it('returns no matches for empty queries', () => {
    expect(findWorkspaceSearchMatchesInContent(noteFile, 'Alpha beta', '')).toEqual([])
  })
})

describe('getWorkspaceSearchLinePreview', () => {
  it('clips long lines while keeping match offsets aligned to the preview', () => {
    const line = `${'a'.repeat(300)}needle${'b'.repeat(300)}`
    const preview = getWorkspaceSearchLinePreview(line, 300, 'needle'.length)

    expect(preview.lineText.length).toBeLessThanOrEqual(workspaceSearchLinePreviewLength + 6)
    expect(preview.lineText.startsWith('...')).toBe(true)
    expect(preview.lineText.endsWith('...')).toBe(true)
    expect(preview.lineText.slice(preview.matchStart, preview.matchEnd)).toBe('needle')
  })
})

describe('isMarkdownLikeFile', () => {
  it('recognizes supported workspace text extensions case-insensitively', () => {
    expect(isMarkdownLikeFile('README.MD')).toBe(true)
    expect(isMarkdownLikeFile('draft.markdown')).toBe(true)
    expect(isMarkdownLikeFile('notes.mdown')).toBe(true)
    expect(isMarkdownLikeFile('plain.txt')).toBe(true)
    expect(isMarkdownLikeFile('image.png')).toBe(false)
  })
})
