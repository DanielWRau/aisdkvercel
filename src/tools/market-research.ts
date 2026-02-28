import { tool, generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { ai } from '@/lib/ai';
import { z } from 'zod';
import { getMarketResearchPrompt, getPerplexityConfig } from '@/prompts';
import { marketResearchResultSchema } from './market-research-schema';
import type { Provider, MarketResearchResult } from './market-research-schema';

export { providerSchema, marketResearchResultSchema } from './market-research-schema';
export type { Provider, MarketResearchResult } from './market-research-schema';

export type MarketResearchProgress = {
  status: 'searching' | 'enriching';
  query: string;
  providers: Provider[];
  citations?: string[];
  searchResults?: Array<{ title: string; url: string; date?: string }>;
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
      model: ai.languageModel('fast'),
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

export const marketResearch = tool({
  description:
    'Führe eine Marktrecherche mit Perplexity durch, um Anbieter und Unternehmen für ein bestimmtes Thema zu finden. Unterstützt optionale Filterung nach Region und Unternehmensgröße.',
  inputSchema: z.object({
    query: z.string().describe('Suchanfrage für die Marktrecherche'),
    region: z.string().optional().describe('Regionale Einschränkung, z.B. "NRW", "Bayern"'),
    groessenPraeferenz: z.enum(['klein', 'mittel', 'gross', 'alle']).optional().describe('Bevorzugte Unternehmensgröße'),
  }),
  execute: async function* ({ query, region, groessenPraeferenz }) {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      yield {
        providers: [],
        citations: [],
        searchResults: [],
        query,
        error: 'PERPLEXITY_API_KEY nicht konfiguriert',
      } satisfies MarketResearchResult;
      return;
    }

    // Preliminary: searching
    yield { status: 'searching' as const, query, providers: [] as Provider[], citations: [] as string[], searchResults: [] as Array<{ title: string; url: string; date?: string }> };

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
      yield {
        providers: [],
        citations: [],
        searchResults: [],
        query,
        error: `Perplexity API Fehler: ${response.status}`,
      } satisfies MarketResearchResult;
      return;
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

    // Preliminary: enriching (initial providers found)
    yield { status: 'enriching' as const, query, providers, citations, searchResults };

    // Zweiter Pass: Kontaktdaten anreichern für Anbieter ohne E-Mail oder Telefon
    if (providers.length > 0) {
      const needsEnrichment = providers.filter(
        (p) => !p.email || !p.phone,
      );

      if (needsEnrichment.length > 0) {
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

          // Update providers with enriched data and yield progress
          providers = providers.map((p) => enriched.get(p.name) ?? p);
          yield { status: 'enriching' as const, query, providers, citations, searchResults };
        }
      }
    }

    // Final yield: validated MarketResearchResult
    const finalResult = marketResearchResultSchema.parse({ providers, citations, searchResults, query });
    yield finalResult;
  },
});
