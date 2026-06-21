export type InlineFormat = 'bold' | 'italic' | 'link'
export type BlockFormat = 'heading-2' | 'bullet-list' | 'ordered-list' | 'task-list' | 'quote' | 'code-block' | 'table' | 'horizontal-rule'
export type MarkdownFormat = InlineFormat | BlockFormat

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
