import { describe, expect, it } from 'vitest'
import {
  createMarkdownLinkFromPaste,
  createMarkdownTable,
  formatBlockLine,
  getDelimitedInlineFormatEdit,
  getMarkdownListContinuationEdit,
  getMarkdownListMatch,
  getMarkdownPasteEdit,
  getSinglePastedUrl,
  getTaskCheckboxToggleChanges,
  getTableEditActionResult,
  getTableColumnIndex,
  normalizePastedPlainText,
  renderMarkdownTableRows,
  splitTableCells,
} from '../src/markdownFormat'
import type { MarkdownTextChange, MarkdownTextEdit } from '../src/markdownFormat'
import type { MarkdownTableContext, MarkdownTableEditResult } from '../src/markdownFormat'

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

function getMarkdownLines(markdownValue: string) {
  let offset = 0

  return markdownValue.split('\n').map((text) => {
    const line = {
      from: offset,
      to: offset + text.length,
      text,
    }

    offset += text.length + 1

    return line
  })
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

function createTableContext(
  rows: string[][],
  overrides: Partial<MarkdownTableContext> = {},
): MarkdownTableContext {
  return {
    from: 0,
    to: 0,
    rows,
    separatorIndex: 1,
    activeRowIndex: 2,
    activeColumnIndex: 0,
    columnCount: Math.max(2, ...rows.map((row) => row.length)),
    ...overrides,
  }
}

function renderTableEditResult(context: MarkdownTableContext, result: MarkdownTableEditResult | null) {
  if (!result) {
    return null
  }

  return {
    ...result,
    table: renderMarkdownTableRows(result.rows, context.separatorIndex, result.columnCount),
  }
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

describe('getMarkdownListContinuationEdit', () => {
  it('continues bullet, ordered, and task list markers', () => {
    const bulletEdit = getMarkdownListContinuationEdit({
      selection: { from: 6, to: 6 },
      line: { from: 0, to: 6, text: '- item' },
    })
    const orderedEdit = getMarkdownListContinuationEdit({
      selection: { from: 9, to: 9 },
      line: { from: 0, to: 9, text: '  9) Step' },
    })
    const taskEdit = getMarkdownListContinuationEdit({
      selection: { from: 10, to: 10 },
      line: { from: 0, to: 10, text: '- [x] Done' },
    })

    expect(bulletEdit).toEqual({
      changes: { from: 6, to: 6, insert: '\n- ' },
      selection: { anchor: 9 },
    })
    expect(orderedEdit).toEqual({
      changes: { from: 9, to: 9, insert: '\n  10) ' },
      selection: { anchor: 16 },
    })
    expect(taskEdit).toEqual({
      changes: { from: 10, to: 10, insert: '\n- [ ] ' },
      selection: { anchor: 17 },
    })
  })

  it('removes the list marker from an empty list item', () => {
    const edit = getMarkdownListContinuationEdit({
      selection: { from: 4, to: 4 },
      line: { from: 0, to: 4, text: '  - ' },
    })

    expect(edit).toEqual({
      changes: { from: 0, to: 4, insert: '  ' },
      selection: { anchor: 2 },
    })
  })

  it('does not handle non-list lines or expanded selections', () => {
    expect(getMarkdownListMatch('Plain text')).toBeNull()
    expect(getMarkdownListContinuationEdit({
      selection: { from: 0, to: 4 },
      line: { from: 0, to: 6, text: '- item' },
    })).toBeNull()
  })
})

describe('getTaskCheckboxToggleChanges', () => {
  it('toggles task checkbox markers across selected lines', () => {
    const markdownValue = [
      '- [ ] One',
      'plain',
      '  * [X] Two',
      '+ [x] Three',
    ].join('\n')
    const changes = getTaskCheckboxToggleChanges(getMarkdownLines(markdownValue))

    expect(changes).toEqual([
      { from: 3, to: 4, insert: 'x' },
      { from: 21, to: 22, insert: ' ' },
      { from: 31, to: 32, insert: ' ' },
    ])
    expect(applyChanges(markdownValue, changes ?? [])).toBe([
      '- [x] One',
      'plain',
      '  * [ ] Two',
      '+ [ ] Three',
    ].join('\n'))
  })

  it('returns null when no task checkbox markers are present', () => {
    expect(getTaskCheckboxToggleChanges(getMarkdownLines('- item\nplain'))).toBeNull()
  })
})

describe('getMarkdownPasteEdit', () => {
  it('normalizes plain text pasted from rich sources', () => {
    const clipboardText = '\uFEFFOne\u200B\u00A0two\r\nthree\u2028four'

    expect(normalizePastedPlainText(clipboardText)).toBe('One two\nthree\nfour')
    expect(getMarkdownPasteEdit({
      clipboardText,
      selection: { from: 2, to: 5 },
      selectedText: 'old',
    })).toEqual({
      changes: { from: 2, to: 5, insert: 'One two\nthree\nfour' },
      selection: { anchor: 20 },
    })
  })

  it('wraps selected text as a Markdown link when a single web URL is pasted', () => {
    const edit = getMarkdownPasteEdit({
      clipboardText: ' https://example.com/a?b=<c> ',
      selection: { from: 0, to: 5 },
      selectedText: 'Label ] text',
    })

    expect(createMarkdownLinkFromPaste('Label ] text', 'https://example.com/a?b=<c>')).toBe(
      '[Label \\] text](<https://example.com/a?b=%3Cc%3E>)',
    )
    expect(edit).toEqual({
      changes: {
        from: 0,
        to: 5,
        insert: '[Label \\] text](<https://example.com/a?b=%3Cc%3E>)',
      },
      selection: { anchor: 50 },
    })
  })

  it('keeps default paste behavior for unchanged text and empty-selection URLs', () => {
    expect(getSinglePastedUrl('https://example.com')).toBe('https://example.com')
    expect(getSinglePastedUrl('mailto:test@example.com')).toBeNull()
    expect(getSinglePastedUrl('https://example.com with-space')).toBeNull()
    expect(getMarkdownPasteEdit({
      clipboardText: 'plain text',
      selection: { from: 0, to: 0 },
      selectedText: '',
    })).toBeNull()
    expect(getMarkdownPasteEdit({
      clipboardText: 'https://example.com',
      selection: { from: 0, to: 0 },
      selectedText: '',
    })).toBeNull()
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

describe('getTableEditActionResult', () => {
  it('formats existing table rows without moving the active cell', () => {
    const context = createTableContext([
      ['Name', 'Role'],
      ['bad', ':---:'],
      ['Ada'],
    ], { activeRowIndex: 2, activeColumnIndex: 1 })

    expect(renderTableEditResult(context, getTableEditActionResult(context, 'format'))).toEqual({
      rows: [
        ['Name', 'Role'],
        ['---', ':---:'],
        ['Ada', ' '],
      ],
      activeRowIndex: 2,
      activeColumnIndex: 1,
      columnCount: 2,
      table: [
        '| Name | Role |',
        '| --- | :---: |',
        '| Ada |   |',
      ].join('\n'),
    })
  })

  it('inserts a blank row below the active body row', () => {
    const context = createTableContext([
      ['Name', 'Role'],
      ['---', '---'],
      ['Ada', 'Writer'],
    ])

    expect(renderTableEditResult(context, getTableEditActionResult(context, 'insert-row-below'))).toEqual({
      rows: [
        ['Name', 'Role'],
        ['---', '---'],
        ['Ada', 'Writer'],
        [' ', ' '],
      ],
      activeRowIndex: 3,
      activeColumnIndex: 0,
      columnCount: 2,
      table: [
        '| Name | Role |',
        '| --- | --- |',
        '| Ada | Writer |',
        '|   |   |',
      ].join('\n'),
    })
  })

  it('inserts a blank row below the separator when the active row is the header or separator', () => {
    const context = createTableContext([
      ['Name', 'Role'],
      ['---', '---'],
      ['Ada', 'Writer'],
    ], { activeRowIndex: 0 })

    const result = getTableEditActionResult(context, 'insert-row-below')

    expect(result?.rows).toEqual([
      ['Name', 'Role'],
      ['---', '---'],
      [' ', ' '],
      ['Ada', 'Writer'],
    ])
    expect(result?.activeRowIndex).toBe(2)
  })

  it('deletes body rows while keeping the active row index in range', () => {
    const context = createTableContext([
      ['Name', 'Role'],
      ['---', '---'],
      ['Ada', 'Writer'],
      ['Grace', 'Reviewer'],
    ], { activeRowIndex: 3 })

    expect(renderTableEditResult(context, getTableEditActionResult(context, 'delete-row'))).toEqual({
      rows: [
        ['Name', 'Role'],
        ['---', '---'],
        ['Ada', 'Writer'],
      ],
      activeRowIndex: 2,
      activeColumnIndex: 0,
      columnCount: 2,
      table: [
        '| Name | Role |',
        '| --- | --- |',
        '| Ada | Writer |',
      ].join('\n'),
    })
  })

  it('does not delete header or separator rows', () => {
    const context = createTableContext([
      ['Name', 'Role'],
      ['---', '---'],
      ['Ada', 'Writer'],
    ], { activeRowIndex: 1 })

    expect(getTableEditActionResult(context, 'delete-row')).toBeNull()
  })

  it('inserts a blank column to the right of the active column', () => {
    const context = createTableContext([
      ['Name', 'Role'],
      ['---', '---'],
      ['Ada', 'Writer'],
    ], { activeColumnIndex: 0 })

    expect(renderTableEditResult(context, getTableEditActionResult(context, 'insert-column-right'))).toEqual({
      rows: [
        ['Name', ' ', 'Role'],
        ['---', '---', '---'],
        ['Ada', ' ', 'Writer'],
      ],
      activeRowIndex: 2,
      activeColumnIndex: 1,
      columnCount: 3,
      table: [
        '| Name |   | Role |',
        '| --- | --- | --- |',
        '| Ada |   | Writer |',
      ].join('\n'),
    })
  })

  it('deletes columns when more than two columns remain', () => {
    const context = createTableContext([
      ['Name', 'Role', 'Status'],
      ['---', '---', '---'],
      ['Ada', 'Writer', 'Done'],
    ], { activeColumnIndex: 1 })

    expect(renderTableEditResult(context, getTableEditActionResult(context, 'delete-column'))).toEqual({
      rows: [
        ['Name', 'Status'],
        ['---', '---'],
        ['Ada', 'Done'],
      ],
      activeRowIndex: 2,
      activeColumnIndex: 1,
      columnCount: 2,
      table: [
        '| Name | Status |',
        '| --- | --- |',
        '| Ada | Done |',
      ].join('\n'),
    })
  })

  it('does not delete columns from a two-column table', () => {
    const context = createTableContext([
      ['Name', 'Role'],
      ['---', '---'],
      ['Ada', 'Writer'],
    ])

    expect(getTableEditActionResult(context, 'delete-column')).toBeNull()
  })
})
