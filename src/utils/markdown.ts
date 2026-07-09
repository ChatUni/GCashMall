// Minimal, dependency-free markdown → HTML renderer for the admin prompt preview.
// Supports headings, bold, inline code, fenced code blocks, blockquotes, unordered
// and ordered lists, horizontal rules and paragraphs. Input is HTML-escaped first,
// so the output is safe to inject via innerHTML.

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

// Inline formatting: **bold**, *italic*, `code`
const inline = (s: string): string =>
  s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')

export const renderMarkdown = (md: string): string => {
  const src = escapeHtml(md || '').replace(/\r\n/g, '\n')
  const lines = src.split('\n')
  const out: string[] = []

  let i = 0
  let listType: 'ul' | 'ol' | null = null

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`)
      listType = null
    }
  }

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    const fence = line.match(/^```([a-z]*)\s*$/i)
    if (fence) {
      closeList()
      const body: string[] = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        body.push(lines[i])
        i++
      }
      i++ // skip closing fence
      out.push(`<pre class="md-pre"><code>${body.join('\n')}</code></pre>`)
      continue
    }

    // Headings
    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      closeList()
      const level = heading[1].length
      out.push(`<h${level} class="md-h${level}">${inline(heading[2])}</h${level}>`)
      i++
      continue
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      closeList()
      out.push('<hr class="md-hr" />')
      i++
      continue
    }

    // Blockquote
    const quote = line.match(/^>\s?(.*)$/)
    if (quote) {
      closeList()
      out.push(`<blockquote class="md-quote">${inline(quote[1])}</blockquote>`)
      i++
      continue
    }

    // Unordered list item
    const ul = line.match(/^\s*[-*+]\s+(.*)$/)
    if (ul) {
      if (listType !== 'ul') {
        closeList()
        out.push('<ul class="md-ul">')
        listType = 'ul'
      }
      out.push(`<li>${inline(ul[1])}</li>`)
      i++
      continue
    }

    // Ordered list item
    const ol = line.match(/^\s*\d+\.\s+(.*)$/)
    if (ol) {
      if (listType !== 'ol') {
        closeList()
        out.push('<ol class="md-ol">')
        listType = 'ol'
      }
      out.push(`<li>${inline(ol[1])}</li>`)
      i++
      continue
    }

    // Blank line
    if (/^\s*$/.test(line)) {
      closeList()
      i++
      continue
    }

    // Paragraph
    closeList()
    out.push(`<p class="md-p">${inline(line)}</p>`)
    i++
  }

  closeList()
  return out.join('\n')
}
