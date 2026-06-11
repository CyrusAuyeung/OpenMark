import {
  SearchQuery,
  findNext,
  findPrevious,
  replaceAll,
  replaceNext,
  search,
  setSearchQuery,
} from '@codemirror/search'
import type { EditorView } from '@codemirror/view'

export function createSearchExtension() {
  return search({ top: true })
}

export function applySearchQuery(
  editorView: EditorView,
  options: {
    searchTerm: string
    replaceTerm: string
    caseSensitive: boolean
    wholeWord: boolean
  },
) {
  editorView.dispatch({
    effects: setSearchQuery.of(new SearchQuery({
      search: options.searchTerm,
      replace: options.replaceTerm,
      caseSensitive: options.caseSensitive,
      wholeWord: options.wholeWord,
      literal: true,
    })),
  })
}

export function moveSearchMatch(editorView: EditorView, direction: 'next' | 'previous') {
  return direction === 'next' ? findNext(editorView) : findPrevious(editorView)
}

export function replaceCurrentSearchMatch(editorView: EditorView) {
  return replaceNext(editorView)
}

export function replaceAllSearchMatches(editorView: EditorView) {
  replaceAll(editorView)
}