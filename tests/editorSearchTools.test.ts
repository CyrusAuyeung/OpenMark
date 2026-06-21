import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { getSearchQuery } from '@codemirror/search'
import { afterEach, describe, expect, it } from 'vitest'
import {
  applySearchQuery,
  createSearchExtension,
  moveSearchMatch,
  replaceAllSearchMatches,
  replaceCurrentSearchMatch,
} from '../src/editorSearchTools'

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

function createSearchEditor(
  doc: string,
  selection: { anchor: number, head?: number } = { anchor: 0 },
) {
  const parent = document.createElement('div')
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      selection,
      extensions: [createSearchExtension()],
    }),
  })

  document.body.append(parent)
  testEditors.push({ parent, view })

  return view
}

function expectSelection(view: EditorView, anchor: number, head: number) {
  expect(view.state.selection.main.anchor).toBe(anchor)
  expect(view.state.selection.main.head).toBe(head)
}

describe('editor search tool integration', () => {
  it('applies literal search query options to real CodeMirror search state', () => {
    const view = createSearchEditor('Alpha beta alpha')

    applySearchQuery(view, {
      searchTerm: 'Alpha',
      replaceTerm: 'Omega',
      caseSensitive: true,
      wholeWord: true,
    })

    const query = getSearchQuery(view.state)
    expect(query.search).toBe('Alpha')
    expect(query.replace).toBe('Omega')
    expect(query.caseSensitive).toBe(true)
    expect(query.wholeWord).toBe(true)
    expect(query.literal).toBe(true)
  })

  it('moves to next and previous matches with wrapping selection behavior', () => {
    const view = createSearchEditor('alpha beta alpha gamma')

    applySearchQuery(view, {
      searchTerm: 'alpha',
      replaceTerm: '',
      caseSensitive: false,
      wholeWord: false,
    })

    expect(moveSearchMatch(view, 'next')).toBe(true)
    expectSelection(view, 0, 5)

    expect(moveSearchMatch(view, 'next')).toBe(true)
    expectSelection(view, 11, 16)

    expect(moveSearchMatch(view, 'previous')).toBe(true)
    expectSelection(view, 0, 5)
  })

  it('replaces the current selected search match and keeps remaining matches navigable', () => {
    const view = createSearchEditor('alpha beta alpha gamma')

    applySearchQuery(view, {
      searchTerm: 'alpha',
      replaceTerm: 'omega',
      caseSensitive: false,
      wholeWord: false,
    })
    moveSearchMatch(view, 'next')

    expect(replaceCurrentSearchMatch(view)).toBe(true)
    expect(view.state.doc.toString()).toBe('omega beta alpha gamma')

    expect(moveSearchMatch(view, 'next')).toBe(true)
    expect(view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)).toBe('alpha')
  })

  it('replaces all matches using case-sensitive and whole-word options', () => {
    const caseSensitiveView = createSearchEditor('Mark mark MARK')
    const wholeWordView = createSearchEditor('mark markdown mark')

    applySearchQuery(caseSensitiveView, {
      searchTerm: 'mark',
      replaceTerm: 'X',
      caseSensitive: true,
      wholeWord: false,
    })
    replaceAllSearchMatches(caseSensitiveView)

    applySearchQuery(wholeWordView, {
      searchTerm: 'mark',
      replaceTerm: 'X',
      caseSensitive: false,
      wholeWord: true,
    })
    replaceAllSearchMatches(wholeWordView)

    expect(caseSensitiveView.state.doc.toString()).toBe('Mark X MARK')
    expect(wholeWordView.state.doc.toString()).toBe('X markdown X')
  })

  it('returns false and keeps the document stable when there are no matches', () => {
    const view = createSearchEditor('alpha beta')

    applySearchQuery(view, {
      searchTerm: 'missing',
      replaceTerm: 'omega',
      caseSensitive: false,
      wholeWord: false,
    })

    expect(moveSearchMatch(view, 'next')).toBe(false)
    expect(replaceCurrentSearchMatch(view)).toBe(false)
    expect(view.state.doc.toString()).toBe('alpha beta')
    expectSelection(view, 0, 0)
  })
})
