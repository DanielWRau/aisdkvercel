/**
 * Unified form schema registry.
 *
 * Merges all Sammlung-specific schema files (BerlAVG, VHL Bayern, ...)
 * into a single lookup by formularNummer.
 */

import { wirtSchemas, type WirtSchemaEntry } from './wirt-schemas'
import { bayernVhlSchemas } from './bayern-vhl-schemas'

export type FormSchemaEntry = WirtSchemaEntry

/**
 * Master registry: formularNummer → { schema, toMarkdown, schemaVersion }
 *
 * Import this instead of individual schema files when you need to
 * look up schemas dynamically (e.g. in the API route or panel renderer).
 */
export const formSchemas: Record<string, FormSchemaEntry> = {
  ...wirtSchemas,
  ...bayernVhlSchemas,
}
