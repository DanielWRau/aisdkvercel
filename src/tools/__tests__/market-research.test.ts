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

// Mock @ai-sdk/anthropic
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

// Import after mocks are set up
const { marketResearch } = await import('../market-research');

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

    const result = await marketResearch.execute!(
      { query: 'Gebäudereinigung Berlin' },
      { toolCallId: 'test', messages: [] },
    );

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

    const result = await marketResearch.execute!(
      { query: 'Reinigung' },
      { toolCallId: 'test', messages: [] },
    );

    expect(result.providers).toHaveLength(3);
  });

  it('returns error when API key is missing', async () => {
    delete process.env.PERPLEXITY_API_KEY;

    const result = await marketResearch.execute!(
      { query: 'test' },
      { toolCallId: 'test', messages: [] },
    );

    expect(result.error).toBe('PERPLEXITY_API_KEY nicht konfiguriert');
    expect(result.providers).toHaveLength(0);
  });

  it('returns error on API failure', async () => {
    mockPerplexityError(500);

    const result = await marketResearch.execute!(
      { query: 'test' },
      { toolCallId: 'test', messages: [] },
    );

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

    const result = await marketResearch.execute!(
      { query: 'test' },
      { toolCallId: 'test', messages: [] },
    );

    expect(result.providers).toHaveLength(0);
    expect(result.error).toBeUndefined();
  });

  it('sends correct headers and body to Perplexity', async () => {
    const mockFetch = mockPerplexityFetch([]);

    await marketResearch.execute!(
      { query: 'IT-Sicherheit' },
      { toolCallId: 'test', messages: [] },
    );

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

    const result = await marketResearch.execute!(
      { query: 'Reinigung', region: 'NRW', groessenPraeferenz: 'mittel' },
      { toolCallId: 'test', messages: [] },
    );

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

    const result = await marketResearch.execute!(
      { query: 'Reinigung' },
      { toolCallId: 'test', messages: [] },
    );

    expect(result.providers[0].email).toBe('found@cleanpro.de');
    expect(result.providers[0].phone).toBe('+49 30 9999999');
    expect(mockGenerateText).toHaveBeenCalled();
  });

  it('does not enrich when all providers have contact data', async () => {
    const { generateText } = await import('ai');
    const mockGenerateText = vi.mocked(generateText);
    mockGenerateText.mockClear();

    mockPerplexityFetch(SAMPLE_PROVIDERS);

    await marketResearch.execute!(
      { query: 'Reinigung' },
      { toolCallId: 'test', messages: [] },
    );

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

    const result = await marketResearch.execute!(
      { query: 'Reinigung' },
      { toolCallId: 'test', messages: [] },
    );

    // Should still return providers even if enrichment fails
    expect(result.providers).toHaveLength(1);
    expect(result.error).toBeUndefined();
  });
});
