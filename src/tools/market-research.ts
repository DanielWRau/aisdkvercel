import { tool, generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { getMarketResearchPrompt, getPerplexityConfig } from '@/prompts';

const providerSchema = z.object({
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

export type MarketResearchResult = {
  providers: Provider[];
  citations: string[];
  searchResults: { title: string; url: string; date?: string }[];
  query: string;
  error?: string;
};

/**
 * Enrich a single provider's contact data using Haiku + web search.
 * Searches the provider's own website for impressum/contact info.
 */
async function enrichSingleProvider(
  provider: Provider,
): Promise<Provider> {
  try {
    let hostname: string;
    try {
      hostname = new URL(provider.website).hostname;
    } catch {
      return provider;
    }

    const webSearchTool = anthropic.tools.webSearch_20250305({
      maxUses: 2,
      allowedDomains: [hostname],
    });

    const result = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      tools: { web_search: webSearchTool },
      prompt: `Finde die Kontaktdaten (E-Mail, Telefon, Adresse, Stadt) von ${provider.name} auf ${provider.website}. Suche nach Impressum oder Kontaktseite. Antworte AUSSCHLIESSLICH als JSON-Objekt:
{"email": "...", "phone": "...", "address": "...", "city": "..."}
Setze Felder auf null wenn nicht gefunden. Erfinde KEINE Daten.`,
    });

    const text = result.text || '';
    let contact: Record<string, string | null> = {};
    try {
      contact = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          contact = JSON.parse(match[0]);
        } catch {
          return provider;
        }
      } else {
        return provider;
      }
    }

    return {
      ...provider,
      email: provider.email || contact.email || null,
      phone: provider.phone || contact.phone || null,
      address: provider.address || contact.address || null,
      city: provider.city || contact.city || null,
    };
  } catch {
    return provider;
  }
}

/**
 * Enrich providers with contact data using individual Haiku + web search queries.
 * Processes up to 5 providers with concurrency of 3.
 */
async function enrichContactData(
  providers: Provider[],
): Promise<Provider[]> {
  const needsEnrichment = providers.filter(
    (p) => !p.email || !p.phone,
  );
  if (needsEnrichment.length === 0) return providers;

  const toEnrich = needsEnrichment.slice(0, 5);
  const CONCURRENCY = 3;
  const enriched = new Map<string, Provider>();

  for (let i = 0; i < toEnrich.length; i += CONCURRENCY) {
    const batch = toEnrich.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((p) => enrichSingleProvider(p)),
    );
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        enriched.set(batch[idx].name, result.value);
      }
    });
  }

  return providers.map((p) => enriched.get(p.name) ?? p);
}

export const marketResearch = tool({
  description:
    'Führe eine Marktrecherche mit Perplexity durch, um Anbieter und Unternehmen für ein bestimmtes Thema zu finden. Unterstützt optionale Filterung nach Region und Unternehmensgröße.',
  inputSchema: z.object({
    query: z.string().describe('Suchanfrage für die Marktrecherche'),
    region: z.string().optional().describe('Regionale Einschränkung, z.B. "NRW", "Bayern"'),
    groessenPraeferenz: z.enum(['klein', 'mittel', 'gross', 'alle']).optional().describe('Bevorzugte Unternehmensgröße'),
  }),
  execute: async ({ query, region, groessenPraeferenz }): Promise<MarketResearchResult> => {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return {
        providers: [],
        citations: [],
        searchResults: [],
        query,
        error: 'PERPLEXITY_API_KEY nicht konfiguriert',
      };
    }

    const prompt = getMarketResearchPrompt({ region, groessenPraeferenz });

    const response = await fetch(
      'https://api.perplexity.ai/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...getPerplexityConfig(),
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: `Finde Anbieter für: ${query}` },
          ],
        }),
      },
    );

    if (!response.ok) {
      return {
        providers: [],
        citations: [],
        searchResults: [],
        query,
        error: `Perplexity API Fehler: ${response.status}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations: string[] = data.citations || [];
    const searchResults = (data.search_results || []).map(
      (sr: { title: string; url: string; date?: string }) => ({
        title: sr.title,
        url: sr.url,
        date: sr.date,
      }),
    );

    // JSON aus dem Content extrahieren
    let providers: Provider[] = [];
    try {
      providers = JSON.parse(content);
    } catch {
      // Fallback: JSON aus Markdown-Codeblock extrahieren
      const match = content.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          providers = JSON.parse(match[0]);
        } catch {
          /* ignore */
        }
      }
    }

    // Zweiter Pass: Kontaktdaten anreichern für Anbieter ohne E-Mail oder Telefon
    if (providers.length > 0) {
      providers = await enrichContactData(providers);
    }

    return {
      providers,
      citations,
      searchResults,
      query,
    };
  },
});
