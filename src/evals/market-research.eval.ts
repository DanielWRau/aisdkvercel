import { describe, it, expect } from 'vitest';
import { marketResearch } from '@/tools/market-research';
import { z } from 'zod';
import {
  schemaValid,
  fieldsPopulated,
  minItems,
  weightedAverage,
  formatScore,
} from './helpers/scoring';

const providerSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  website: z.string().min(1),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  strengths: z.array(z.string()).min(1),
  groesse: z.enum(['klein', 'mittel', 'gross']).optional(),
  reichweite: z.enum(['lokal', 'regional', 'ueberregional', 'bundesweit']).optional(),
  spezialisierung: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  mitarbeiteranzahl: z.string().optional().nullable(),
  category: z.string().optional(),
  certifications: z.array(z.string()).optional(),
});

const resultSchema = z.object({
  providers: z.array(providerSchema),
  citations: z.array(z.string()),
  searchResults: z.array(z.object({ title: z.string(), url: z.string() })),
  query: z.string(),
});

function scoreResult(result: unknown) {
  const r = result as Record<string, unknown>;
  const providers = (r.providers ?? []) as Record<string, unknown>[];

  const schema = schemaValid(result, resultSchema);
  const providerCount = minItems(providers, 3);

  const hasGroesse =
    providers.length > 0
      ? providers.filter((p) => p.groesse && String(p.groesse).length > 0)
          .length / providers.length
      : 0;
  const hasReichweite =
    providers.length > 0
      ? providers.filter((p) => p.reichweite && String(p.reichweite).length > 0)
          .length / providers.length
      : 0;
  const hasRegion =
    providers.length > 0
      ? providers.filter((p) => p.region && String(p.region).length > 0)
          .length / providers.length
      : 0;

  const avgFields =
    providers.length > 0
      ? providers.reduce(
          (sum, p) =>
            sum +
            fieldsPopulated(p, [
              'name',
              'description',
              'website',
              'strengths',
              'groesse',
              'reichweite',
            ]),
          0,
        ) / providers.length
      : 0;

  // Contact data scoring
  const hasEmail =
    providers.length > 0
      ? providers.filter(
          (p) => p.email && String(p.email).includes('@'),
        ).length / providers.length
      : 0;
  const hasPhone =
    providers.length > 0
      ? providers.filter(
          (p) => p.phone && String(p.phone).length > 5,
        ).length / providers.length
      : 0;
  const hasAddress =
    providers.length > 0
      ? providers.filter(
          (p) => p.address && String(p.address).length > 3,
        ).length / providers.length
      : 0;
  const hasCity =
    providers.length > 0
      ? providers.filter(
          (p) => p.city && String(p.city).length > 3,
        ).length / providers.length
      : 0;

  const contactScore = weightedAverage([
    { score: hasEmail, weight: 3 },
    { score: hasPhone, weight: 3 },
    { score: hasAddress, weight: 1 },
    { score: hasCity, weight: 1 },
  ]);

  const overall = weightedAverage([
    { score: schema, weight: 2 },
    { score: providerCount, weight: 2 },
    { score: hasGroesse, weight: 1 },
    { score: hasReichweite, weight: 1 },
    { score: avgFields, weight: 1 },
    { score: contactScore, weight: 3 },
  ]);

  return {
    overall,
    schema,
    providerCount,
    hasGroesse,
    hasReichweite,
    hasRegion,
    avgFields,
    contactScore,
    hasEmail,
    hasPhone,
    hasAddress,
    hasCity,
  };
}

const TEST_CASES = [
  {
    name: 'Gartenpflege',
    query: 'Gartenpflege und Landschaftsbau Dienstleister Deutschland',
  },
  {
    name: 'IT-Sicherheit',
    query: 'IT-Sicherheit Penetrationstest Anbieter Deutschland',
  },
  {
    name: 'Gebäudereinigung',
    query: 'Gebäudereinigung gewerblich Anbieter Deutschland',
  },
  {
    name: 'Gebäudereinigung NRW',
    query: 'Gebäudereinigung gewerblich Anbieter',
    region: 'NRW',
  },
  {
    name: 'IT-Dienstleister Bayern',
    query: 'IT-Dienstleister und Systemhäuser',
    region: 'Bayern',
  },
  {
    name: 'Mittelstand Reinigung',
    query: 'Gebäudereinigung gewerblich Anbieter Deutschland',
    groessenPraeferenz: 'mittel' as const,
  },
];

describe('Market Research Evals', () => {
  for (const tc of TEST_CASES) {
    it(`${tc.name}: liefert valide Anbieter mit Kontaktdaten`, async () => {
      const rawResult = await marketResearch.execute!(
        {
          query: tc.query,
          ...(tc.region ? { region: tc.region } : {}),
          ...(tc.groessenPraeferenz ? { groessenPraeferenz: tc.groessenPraeferenz } : {}),
        },
        { toolCallId: 'eval', messages: [] },
      );
      const result =
        rawResult as import('@/tools/market-research').MarketResearchResult;

      const scores = scoreResult(result);
      console.log(
        formatScore(tc.name, scores.overall, {
          schema: scores.schema,
          providers: scores.providerCount,
          groesse: scores.hasGroesse,
          reichweite: scores.hasReichweite,
          region: scores.hasRegion,
          contact: scores.contactScore,
          email: scores.hasEmail,
          phone: scores.hasPhone,
        }),
      );

      // Detail-Log für jeden Anbieter
      for (const p of result.providers) {
        const pr = p as Record<string, unknown>;
        console.log(
          `  ${p.name}: groesse=${pr.groesse || '-'}, reichweite=${pr.reichweite || '-'}, region=${pr.region || '-'}, email=${pr.email || '-'}, phone=${pr.phone || '-'}`,
        );
      }

      expect(result.error).toBeUndefined();
      expect(scores.overall).toBeGreaterThanOrEqual(0.4);
      expect(scores.contactScore).toBeGreaterThanOrEqual(0.5);
    });
  }
});
