import { tool } from 'ai';
import { z } from 'zod';
import { getMarketResearchPrompt, getPerplexityConfig } from '@/prompts';

const providerSchema = z.object({
  name: z.string(),
  description: z.string(),
  website: z.string(),
  strengths: z.array(z.string()),
  category: z.string(),
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

export const marketResearch = tool({
  description:
    'Führe eine Marktrecherche mit Perplexity durch, um Anbieter und Unternehmen für ein bestimmtes Thema zu finden.',
  inputSchema: z.object({
    query: z.string().describe('Suchanfrage für die Marktrecherche'),
  }),
  execute: async ({ query }): Promise<MarketResearchResult> => {
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
            { role: 'system', content: getMarketResearchPrompt() },
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

    return {
      providers,
      citations,
      searchResults,
      query,
    };
  },
});
