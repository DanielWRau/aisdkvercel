/**
 * Cleanup duplicate documents per project+sourceToolType.
 *
 * Keeps the most recently updated non-archived document and deletes older duplicates.
 *
 * Run: npx tsx src/scripts/cleanup-duplicate-docs.ts          (dry-run)
 * Run: npx tsx src/scripts/cleanup-duplicate-docs.ts --execute (apply changes)
 */

import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

async function cleanup() {
  const dryRun = !process.argv.includes('--execute')

  if (dryRun) {
    console.log('=== DRY RUN (pass --execute to apply changes) ===\n')
  } else {
    console.log('=== EXECUTING CLEANUP ===\n')
  }

  const payload = await getPayload({ config })

  const allDocs = await payload.find({
    collection: 'documents',
    where: { workflowStatus: { not_equals: 'archived' } },
    sort: '-updatedAt',
    limit: 1000,
    overrideAccess: true,
  })

  // Group by project+sourceToolType (skip fillFormblatt — multiple docs per project are expected)
  const groups = new Map<string, typeof allDocs.docs>()
  for (const doc of allDocs.docs) {
    if (!doc.sourceToolType) continue
    if (doc.sourceToolType === 'fillFormblatt') continue
    const projectId = typeof doc.project === 'object' ? doc.project?.id : doc.project
    const key = `${projectId}::${doc.sourceToolType}`
    const group = groups.get(key) ?? []
    group.push(doc)
    groups.set(key, group)
  }

  let deleted = 0
  let kept = 0

  for (const [key, docs] of groups) {
    if (docs.length <= 1) {
      kept++
      continue
    }

    // docs are already sorted by -updatedAt, so first one is the keeper
    const [keeper, ...duplicates] = docs
    console.log(`  [${key}] Keeping "${keeper.title}" (${keeper.id}, updated ${keeper.updatedAt})`)

    for (const dup of duplicates) {
      console.log(`    [DELETE] "${dup.title}" (${dup.id}, updated ${dup.updatedAt})`)

      if (!dryRun) {
        // Delete media attachments first
        if (dup.attachments?.length) {
          const mediaIds = dup.attachments.map(
            (a: { id: string | number } | string | number) =>
              typeof a === 'object' ? a.id : a,
          )
          await payload.delete({
            collection: 'media',
            where: { id: { in: mediaIds } },
            overrideAccess: true,
          })
        }

        await payload.delete({
          collection: 'documents',
          id: dup.id,
          overrideAccess: true,
        })
      }

      deleted++
    }
    kept++
  }

  console.log(`\n--- Summary ---`)
  console.log(`Groups checked: ${groups.size}`)
  console.log(`Kept (newest per group): ${kept}`)
  console.log(`Duplicates ${dryRun ? 'to delete' : 'deleted'}: ${deleted}`)

  if (dryRun && deleted > 0) {
    console.log(`\nRun with --execute to apply these changes.`)
  }

  process.exit(0)
}

cleanup().catch((err) => {
  console.error('Cleanup failed:', err)
  process.exit(1)
})
