import { z } from 'zod'
import type { MarketResearchResult } from '@/tools/market-research-schema'
import type { SpecResult } from '@/tools/generate-spec-schema'
import { formSchemas } from '@/data/form-schemas'
import { renderFormToMarkdown, type FormStructure } from '@/lib/form-structure'

export type DocumentInput = {
  title: string
  description: string
  category: string
  sourceToolType: string
  tags: { tag: string }[]
  jsonData: unknown
}

type ToolTransformer<T = unknown> = {
  toDocument: (result: T) => DocumentInput
  toMarkdown: (result: T) => string
}

// --- Bedarfs Data Normalization ---

const answerItemSchema = z.object({
  question: z.string(),
  selectedOptions: z.array(z.string()),
  freeText: z.string().optional(),
})

const bedarfsDataSchema = z.union([
  z.array(answerItemSchema),
  z.object({
    answers: z.array(answerItemSchema),
    summary: z.string().default(''),
  }),
])

export type AnswerItem = z.infer<typeof answerItemSchema>
export type BedarfsData = { answers: AnswerItem[]; summary: string }

export function normalizeBedarfsData(raw: unknown): BedarfsData {
  const parsed = bedarfsDataSchema.safeParse(raw)
  if (!parsed.success) {
    return { answers: [], summary: '' }
  }
  if (Array.isArray(parsed.data)) {
    return { answers: parsed.data, summary: '' }
  }
  return parsed.data
}

// --- Market Research ---

const marketResearchTransformer: ToolTransformer<MarketResearchResult> = {
  toDocument(result) {
    return {
      title: `Marktrecherche: ${result.query}`,
      description: `${result.providers.length} Anbieter gefunden für "${result.query}"`,
      category: 'research',
      sourceToolType: 'marketResearch',
      tags: [
        { tag: 'marktrecherche' },
        { tag: 'ai-generiert' },
      ],
      jsonData: result,
    }
  },
  toMarkdown(result) {
    const lines: string[] = [
      `# Marktrecherche: ${result.query}`,
      '',
      `> ${result.providers.length} Anbieter gefunden`,
      '',
    ]

    if (result.providers.length > 0) {
      lines.push('| Name | Größe | Reichweite | E-Mail | Telefon | Website |')
      lines.push('|------|-------|------------|--------|---------|---------|')
      for (const p of result.providers) {
        lines.push(
          `| ${p.name} | ${p.groesse ?? '—'} | ${p.reichweite ?? '—'} | ${p.email ?? '—'} | ${p.phone ?? '—'} | ${p.website ?? '—'} |`,
        )
      }
      lines.push('')

      lines.push('## Details')
      lines.push('')
      for (const p of result.providers) {
        lines.push(`### ${p.name}`)
        lines.push('')
        if (p.description) lines.push(p.description)
        if (p.spezialisierung) lines.push(`**Spezialisierung:** ${p.spezialisierung}`)
        if (p.region) lines.push(`**Region:** ${p.region}`)
        if (p.strengths?.length) lines.push(`**Stärken:** ${p.strengths.join(', ')}`)
        if (p.address) lines.push(`**Adresse:** ${p.address}${p.city ? `, ${p.city}` : ''}`)
        lines.push('')
      }
    }

    if (result.citations?.length) {
      lines.push('## Quellen')
      lines.push('')
      for (const c of result.citations) {
        lines.push(`- ${c}`)
      }
      lines.push('')
    }

    return lines.join('\n')
  },
}

// --- Generate Spec ---

const generateSpecTransformer: ToolTransformer<SpecResult> = {
  toDocument(result) {
    return {
      title: result.titel || 'Leistungsbeschreibung',
      description: result.bedarf?.ausgangssituation || '',
      category: 'spec',
      sourceToolType: 'generateSpec',
      tags: [
        { tag: 'leistungsbeschreibung' },
        { tag: 'ai-generiert' },
        ...(result.leistungstyp ? [{ tag: result.leistungstyp }] : []),
      ],
      jsonData: result,
    }
  },
  toMarkdown(result) {
    const lines: string[] = []

    // Header — tolerant to partial streaming data
    if (result.titel) lines.push(`# ${result.titel}`, '')
    if (result.leistungstyp) lines.push(`**Leistungstyp:** ${result.leistungstyp}`, '')

    // Bedarf
    if (result.bedarf) {
      lines.push('## Bedarf', '')
      if (result.bedarf.ausgangssituation) {
        lines.push('### Ausgangssituation', result.bedarf.ausgangssituation, '')
      }
      if (result.bedarf.problemstellung) {
        lines.push('### Problemstellung', result.bedarf.problemstellung, '')
      }
      if (result.bedarf.bedarfsumfang) {
        lines.push('### Bedarfsumfang', result.bedarf.bedarfsumfang, '')
      }
    }

    // Ziel
    if (result.ziel) {
      lines.push('## Ziel', '')
      if (result.ziel.gewuenschte_ergebnisse) {
        lines.push('### Gewünschte Ergebnisse', result.ziel.gewuenschte_ergebnisse, '')
      }
      if (result.ziel.nutzen) {
        lines.push('### Nutzen', result.ziel.nutzen, '')
      }
      if (result.ziel.erfolgskriterien?.length) {
        lines.push('### Erfolgskriterien')
        for (const k of result.ziel.erfolgskriterien) {
          lines.push(`- ${k}`)
        }
        lines.push('')
      }
    }

    // Leistungsbereiche
    if (result.leistungsbeschreibung?.bereiche?.length) {
      lines.push('## Leistungsbereiche', '')
      for (const bereich of result.leistungsbeschreibung.bereiche) {
        if (bereich.titel) lines.push(`### ${bereich.titel}`, '')
        if (bereich.beschreibung) lines.push(bereich.beschreibung, '')
        if (bereich.unterbereiche) {
          for (const ub of bereich.unterbereiche) {
            if (ub.titel) lines.push(`#### ${ub.titel}`)
            if (ub.inhalt) lines.push(ub.inhalt)
            lines.push('')
          }
        }
      }
    }

    // Zeitplanung
    if (result.zeitplanung) {
      lines.push('## Zeitplanung', '')
      if (result.zeitplanung.gesamtdauer_monate) {
        lines.push(`**Gesamtdauer:** ${result.zeitplanung.gesamtdauer_monate} Monate`, '')
      }
      if (result.zeitplanung.meilensteine) {
        for (const ms of result.zeitplanung.meilensteine) {
          if (ms.phase) lines.push(`### ${ms.phase}${ms.dauer_wochen ? ` (${ms.dauer_wochen} Wochen)` : ''}`, '')
          if (ms.aktivitaeten?.length) {
            lines.push('**Aktivitäten:**')
            for (const a of ms.aktivitaeten) lines.push(`- ${a}`)
            lines.push('')
          }
          if (ms.liefergegenstaende?.length) {
            lines.push('**Liefergegenstände:**')
            for (const l of ms.liefergegenstaende) lines.push(`- ${l}`)
            lines.push('')
          }
        }
      }
    }

    return lines.join('\n')
  },
}

// --- Ask Questions ---

const askQuestionsTransformer: ToolTransformer = {
  toDocument(result) {
    const { answers, summary } = normalizeBedarfsData(result)
    return {
      title: `Bedarfsermittlung (${answers.length} Fragen)`,
      description: summary || `Fragebogen mit ${answers.length} beantworteten Fragen`,
      category: 'questionnaire',
      sourceToolType: 'askQuestions',
      tags: [
        { tag: 'fragebogen' },
        { tag: 'ai-generiert' },
      ],
      jsonData: { answers, summary },
    }
  },
  toMarkdown(result) {
    const { answers, summary } = normalizeBedarfsData(result)
    const lines: string[] = [
      `# Bedarfsermittlung`,
      '',
    ]

    if (summary) {
      lines.push('## Zusammenfassung', '', summary, '')
    }

    lines.push('')

    for (let i = 0; i < answers.length; i++) {
      const item = answers[i]
      lines.push(`**${i + 1}. ${item.question}**`)
      if (item.selectedOptions?.length) {
        lines.push(`- Auswahl: ${item.selectedOptions.join(', ')}`)
      }
      if (item.freeText) {
        lines.push(`- Freitext: ${item.freeText}`)
      }
      lines.push('')
    }

    return lines.join('\n')
  },
}

// --- Angebotsanfrage ---

const angebotsAnfrageTransformer: ToolTransformer<{ content: string }> = {
  toDocument(result) {
    return {
      title: 'Angebotsanfrage',
      description: 'KI-generierte herstellerneutrale Angebotsanfrage',
      category: 'angebots-anfrage',
      sourceToolType: 'angebotsAnfrage',
      tags: [
        { tag: 'angebotsanfrage' },
        { tag: 'ai-generiert' },
      ],
      jsonData: result,
    }
  },
  toMarkdown(result) {
    return result.content
  },
}

// --- Angebotsvergleich ---

const angebotsVergleichTransformer: ToolTransformer<{ content: string; supplierCount?: number }> = {
  toDocument(result) {
    const suffix = result.supplierCount ? ` (${result.supplierCount} Anbieter)` : ''
    return {
      title: `Angebotsvergleich${suffix}`,
      description: 'KI-generierte Angebotsauswertung',
      category: 'angebots-vergleich',
      sourceToolType: 'angebotsVergleich',
      tags: [
        { tag: 'angebotsvergleich' },
        { tag: 'ai-generiert' },
      ],
      jsonData: result,
    }
  },
  toMarkdown(result) {
    return result.content
  },
}

// --- Angebotsentwurf (Lieferantenliste) ---

type AngebotsDraftData = {
  suppliers: { id?: string; name: string; kontakt?: string; website?: string; angebotText?: string }[]
}

const angebotsDraftTransformer: ToolTransformer<AngebotsDraftData> = {
  toDocument(result) {
    return {
      title: `Lieferantenliste (${result.suppliers.length} Lieferanten)`,
      description: `Entwurf mit ${result.suppliers.length} Lieferanten`,
      category: 'angebots-draft',
      sourceToolType: 'angebotsDraft',
      tags: [
        { tag: 'lieferantenliste' },
        { tag: 'angebotsentwurf' },
      ],
      jsonData: result,
    }
  },
  toMarkdown(result) {
    const lines: string[] = [
      `# Lieferantenliste`,
      '',
      `> ${result.suppliers.length} Lieferanten`,
      '',
    ]

    if (result.suppliers.length > 0) {
      lines.push('| Name | Kontakt | Website |')
      lines.push('|------|---------|---------|')
      for (const s of result.suppliers) {
        lines.push(`| ${s.name} | ${s.kontakt ?? '—'} | ${s.website ?? '—'} |`)
      }
      lines.push('')

      for (const s of result.suppliers) {
        if (s.angebotText) {
          lines.push(`## ${s.name}`)
          lines.push('')
          lines.push(s.angebotText)
          lines.push('')
        }
      }
    }

    return lines.join('\n')
  },
}

// --- Fill Formblatt ---

type FormblattResult = {
  _meta: {
    formularNummer: string
    name: string
    description?: string
    schemaVersion: number
    structureSnapshot?: FormStructure
  }
  [key: string]: unknown
}

const fillFormblattTransformer: ToolTransformer<FormblattResult> = {
  toDocument(result) {
    return {
      title: `${result._meta.formularNummer}: ${result._meta.name}`,
      description: result._meta.description ?? '',
      category: 'formblatt',
      sourceToolType: 'fillFormblatt',
      tags: [
        { tag: 'formblatt' },
        { tag: result._meta.formularNummer },
        { tag: 'ai-generiert' },
      ],
      jsonData: {
        ...result,
        _meta: {
          ...result._meta,
          schemaVersion: result._meta.schemaVersion,
        },
      },
    }
  },
  toMarkdown(result) {
    try {
      const structure = result._meta?.structureSnapshot as FormStructure | undefined
      if (structure) {
        return renderFormToMarkdown(structure, result, {
          formularNummer: result._meta.formularNummer,
          name: result._meta.name,
        })
      }
      // Legacy fallback for v1 documents
      const renderer = formSchemas[result._meta.formularNummer]
      return renderer ? renderer.toMarkdown(result) : JSON.stringify(result, null, 2)
    } catch (err) {
      console.error('[fillFormblatt.toMarkdown]', err)
      return `# ${result._meta.formularNummer}\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``
    }
  },
}

// --- Save Document ---

const saveDocumentTransformer: ToolTransformer<{ content: string }> = {
  toDocument(result) {
    return {
      title: 'Dokument',
      description: '',
      category: 'other',
      sourceToolType: 'saveDocument',
      tags: [{ tag: 'ai-generiert' }],
      jsonData: result,
    }
  },
  toMarkdown(result) {
    return result.content
  },
}

// --- Registry ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- registry maps string keys to heterogeneous transformers
const registry: Record<string, ToolTransformer<any>> = {
  marketResearch: marketResearchTransformer,
  generateSpec: generateSpecTransformer,
  askQuestions: askQuestionsTransformer,
  angebotsDraft: angebotsDraftTransformer,
  angebotsAnfrage: angebotsAnfrageTransformer,
  angebotsVergleich: angebotsVergleichTransformer,
  fillFormblatt: fillFormblattTransformer,
  saveDocument: saveDocumentTransformer,
}

export function getTransformer(toolType: string): ToolTransformer | undefined {
  return registry[toolType]
}
