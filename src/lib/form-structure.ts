/**
 * Core module for form structure types, dynamic Zod schema generation,
 * prompt building, and Markdown rendering.
 *
 * Each FormTemplate stores a `structure` JSON that describes the complete
 * form: fixed legal text (Festtext) + fillable fields. The AI only fills
 * the fields; the renderer combines Festtext + values into the final document.
 */

import { z } from 'zod'

// ── Types ──────────────────────────────────────────────────────────────

export type FormFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'enum'
  | 'percentage'
  | 'currency'
  | 'array'

export type FormField = {
  id: string
  label: string
  type: FormFieldType
  beschreibung?: string
  pflicht?: boolean // default: true
  standardwert?: unknown
  optionen?: string[] // for 'enum'
  einheit?: string // "v.H.", "EUR", "Werktage"
  kontextImFesttext?: string
  positionIndex?: number // 0-based: which "___" placeholder in festtext
  spalten?: FormField[] // for 'array': table columns
  minZeilen?: number
  maxZeilen?: number
}

export type FormSection = {
  id: string
  nummer?: string // display: "1", "2.1"
  titel: string
  festtext?: string // verbatim legal text from PDF
  felder: FormField[]
  bedingt?: boolean
  bedingungHinweis?: string
  annotierbar?: boolean // L 215 type: AI adds context note
  unterabschnitte?: FormSection[]
}

export type FormStructure = {
  schemaVersion: number
  formType: 'fillable' | 'annotation-only' | 'mixed'
  sections: FormSection[]
}

// ── Validation ─────────────────────────────────────────────────────────

const MAX_SECTIONS = 50
const MAX_FIELDS = 200
const MAX_FESTTEXT_CHARS = 100_000
const MAX_NESTING_DEPTH = 3

type ValidationResult =
  | { success: true; data: FormStructure }
  | { success: false; error: string }

function countSectionsAndFields(
  sections: FormSection[],
  depth: number,
): { sectionCount: number; fieldCount: number; festtextChars: number; maxDepth: number } {
  let sectionCount = 0
  let fieldCount = 0
  let festtextChars = 0
  let maxDepth = depth

  for (const s of sections) {
    sectionCount++
    fieldCount += s.felder.length
    festtextChars += (s.festtext ?? '').length

    if (s.unterabschnitte && s.unterabschnitte.length > 0) {
      const sub = countSectionsAndFields(s.unterabschnitte, depth + 1)
      sectionCount += sub.sectionCount
      fieldCount += sub.fieldCount
      festtextChars += sub.festtextChars
      if (sub.maxDepth > maxDepth) maxDepth = sub.maxDepth
    }
  }

  return { sectionCount, fieldCount, festtextChars, maxDepth }
}

/**
 * Runtime validation of a FormStructure JSON with hard limits.
 * Returns `{ success: true, data }` or `{ success: false, error }`.
 */
export function validateStructure(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== 'object') {
    return { success: false, error: 'structure ist leer oder kein Objekt' }
  }

  const obj = raw as Record<string, unknown>

  if (typeof obj.schemaVersion !== 'number') {
    return { success: false, error: 'schemaVersion fehlt oder ist keine Zahl' }
  }

  const validTypes = ['fillable', 'annotation-only', 'mixed']
  if (!validTypes.includes(obj.formType as string)) {
    return { success: false, error: `formType muss eines von ${validTypes.join(', ')} sein` }
  }

  if (!Array.isArray(obj.sections)) {
    return { success: false, error: 'sections muss ein Array sein' }
  }

  const stats = countSectionsAndFields(obj.sections as FormSection[], 1)

  if (stats.sectionCount > MAX_SECTIONS) {
    return { success: false, error: `Zu viele Abschnitte: ${stats.sectionCount} (max ${MAX_SECTIONS})` }
  }
  if (stats.fieldCount > MAX_FIELDS) {
    return { success: false, error: `Zu viele Felder: ${stats.fieldCount} (max ${MAX_FIELDS})` }
  }
  if (stats.festtextChars > MAX_FESTTEXT_CHARS) {
    return { success: false, error: `Festtext zu lang: ${stats.festtextChars} Zeichen (max ${MAX_FESTTEXT_CHARS})` }
  }
  if (stats.maxDepth > MAX_NESTING_DEPTH) {
    return { success: false, error: `Verschachtelung zu tief: ${stats.maxDepth} (max ${MAX_NESTING_DEPTH})` }
  }

  return { success: true, data: raw as FormStructure }
}

// ── Zod Schema Builder ─────────────────────────────────────────────────

function fieldToZod(field: FormField): z.ZodType {
  const required = field.pflicht !== false

  let schema: z.ZodType

  switch (field.type) {
    case 'text':
      schema = z.string().describe(field.beschreibung ?? field.label)
      break
    case 'number':
    case 'percentage':
    case 'currency':
      schema = z.number().describe(
        field.beschreibung ?? `${field.label}${field.einheit ? ` (${field.einheit})` : ''}`,
      )
      break
    case 'date':
      schema = z.string().describe(field.beschreibung ?? `${field.label} (Datum)`)
      break
    case 'boolean':
      schema = z.boolean().describe(field.beschreibung ?? field.label)
      break
    case 'enum':
      if (field.optionen && field.optionen.length >= 2) {
        schema = z.enum(field.optionen as [string, ...string[]]).describe(
          field.beschreibung ?? field.label,
        )
      } else {
        schema = z.string().describe(field.beschreibung ?? field.label)
      }
      break
    case 'array': {
      if (field.spalten && field.spalten.length > 0) {
        const rowShape: Record<string, z.ZodType> = {}
        for (const col of field.spalten) {
          rowShape[col.id] = fieldToZod(col)
        }
        let arraySchema = z.array(z.object(rowShape)).describe(field.beschreibung ?? field.label)
        if (field.minZeilen) arraySchema = arraySchema.min(field.minZeilen)
        if (field.maxZeilen) arraySchema = arraySchema.max(field.maxZeilen)
        schema = arraySchema
      } else {
        schema = z.array(z.string()).describe(field.beschreibung ?? field.label)
      }
      break
    }
    default:
      schema = z.string().describe(field.beschreibung ?? field.label)
  }

  if (!required) {
    schema = schema.optional()
  }

  return schema
}

function collectFieldsFromSections(sections: FormSection[]): Record<string, z.ZodType> {
  const shape: Record<string, z.ZodType> = {}

  for (const section of sections) {
    for (const field of section.felder) {
      shape[field.id] = fieldToZod(field)
    }

    // annotation-only sections get an annotation field
    if (section.annotierbar) {
      shape[`annotation_${section.id}`] = z
        .string()
        .describe(`KI-Einordnung für Abschnitt "${section.titel}": 1-3 Sätze warum dieser Abschnitt für den konkreten Auftrag relevant ist.`)
        .optional()
    }

    if (section.unterabschnitte) {
      Object.assign(shape, collectFieldsFromSections(section.unterabschnitte))
    }
  }

  return shape
}

/**
 * Build a Zod schema dynamically from a FormStructure.
 * Only fields become schema keys. For annotierbar sections,
 * an `annotation_<sectionId>` string field is added.
 */
export function buildZodSchema(structure: FormStructure): z.ZodObject<Record<string, z.ZodType>> {
  const shape = collectFieldsFromSections(structure.sections)
  return z.object(shape)
}

// ── Prompt Builder ─────────────────────────────────────────────────────

type PromptMeta = {
  formularNummer: string
  name: string
  promptHinweise?: string
}

function renderSectionForPrompt(section: FormSection, depth: number): string {
  const lines: string[] = []
  const prefix = '#'.repeat(Math.min(depth + 1, 4))
  const heading = section.nummer ? `${prefix} ${section.nummer}. ${section.titel}` : `${prefix} ${section.titel}`
  lines.push(heading)

  if (section.bedingt && section.bedingungHinweis) {
    lines.push(`> Bedingter Abschnitt: ${section.bedingungHinweis}`)
  }

  if (section.festtext) {
    lines.push('')
    lines.push(section.festtext)
  }

  if (section.felder.length > 0) {
    lines.push('')
    for (const f of section.felder) {
      const pflicht = f.pflicht !== false ? 'Pflicht' : 'Optional'
      const typeInfo = f.einheit ?? f.type
      const opts = f.optionen ? ` [${f.optionen.join(' / ')}]` : ''
      lines.push(`→ Feld: ${f.id} — ${f.label} [${typeInfo}]${opts} (${pflicht})`)
      if (f.kontextImFesttext) {
        lines.push(`  Kontext: ${f.kontextImFesttext}`)
      }
    }
  }

  if (section.annotierbar) {
    lines.push('')
    lines.push(`→ Feld: annotation_${section.id} — KI-Einordnung [text] (Optional)`)
    lines.push('  Schreibe 1-3 Sätze warum dieser Abschnitt für den konkreten Auftrag relevant ist.')
  }

  if (section.unterabschnitte) {
    for (const sub of section.unterabschnitte) {
      lines.push('')
      lines.push(renderSectionForPrompt(sub, depth + 1))
    }
  }

  return lines.join('\n')
}

/**
 * Build system + user prompts from a FormStructure.
 */
export function buildFormblattPrompt(
  structure: FormStructure,
  meta: PromptMeta,
): { system: string; prompt: string } {
  const systemParts = [
    'Du bist ein Experte für öffentliches Vergaberecht in Deutschland.',
    'Du füllst Vergabeformulare basierend auf den Projektdaten aus.',
    '',
    'WICHTIG:',
    '- Die Formulartexte sind rechtsverbindlich und dürfen NICHT verändert werden.',
    '- Du füllst NUR die gekennzeichneten Felder (→ Feld: ...) aus.',
    '- Antworte präzise und fachlich korrekt auf Deutsch.',
  ]

  if (structure.formType === 'annotation-only' || structure.formType === 'mixed') {
    systemParts.push(
      '',
      'Für Abschnitte mit KI-Einordnung:',
      '- Schreibe pro Abschnitt 1-3 Sätze warum er für diesen Auftrag relevant ist.',
      '- Kennzeichne deine Einordnungen als nicht rechtsverbindlich.',
    )
  }

  if (meta.promptHinweise) {
    systemParts.push('', `Zusätzliche Hinweise:\n${meta.promptHinweise}`)
  }

  const promptParts = [
    `Fülle das Formular "${meta.formularNummer}: ${meta.name}" aus.`,
    '',
    '=== FORMULARSTRUKTUR ===',
    '',
  ]

  for (const section of structure.sections) {
    promptParts.push(renderSectionForPrompt(section, 1))
    promptParts.push('')
  }

  return {
    system: systemParts.join('\n'),
    prompt: promptParts.join('\n'),
  }
}

// ── Markdown Escape ────────────────────────────────────────────────────

/**
 * Escape Markdown special characters in field values before rendering.
 */
export function escapeMarkdown(value: string): string {
  return value.replace(/([*_\[\]`#>|\\])/g, '\\$1')
}

// ── Markdown Renderer ──────────────────────────────────────────────────

type RenderMeta = {
  formularNummer: string
  name: string
}

function formatFieldValue(field: FormField, value: unknown): string {
  if (value === null || value === undefined) return '___'

  if (field.type === 'boolean') {
    return value ? '**Ja**' : '**Nein**'
  }

  if (field.type === 'number' || field.type === 'percentage' || field.type === 'currency') {
    const num = typeof value === 'number' ? value : Number(value)
    if (Number.isNaN(num)) return `**${escapeMarkdown(String(value))}**`
    const formatted = num.toLocaleString('de-DE')
    const suffix = field.einheit ? ` ${field.einheit}` : ''
    return `**${formatted}${suffix}**`
  }

  if (field.type === 'enum') {
    return `**${escapeMarkdown(String(value))}**`
  }

  return `**${escapeMarkdown(String(value))}**`
}

function replacePlaceholders(
  festtext: string,
  felder: FormField[],
  data: Record<string, unknown>,
): string {
  // Collect fields that have a positionIndex
  const indexed = felder
    .filter((f) => typeof f.positionIndex === 'number')
    .sort((a, b) => a.positionIndex! - b.positionIndex!)

  if (indexed.length === 0) return festtext

  // Count "___" placeholders in festtext
  const placeholderPattern = /_{3,}/g
  const placeholders = [...festtext.matchAll(placeholderPattern)]

  if (placeholders.length === 0) return festtext

  // Check for count mismatch
  if (placeholders.length !== indexed.length) {
    // Mismatch — still do best-effort but mark extras
    let result = festtext
    // Replace from end to start to preserve indices
    const replacements = Math.min(placeholders.length, indexed.length)
    for (let i = replacements - 1; i >= 0; i--) {
      const match = placeholders[i]
      const field = indexed[i]
      const formatted = formatFieldValue(field, data[field.id])
      result =
        result.slice(0, match.index!) +
        formatted +
        result.slice(match.index! + match[0].length)
    }
    // Mark unmatched placeholders
    if (placeholders.length > indexed.length) {
      result = result.replace(/_{3,}/g, '\u26A0\uFE0F FELD NICHT ZUGEORDNET')
    }
    return result
  }

  // Happy path: exact match — replace from end to start
  let result = festtext
  for (let i = placeholders.length - 1; i >= 0; i--) {
    const match = placeholders[i]
    const field = indexed[i]
    const formatted = formatFieldValue(field, data[field.id])
    result =
      result.slice(0, match.index!) +
      formatted +
      result.slice(match.index! + match[0].length)
  }

  return result
}

function renderSectionToMarkdown(
  section: FormSection,
  data: Record<string, unknown>,
  depth: number,
): string {
  const lines: string[] = []
  const prefix = '#'.repeat(Math.min(depth + 1, 4))
  const heading = section.nummer
    ? `${prefix} ${section.nummer}. ${section.titel}`
    : `${prefix} ${section.titel}`
  lines.push(heading)

  if (section.bedingt && section.bedingungHinweis) {
    lines.push(`> ${section.bedingungHinweis}`)
  }

  if (section.festtext) {
    const rendered = replacePlaceholders(section.festtext, section.felder, data)
    lines.push('')
    lines.push(rendered)
  }

  // Fields without positionIndex (not embedded in festtext) — render as list
  const standaloneFields = section.felder.filter((f) => typeof f.positionIndex !== 'number')
  if (standaloneFields.length > 0) {
    lines.push('')
    for (const field of standaloneFields) {
      const value = data[field.id]
      if (field.type === 'array' && Array.isArray(value)) {
        lines.push(`**${field.label}:**`)
        if (field.spalten && field.spalten.length > 0) {
          // Render as table
          const headers = field.spalten.map((c) => c.label)
          lines.push(`| ${headers.join(' | ')} |`)
          lines.push(`| ${headers.map(() => '---').join(' | ')} |`)
          for (const row of value) {
            const cells = field.spalten!.map((c) => {
              const cellVal = (row as Record<string, unknown>)[c.id]
              return cellVal != null ? escapeMarkdown(String(cellVal)) : '—'
            })
            lines.push(`| ${cells.join(' | ')} |`)
          }
        } else {
          for (const item of value) {
            lines.push(`- ${escapeMarkdown(String(item))}`)
          }
        }
        lines.push('')
      } else {
        lines.push(`**${field.label}:** ${formatFieldValue(field, value)}`)
      }
    }
  }

  // Annotation for annotierbar sections
  if (section.annotierbar) {
    const annotation = data[`annotation_${section.id}`]
    if (annotation && typeof annotation === 'string') {
      lines.push('')
      lines.push('> **\u2699\uFE0F KI-Einordnung (nicht rechtsverbindlich):**')
      for (const line of annotation.split('\n')) {
        lines.push(`> ${line}`)
      }
    }
  }

  // Sub-sections
  if (section.unterabschnitte) {
    for (const sub of section.unterabschnitte) {
      lines.push('')
      lines.push(renderSectionToMarkdown(sub, data, depth + 1))
    }
  }

  return lines.join('\n')
}

/**
 * Render a completed form to Markdown: fixed legal text + filled values.
 * Placeholders (___) are deterministically replaced via positionIndex.
 * Mismatches are visibly marked. Field values are escaped.
 */
export function renderFormToMarkdown(
  structure: FormStructure,
  filledData: Record<string, unknown>,
  meta: RenderMeta,
): string {
  const lines: string[] = [
    `# ${meta.formularNummer}: ${meta.name}`,
    '',
  ]

  for (const section of structure.sections) {
    lines.push(renderSectionToMarkdown(section, filledData, 1))
    lines.push('')
  }

  return lines.join('\n')
}
