import { z } from 'zod';

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

export const specResultSchema = z.object({
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
  }).optional(),
});

export type SpecResult = z.infer<typeof specResultSchema> & {
  error?: string;
};
