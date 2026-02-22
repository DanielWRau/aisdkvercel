import { vi } from 'vitest';
import type { Provider } from '@/tools/market-research';

type PerplexityResponse = {
  choices: { message: { content: string } }[];
  citations?: string[];
  search_results?: { title: string; url: string; date?: string }[];
};

/**
 * Installs a globalThis.fetch mock that intercepts Perplexity API calls.
 * Returns the providers array as JSON in the response content.
 */
export function mockPerplexityFetch(
  providers: Provider[],
  options: {
    citations?: string[];
    searchResults?: { title: string; url: string; date?: string }[];
  } = {},
) {
  const body: PerplexityResponse = {
    choices: [{ message: { content: JSON.stringify(providers) } }],
    citations: options.citations ?? ['https://example.com'],
    search_results: options.searchResults ?? [
      { title: 'Example', url: 'https://example.com' },
    ],
  };

  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  });

  vi.stubGlobal('fetch', mockFetch);
  return mockFetch;
}

/**
 * Mock fetch that returns an HTTP error.
 */
export function mockPerplexityError(status: number) {
  const mockFetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({}),
  });

  vi.stubGlobal('fetch', mockFetch);
  return mockFetch;
}
