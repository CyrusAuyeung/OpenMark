import { EditorState } from '@codemirror/state'
import { EditorView, keymap, runScopeHandlers } from '@codemirror/view'
import { afterEach, describe, expect, it } from 'vitest'
import {
  markdownEditorInputKeyBindings,
  markdownEditorPasteHandlers,
} from '../src/markdownEditorCommands'

type TestEditor = {
  parent: HTMLElement
  view: EditorView
}

const testEditors: TestEditor[] = []

afterEach(() => {
  while (testEditors.length > 0) {
    const editor = testEditors.pop()

    editor?.view.destroy()
    editor?.parent.remove()
  }
})

function createTestEditor(
  doc: string,
  selection: { anchor: number, head?: number } = { anchor: doc.length },
) {
  const parent = document.createElement('div')
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      selection,
      extensions: [
        markdownEditorPasteHandlers,
        keymap.of(markdownEditorInputKeyBindings),
      ],
    }),
  })

  document.body.append(parent)
  testEditors.push({ parent, view })

  return view
}

function runEditorKey(
  view: EditorView,
  key: string,
  options: Pick<KeyboardEventInit, 'ctrlKey' | 'metaKey' | 'shiftKey'> = {},
) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  })

  return runScopeHandlers(view, event, 'editor')
}

function dispatchPaste(view: EditorView, text: string) {
  const event = new Event('paste', {
    bubbles: true,
    cancelable: true,
  }) as ClipboardEvent

  Object.defineProperty(event, 'clipboardData', {
    value: {
      getData: (format: string) => (format === 'text/plain' ? text : ''),
    },
  })

  view.contentDOM.dispatchEvent(event)

  return event
}

describe('markdown editor command integration', () => {
  it('continues bullet, ordered, and task lists through the configured Enter keymap', () => {
    const bulletView = createTestEditor('- item')
    const orderedView = createTestEditor('  9) Step')
    const taskView = createTestEditor('- [x] Done')

    expect(runEditorKey(bulletView, 'Enter')).toBe(true)
    expect(runEditorKey(orderedView, 'Enter')).toBe(true)
    expect(runEditorKey(taskView, 'Enter')).toBe(true)

    expect(bulletView.state.doc.toString()).toBe('- item\n- ')
    expect(bulletView.state.selection.main.anchor).toBe(9)
    expect(orderedView.state.doc.toString()).toBe('  9) Step\n  10) ')
    expect(orderedView.state.selection.main.anchor).toBe(16)
    expect(taskView.state.doc.toString()).toBe('- [x] Done\n- [ ] ')
    expect(taskView.state.selection.main.anchor).toBe(17)
  })

  it('exits an empty list item through the configured Enter keymap', () => {
    const view = createTestEditor('  - ')

    expect(runEditorKey(view, 'Enter')).toBe(true)

    expect(view.state.doc.toString()).toBe('  ')
    expect(view.state.selection.main.anchor).toBe(2)
  })

  it('leaves Enter available to CodeMirror defaults outside Markdown lists', () => {
    const view = createTestEditor('Plain text')

    expect(runEditorKey(view, 'Enter')).toBe(false)
    expect(view.state.doc.toString()).toBe('Plain text')
  })

  it('toggles selected task checkboxes through the configured shortcut keymap', () => {
    const markdownValue = [
      '- [ ] One',
      'plain',
      '  * [X] Two',
      '+ [x] Three',
    ].join('\n')
    const view = createTestEditor(markdownValue, { anchor: 0, head: markdownValue.length })

    expect(runEditorKey(view, 'x', { ctrlKey: true, shiftKey: true })).toBe(true)

    expect(view.state.doc.toString()).toBe([
      '- [x] One',
      'plain',
      '  * [ ] Two',
      '+ [ ] Three',
    ].join('\n'))
  })

  it('turns selected text into a Markdown link through the configured paste handler', () => {
    const view = createTestEditor('Label', { anchor: 0, head: 5 })
    const event = dispatchPaste(view, 'https://example.com/docs')

    expect(event.defaultPrevented).toBe(true)
    expect(view.state.doc.toString()).toBe('[Label](<https://example.com/docs>)')
    expect(view.state.selection.main.anchor).toBe(35)
  })

  it('normalizes pasted plain text through the configured paste handler', () => {
    const view = createTestEditor('abc', { anchor: 1, head: 2 })
    const event = dispatchPaste(view, '\uFEFFOne\u200B\u00A0two\r\nthree\u2028four')

    expect(event.defaultPrevented).toBe(true)
    expect(view.state.doc.toString()).toBe('aOne two\nthree\nfourc')
    expect(view.state.selection.main.anchor).toBe(19)
  })

  it('lets CodeMirror handle unchanged plain text paste events', () => {
    const view = createTestEditor('abc', { anchor: 1, head: 2 })
    dispatchPaste(view, 'plain text')

    expect(view.state.doc.toString()).toBe('aplain textc')
    expect(view.state.selection.main.anchor).toBe(11)
  })
})
