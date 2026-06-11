import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const markdownRenderer = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})

export function renderMarkdownSource(markdownValue: string) {
  return markdownRenderer.render(markdownValue)
}

export function sanitizeMarkdownHtml(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_URI_REGEXP: /^(?:(?:(?:https?|mailto|tel|file|blob):)|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  })
}