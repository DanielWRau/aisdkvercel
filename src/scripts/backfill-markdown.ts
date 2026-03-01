/**
 * Backfill: Setzt das `markdown`-Feld für alle Dokumente, die jsonData + sourceToolType haben aber kein markdown.
 * Ausführen: npx tsx src/scripts/backfill-markdown.ts
 *
 * Nutzt direkte DB-Verbindung statt Payload (wegen TLA in payload.config.ts).
 */
import pg from 'pg'
import { getTransformer } from '../lib/tool-transformers'
// Env vars must be loaded via shell: source .env && source .env.local && npx tsx ...

const { Pool } = pg

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  const { rows } = await pool.query(
    `SELECT id, title, source_tool_type, json_data
     FROM documents
     WHERE (markdown IS NULL OR markdown = '')
       AND json_data IS NOT NULL
       AND source_tool_type IS NOT NULL`,
  )

  console.log(`Gefunden: ${rows.length} Dokumente ohne Markdown`)

  for (const row of rows) {
    const transformer = getTransformer(row.source_tool_type)
    if (!transformer) {
      console.log(`  Überspringe ${row.id} (${row.title}) — kein Transformer für ${row.source_tool_type}`)
      continue
    }

    try {
      const markdown = transformer.toMarkdown(row.json_data)
      if (!markdown || markdown.trim().length === 0) {
        console.log(`  Überspringe ${row.id} (${row.title}) — leerer Markdown`)
        continue
      }

      await pool.query(
        `UPDATE documents SET markdown = $1, updated_at = NOW() WHERE id = $2`,
        [markdown, row.id],
      )
      console.log(`  OK ${row.id} (${row.title}) — ${markdown.length} Zeichen`)
    } catch (err) {
      console.error(`  FEHLER ${row.id} (${row.title}):`, err instanceof Error ? err.message : err)
    }
  }

  await pool.end()
  console.log('Fertig.')
}

main()
