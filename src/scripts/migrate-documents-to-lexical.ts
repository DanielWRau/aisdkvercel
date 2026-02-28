/**
 * Lexical Migration Script
 *
 * Converts documents with markdown string content to Lexical richText format.
 * Run: npx tsx src/scripts/migrate-documents-to-lexical.ts
 */

import { getPayload } from 'payload'
import config from '@payload-config'
import {
  convertMarkdownToLexical,
  editorConfigFactory,
} from '@payloadcms/richtext-lexical'

async function migrate() {
  console.log('=== LEXICAL MIGRATION ===\n')

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
    // Skip if content is already Lexical (object with root)
    if (
      doc.content &&
      typeof doc.content === 'object' &&
      'root' in (doc.content as Record<string, unknown>)
    ) {
      skipped++
      continue
    }

    // Skip if no string content to migrate
    if (!doc.content || typeof doc.content !== 'string') {
      skipped++
      continue
    }

    try {
      const lexicalContent = convertMarkdownToLexical({
        editorConfig,
        markdown: doc.content,
      })

      await payload.update({
        collection: 'documents',
        id: doc.id,
        data: { content: lexicalContent },
        overrideAccess: true,
      })

      migrated++
      console.log(`  ✓ ${doc.id}: ${doc.title}`)
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
