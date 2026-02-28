/**
 * Status Migration Script
 *
 * Migrates old English project status values to new German ones.
 * Run: npx tsx src/scripts/migrate-status.ts          (dry-run)
 * Run: npx tsx src/scripts/migrate-status.ts --execute (apply changes)
 */

import { getPayload } from 'payload'
import config from '@payload-config'
import { STATUS_MIGRATION_MAP, type ProjectStatus } from '@/types/project'

async function migrateStatuses() {
  const dryRun = !process.argv.includes('--execute')

  if (dryRun) {
    console.log('=== DRY RUN (pass --execute to apply changes) ===\n')
  } else {
    console.log('=== EXECUTING MIGRATION ===\n')
  }

  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'projects',
    limit: 0,
    overrideAccess: true,
  })

  const allProjects = await payload.find({
    collection: 'projects',
    limit: result.totalDocs,
    overrideAccess: true,
  })

  let migrated = 0
  let skipped = 0
  let alreadyCurrent = 0

  for (const project of allProjects.docs) {
    const currentStatus = project.projectStatus as string | null | undefined

    if (!currentStatus) {
      console.log(`  [SKIP] Project "${project.name}" (${project.id}): no status set`)
      skipped++
      continue
    }

    const newStatus: ProjectStatus | undefined = STATUS_MIGRATION_MAP[currentStatus]

    if (!newStatus) {
      // Already a new-format status or unknown
      const isNewFormat = Object.values(STATUS_MIGRATION_MAP).includes(currentStatus as ProjectStatus)
      if (isNewFormat) {
        alreadyCurrent++
        continue
      }
      console.log(`  [SKIP] Project "${project.name}" (${project.id}): unknown status "${currentStatus}"`)
      skipped++
      continue
    }

    console.log(`  [MIGRATE] Project "${project.name}" (${project.id}): "${currentStatus}" → "${newStatus}"`)

    if (!dryRun) {
      await payload.update({
        collection: 'projects',
        id: project.id,
        data: { projectStatus: newStatus },
        overrideAccess: true,
      })
    }

    migrated++
  }

  console.log(`\n--- Summary ---`)
  console.log(`Total projects: ${allProjects.docs.length}`)
  console.log(`Migrated: ${migrated}`)
  console.log(`Already current: ${alreadyCurrent}`)
  console.log(`Skipped: ${skipped}`)

  if (dryRun && migrated > 0) {
    console.log(`\nRun with --execute to apply these changes.`)
  }

  process.exit(0)
}

migrateStatuses().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
