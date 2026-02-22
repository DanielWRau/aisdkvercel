import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SAMPLE_SPEC } from '@/__tests__/helpers/sample-data';

// Mock generateText from ai
vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    generateText: vi.fn(),
  };
});

// Mock anthropic provider
vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(() => 'mock-model'),
}));

const { generateText } = await import('ai');
const { generateSpec } = await import('../generate-spec');

const mockedGenerateText = vi.mocked(generateText);

describe('generateSpec', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses valid JSON spec from generateText response', async () => {
    mockedGenerateText.mockResolvedValue({
      text: JSON.stringify(SAMPLE_SPEC),
    } as never);

    const result = await generateSpec.execute!(
      { anforderungen: 'Gebäudereinigung für 5000m²' },
      { toolCallId: 'test', messages: [] },
    );

    expect(result.titel).toBe('Leistungsbeschreibung Gebäudereinigung');
    expect(result.leistungstyp).toBe('dienstleistung');
    expect(result.bedarf.ausgangssituation).toBeTruthy();
    expect(result.ziel.erfolgskriterien.length).toBeGreaterThan(0);
    expect(result.leistungsbeschreibung.bereiche.length).toBeGreaterThan(0);
    expect(result.error).toBeUndefined();
  });

  it('extracts JSON from markdown-wrapped response', async () => {
    const wrappedText = `Hier ist die Leistungsbeschreibung:\n\`\`\`json\n${JSON.stringify(SAMPLE_SPEC)}\n\`\`\``;
    mockedGenerateText.mockResolvedValue({ text: wrappedText } as never);

    const result = await generateSpec.execute!(
      { anforderungen: 'Test' },
      { toolCallId: 'test', messages: [] },
    );

    expect(result.titel).toBe('Leistungsbeschreibung Gebäudereinigung');
  });

  it('returns error skeleton when JSON is unparseable', async () => {
    mockedGenerateText.mockResolvedValue({
      text: 'this is not json',
    } as never);

    const result = await generateSpec.execute!(
      { anforderungen: 'Test' },
      { toolCallId: 'test', messages: [] },
    );

    expect(result.error).toBe(
      'Leistungsbeschreibung konnte nicht generiert werden.',
    );
    expect(result.titel).toBe('');
    expect(result.leistungsbeschreibung.bereiche).toHaveLength(0);
    expect(result.zeitplanung.gesamtdauer_monate).toBe(0);
  });

  it('returns error skeleton on generateText exception', async () => {
    mockedGenerateText.mockRejectedValue(new Error('API down'));

    const result = await generateSpec.execute!(
      { anforderungen: 'Test' },
      { toolCallId: 'test', messages: [] },
    );

    expect(result.error).toBe('Fehler: API down');
    expect(result.titel).toBe('');
  });

  it('includes marktkontext in prompt when provided', async () => {
    mockedGenerateText.mockResolvedValue({
      text: JSON.stringify(SAMPLE_SPEC),
    } as never);

    await generateSpec.execute!(
      {
        anforderungen: 'Reinigung',
        marktkontext: 'Es gibt 3 regionale Anbieter mit ISO-Zertifizierung',
      },
      { toolCallId: 'test', messages: [] },
    );

    const call = mockedGenerateText.mock.calls[0][0];
    expect(call.prompt).toContain('MARKTKONTEXT');
    expect(call.prompt).toContain('ISO-Zertifizierung');
  });

  it('omits marktkontext section when not provided', async () => {
    mockedGenerateText.mockResolvedValue({
      text: JSON.stringify(SAMPLE_SPEC),
    } as never);

    await generateSpec.execute!(
      { anforderungen: 'Reinigung' },
      { toolCallId: 'test', messages: [] },
    );

    const call = mockedGenerateText.mock.calls[0][0];
    expect(call.prompt).not.toContain('MARKTKONTEXT');
  });
});
