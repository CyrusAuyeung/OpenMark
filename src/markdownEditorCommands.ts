import { EditorView, type KeyBinding } from '@codemirror/view'
import {
  getMarkdownListContinuationEdit,
  getMarkdownPasteEdit,
  getTaskCheckboxToggleChanges,
} from './markdownFormat'

export function continueMarkdownList(view: EditorView) {
  const selection = view.state.selection.main
  const line = view.state.doc.lineAt(selection.from)
  const edit = getMarkdownListContinuationEdit({
    selection: { from: selection.from, to: selection.to },
    line: {
      from: line.from,
      to: line.to,
      text: line.text,
    },
  })

  if (!edit) {
    return false
  }

  view.dispatch({
    changes: edit.changes,
    selection: edit.selection,
    scrollIntoView: true,
  })

  return true
}

export function toggleTaskCheckbox(view: EditorView) {
  const selection = view.state.selection.main
  const lineEndPosition = selection.empty ? selection.to : Math.max(selection.from, selection.to - 1)
  const fromLine = view.state.doc.lineAt(selection.from)
  const toLine = view.state.doc.lineAt(lineEndPosition)
  const lines = []

  for (let lineNumber = fromLine.number; lineNumber <= toLine.number; lineNumber += 1) {
    const line = view.state.doc.line(lineNumber)
    lines.push({
      from: line.from,
      to: line.to,
      text: line.text,
    })
  }

  const changes = getTaskCheckboxToggleChanges(lines)

  if (!changes) {
    return false
  }

  view.dispatch({ changes, scrollIntoView: true })
  view.focus()

  return true
}

export function handleMarkdownPaste(event: ClipboardEvent, view: EditorView) {
  const clipboardText = event.clipboardData?.getData('text/plain') ?? ''

  if (clipboardText.length === 0) {
    return false
  }

  const selection = view.state.selection.main
  const edit = getMarkdownPasteEdit({
    clipboardText,
    selection: { from: selection.from, to: selection.to },
    selectedText: selection.empty ? '' : view.state.sliceDoc(selection.from, selection.to),
  })

  if (edit) {
    event.preventDefault()
    view.dispatch({
      changes: edit.changes,
      selection: edit.selection,
      scrollIntoView: true,
    })
    view.focus()
    return true
  }

  return false
}

export const markdownEditorInputKeyBindings: KeyBinding[] = [
  { key: 'Enter', run: continueMarkdownList },
  { key: 'Mod-Shift-x', run: toggleTaskCheckbox },
]

export const markdownEditorPasteHandlers = EditorView.domEventHandlers({
  paste: handleMarkdownPaste,
})
