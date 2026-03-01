import { tool, streamObject } from 'ai';
import { ai } from '@/lib/ai';
import { z } from 'zod';
import { getSpecGenerationPrompt } from '@/prompts';
import { specResultSchema } from './generate-spec-schema';
import type { SpecResult } from './generate-spec-schema';

export { specResultSchema } from './generate-spec-schema';
export type { SpecResult } from './generate-spec-schema';

const emptyResult: SpecResult = {
  titel: '',
  leistungstyp: '',
  bedarf: {
    ausgangssituation: '',
    problemstellung: '',
    bedarfsumfang: '',
  },
  ziel: {
    gewuenschte_ergebnisse: '',
    nutzen: '',
    erfolgskriterien: [],
  },
  leistungsbeschreibung: { bereiche: [] },
};

export const generateSpec = tool({
  description:
    'Erstelle eine detaillierte Leistungsbeschreibung basierend auf dem Bedarf des Benutzers und den Ergebnissen der Marktrecherche.',
  inputSchema: z.object({
    anforderungen: z
      .string()
      .describe(
        'Zusammenfassung aller Anforderungen aus den Benutzerantworten',
      ),
    marktkontext: z
      .string()
      .optional()
      .describe(
        'Zusammenfassung der Marktrecherche (Anbieter, Zertifizierungen, Marktstruktur)',
      ),
    detailtiefe: z
      .enum(['kurz', 'standard', 'erweitert'])
      .optional()
      .describe('Detailtiefe: kurz (2 Bereiche), standard (3), erweitert (5)'),
    stil: z
      .enum(['formal', 'einfach'])
      .optional()
      .describe('Sprachstil: formal (Fachsprache) oder einfach'),
    mitZeitplanung: z
      .boolean()
      .optional()
      .describe('Ob eine Zeitplanung enthalten sein soll'),
    gliederung: z
      .array(z.string())
      .optional()
      .describe('Benutzerdefinierte Gliederungspunkte. Ersetzt die Standard-Gliederung.'),
  }),
  execute: async function* ({ anforderungen, marktkontext, detailtiefe, stil, mitZeitplanung, gliederung }) {
    try {
      const userContent = [
        `Erstelle eine Leistungsbeschreibung für folgenden Bedarf:`,
        '',
        anforderungen,
        marktkontext
          ? `\n=== MARKTKONTEXT ===\n${marktkontext}`
          : '',
      ].join('\n');

      const result = streamObject({
        model: ai.languageModel('fast'),
        schema: specResultSchema,
        system: getSpecGenerationPrompt({
          detailtiefe: detailtiefe ?? 'standard',
          stil: stil ?? 'formal',
          mitZeitplanung: mitZeitplanung ?? true,
          gliederung,
        }),
        prompt: userContent,
      });

      // Yield partial objects as preliminary results
      for await (const partialObject of result.partialObjectStream) {
        yield partialObject as Partial<SpecResult>;
      }

      // Final yield: complete validated SpecResult
      yield await result.object;
    } catch (err) {
      yield {
        ...emptyResult,
        error: `Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`,
      };
    }
  },
});
