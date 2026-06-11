import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const markdownRenderer = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})

function getTopLevelBlockRanges(markdownValue: string) {
  return markdownRenderer
    .parse(markdownValue, {})
    .filter((token) => token.level === 0 && token.nesting !== -1 && token.map !== null)
    .map((token) => ({
      startLine: token.map![0] + 1,
      endLine: token.map![1],
    }))
}

function createBlankLineSpacer(sourceLine: number) {
  const spacer = document.createElement('div')

  spacer.className = 'markdown-blank-line'
  spacer.setAttribute('data-source-line', String(sourceLine))
  spacer.setAttribute('aria-hidden', 'true')

  return spacer
}

function preserveSourceLayout(rawHtml: string, markdownValue: string) {
  if (typeof document === 'undefined') {
    return rawHtml
  }

  const blockRanges = getTopLevelBlockRanges(markdownValue)

  if (blockRanges.length === 0) {
    return rawHtml
  }

  const template = document.createElement('template')
  template.innerHTML = rawHtml

  const previewBlocks = Array.from(template.content.children)
    .filter((element): element is HTMLElement => element instanceof HTMLElement)

  let previousEndLine = 0

  blockRanges.forEach((range, index) => {
    const previewBlock = previewBlocks[index]

    if (!previewBlock) {
      return
    }

    const firstPreservedBlankLine = index === 0 ? 1 : previousEndLine + 1

    for (let sourceLine = firstPreservedBlankLine; sourceLine < range.startLine; sourceLine += 1) {
      previewBlock.before(createBlankLineSpacer(sourceLine))
    }

    previewBlock.setAttribute('data-source-start-line', String(range.startLine))
    previewBlock.setAttribute('data-source-end-line', String(range.endLine))
    previousEndLine = range.endLine
  })

  const sourceLines = markdownValue.split(/\r\n|\r|\n/)

  for (let sourceLine = previousEndLine + 1; sourceLine <= sourceLines.length; sourceLine += 1) {
    if (sourceLines[sourceLine - 1]?.trim().length === 0) {
      template.content.append(createBlankLineSpacer(sourceLine))
    }
  }

  return template.innerHTML
}

export function renderMarkdownSource(markdownValue: string) {
  return preserveSourceLayout(markdownRenderer.render(markdownValue), markdownValue)
}

export function sanitizeMarkdownHtml(html: string) {
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['aria-hidden', 'data-source-end-line', 'data-source-line', 'data-source-start-line'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:https?|mailto|tel|file|blob):)|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  })
}