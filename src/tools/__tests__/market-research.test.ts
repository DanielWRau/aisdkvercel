import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SAMPLE_PROVIDERS } from '@/__tests__/helpers/sample-data';
import {
  mockPerplexityFetch,
  mockPerplexityError,
} from '@/__tests__/helpers/mock-perplexity';

// Mock the prompts module so we don't depend on its internals
vi.mock('@/prompts', () => ({
  getMarketResearchPrompt: () => 'mock system prompt',
  getPerplexityConfig: () => ({ model: 'sonar-pro' }),
}));

// Mock generateText for enrichment (Haiku web search)
vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    generateText: vi.fn().mockResolvedValue({ text: '{}' }),
  };
});

// Mock session context (no sessionId during tests)
vi.mock('@/lib/session-context', () => ({
  getSessionId: vi.fn(() => undefined),
}));

// Mock @ai-sdk/anthropic (still needed for anthropic.tools.webSearch)
vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: Object.assign(
    (model: string) => ({ modelId: model }),
    {
      tools: {
        webSearch_20250305: (opts: Record<string, unknown>) => ({
          type: 'provider-defined',
          ...opts,
        }),
      },
    },
  ),
}));

// Mock AI provider
vi.mock('@/lib/ai', () => ({
  ai: { languageModel: vi.fn(() => ({ modelId: 'mock-model' })) },
}));

// Import after mocks are set up
const { marketResearch } = await import('../market-research');

/** Helper: consume an async generator and return the last yielded value */
async function consumeGenerator<T>(gen: AsyncGenerator<T>): Promise<T> {
  let last: T | undefined;
  for await (const value of gen) {
    last = value;
  }
  return last!;
}

describe('marketResearch', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, PERPLEXITY_API_KEY: 'test-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('parses provider JSON from Perplexity response', async () => {
    mockPerplexityFetch(SAMPLE_PROVIDERS, {
      citations: ['https://cleanpro.de'],
      searchResults: [{ title: 'CleanPro', url: 'https://cleanpro.de' }],
    });

    const gen = marketResearch.execute!(
      { query: 'Gebäudereinigung Berlin' },
      { toolCallId: 'test', messages: [] },
    );
    const result = await consumeGenerator(gen as AsyncGenerator);

    expect(result.providers).toHaveLength(3);
    expect(result.providers[0].name).toBe('CleanPro GmbH');
    expect(result.providers[0].groesse).toBe('gross');
    expect(result.providers[0].reichweite).toBe('bundesweit');
    expect(result.citations).toContain('https://cleanpro.de');
    expect(result.query).toBe('Gebäudereinigung Berlin');
    expect(result.error).toBeUndefined();
  });

  it('extracts JSON from markdown code block fallback', async () => {
    const markdownContent = `Hier sind die Ergebnisse:\n\`\`\`json\n${JSON.stringify(SAMPLE_PROVIDERS)}\n\`\`\``;

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: markdownContent } }],
          citations: [],
          search_results: [],
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const gen = marketResearch.execute!(
      { query: 'Reinigung' },
      { toolCallId: 'test', messages: [] },
    );
    const result = await consumeGenerator(gen as AsyncGenerator);

    expect(result.providers).toHaveLength(3);
  });

  it('returns error when API key is missing', async () => {
    delete process.env.PERPLEXITY_API_KEY;

    const gen = marketResearch.execute!(
      { query: 'test' },
      { toolCallId: 'test', messages: [] },
    );
    const result = await consumeGenerator(gen as AsyncGenerator);

    expect(result.error).toBe('PERPLEXITY_API_KEY nicht konfiguriert');
    expect(result.providers).toHaveLength(0);
  });

  it('returns error on API failure', async () => {
    mockPerplexityError(500);

    const gen = marketResearch.execute!(
      { query: 'test' },
      { toolCallId: 'test', messages: [] },
    );
    const result = await consumeGenerator(gen as AsyncGenerator);

    expect(result.error).toBe('Perplexity API Fehler: 500');
    expect(result.providers).toHaveLength(0);
  });

  it('returns empty providers on unparseable content', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: 'this is not json at all' } }],
          citations: [],
          search_results: [],
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const gen = marketResearch.execute!(
      { query: 'test' },
      { toolCallId: 'test', messages: [] },
    );
    const result = await consumeGenerator(gen as AsyncGenerator);

    expect(result.providers).toHaveLength(0);
    expect(result.error).toBeUndefined();
  });

  it('sends correct headers and body to Perplexity', async () => {
    const mockFetch = mockPerplexityFetch([]);

    const gen = marketResearch.execute!(
      { query: 'IT-Sicherheit' },
      { toolCallId: 'test', messages: [] },
    );
    await consumeGenerator(gen as AsyncGenerator);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.perplexity.ai/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('accepts optional region and groessenPraeferenz parameters', async () => {
    mockPerplexityFetch(SAMPLE_PROVIDERS);

    const gen = marketResearch.execute!(
      { query: 'Reinigung', region: 'NRW', groessenPraeferenz: 'mittel' },
      { toolCallId: 'test', messages: [] },
    );
    const result = await consumeGenerator(gen as AsyncGenerator);

    expect(result.providers).toHaveLength(3);
    expect(result.error).toBeUndefined();
  });

  it('enriches providers missing contact data via generateText', async () => {
    const { generateText } = await import('ai');
    const mockGenerateText = vi.mocked(generateText);

    // Provider without email — should trigger enrichment
    const providersWithMissingContact = [
      {
        ...SAMPLE_PROVIDERS[0],
        email: null,
        phone: null,
      },
    ];

    mockPerplexityFetch(providersWithMissingContact);

    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        email: 'found@cleanpro.de',
        phone: '+49 30 9999999',
        address: 'Neue Straße 5',
        city: '10117 Berlin',
      }),
    } as Awaited<ReturnType<typeof generateText>>);

    const gen = marketResearch.execute!(
      { query: 'Reinigung' },
      { toolCallId: 'test', messages: [] },
    );
    const result = await consumeGenerator(gen as AsyncGenerator);

    expect(result.providers[0].email).toBe('found@cleanpro.de');
    expect(result.providers[0].phone).toBe('+49 30 9999999');
    expect(mockGenerateText).toHaveBeenCalled();
  });

  it('does not enrich when all providers have contact data', async () => {
    const { generateText } = await import('ai');
    const mockGenerateText = vi.mocked(generateText);
    mockGenerateText.mockClear();

    mockPerplexityFetch(SAMPLE_PROVIDERS);

    const gen = marketResearch.execute!(
      { query: 'Reinigung' },
      { toolCallId: 'test', messages: [] },
    );
    await consumeGenerator(gen as AsyncGenerator);

    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('handles enrichment errors gracefully', async () => {
    const { generateText } = await import('ai');
    const mockGenerateText = vi.mocked(generateText);

    const providersWithMissingContact = [
      { ...SAMPLE_PROVIDERS[0], email: null, phone: null },
    ];

    mockPerplexityFetch(providersWithMissingContact);
    mockGenerateText.mockRejectedValueOnce(new Error('API Error'));

    const gen = marketResearch.execute!(
      { query: 'Reinigung' },
      { toolCallId: 'test', messages: [] },
    );
    const result = await consumeGenerator(gen as AsyncGenerator);

    // Should still return providers even if enrichment fails
    expect(result.providers).toHaveLength(1);
    expect(result.error).toBeUndefined();
  });

  it('yields preliminary results during execution', async () => {
    mockPerplexityFetch(SAMPLE_PROVIDERS);

    const gen = marketResearch.execute!(
      { query: 'Reinigung' },
      { toolCallId: 'test', messages: [] },
    );
    const allYields: unknown[] = [];
    for await (const value of gen as AsyncGenerator) {
      allYields.push(value);
    }

    // Should have at least: searching, enriching, final
    expect(allYields.length).toBeGreaterThanOrEqual(3);
    // First yield should have status 'searching'
    expect((allYields[0] as { status: string }).status).toBe('searching');
    // Last yield should be the final result (no status field)
    const last = allYields[allYields.length - 1] as { providers: unknown[]; status?: string };
    expect(last.providers).toBeDefined();
    expect(last.status).toBeUndefined();
  });
});
