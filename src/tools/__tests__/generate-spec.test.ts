import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SpecResult } from '../generate-spec-schema';
import { SAMPLE_SPEC } from '@/__tests__/helpers/sample-data';

// Mock streamObject from ai
vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    streamObject: vi.fn(),
  };
});

// Mock AI provider
vi.mock('@/lib/ai', () => ({
  ai: { languageModel: vi.fn(() => 'mock-model') },
}));

// Mock session context (no sessionId during tests)
vi.mock('@/lib/session-context', () => ({
  getSessionId: vi.fn(() => undefined),
}));

const { streamObject } = await import('ai');
const { generateSpec } = await import('../generate-spec');

const mockedStreamObject = vi.mocked(streamObject);

function createMockStreamResult(resolvedObject: unknown) {
  async function* emptyStream() {
    yield resolvedObject;
  }
  return {
    partialObjectStream: emptyStream(),
    object: Promise.resolve(resolvedObject),
  };
}

function createMockStreamError(error: Error) {
  async function* emptyStream() {
    // stream yields nothing before error
  }
  return {
    partialObjectStream: emptyStream(),
    object: Promise.reject(error),
  };
}

/** Helper: consume an async generator and return the last yielded value */
async function consumeGenerator(gen: AsyncGenerator): Promise<SpecResult & { error?: string }> {
  let last: unknown;
  for await (const value of gen) {
    last = value;
  }
  return last as SpecResult & { error?: string };
}

describe('generateSpec', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses valid JSON spec from streamObject response', async () => {
    mockedStreamObject.mockReturnValue(
      createMockStreamResult(SAMPLE_SPEC) as never,
    );

    const gen = generateSpec.execute!(
      { anforderungen: 'Gebäudereinigung für 5000m²' },
      { toolCallId: 'test', messages: [] },
    );
    const result = await consumeGenerator(gen as AsyncGenerator);

    expect(result.titel).toBe('Leistungsbeschreibung Gebäudereinigung');
    expect(result.leistungstyp).toBe('dienstleistung');
    expect(result.bedarf.ausgangssituation).toBeTruthy();
    expect(result.ziel.erfolgskriterien.length).toBeGreaterThan(0);
    expect(result.leistungsbeschreibung.bereiche.length).toBeGreaterThan(0);
    expect(result.error).toBeUndefined();
  });

  it('returns error skeleton on streamObject exception', async () => {
    mockedStreamObject.mockReturnValue(
      createMockStreamError(new Error('API down')) as never,
    );

    const gen = generateSpec.execute!(
      { anforderungen: 'Test' },
      { toolCallId: 'test', messages: [] },
    );
    const result = await consumeGenerator(gen as AsyncGenerator);

    expect(result.error).toBe('Fehler: API down');
    expect(result.titel).toBe('');
  });

  it('includes marktkontext in prompt when provided', async () => {
    mockedStreamObject.mockReturnValue(
      createMockStreamResult(SAMPLE_SPEC) as never,
    );

    const gen = generateSpec.execute!(
      {
        anforderungen: 'Reinigung',
        marktkontext: 'Es gibt 3 regionale Anbieter mit ISO-Zertifizierung',
      },
      { toolCallId: 'test', messages: [] },
    );
    await consumeGenerator(gen as AsyncGenerator);

    const call = mockedStreamObject.mock.calls[0][0];
    expect(call.prompt).toContain('MARKTKONTEXT');
    expect(call.prompt).toContain('ISO-Zertifizierung');
  });

  it('omits marktkontext section when not provided', async () => {
    mockedStreamObject.mockReturnValue(
      createMockStreamResult(SAMPLE_SPEC) as never,
    );

    const gen = generateSpec.execute!(
      { anforderungen: 'Reinigung' },
      { toolCallId: 'test', messages: [] },
    );
    await consumeGenerator(gen as AsyncGenerator);

    const call = mockedStreamObject.mock.calls[0][0];
    expect(call.prompt).not.toContain('MARKTKONTEXT');
  });

  it('passes gliederung to getSpecGenerationPrompt', async () => {
    mockedStreamObject.mockReturnValue(
      createMockStreamResult(SAMPLE_SPEC) as never,
    );

    const gliederung = ['1. Gegenstand', '2. Anforderungen', '3. Zeitplan'];
    const gen = generateSpec.execute!(
      { anforderungen: 'Reinigung', gliederung },
      { toolCallId: 'test', messages: [] },
    );
    await consumeGenerator(gen as AsyncGenerator);

    const call = mockedStreamObject.mock.calls[0][0];
    // The system prompt should contain the custom gliederung items
    expect(call.system).toContain('1. Gegenstand');
    expect(call.system).toContain('2. Anforderungen');
    expect(call.system).toContain('3. Zeitplan');
    // Should NOT contain the default structure
    expect(call.system).not.toContain('Titel und Leistungstyp');
  });

  it('yields partial objects during streaming', async () => {
    const partial1 = { titel: 'Test' };
    const partial2 = { titel: 'Test', leistungstyp: 'dienstleistung' };

    async function* partialStream() {
      yield partial1;
      yield partial2;
    }

    mockedStreamObject.mockReturnValue({
      partialObjectStream: partialStream(),
      object: Promise.resolve(SAMPLE_SPEC),
    } as never);

    const gen = generateSpec.execute!(
      { anforderungen: 'Test' },
      { toolCallId: 'test', messages: [] },
    );

    const allYields: unknown[] = [];
    for await (const value of gen as AsyncGenerator) {
      allYields.push(value);
    }

    // Should have partial1, partial2, and the final SAMPLE_SPEC
    expect(allYields.length).toBe(3);
    expect((allYields[0] as { titel: string }).titel).toBe('Test');
    expect((allYields[2] as { titel: string }).titel).toBe(SAMPLE_SPEC.titel);
  });
});
