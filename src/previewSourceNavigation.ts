export type PreviewSourceRange = {
  element: HTMLElement
  startLine: number
  endLine: number
}

const previewSourceJumpSelector = '[data-preview-source-jump="true"]'
const ignoredPreviewSourceTargetSelector = 'a, button, input, textarea, select, summary'

function parsePositiveSourceLine(value: string | undefined) {
  if (value === undefined || value.trim().length === 0) {
    return null
  }

  const lineNumber = Number(value)

  return Number.isInteger(lineNumber) && lineNumber >= 1 ? lineNumber : null
}

export function addPreviewSourceNavigation(html: string) {
  if (!/data-source-(line|start-line)/i.test(html)) {
    return html
  }

  const template = document.createElement('template')
  template.innerHTML = html
  const sourceBlocks = Array.from(template.content.querySelectorAll<HTMLElement>('[data-source-line], [data-source-start-line]'))

  sourceBlocks.forEach((block) => {
    block.setAttribute('data-preview-source-jump', 'true')

    if (!block.classList.contains('markdown-blank-line')) {
      block.setAttribute('tabindex', block.getAttribute('tabindex') ?? '0')
    }
  })

  return template.innerHTML
}

export function getPreviewSourceRange(element: HTMLElement): PreviewSourceRange | null {
  const sourceLine = parsePositiveSourceLine(element.dataset.sourceLine)

  if (sourceLine !== null) {
    return { element, startLine: sourceLine, endLine: sourceLine }
  }

  const startLine = parsePositiveSourceLine(element.dataset.sourceStartLine)
  const endLine = parsePositiveSourceLine(element.dataset.sourceEndLine)

  return startLine !== null && endLine !== null && endLine >= startLine
    ? { element, startLine, endLine }
    : null
}

export function getPreviewSourceRanges(previewScroller: HTMLElement) {
  const markdownPreview = previewScroller.classList.contains('markdown-preview')
    ? previewScroller
    : previewScroller.querySelector<HTMLElement>('.markdown-preview')
  const previewBlocks = Array.from(markdownPreview?.children ?? [])
    .filter((element): element is HTMLElement => element instanceof HTMLElement)

  return previewBlocks
    .map((element) => getPreviewSourceRange(element))
    .filter((range): range is PreviewSourceRange => range !== null)
}

export function getPreviewSourceLineAtClientY(range: PreviewSourceRange, clientY?: number) {
  if (clientY === undefined || range.endLine <= range.startLine) {
    return range.startLine
  }

  const blockRect = range.element.getBoundingClientRect()
  const lineCount = range.endLine - range.startLine + 1
  const clickRatio = blockRect.height <= 0
    ? 0
    : Math.min(Math.max((clientY - blockRect.top) / blockRect.height, 0), 0.999)

  return range.startLine + Math.floor(clickRatio * lineCount)
}

export function getPreviewSourceBlockForTarget(target: EventTarget | null, container: HTMLElement) {
  if (!(target instanceof Element) || target.closest(ignoredPreviewSourceTargetSelector)) {
    return null
  }

  const sourceBlock = target.closest<HTMLElement>(previewSourceJumpSelector)

  return sourceBlock && (container === sourceBlock || container.contains(sourceBlock))
    ? sourceBlock
    : null
}

export function getPreviewSourceRangeFromTarget(target: EventTarget | null, container: HTMLElement) {
  const sourceBlock = getPreviewSourceBlockForTarget(target, container)

  return sourceBlock ? getPreviewSourceRange(sourceBlock) : null
}
