import { z } from 'zod';

export const providerSchema = z.object({
  name: z.string(),
  description: z.string(),
  website: z.string(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  strengths: z.array(z.string()),
  groesse: z.enum(['klein', 'mittel', 'gross']).optional(),
  reichweite: z.enum(['lokal', 'regional', 'ueberregional', 'bundesweit']).optional(),
  spezialisierung: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  mitarbeiteranzahl: z.string().nullable().optional(),
  category: z.string().optional(),
  certifications: z.array(z.string()).optional(),
});

export type Provider = z.infer<typeof providerSchema>;

export const marketResearchResultSchema = z.object({
  providers: z.array(providerSchema),
  citations: z.array(z.string()),
  searchResults: z.array(z.object({ title: z.string(), url: z.string(), date: z.string().optional() })),
  query: z.string(),
});

export type MarketResearchResult = z.infer<typeof marketResearchResultSchema> & {
  error?: string;
};
