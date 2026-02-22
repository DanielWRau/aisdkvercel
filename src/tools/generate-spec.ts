import { tool } from 'ai';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { getSpecGenerationPrompt } from '@/prompts';

// --- Zod-Schema für das Ergebnis ---
const unterbereichSchema = z.object({
  titel: z.string(),
  inhalt: z.string(),
});

const bereichSchema = z.object({
  titel: z.string(),
  beschreibung: z.string(),
  unterbereiche: z.array(unterbereichSchema),
});

const meilensteinSchema = z.object({
  phase: z.string(),
  dauer_wochen: z.number(),
  aktivitaeten: z.array(z.string()),
  liefergegenstaende: z.array(z.string()),
});

const specResultSchema = z.object({
  titel: z.string(),
  leistungstyp: z.string(),
  bedarf: z.object({
    ausgangssituation: z.string(),
    problemstellung: z.string(),
    bedarfsumfang: z.string(),
  }),
  ziel: z.object({
    gewuenschte_ergebnisse: z.string(),
    nutzen: z.string(),
    erfolgskriterien: z.array(z.string()),
  }),
  leistungsbeschreibung: z.object({
    bereiche: z.array(bereichSchema),
  }),
  zeitplanung: z.object({
    gesamtdauer_monate: z.number(),
    meilensteine: z.array(meilensteinSchema),
  }),
});

export type SpecResult = z.infer<typeof specResultSchema> & {
  error?: string;
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
  }),
  execute: async ({ anforderungen, marktkontext }): Promise<SpecResult> => {
    try {
      const userContent = [
        `Erstelle eine Leistungsbeschreibung für folgenden Bedarf:`,
        '',
        anforderungen,
        marktkontext
          ? `\n=== MARKTKONTEXT ===\n${marktkontext}`
          : '',
      ].join('\n');

      const { text } = await generateText({
        model: anthropic('claude-haiku-4-5-20251001'),
        system: getSpecGenerationPrompt(),
        prompt: userContent,
      });

      // JSON extrahieren
      let parsed: SpecResult;
      try {
        parsed = JSON.parse(text);
      } catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) {
          return {
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
            zeitplanung: { gesamtdauer_monate: 0, meilensteine: [] },
            error: 'Leistungsbeschreibung konnte nicht generiert werden.',
          };
        }
        parsed = JSON.parse(match[0]);
      }

      return parsed;
    } catch (err) {
      return {
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
        zeitplanung: { gesamtdauer_monate: 0, meilensteine: [] },
        error: `Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`,
      };
    }
  },
});
