import type { MarketResearchResult, Provider } from '@/tools/market-research'
import type { SpecResult } from '@/tools/generate-spec'

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
    const lines: string[] = [
      `# ${result.titel}`,
      '',
      `**Leistungstyp:** ${result.leistungstyp}`,
      '',
    ]

    // Bedarf
    lines.push('## Bedarf')
    lines.push('')
    lines.push(`### Ausgangssituation`)
    lines.push(result.bedarf.ausgangssituation)
    lines.push('')
    lines.push(`### Problemstellung`)
    lines.push(result.bedarf.problemstellung)
    lines.push('')
    lines.push(`### Bedarfsumfang`)
    lines.push(result.bedarf.bedarfsumfang)
    lines.push('')

    // Ziel
    lines.push('## Ziel')
    lines.push('')
    lines.push(`### Gewünschte Ergebnisse`)
    lines.push(result.ziel.gewuenschte_ergebnisse)
    lines.push('')
    lines.push(`### Nutzen`)
    lines.push(result.ziel.nutzen)
    lines.push('')
    if (result.ziel.erfolgskriterien?.length) {
      lines.push(`### Erfolgskriterien`)
      for (const k of result.ziel.erfolgskriterien) {
        lines.push(`- ${k}`)
      }
      lines.push('')
    }

    // Leistungsbereiche
    if (result.leistungsbeschreibung?.bereiche?.length) {
      lines.push('## Leistungsbereiche')
      lines.push('')
      for (const bereich of result.leistungsbeschreibung.bereiche) {
        lines.push(`### ${bereich.titel}`)
        lines.push('')
        lines.push(bereich.beschreibung)
        lines.push('')
        for (const ub of bereich.unterbereiche) {
          lines.push(`#### ${ub.titel}`)
          lines.push(ub.inhalt)
          lines.push('')
        }
      }
    }

    // Zeitplanung
    if (result.zeitplanung) {
      lines.push('## Zeitplanung')
      lines.push('')
      lines.push(`**Gesamtdauer:** ${result.zeitplanung.gesamtdauer_monate} Monate`)
      lines.push('')
      for (const ms of result.zeitplanung.meilensteine) {
        lines.push(`### ${ms.phase} (${ms.dauer_wochen} Wochen)`)
        lines.push('')
        lines.push('**Aktivitäten:**')
        for (const a of ms.aktivitaeten) {
          lines.push(`- ${a}`)
        }
        lines.push('')
        lines.push('**Liefergegenstände:**')
        for (const l of ms.liefergegenstaende) {
          lines.push(`- ${l}`)
        }
        lines.push('')
      }
    }

    return lines.join('\n')
  },
}

// --- Ask Questions ---

type AnswerItem = {
  question: string
  selectedOptions: string[]
  freeText?: string
}

const askQuestionsTransformer: ToolTransformer<AnswerItem[]> = {
  toDocument(result) {
    return {
      title: `Bedarfsermittlung (${result.length} Fragen)`,
      description: `Fragebogen mit ${result.length} beantworteten Fragen`,
      category: 'questionnaire',
      sourceToolType: 'askQuestions',
      tags: [
        { tag: 'fragebogen' },
        { tag: 'ai-generiert' },
      ],
      jsonData: result,
    }
  },
  toMarkdown(result) {
    const lines: string[] = [
      `# Bedarfsermittlung`,
      '',
      `> ${result.length} Fragen beantwortet`,
      '',
    ]

    for (let i = 0; i < result.length; i++) {
      const item = result[i]
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

// --- Registry ---

const registry: Record<string, ToolTransformer<any>> = {
  marketResearch: marketResearchTransformer,
  generateSpec: generateSpecTransformer,
  askQuestions: askQuestionsTransformer,
}

export function getTransformer(toolType: string): ToolTransformer | undefined {
  return registry[toolType]
}
