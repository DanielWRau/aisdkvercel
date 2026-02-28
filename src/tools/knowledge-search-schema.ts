import { z } from 'zod'

export const knowledgeSearchInputSchema = z.object({
  query: z.string().describe('Suchanfrage in natürlicher Sprache'),
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
      'media',
    ])
    .optional()
    .describe(
      'Kategorie zum Filtern: spec=Leistungsbeschreibung, research=Marktrecherche, ' +
      'contract=Vertrag, questionnaire=Fragebogen, angebots-draft=Angebotsentwurf, ' +
      'angebots-anfrage=Angebotsanfrage, angebots-vergleich=Angebotsvergleich, ' +
      'formblatt=Formblatt, media=Hochgeladene Dateien',
    ),
  limit: z
    .number()
    .min(1)
    .max(20)
    .optional()
    .default(8)
    .describe('Maximale Anzahl der Ergebnisse'),
})

export type KnowledgeSearchInput = z.infer<typeof knowledgeSearchInputSchema>

export const knowledgeSearchResultSchema = z.object({
  results: z.array(
    z.object({
      text: z.string(),
      source: z.string(),
      docId: z.string(),
      docTitle: z.string().optional(),
      similarity: z.number(),
    }),
  ),
  message: z.string().optional(),
  error: z.string().optional(),
})

export type KnowledgeSearchResult = z.infer<typeof knowledgeSearchResultSchema>
