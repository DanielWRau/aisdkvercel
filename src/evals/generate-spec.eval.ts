import { describe, it, expect } from 'vitest';
import { generateSpec } from '@/tools/generate-spec';
import { z } from 'zod';
import {
  schemaValid,
  fieldsPopulated,
  minItems,
  minLength,
  weightedAverage,
  formatScore,
} from './helpers/scoring';

const specSchema = z.object({
  titel: z.string().min(3),
  leistungstyp: z.string().min(1),
  bedarf: z.object({
    ausgangssituation: z.string().min(10),
    problemstellung: z.string().min(10),
    bedarfsumfang: z.string().min(10),
  }),
  ziel: z.object({
    gewuenschte_ergebnisse: z.string().min(10),
    nutzen: z.string().min(10),
    erfolgskriterien: z.array(z.string()).min(2),
  }),
  leistungsbeschreibung: z.object({
    bereiche: z
      .array(
        z.object({
          titel: z.string(),
          beschreibung: z.string(),
          unterbereiche: z.array(
            z.object({ titel: z.string(), inhalt: z.string().min(10) }),
          ),
        }),
      )
      .min(2),
  }),
  zeitplanung: z.object({
    gesamtdauer_monate: z.number().min(1),
    meilensteine: z
      .array(
        z.object({
          phase: z.string(),
          dauer_wochen: z.number(),
          aktivitaeten: z.array(z.string()).min(1),
          liefergegenstaende: z.array(z.string()).min(1),
        }),
      )
      .min(1),
  }),
});

function scoreResult(result: unknown) {
  const r = result as Record<string, unknown>;

  const schema = schemaValid(result, specSchema);
  const topFields = fieldsPopulated(r, [
    'titel',
    'leistungstyp',
    'bedarf',
    'ziel',
    'leistungsbeschreibung',
    'zeitplanung',
  ]);
  const bereiche = (
    (r.leistungsbeschreibung as { bereiche?: unknown[] })?.bereiche ?? []
  ) as Record<string, unknown>[];
  const bereicheCount = minItems(bereiche, 2);
  const titelLength = minLength(String(r.titel ?? ''), 10);

  const erfolgskriterien = (
    (r.ziel as { erfolgskriterien?: unknown[] })?.erfolgskriterien ?? []
  ) as unknown[];
  const kriterienCount = minItems(erfolgskriterien, 3);

  const meilensteine = (
    (r.zeitplanung as { meilensteine?: unknown[] })?.meilensteine ?? []
  ) as unknown[];
  const meilensteineCount = minItems(meilensteine, 2);

  const overall = weightedAverage([
    { score: schema, weight: 3 },
    { score: topFields, weight: 2 },
    { score: bereicheCount, weight: 2 },
    { score: titelLength, weight: 1 },
    { score: kriterienCount, weight: 1 },
    { score: meilensteineCount, weight: 1 },
  ]);

  return {
    overall,
    schema,
    topFields,
    bereicheCount,
    titelLength,
    kriterienCount,
    meilensteineCount,
  };
}

const TEST_CASES = [
  {
    name: 'Gartenpflege',
    anforderungen:
      'Wir suchen einen Dienstleister für die regelmäßige Pflege unserer Außenanlagen (ca. 2.000 m²). Rasen mähen, Hecken schneiden, Beetpflege, Winterdienst. Vertragslaufzeit 24 Monate.',
  },
  {
    name: 'IT-Sicherheit',
    anforderungen:
      'Jährlicher Penetrationstest für unsere Web-Applikationen und interne IT-Infrastruktur. Etwa 50 Server, 3 Webanwendungen. OWASP Top 10 Prüfung, Netzwerksicherheit, Social Engineering Tests. Abschlussbericht mit Maßnahmenempfehlung.',
  },
  {
    name: 'Gebäudereinigung',
    anforderungen:
      'Tägliche Unterhaltsreinigung für Bürogebäude mit 5.000 m² Nutzfläche, 3 Etagen. 200 Mitarbeiter. Sanitärreinigung, Teeküchen, Konferenzräume. Wöchentliche Grundreinigung der Eingangsbereiche. Monatliche Fensterreinigung.',
    marktkontext:
      'Es gibt mehrere Anbieter im regionalen Markt. Die meisten verfügen über ISO 9001 Zertifizierung. Der Markt ist geprägt von großen überregionalen Anbietern und spezialisierten regionalen Dienstleistern.',
  },
];

describe('Generate Spec Evals', () => {
  for (const tc of TEST_CASES) {
    it(`${tc.name}: generiert valide Leistungsbeschreibung`, async () => {
      const rawResult = await generateSpec.execute!(
        {
          anforderungen: tc.anforderungen,
          marktkontext: tc.marktkontext,
        },
        { toolCallId: 'eval', messages: [] },
      );
      const result = rawResult as import('@/tools/generate-spec').SpecResult;

      const scores = scoreResult(result);
      console.log(
        formatScore(tc.name, scores.overall, {
          schema: scores.schema,
          topFields: scores.topFields,
          bereiche: scores.bereicheCount,
          titel: scores.titelLength,
          kriterien: scores.kriterienCount,
          meilensteine: scores.meilensteineCount,
        }),
      );

      expect(result.error).toBeUndefined();
      expect(scores.overall).toBeGreaterThanOrEqual(0.6);
    });
  }
});
