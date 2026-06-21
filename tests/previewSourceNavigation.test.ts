import { describe, expect, it } from 'vitest'
import { renderMarkdownSource } from '../src/markdownEngine'
import {
  addPreviewSourceNavigation,
  getPreviewSourceBlockForTarget,
  getPreviewSourceLineAtClientY,
  getPreviewSourceRange,
  getPreviewSourceRangeFromTarget,
  getPreviewSourceRanges,
} from '../src/previewSourceNavigation'

function createPreviewScroller(html: string) {
  const scroller = document.createElement('div')
  scroller.className = 'preview-scroll'
  scroller.innerHTML = `<article class="markdown-preview">${addPreviewSourceNavigation(html)}</article>`
  document.body.append(scroller)

  return scroller
}

function getPreviewBlock(scroller: HTMLElement, selector: string) {
  const block = scroller.querySelector<HTMLElement>(selector)

  expect(block).toBeInstanceOf(HTMLElement)

  return block as HTMLElement
}

function mockElementRect(element: HTMLElement, top: number, height: number) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      bottom: top + height,
      height,
      left: 0,
      right: 320,
      top,
      width: 320,
      x: 0,
      y: top,
      toJSON: () => ({}),
    } as DOMRect),
  })
}

describe('preview source navigation helpers', () => {
  it('annotates source-mapped preview blocks while keeping blank spacers out of keyboard order', () => {
    const scroller = createPreviewScroller(`
      <h1 data-source-start-line="1" data-source-end-line="1" tabindex="-1">Title</h1>
      <div class="markdown-blank-line" data-source-line="2" aria-hidden="true"></div>
      <p data-source-start-line="3" data-source-end-line="4">Paragraph</p>
    `)

    const heading = getPreviewBlock(scroller, 'h1')
    const spacer = getPreviewBlock(scroller, '.markdown-blank-line')
    const paragraph = getPreviewBlock(scroller, 'p')

    expect(heading.getAttribute('data-preview-source-jump')).toBe('true')
    expect(heading.getAttribute('tabindex')).toBe('-1')
    expect(spacer.getAttribute('data-preview-source-jump')).toBe('true')
    expect(spacer.getAttribute('tabindex')).toBeNull()
    expect(paragraph.getAttribute('data-preview-source-jump')).toBe('true')
    expect(paragraph.getAttribute('tabindex')).toBe('0')

    scroller.remove()
  })

  it('reads top-level source ranges for headings, blank lines, quotes, nested lists, tables, and code fences', () => {
    const markdown = [
      '# Title',
      '',
      '> Quote',
      '> continued',
      '',
      '- Parent',
      '  - Child',
      '  - Child two',
      '',
      '| Left | Right |',
      '| --- | --- |',
      '| One | Two |',
      '',
      '```ts',
      'const value = 1',
      '```',
    ].join('\n')
    const scroller = createPreviewScroller(renderMarkdownSource(markdown))
    const rangesByTag = getPreviewSourceRanges(scroller).map((range) => ({
      tagName: range.element.tagName.toLowerCase(),
      startLine: range.startLine,
      endLine: range.endLine,
    }))

    expect(rangesByTag).toEqual([
      { tagName: 'h1', startLine: 1, endLine: 1 },
      { tagName: 'div', startLine: 2, endLine: 2 },
      { tagName: 'blockquote', startLine: 3, endLine: 4 },
      { tagName: 'div', startLine: 5, endLine: 5 },
      { tagName: 'ul', startLine: 6, endLine: 9 },
      { tagName: 'table', startLine: 10, endLine: 12 },
      { tagName: 'div', startLine: 13, endLine: 13 },
      { tagName: 'pre', startLine: 14, endLine: 16 },
    ])

    scroller.remove()
  })

  it('maps click height within multi-line preview blocks to clamped source lines', () => {
    const element = document.createElement('blockquote')
    const range = { element, startLine: 10, endLine: 13 }

    mockElementRect(element, 100, 80)

    expect(getPreviewSourceLineAtClientY(range, 80)).toBe(10)
    expect(getPreviewSourceLineAtClientY(range, 100)).toBe(10)
    expect(getPreviewSourceLineAtClientY(range, 120)).toBe(11)
    expect(getPreviewSourceLineAtClientY(range, 140)).toBe(12)
    expect(getPreviewSourceLineAtClientY(range, 160)).toBe(13)
    expect(getPreviewSourceLineAtClientY(range, 220)).toBe(13)
  })

  it('finds source ranges from nested preview targets without intercepting links or native controls', () => {
    const scroller = createPreviewScroller(`
      <p data-source-start-line="3" data-source-end-line="5">
        Plain <strong>strong</strong> <a href="https://example.com">link</a>
      </p>
      <button data-source-start-line="7" data-source-end-line="7">Native action</button>
    `)
    const article = getPreviewBlock(scroller, '.markdown-preview')
    const paragraph = getPreviewBlock(scroller, 'p')
    const strong = getPreviewBlock(scroller, 'strong')
    const link = getPreviewBlock(scroller, 'a')
    const button = getPreviewBlock(scroller, 'button')
    const outside = document.createElement('span')

    expect(getPreviewSourceBlockForTarget(strong, article)).toBe(paragraph)
    expect(getPreviewSourceRangeFromTarget(strong, article)).toMatchObject({ startLine: 3, endLine: 5 })
    expect(getPreviewSourceRangeFromTarget(link, article)).toBeNull()
    expect(getPreviewSourceRangeFromTarget(button, article)).toBeNull()
    expect(getPreviewSourceRangeFromTarget(outside, article)).toBeNull()

    scroller.remove()
  })

  it('rejects invalid source metadata instead of producing line zero jumps', () => {
    const emptyLine = document.createElement('div')
    const zeroLine = document.createElement('div')
    const invertedRange = document.createElement('p')
    const decimalLine = document.createElement('p')

    emptyLine.dataset.sourceLine = ''
    zeroLine.dataset.sourceLine = '0'
    invertedRange.dataset.sourceStartLine = '8'
    invertedRange.dataset.sourceEndLine = '7'
    decimalLine.dataset.sourceStartLine = '2.5'
    decimalLine.dataset.sourceEndLine = '3'

    expect(getPreviewSourceRange(emptyLine)).toBeNull()
    expect(getPreviewSourceRange(zeroLine)).toBeNull()
    expect(getPreviewSourceRange(invertedRange)).toBeNull()
    expect(getPreviewSourceRange(decimalLine)).toBeNull()
  })
})
