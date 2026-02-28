/**
 * Markdown Migration Script
 *
 * Populates the new `markdown` field on all documents.
 * Priority per doc:
 *   1. jsonData._editedMarkdown → markdown (and remove _editedMarkdown from jsonData)
 *   2. sourceToolType + jsonData → transformer.toMarkdown(jsonData)
 *   3. content is Lexical → lexicalToMarkdown(content)
 *   4. content is string → use directly
 *
 * Run: npx tsx src/scripts/migrate-documents-to-markdown.ts
 */

import { getPayload } from 'payload'
import config from '@payload-config'
import {
  convertLexicalToMarkdown,
  editorConfigFactory,
} from '@payloadcms/richtext-lexical'
import { getTransformer } from '@/lib/tool-transformers'

function isLexicalData(val: unknown): val is import('lexical').SerializedEditorState {
  return (
    val !== null &&
    typeof val === 'object' &&
    'root' in (val as Record<string, unknown>)
  )
}

async function migrate() {
  console.log('=== MARKDOWN MIGRATION ===\n')

  const payload = await getPayload({ config })
  const editorConfig = await editorConfigFactory.default({
    config: payload.config,
  })

  const result = await payload.find({
    collection: 'documents',
    limit: 0,
    overrideAccess: true,
  })

  console.log(`Found ${result.docs.length} documents total\n`)

  let migrated = 0
  let skipped = 0
  let errors = 0

  for (const doc of result.docs) {
    // Skip if markdown is already set
    if (doc.markdown && typeof doc.markdown === 'string' && doc.markdown.length > 0) {
      skipped++
      continue
    }

    let markdown: string | null = null
    let cleanedJsonData: Record<string, unknown> | null = null

    const jsonObj =
      doc.jsonData && typeof doc.jsonData === 'object'
        ? (doc.jsonData as Record<string, unknown>)
        : null

    // 1. _editedMarkdown in jsonData
    if (jsonObj?._editedMarkdown && typeof jsonObj._editedMarkdown === 'string') {
      markdown = jsonObj._editedMarkdown
      // Remove _editedMarkdown from jsonData
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _editedMarkdown: _, ...rest } = jsonObj
      cleanedJsonData = rest
    }

    // 2. transformer.toMarkdown from jsonData
    if (!markdown && doc.sourceToolType && doc.jsonData) {
      const transformer = getTransformer(doc.sourceToolType as string)
      if (transformer) {
        try {
          markdown = transformer.toMarkdown(doc.jsonData)
        } catch (err) {
          console.warn(`  ! ${doc.id}: transformer.toMarkdown failed:`, err)
        }
      }
    }

    // 3. Lexical content → markdown
    if (!markdown && isLexicalData(doc.content)) {
      try {
        markdown = convertLexicalToMarkdown({
          data: doc.content as import('lexical').SerializedEditorState,
          editorConfig,
        })
      } catch (err) {
        console.warn(`  ! ${doc.id}: lexicalToMarkdown failed:`, err)
      }
    }

    // 4. String content
    if (!markdown && typeof doc.content === 'string' && doc.content) {
      markdown = doc.content
    }

    if (!markdown) {
      skipped++
      continue
    }

    try {
      const updateData: Record<string, unknown> = { markdown }
      if (cleanedJsonData) {
        updateData.jsonData = cleanedJsonData
      }

      await payload.update({
        collection: 'documents',
        id: doc.id,
        data: updateData,
        overrideAccess: true,
      })

      migrated++
      const suffix = cleanedJsonData ? ' (cleaned _editedMarkdown)' : ''
      console.log(`  ✓ ${doc.id}: ${doc.title}${suffix}`)
    } catch (err) {
      errors++
      console.error(
        `  ✗ ${doc.id}: ${doc.title} — ${err instanceof Error ? err.message : err}`,
      )
    }
  }

  console.log(
    `\nDone: ${migrated} migrated, ${skipped} skipped, ${errors} errors`,
  )
  process.exit(errors > 0 ? 1 : 0)
}

migrate()
