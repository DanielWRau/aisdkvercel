import JSZip from 'jszip'
import { withAuth } from '@/lib/auth'
import { getPayloadClient } from '@/lib/payload'
import {
  MAX_EXPORT_CHARS,
  safeZipEntryName,
  contentDisposition,
  documentToMarkdown,
  documentToPdf,
  documentToDocx,
} from '@/lib/export'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_DOCUMENTS = 20

export const GET = withAuth(async (req, routeContext) => {
  const user = routeContext.user
  const routeParams = (routeContext as { params?: Promise<{ id: string }> }).params
  if (!routeParams) return new Response('Missing route params', { status: 400 })
  const { id: projectId } = await routeParams

  const payload = await getPayloadClient()

  // Verify project ownership via ACL
  try {
    await payload.findByID({
      collection: 'projects',
      id: projectId,
      user,
      overrideAccess: false,
    })
  } catch {
    return new Response('Projekt nicht gefunden', { status: 404 })
  }

  // Fetch all non-archived documents for this project
  const docs = await payload.find({
    collection: 'documents',
    where: {
      project: { equals: projectId },
      workflowStatus: { not_equals: 'archived' },
    },
    limit: MAX_DOCUMENTS + 1,
    overrideAccess: false,
    user,
  })

  if (docs.docs.length === 0) {
    return new Response('Keine exportierbaren Dokumente gefunden', { status: 404 })
  }

  if (docs.docs.length > MAX_DOCUMENTS) {
    return new Response(
      `Zu viele Dokumente (max. ${MAX_DOCUMENTS}). Bitte archivieren Sie nicht benötigte Dokumente.`,
      { status: 413 },
    )
  }

  const zip = new JSZip()
  const usedNames = new Set<string>()
  let exportedCount = 0

  for (const doc of docs.docs) {
    // Check for request abort
    if (req.signal.aborted) {
      return new Response('Abgebrochen', { status: 499 })
    }

    // Skip documents without any content
    if (!doc.markdown && !doc.jsonData) continue

    const title = doc.title ?? 'Dokument'

    try {
      // Size check via markdown
      const md = await documentToMarkdown(doc)
      if (md.length > MAX_EXPORT_CHARS) {
        console.warn(`[export-zip] Skipping oversized document: ${doc.id}`)
        continue
      }

      // Generate PDF
      try {
        const pdfBuffer = await documentToPdf(doc, {
          title,
          createdAt: doc.createdAt,
        })
        const pdfName = safeZipEntryName(title, 'pdf', usedNames)
        zip.file(pdfName, pdfBuffer)
      } catch (err) {
        console.error(`[export-zip] PDF failed for doc ${doc.id}:`, err)
      }

      // Generate DOCX
      try {
        const docxBuffer = await documentToDocx(doc, {
          title,
          createdAt: doc.createdAt,
        })
        const docxName = safeZipEntryName(title, 'docx', usedNames)
        zip.file(docxName, docxBuffer)
      } catch (err) {
        console.error(`[export-zip] DOCX failed for doc ${doc.id}:`, err)
      }

      exportedCount++
    } catch (err) {
      console.error(`[export-zip] Skipping doc ${doc.id}:`, err)
    }
  }

  if (exportedCount === 0) {
    return new Response('Keine exportierbaren Dokumente gefunden', { status: 404 })
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

  // Get project name for the ZIP filename
  let projectName = 'Export'
  try {
    const project = await payload.findByID({
      collection: 'projects',
      id: projectId,
      user,
      overrideAccess: false,
    })
    projectName = project.name ?? 'Export'
  } catch {
    // Fall back to generic name
  }

  return new Response(new Uint8Array(zipBuffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': contentDisposition(projectName, 'zip'),
      'Cache-Control': 'private, no-store, max-age=0',
      Vary: 'Cookie',
    },
  })
})
