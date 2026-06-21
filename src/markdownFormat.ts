export type InlineFormat = 'bold' | 'italic' | 'link'
export type BlockFormat = 'heading-2' | 'bullet-list' | 'ordered-list' | 'task-list' | 'quote' | 'code-block' | 'table' | 'horizontal-rule'
export type MarkdownFormat = InlineFormat | BlockFormat
export type LineBlockFormat = Exclude<BlockFormat, 'code-block' | 'table' | 'horizontal-rule'>
export type TableEditAction = 'format' | 'insert-row-below' | 'delete-row' | 'insert-column-right' | 'delete-column'

export type MarkdownPlaceholderCatalog = {
  heading: string
  listItem: string
  taskItem: string
  quote: string
  tableHeaders: string[]
  tableRows: string[][]
}

export type MarkdownTextSelection = {
  from: number
  to: number
}

export type MarkdownTextChange = {
  from: number
  to: number
  insert: string
}

export type MarkdownTextEdit = {
  changes: MarkdownTextChange | MarkdownTextChange[]
  selection: {
    anchor: number
    head?: number
  }
}

export type MarkdownTextLine = {
  from: number
  to: number
  text: string
}

export type MarkdownListMatch = {
  indent: string
  marker: string
  body: string
}

export type MarkdownTableContext = {
  from: number
  to: number
  rows: string[][]
  separatorIndex: number
  activeRowIndex: number
  activeColumnIndex: number
  columnCount: number
}

export type MarkdownTableEditResult = {
  rows: string[][]
  activeRowIndex: number
  activeColumnIndex: number
  columnCount: number
}

const taskListLinePattern = /^(\s*)([-*+])\s+\[([ xX])\]\s*(.*)$/
const bulletListLinePattern = /^(\s*)([-*+])\s+(.*)$/
const orderedListLinePattern = /^(\s*)(\d+)([.)])\s+(.*)$/
const taskCheckboxPattern = /^(\s*[-*+]\s+\[)([ xX])(\]\s*)/
const zeroWidthPasteCharactersPattern = /[\u200B-\u200D\uFEFF]/g
const supportedPasteUrlProtocols = new Set(['http:', 'https:'])

function countEdgeMarkerRun(text: string, direction: 'start' | 'end') {
  let markerCount = 0
  const startIndex = direction === 'start' ? 0 : text.length - 1
  const step = direction === 'start' ? 1 : -1

  for (let index = startIndex; index >= 0 && index < text.length; index += step) {
    if (text[index] !== '*') {
      break
    }

    markerCount += 1
  }

  return markerCount
}

function getInlineStyleMarker(hasBold: boolean, hasItalic: boolean) {
  return '*'.repeat((hasBold ? 2 : 0) + (hasItalic ? 1 : 0))
}

function getToggledInlineStyleMarker(leftMarkerRun: number, rightMarkerRun: number, delimiter: '*' | '**') {
  const hasBold = leftMarkerRun >= 2 && rightMarkerRun >= 2
  const hasItalic = leftMarkerRun % 2 === 1 && rightMarkerRun % 2 === 1

  return getInlineStyleMarker(
    delimiter === '**' ? !hasBold : hasBold,
    delimiter === '*' ? !hasItalic : hasItalic,
  )
}

export function getDelimitedInlineFormatEdit({
  selection,
  selectedText,
  leftOuterMarkerRun = 0,
  rightOuterMarkerRun = 0,
  delimiter,
}: {
  selection: MarkdownTextSelection
  selectedText: string
  leftOuterMarkerRun?: number
  rightOuterMarkerRun?: number
  delimiter: '*' | '**'
}): MarkdownTextEdit {
  const selectedLeftMarkerRun = countEdgeMarkerRun(selectedText, 'start')
  const selectedRightMarkerRun = countEdgeMarkerRun(selectedText, 'end')
  const selectionIncludesMarkers = selectedLeftMarkerRun > 0 &&
    selectedRightMarkerRun > 0 &&
    selectedText.length > selectedLeftMarkerRun + selectedRightMarkerRun

  if (selectionIncludesMarkers) {
    const marker = getToggledInlineStyleMarker(selectedLeftMarkerRun, selectedRightMarkerRun, delimiter)
    const unwrappedText = selectedText.slice(selectedLeftMarkerRun, selectedText.length - selectedRightMarkerRun)
    const insertText = `${marker}${unwrappedText}${marker}`

    return {
      changes: { from: selection.from, to: selection.to, insert: insertText },
      selection: {
        anchor: selection.from + marker.length,
        head: selection.from + marker.length + unwrappedText.length,
      },
    }
  }

  const hasOuterMarkers = leftOuterMarkerRun > 0 && rightOuterMarkerRun > 0

  if (hasOuterMarkers) {
    const marker = getToggledInlineStyleMarker(leftOuterMarkerRun, rightOuterMarkerRun, delimiter)

    return {
      changes: [
        { from: selection.from - leftOuterMarkerRun, to: selection.from, insert: marker },
        { from: selection.to, to: selection.to + rightOuterMarkerRun, insert: marker },
      ],
      selection: {
        anchor: selection.from - leftOuterMarkerRun + marker.length,
        head: selection.to - leftOuterMarkerRun + marker.length,
      },
    }
  }

  const insertText = `${delimiter}${selectedText}${delimiter}`
  const anchor = selection.from + delimiter.length
  const head = anchor + selectedText.length

  return {
    changes: { from: selection.from, to: selection.to, insert: insertText },
    selection: { anchor, head },
  }
}

export function getMarkdownListMatch(line: string): MarkdownListMatch | null {
  const taskMatch = line.match(taskListLinePattern)

  if (taskMatch) {
    return {
      indent: taskMatch[1],
      marker: `${taskMatch[2]} [ ]`,
      body: taskMatch[4],
    }
  }

  const orderedMatch = line.match(orderedListLinePattern)

  if (orderedMatch) {
    return {
      indent: orderedMatch[1],
      marker: `${Number(orderedMatch[2]) + 1}${orderedMatch[3]}`,
      body: orderedMatch[4],
    }
  }

  const bulletMatch = line.match(bulletListLinePattern)

  if (bulletMatch) {
    return {
      indent: bulletMatch[1],
      marker: bulletMatch[2],
      body: bulletMatch[3],
    }
  }

  return null
}

export function getMarkdownListContinuationEdit({
  selection,
  line,
}: {
  selection: MarkdownTextSelection
  line: MarkdownTextLine
}): MarkdownTextEdit | null {
  if (selection.from !== selection.to) {
    return null
  }

  const listMatch = getMarkdownListMatch(line.text)

  if (!listMatch) {
    return null
  }

  if (listMatch.body.trim().length === 0) {
    const anchor = line.from + listMatch.indent.length

    return {
      changes: { from: line.from, to: line.to, insert: listMatch.indent },
      selection: { anchor },
    }
  }

  const insertText = `\n${listMatch.indent}${listMatch.marker} `

  return {
    changes: { from: selection.from, to: selection.to, insert: insertText },
    selection: { anchor: selection.from + insertText.length },
  }
}

export function getTaskCheckboxToggleChanges(lines: MarkdownTextLine[]) {
  const changes: MarkdownTextChange[] = []

  lines.forEach((line) => {
    const taskMatch = line.text.match(taskCheckboxPattern)

    if (!taskMatch) {
      return
    }

    const checkboxPosition = line.from + taskMatch[1].length
    changes.push({
      from: checkboxPosition,
      to: checkboxPosition + 1,
      insert: taskMatch[2].trim().length === 0 ? 'x' : ' ',
    })
  })

  return changes.length > 0 ? changes : null
}

export function normalizePastedPlainText(text: string) {
  return text
    .replace(/^\uFEFF/, '')
    .replace(zeroWidthPasteCharactersPattern, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2028\u2029]/g, '\n')
    .replace(/\r\n?/g, '\n')
}

export function getSinglePastedUrl(text: string) {
  const trimmedText = text.trim()

  if (trimmedText.length === 0 || /\s/.test(trimmedText)) {
    return null
  }

  try {
    const parsedUrl = new URL(trimmedText)
    return supportedPasteUrlProtocols.has(parsedUrl.protocol) ? trimmedText : null
  } catch {
    return null
  }
}

function escapeMarkdownLinkText(text: string) {
  return text.replace(/([\\\]])/g, '\\$1').replace(/\s+/g, ' ').trim()
}

function formatMarkdownLinkDestination(url: string) {
  return `<${url.replace(/</g, '%3C').replace(/>/g, '%3E')}>`
}

export function createMarkdownLinkFromPaste(label: string, url: string) {
  return `[${escapeMarkdownLinkText(label) || url}](${formatMarkdownLinkDestination(url)})`
}

export function getMarkdownPasteEdit({
  clipboardText,
  selection,
  selectedText,
}: {
  clipboardText: string
  selection: MarkdownTextSelection
  selectedText: string
}): MarkdownTextEdit | null {
  if (clipboardText.length === 0) {
    return null
  }

  const normalizedText = normalizePastedPlainText(clipboardText)
  const pastedUrl = getSinglePastedUrl(normalizedText)
  const hasSelection = selection.from !== selection.to

  if (pastedUrl && hasSelection) {
    const insert = createMarkdownLinkFromPaste(selectedText, pastedUrl)

    return {
      changes: { from: selection.from, to: selection.to, insert },
      selection: { anchor: selection.from + insert.length },
    }
  }

  if (normalizedText !== clipboardText) {
    return {
      changes: { from: selection.from, to: selection.to, insert: normalizedText },
      selection: { anchor: selection.from + normalizedText.length },
    }
  }

  return null
}

export function splitTableCells(line: string) {
  const trimmedLine = line.trim()

  if (trimmedLine.includes('|')) {
    return trimmedLine
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim())
  }

  if (trimmedLine.includes('\t')) {
    return trimmedLine.split('\t').map((cell) => cell.trim())
  }

  if (trimmedLine.includes(',')) {
    return trimmedLine.split(',').map((cell) => cell.trim())
  }

  return [trimmedLine]
}

export function renderTableRow(cells: string[], columnCount: number) {
  const normalizedCells = Array.from({ length: columnCount }, (_item, index) => cells[index]?.trim() || ' ')
  return `| ${normalizedCells.join(' | ')} |`
}

function isTableSeparatorCell(cell: string) {
  return /^:?-{3,}:?$/.test(cell.trim())
}

export function isMarkdownTableRow(line: string) {
  return line.includes('|') && splitTableCells(line).length >= 2
}

export function isTableSeparatorRow(line: string) {
  const cells = splitTableCells(line)

  return cells.length >= 2 && cells.every(isTableSeparatorCell)
}

function normalizeTableCells(cells: string[], columnCount: number) {
  return Array.from({ length: columnCount }, (_item, index) => cells[index]?.trim() || ' ')
}

function normalizeTableSeparatorCells(cells: string[], columnCount: number) {
  return Array.from({ length: columnCount }, (_item, index) => {
    const cell = cells[index]?.trim() ?? ''

    return isTableSeparatorCell(cell) ? cell : '---'
  })
}

function renderTableSeparatorRow(cells: string[], columnCount: number) {
  return `| ${normalizeTableSeparatorCells(cells, columnCount).join(' | ')} |`
}

export function normalizeTableRows(rows: string[][], separatorIndex: number, columnCount: number) {
  return rows.map((row, rowIndex) => (
    rowIndex === separatorIndex
      ? normalizeTableSeparatorCells(row, columnCount)
      : normalizeTableCells(row, columnCount)
  ))
}

export function renderMarkdownTableRows(rows: string[][], separatorIndex: number, columnCount: number) {
  return rows.map((row, rowIndex) => (
    rowIndex === separatorIndex
      ? renderTableSeparatorRow(row, columnCount)
      : renderTableRow(row, columnCount)
  )).join('\n')
}

export function getTableColumnIndex(line: string, cursorOffset: number, columnCount: number) {
  const prefix = line.slice(0, Math.max(0, cursorOffset))
  const pipeCount = [...prefix].filter((character) => character === '|').length
  const startsWithPipe = line.trimStart().startsWith('|')
  const columnIndex = startsWithPipe ? pipeCount - 1 : pipeCount

  return Math.max(0, Math.min(columnIndex, columnCount - 1))
}

export function getRenderedTableCellOffset(
  rows: string[][],
  separatorIndex: number,
  columnCount: number,
  rowIndex: number,
  columnIndex: number,
) {
  const safeRowIndex = Math.max(0, Math.min(rowIndex, rows.length - 1))
  const safeColumnIndex = Math.max(0, Math.min(columnIndex, columnCount - 1))
  const normalizedRows = normalizeTableRows(rows, separatorIndex, columnCount)
  let offset = 0

  for (let index = 0; index < safeRowIndex; index += 1) {
    offset += (index === separatorIndex
      ? renderTableSeparatorRow(normalizedRows[index], columnCount)
      : renderTableRow(normalizedRows[index], columnCount)
    ).length + 1
  }

  offset += 2

  for (let index = 0; index < safeColumnIndex; index += 1) {
    offset += normalizedRows[safeRowIndex][index].length + 3
  }

  return offset
}

export function getTableEditActionResult(
  context: MarkdownTableContext,
  action: TableEditAction,
): MarkdownTableEditResult | null {
  const rows = normalizeTableRows(context.rows, context.separatorIndex, context.columnCount)
  let activeRowIndex = context.activeRowIndex
  let activeColumnIndex = context.activeColumnIndex

  if (action === 'insert-row-below') {
    const insertAfterIndex = activeRowIndex <= context.separatorIndex ? context.separatorIndex : activeRowIndex
    rows.splice(insertAfterIndex + 1, 0, Array.from({ length: context.columnCount }, () => ' '))
    activeRowIndex = insertAfterIndex + 1
  }

  if (action === 'delete-row') {
    if (activeRowIndex <= context.separatorIndex) {
      return null
    }

    rows.splice(activeRowIndex, 1)
    activeRowIndex = Math.min(activeRowIndex, rows.length - 1)
  }

  if (action === 'insert-column-right') {
    rows.forEach((row, rowIndex) => {
      row.splice(activeColumnIndex + 1, 0, rowIndex === context.separatorIndex ? '---' : ' ')
    })
    activeColumnIndex += 1
  }

  if (action === 'delete-column') {
    if (context.columnCount <= 2) {
      return null
    }

    rows.forEach((row) => row.splice(activeColumnIndex, 1))
    activeColumnIndex = Math.min(activeColumnIndex, context.columnCount - 2)
  }

  const columnCount = Math.max(2, ...rows.map((row) => row.length))

  return {
    rows,
    activeRowIndex,
    activeColumnIndex,
    columnCount,
  }
}

function stripListMarker(line: string) {
  return line.replace(/^(-\s+\[[ xX]\]\s+|[-*+]\s+|\d+\.\s+)/, '')
}

export function formatBlockLine(
  line: string,
  index: number,
  format: LineBlockFormat,
  placeholders: MarkdownPlaceholderCatalog,
) {
  const trimmedLine = line.trimStart()
  const indent = line.slice(0, line.length - trimmedLine.length)

  if (format === 'heading-2') {
    const body = trimmedLine.replace(/^#{1,6}\s*/, '')
    return `${indent}## ${body || placeholders.heading}`
  }

  if (format === 'bullet-list') {
    const body = stripListMarker(trimmedLine)
    return `${indent}- ${body || placeholders.listItem}`
  }

  if (format === 'ordered-list') {
    const body = stripListMarker(trimmedLine)
    return `${indent}${index + 1}. ${body || placeholders.listItem}`
  }

  if (format === 'task-list') {
    const body = stripListMarker(trimmedLine)
    return `${indent}- [ ] ${body || placeholders.taskItem}`
  }

  const body = trimmedLine.replace(/^>\s?/, '')
  return `${indent}> ${body || placeholders.quote}`
}

export function createMarkdownTable(selectedText: string, placeholders: MarkdownPlaceholderCatalog) {
  const selectedLines = selectedText
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (selectedLines.length > 0) {
    const rows = selectedLines.map(splitTableCells)
    const columnCount = Math.max(2, ...rows.map((row) => row.length))
    const separator = renderTableRow(Array.from({ length: columnCount }, () => '---'), columnCount)

    return [
      renderTableRow(rows[0], columnCount),
      separator,
      ...rows.slice(1).map((row) => renderTableRow(row, columnCount)),
    ].join('\n')
  }

  const columnCount = Math.max(2, placeholders.tableHeaders.length)

  return [
    renderTableRow(placeholders.tableHeaders, columnCount),
    renderTableRow(Array.from({ length: columnCount }, () => '---'), columnCount),
    ...placeholders.tableRows.map((row) => renderTableRow(row, columnCount)),
  ].join('\n')
}
