import { describe, expect, it } from 'vitest'
import {
  createMarkdownTable,
  formatBlockLine,
  getDelimitedInlineFormatEdit,
  getTableColumnIndex,
  renderMarkdownTableRows,
  splitTableCells,
} from '../src/markdownFormat'
import type { MarkdownTextChange, MarkdownTextEdit } from '../src/markdownFormat'

const placeholders = {
  heading: 'Heading',
  listItem: 'List item',
  taskItem: 'Task item',
  quote: 'Quote',
  tableHeaders: ['Column 1', 'Column 2', 'Column 3'],
  tableRows: [
    ['Value 1', 'Value 2', 'Value 3'],
    ['Value 4', 'Value 5', 'Value 6'],
  ],
}

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

describe('formatBlockLine', () => {
  it('formats headings while preserving indentation and replacing existing heading markers', () => {
    expect(formatBlockLine('  ### Old heading', 0, 'heading-2', placeholders)).toBe('  ## Old heading')
    expect(formatBlockLine('  ', 0, 'heading-2', placeholders)).toBe('  ## Heading')
  })

  it('converts existing list markers into bullet, ordered, and task markers', () => {
    expect(formatBlockLine('  3. Existing item', 0, 'bullet-list', placeholders)).toBe('  - Existing item')
    expect(formatBlockLine('- Existing item', 1, 'ordered-list', placeholders)).toBe('2. Existing item')
    expect(formatBlockLine('  - [x] Finished', 0, 'task-list', placeholders)).toBe('  - [ ] Finished')
  })

  it('formats quotes and falls back to placeholder copy for empty lines', () => {
    expect(formatBlockLine('> Existing quote', 0, 'quote', placeholders)).toBe('> Existing quote')
    expect(formatBlockLine('', 0, 'quote', placeholders)).toBe('> Quote')
  })
})

describe('createMarkdownTable', () => {
  it('creates a placeholder table when no text is selected', () => {
    expect(createMarkdownTable('', placeholders)).toBe([
      '| Column 1 | Column 2 | Column 3 |',
      '| --- | --- | --- |',
      '| Value 1 | Value 2 | Value 3 |',
      '| Value 4 | Value 5 | Value 6 |',
    ].join('\n'))
  })

  it('converts comma-separated selected rows into a Markdown table', () => {
    expect(createMarkdownTable('Name, Role\nAda, Writer', placeholders)).toBe([
      '| Name | Role |',
      '| --- | --- |',
      '| Ada | Writer |',
    ].join('\n'))
  })

  it('normalizes Markdown-like and tab-separated table cells', () => {
    expect(splitTableCells('| Name | Role |')).toEqual(['Name', 'Role'])
    expect(splitTableCells('Name\tRole')).toEqual(['Name', 'Role'])
  })

  it('normalizes missing cells and separator rows while rendering table rows', () => {
    expect(renderMarkdownTableRows([
      ['Name', 'Role'],
      ['bad', ':---:'],
      ['Ada'],
    ], 1, 2)).toBe([
      '| Name | Role |',
      '| --- | :---: |',
      '| Ada |   |',
    ].join('\n'))
  })

  it('maps cursor offsets to bounded table column indexes', () => {
    expect(getTableColumnIndex('| Name | Role |', 2, 2)).toBe(0)
    expect(getTableColumnIndex('| Name | Role |', 9, 2)).toBe(1)
    expect(getTableColumnIndex('| Name | Role |', 100, 2)).toBe(1)
  })
})
