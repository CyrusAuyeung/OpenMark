import { describe, expect, it } from 'vitest'
import { renderMarkdownSource, sanitizeMarkdownHtml } from '../src/markdownEngine'

function parseHtml(html: string) {
  const template = document.createElement('template')
  template.innerHTML = html

  return template.content
}

describe('renderMarkdownSource', () => {
  it('annotates top-level preview blocks with source line ranges', () => {
    const fragment = parseHtml(renderMarkdownSource('# Title\n\nFirst paragraph\n\n- item'))

    const heading = fragment.querySelector('h1')
    const paragraph = fragment.querySelector('p')
    const list = fragment.querySelector('ul')

    expect(heading?.getAttribute('data-source-start-line')).toBe('1')
    expect(heading?.getAttribute('data-source-end-line')).toBe('1')
    expect(paragraph?.getAttribute('data-source-start-line')).toBe('3')
    expect(paragraph?.getAttribute('data-source-end-line')).toBe('3')
    expect(list?.getAttribute('data-source-start-line')).toBe('5')
    expect(list?.getAttribute('data-source-end-line')).toBe('5')
  })

  it('preserves blank source lines as inert preview spacers', () => {
    const fragment = parseHtml(renderMarkdownSource('# Title\n\nFirst paragraph\n\n'))
    const spacers = Array.from(fragment.querySelectorAll('.markdown-blank-line'))

    expect(spacers.map((spacer) => spacer.getAttribute('data-source-line'))).toEqual(['2', '4', '5'])
    expect(spacers.every((spacer) => spacer.getAttribute('aria-hidden') === 'true')).toBe(true)
  })
})

describe('sanitizeMarkdownHtml', () => {
  it('keeps preview source metadata while stripping unsafe markup', () => {
    const fragment = parseHtml(sanitizeMarkdownHtml(`
      <h1 data-source-start-line="1" data-source-end-line="1" onclick="alert(1)">Title</h1>
      <script>alert(1)</script>
      <a href="javascript:alert(1)">bad</a>
      <a href="https://example.com">safe</a>
    `))

    const heading = fragment.querySelector('h1')
    const links = fragment.querySelectorAll('a')

    expect(heading?.getAttribute('data-source-start-line')).toBe('1')
    expect(heading?.getAttribute('data-source-end-line')).toBe('1')
    expect(heading?.getAttribute('onclick')).toBeNull()
    expect(fragment.querySelector('script')).toBeNull()
    expect(links[0]?.getAttribute('href')).toBeNull()
    expect(links[1]?.getAttribute('href')).toBe('https://example.com')
  })
})
