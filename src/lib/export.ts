import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import { getTransformer } from '@/lib/tool-transformers'

/* ── Constants ── */

export const MAX_EXPORT_CHARS = 200_000

/* ── Filename / Content-Disposition helpers ── */

export function safeFilename(title: string, ext: string): string {
  const ascii = title
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/[\\/"<>|:*?]/g, '_')
    .slice(0, 80)
  return `${ascii}.${ext}`
}

export function contentDisposition(title: string, ext: string): string {
  const asciiName = safeFilename(title, ext)
  const utf8Name = encodeURIComponent(`${title.slice(0, 80)}.${ext}`)
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`
}

/**
 * Sanitize a filename for use inside a ZIP archive.
 * Removes path traversal, invalid characters, and deduplicates within the set.
 */
export function safeZipEntryName(
  title: string,
  ext: string,
  usedNames: Set<string>,
): string {
  // Strip path separators and traversal
  let name = title
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '_')
    .replace(/[<>|:*?"]/g, '_')
    .trim()
    .slice(0, 80)

  if (!name) name = 'dokument'

  let candidate = `${name}.${ext}`
  let counter = 1
  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${name}_${counter}.${ext}`
    counter++
  }
  usedNames.add(candidate.toLowerCase())
  return candidate
}

/* ── Document type ── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExportableDocument = Record<string, any> & {
  content?: unknown
  markdown?: string | null
  jsonData?: unknown
  sourceToolType?: string | null
}

/* ── Markdown conversion ── */

/**
 * Convert a document (from Payload CMS) to markdown.
 * Priority: markdown field > transformer(jsonData) > empty
 */
export async function documentToMarkdown(doc: ExportableDocument): Promise<string> {
  // 1. Markdown field (single source of truth for migrated docs)
  if (doc.markdown && typeof doc.markdown === 'string') {
    return doc.markdown
  }

  // 2. AI-generated with jsonData — use transformer fallback for non-migrated docs
  if (doc.sourceToolType && doc.jsonData) {
    const transformer = getTransformer(doc.sourceToolType)
    if (transformer) {
      return transformer.toMarkdown(doc.jsonData)
    }
  }

  return ''
}

/**
 * Convert markdown to HTML using unified/remark-gfm.
 * Produces proper <table> elements for GFM tables.
 * No allowDangerousHtml — fail-closed by design.
 */
export async function markdownToHtml(md: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(md)
  return String(result)
}

/* ── High-level export functions ── */

export type ExportOptions = {
  title: string
  createdAt?: string
}

/**
 * Export a document to PDF buffer.
 * markdown → HTML → pdfmake (proper tables).
 */
export async function documentToPdf(
  doc: ExportableDocument,
  opts: ExportOptions,
): Promise<Buffer> {
  const { lexicalToPdf } = await import('@/lib/export-pdf')

  const md = await documentToMarkdown(doc)
  if (!md) throw new Error('No exportable content')

  const html = await markdownToHtml(md)
  return await lexicalToPdf(null, { ...opts, html })
}

/**
 * Export a document to DOCX buffer.
 * markdown → mdast → docx (proper tables).
 */
export async function documentToDocx(
  doc: ExportableDocument,
  opts: ExportOptions,
): Promise<Buffer> {
  const { markdownToDocxBuffer } = await import('@/lib/export-docx')

  const md = await documentToMarkdown(doc)
  if (!md) throw new Error('No exportable content')

  return await markdownToDocxBuffer(md, opts)
}
