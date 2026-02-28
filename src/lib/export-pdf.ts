import type { SerializedEditorState } from 'lexical'
import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'
import { JSDOM } from 'jsdom'

const ALLOWED_URL_SCHEMES = ['https:', 'http:', 'mailto:']

export function sanitizeUrl(url: string): string | null {
  try {
    return ALLOWED_URL_SCHEMES.includes(new URL(url).protocol) ? url : null
  } catch {
    return null
  }
}

export async function lexicalToPdf(
  data: SerializedEditorState | null,
  options: { title: string; createdAt?: string; html?: string },
): Promise<Buffer> {
  let html: string
  if (options.html) {
    html = options.html
  } else if (data) {
    html = convertLexicalToHTML({ data, disableContainer: true })
  } else {
    throw new Error('Either data or options.html must be provided')
  }

  // html-to-pdfmake needs a window object for DOM parsing
  const { window } = new JSDOM('')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const htmlToPdfmake = require('html-to-pdfmake') as (
    html: string,
    options: { window: unknown },
  ) => unknown[]

  const content = htmlToPdfmake(html, { window }) as import('pdfmake/interfaces').Content

  // Sanitize any links in the pdfmake content tree
  sanitizePdfmakeLinks(content)

  // Style tables with borders and padding
  styleTablesForPdf(content)

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfmake = require('pdfmake/build/pdfmake') as typeof import('pdfmake')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const vfs = require('pdfmake/build/vfs_fonts') as import('pdfmake/interfaces').TVirtualFileSystem
  pdfmake.addVirtualFileSystem(vfs)

  const dateStr = options.createdAt
    ? new Date(options.createdAt).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })

  const docDefinition = {
    pageSize: 'A4' as const,
    pageMargins: [40, 80, 40, 60] as [number, number, number, number],
    header: {
      text: options.title,
      fontSize: 9,
      color: '#888888',
      margin: [40, 20, 40, 0] as [number, number, number, number],
    },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: dateStr, fontSize: 8, color: '#888888', margin: [40, 0, 0, 0] as [number, number, number, number] },
        {
          text: `Seite ${currentPage} von ${pageCount}`,
          fontSize: 8,
          color: '#888888',
          alignment: 'right' as const,
          margin: [0, 0, 40, 0] as [number, number, number, number],
        },
      ],
    }),
    content,
    styles: {
      'html-h1': { fontSize: 18, bold: true, margin: [0, 12, 0, 4] as [number, number, number, number] },
      'html-h2': { fontSize: 15, bold: true, margin: [0, 10, 0, 3] as [number, number, number, number] },
      'html-h3': { fontSize: 13, bold: true, margin: [0, 8, 0, 2] as [number, number, number, number] },
    },
    defaultStyle: {
      fontSize: 10,
      lineHeight: 1.4,
    },
  }

  const pdf = pdfmake.createPdf(docDefinition)
  return await pdf.getBuffer()
}

/**
 * Walk the pdfmake content tree and style table elements
 * with light borders and auto-widths.
 */
function styleTablesForPdf(content: unknown): void {
  if (Array.isArray(content)) {
    for (const item of content) {
      styleTablesForPdf(item)
    }
  } else if (content && typeof content === 'object') {
    const obj = content as Record<string, unknown>

    if (obj.table && typeof obj.table === 'object') {
      const table = obj.table as Record<string, unknown>
      const body = table.body as unknown[][] | undefined
      if (body && body.length > 0) {
        const colCount = body[0].length
        table.widths = Array(colCount).fill('*')
      }

      // Light border layout
      obj.layout = {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#CCCCCC',
        vLineColor: () => '#CCCCCC',
        paddingLeft: () => 6,
        paddingRight: () => 6,
        paddingTop: () => 4,
        paddingBottom: () => 4,
      }

      // Bold the first row (header)
      if (body && body.length > 0) {
        for (const cell of body[0]) {
          if (cell && typeof cell === 'object') {
            (cell as Record<string, unknown>).bold = true
          }
        }
      }
    }

    // Recurse into nested structures
    for (const key of ['stack', 'columns', 'text', 'ol', 'ul']) {
      if (obj[key]) styleTablesForPdf(obj[key])
    }
    if (
      obj.table &&
      typeof obj.table === 'object' &&
      (obj.table as Record<string, unknown>).body
    ) {
      styleTablesForPdf((obj.table as Record<string, unknown>).body)
    }
  }
}

/**
 * Walk the pdfmake content tree and sanitize link URLs.
 * Removes or neutralizes links with disallowed schemes.
 */
function sanitizePdfmakeLinks(content: unknown): void {
  if (Array.isArray(content)) {
    for (const item of content) {
      sanitizePdfmakeLinks(item)
    }
  } else if (content && typeof content === 'object') {
    const obj = content as Record<string, unknown>
    if (typeof obj.link === 'string') {
      const safe = sanitizeUrl(obj.link)
      if (!safe) {
        delete obj.link
      }
    }
    // Recurse into nested structures
    for (const key of ['stack', 'columns', 'text', 'ol', 'ul', 'table']) {
      if (obj[key]) sanitizePdfmakeLinks(obj[key])
    }
    if (
      obj.table &&
      typeof obj.table === 'object' &&
      (obj.table as Record<string, unknown>).body
    ) {
      sanitizePdfmakeLinks((obj.table as Record<string, unknown>).body)
    }
  }
}
