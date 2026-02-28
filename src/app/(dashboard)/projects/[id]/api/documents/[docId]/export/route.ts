import { withAuth } from '@/lib/auth'
import { getPayloadClient } from '@/lib/payload'
import {
  MAX_EXPORT_CHARS,
  contentDisposition,
  documentToMarkdown,
  documentToPdf,
  documentToDocx,
} from '@/lib/export'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const VALID_FORMATS = ['pdf', 'docx', 'md'] as const
type ExportFormat = (typeof VALID_FORMATS)[number]

export const GET = withAuth(async (req, routeContext) => {
  const user = routeContext.user
  const routeParams = (routeContext as { params?: Promise<{ id: string; docId: string }> }).params
  if (!routeParams) return new Response('Missing route params', { status: 400 })
  const { id: projectId, docId } = await routeParams

  // Validate format
  const url = new URL(req.url)
  const format = url.searchParams.get('format') as ExportFormat | null
  if (!format || !VALID_FORMATS.includes(format)) {
    return new Response('Ungültiges Format. Erlaubt: pdf, docx, md', { status: 400 })
  }

  // Load document with ACL (project.owner check via Documents access control)
  const payload = await getPayloadClient()
  const docs = await payload.find({
    collection: 'documents',
    where: {
      id: { equals: docId },
      project: { equals: projectId },
    },
    limit: 1,
    overrideAccess: false,
    user,
  })

  const doc = docs.docs[0]
  if (!doc) {
    return new Response('Dokument nicht gefunden', { status: 404 })
  }

  if (!doc.markdown && !doc.jsonData) {
    return new Response('Dokument hat keinen Inhalt', { status: 404 })
  }

  // Size check
  const markdown = await documentToMarkdown(doc)
  if (markdown.length > MAX_EXPORT_CHARS) {
    return new Response('Dokument zu groß für Export', { status: 413 })
  }

  const cacheHeaders = {
    'Cache-Control': 'private, no-store, max-age=0',
    Vary: 'Cookie',
  }

  const title = doc.title ?? 'Dokument'

  try {
    if (format === 'md') {
      return new Response(markdown, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': contentDisposition(title, 'md'),
          ...cacheHeaders,
        },
      })
    }

    if (format === 'pdf') {
      const buffer = await documentToPdf(doc, {
        title,
        createdAt: doc.createdAt,
      })
      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': contentDisposition(title, 'pdf'),
          ...cacheHeaders,
        },
      })
    }

    if (format === 'docx') {
      const buffer = await documentToDocx(doc, {
        title,
        createdAt: doc.createdAt,
      })
      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': contentDisposition(title, 'docx'),
          ...cacheHeaders,
        },
      })
    }
  } catch (err) {
    console.error('[export]', err)
    return new Response('Konvertierungsfehler', { status: 500 })
  }

  return new Response('Ungültiges Format', { status: 400 })
})
