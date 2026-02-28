import { tool } from 'ai'
import { z } from 'zod'
import { getSessionContext } from '@/lib/session-context'
import { getPayloadClient } from '@/lib/payload'
import { markdownToLexical } from '@/lib/lexical-utils'

export const saveDocument = tool({
  description:
    'Speichere ein vom Assistenten erstelltes Dokument (z.B. Angebotsanfrage, Zusammenfassung, Vertragsentwurf) als Projektdokument. Nutze dieses Tool, wenn du ein Dokument für den Benutzer geschrieben hast.',
  inputSchema: z.object({
    title: z.string().describe('Titel des Dokuments'),
    content: z.string().describe('Inhalt des Dokuments als Markdown'),
    category: z
      .enum([
        'spec',
        'research',
        'contract',
        'questionnaire',
        'angebots-draft',
        'angebots-anfrage',
        'angebots-vergleich',
        'formblatt',
        'other',
      ])
      .describe('Kategorie des Dokuments'),
  }),
  execute: async ({ title, content, category }) => {
    const ctx = getSessionContext()
    if (!ctx?.projectId || !ctx?.user) {
      return { success: false, error: 'Kein Projekt oder Benutzer im Kontext' }
    }

    const payload = await getPayloadClient()

    let lexicalContent
    try {
      lexicalContent = await markdownToLexical(content)
    } catch (err) {
      console.error('[saveDocument] markdownToLexical failed:', err)
      lexicalContent = {
        root: {
          children: [
            {
              children: [
                { text: content.slice(0, 5000), type: 'text', version: 1 },
              ],
              type: 'paragraph',
              version: 1,
              direction: null,
              format: '',
              indent: 0,
            },
          ],
          direction: null,
          format: '',
          indent: 0,
          type: 'root',
          version: 1,
        },
      }
    }

    const doc = await payload.create({
      collection: 'documents',
      data: {
        title,
        content: lexicalContent,
        category,
        sourceToolType: 'saveDocument',
        tags: [{ tag: 'ai-generiert' }],
        jsonData: { content },
        project: ctx.projectId,
        workflowStatus: 'draft',
        _status: 'published',
      },
      user: ctx.user as { id: string | number; [key: string]: unknown },
    })

    return { success: true, documentId: doc.id, title }
  },
})
