import { describe, expect, it } from 'vitest'
import { getDelimitedInlineFormatEdit } from '../src/markdownFormat'
import type { MarkdownTextChange, MarkdownTextEdit } from '../src/markdownFormat'

function countAdjacentMarkerRun(markdownValue: string, position: number, direction: 'before' | 'after') {
  let markerCount = 0
  const step = direction === 'before' ? -1 : 1
  let currentPosition = direction === 'before' ? position - 1 : position

  while (currentPosition >= 0 && currentPosition < markdownValue.length) {
    if (markdownValue[currentPosition] !== '*') {
      break
    }

    markerCount += 1
    currentPosition += step
  }

  return markerCount
}

function applyChanges(markdownValue: string, changes: MarkdownTextChange | MarkdownTextChange[]) {
  const normalizedChanges = Array.isArray(changes) ? changes : [changes]

  return [...normalizedChanges]
    .sort((left, right) => right.from - left.from)
    .reduce((nextValue, change) => (
      `${nextValue.slice(0, change.from)}${change.insert}${nextValue.slice(change.to)}`
    ), markdownValue)
}

function applyDelimitedFormat(
  markdownValue: string,
  selection: { from: number, to: number },
  delimiter: '*' | '**',
) {
  const edit = getDelimitedInlineFormatEdit({
    selection,
    selectedText: markdownValue.slice(selection.from, selection.to),
    leftOuterMarkerRun: countAdjacentMarkerRun(markdownValue, selection.from, 'before'),
    rightOuterMarkerRun: countAdjacentMarkerRun(markdownValue, selection.to, 'after'),
    delimiter,
  })

  return {
    markdownValue: applyChanges(markdownValue, edit.changes),
    selection: edit.selection,
  }
}

function expectEditResult(
  actual: ReturnType<typeof applyDelimitedFormat>,
  expectedMarkdownValue: string,
  expectedSelection: MarkdownTextEdit['selection'],
) {
  expect(actual.markdownValue).toBe(expectedMarkdownValue)
  expect(actual.selection).toEqual(expectedSelection)
}

describe('getDelimitedInlineFormatEdit', () => {
  it('wraps plain selected text with bold markers', () => {
    expectEditResult(
      applyDelimitedFormat('plain text', { from: 0, to: 5 }, '**'),
      '**plain** text',
      { anchor: 2, head: 7 },
    )
  })

  it('removes bold markers when selected text includes them', () => {
    expectEditResult(
      applyDelimitedFormat('**plain** text', { from: 0, to: 9 }, '**'),
      'plain text',
      { anchor: 0, head: 5 },
    )
  })

  it('removes bold markers around the selected text', () => {
    expectEditResult(
      applyDelimitedFormat('**plain** text', { from: 2, to: 7 }, '**'),
      'plain text',
      { anchor: 0, head: 5 },
    )
  })

  it('keeps italic markers when bold is toggled off in combined markers', () => {
    expectEditResult(
      applyDelimitedFormat('***plain***', { from: 0, to: 11 }, '**'),
      '*plain*',
      { anchor: 1, head: 6 },
    )
  })

  it('keeps bold markers when italic is toggled off in combined markers', () => {
    expectEditResult(
      applyDelimitedFormat('***plain***', { from: 0, to: 11 }, '*'),
      '**plain**',
      { anchor: 2, head: 7 },
    )
  })

  it('normalizes repeated marker runs when toggling bold off', () => {
    expectEditResult(
      applyDelimitedFormat('****plain****', { from: 0, to: 13 }, '**'),
      'plain',
      { anchor: 0, head: 5 },
    )
  })

  it('normalizes outer combined markers around the selected text', () => {
    expectEditResult(
      applyDelimitedFormat('***plain***', { from: 3, to: 8 }, '*'),
      '**plain**',
      { anchor: 2, head: 7 },
    )
  })
})
