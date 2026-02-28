import { describe, it, expect } from 'vitest';
import {
  getSystemPrompt,
  getMarketResearchPrompt,
  getPerplexityConfig,
  getSpecGenerationPrompt,
} from '../index';

describe('getSystemPrompt', () => {
  it('includes all 5 tools by default', () => {
    const prompt = getSystemPrompt();
    expect(prompt).toContain('askQuestions');
    expect(prompt).toContain('marketResearch');
    expect(prompt).toContain('generateSpec');
    expect(prompt).toContain('knowledgeSearch');
    expect(prompt).toContain('saveDocument');
    expect(prompt).toContain('5 Tools');
  });

  it('respects custom tool list', () => {
    const prompt = getSystemPrompt({ tools: ['askQuestions'] });
    expect(prompt).toContain('ein Tool');
    expect(prompt).toContain('askQuestions');
    expect(prompt).not.toContain('marketResearch:');
  });

  it('includes direct-call rule by default', () => {
    const prompt = getSystemPrompt();
    expect(prompt).toContain('DIREKT auf');
  });

  it('omits direct-call rule when disabled', () => {
    const prompt = getSystemPrompt({ directToolCalls: false });
    expect(prompt).not.toContain('DIREKT auf');
  });

  it('includes maxFrageRunden in steps', () => {
    const prompt = getSystemPrompt({ maxFrageRunden: 3 });
    expect(prompt).toContain('maximal 3 Runden');
  });

  it('omits follow-up question step when maxFrageRunden is 1', () => {
    const prompt = getSystemPrompt({ maxFrageRunden: 1 });
    expect(prompt).not.toContain('erneut auf');
  });

  it('includes generateSpec step with explicit-only instruction', () => {
    const prompt = getSystemPrompt();
    expect(prompt).toContain('generateSpec NUR');
    expect(prompt).toContain('EXPLIZIT');
  });

  it('includes marketResearch step with explicit-only instruction', () => {
    const prompt = getSystemPrompt();
    expect(prompt).toContain('marketResearch NUR');
    expect(prompt).toContain('NIEMALS automatisch');
  });

  it('includes region/size hint in marketResearch tool description', () => {
    const prompt = getSystemPrompt();
    expect(prompt).toContain('Region');
    expect(prompt).toContain('Unternehmensgröße');
  });
});

describe('getMarketResearchPrompt', () => {
  it('returns prompt with groesse classification', () => {
    const prompt = getMarketResearchPrompt();
    expect(prompt).toContain('"klein"');
    expect(prompt).toContain('"mittel"');
    expect(prompt).toContain('"gross"');
  });

  it('returns prompt with reichweite classification', () => {
    const prompt = getMarketResearchPrompt();
    expect(prompt).toContain('"lokal"');
    expect(prompt).toContain('"regional"');
    expect(prompt).toContain('"ueberregional"');
    expect(prompt).toContain('"bundesweit"');
  });

  it('returns prompt with spezialisierung field', () => {
    const prompt = getMarketResearchPrompt();
    expect(prompt).toContain('spezialisierung');
    expect(prompt).toContain('Fachliche Spezialisierung');
  });

  it('includes JSON format example with new fields', () => {
    const prompt = getMarketResearchPrompt();
    expect(prompt).toContain('"name"');
    expect(prompt).toContain('"description"');
    expect(prompt).toContain('"email"');
    expect(prompt).toContain('"phone"');
    expect(prompt).toContain('"address"');
    expect(prompt).toContain('"city"');
    expect(prompt).toContain('"groesse"');
    expect(prompt).toContain('"reichweite"');
    expect(prompt).toContain('"spezialisierung"');
    expect(prompt).toContain('"region"');
    expect(prompt).toContain('"mitarbeiteranzahl"');
    expect(prompt).toContain('JSON-Array');
  });

  it('includes contact data instructions', () => {
    const prompt = getMarketResearchPrompt();
    expect(prompt).toContain('Impressum');
    expect(prompt).toContain('E-Mail-Adresse');
    expect(prompt).toContain('Telefonnummer');
  });

  it('includes region block when region is set', () => {
    const prompt = getMarketResearchPrompt({ region: 'NRW' });
    expect(prompt).toContain('REGIONALE EINSCHRÄNKUNG');
    expect(prompt).toContain('NRW');
  });

  it('omits region block when region is not set', () => {
    const prompt = getMarketResearchPrompt();
    expect(prompt).not.toContain('REGIONALE EINSCHRÄNKUNG');
  });

  it('includes groessenPraeferenz block when set', () => {
    const prompt = getMarketResearchPrompt({ groessenPraeferenz: 'mittel' });
    expect(prompt).toContain('GRÖSSENPRÄFERENZ');
    expect(prompt).toContain('mittelständische Unternehmen');
  });

  it('omits groessenPraeferenz block when set to "alle"', () => {
    const prompt = getMarketResearchPrompt({ groessenPraeferenz: 'alle' });
    expect(prompt).not.toContain('GRÖSSENPRÄFERENZ');
  });

  it('omits groessenPraeferenz block when not set', () => {
    const prompt = getMarketResearchPrompt();
    expect(prompt).not.toContain('GRÖSSENPRÄFERENZ');
  });

  it('does not contain old category options', () => {
    const prompt = getMarketResearchPrompt();
    expect(prompt).not.toContain('KATEGORIE-OPTIONEN');
    expect(prompt).not.toContain('groß/überregional');
    expect(prompt).not.toContain('mittelständisch/regional');
  });
});

describe('getPerplexityConfig', () => {
  it('returns default config', () => {
    const config = getPerplexityConfig();
    expect(config.model).toBe('sonar-pro');
    expect(config.search_recency_filter).toBe('month');
    expect(config.web_search_options.search_context_size).toBe('high');
  });

  it('respects custom options', () => {
    const config = getPerplexityConfig({
      suchAktualitaet: 'week',
      suchKontextGroesse: 'low',
    });
    expect(config.search_recency_filter).toBe('week');
    expect(config.web_search_options.search_context_size).toBe('low');
  });
});

describe('getSpecGenerationPrompt', () => {
  it('returns prompt with default settings', () => {
    const prompt = getSpecGenerationPrompt();
    expect(prompt).toContain('3 Hauptbereiche');
    expect(prompt).toContain('2-3 Unterbereichen');
    expect(prompt).toContain('fachlich präzise');
  });

  it('uses kurz preset', () => {
    const prompt = getSpecGenerationPrompt({ detailtiefe: 'kurz' });
    expect(prompt).toContain('2 Hauptbereiche');
    expect(prompt).toContain('1-2 Unterbereichen');
  });

  it('uses erweitert preset', () => {
    const prompt = getSpecGenerationPrompt({ detailtiefe: 'erweitert' });
    expect(prompt).toContain('5 Hauptbereiche');
    expect(prompt).toContain('3-4 Unterbereichen');
  });

  it('uses einfach style', () => {
    const prompt = getSpecGenerationPrompt({ stil: 'einfach' });
    expect(prompt).toContain('Einfache, verständliche Sprache');
  });

  it('includes zeitplanung by default', () => {
    const prompt = getSpecGenerationPrompt();
    expect(prompt).toContain('Zeitplanung');
    expect(prompt).toContain('gesamtdauer_monate');
  });

  it('omits zeitplanung when disabled', () => {
    const prompt = getSpecGenerationPrompt({ mitZeitplanung: false });
    expect(prompt).not.toContain('gesamtdauer_monate');
  });

  it('uses custom anzahlBereiche', () => {
    const prompt = getSpecGenerationPrompt({ anzahlBereiche: 7 });
    expect(prompt).toContain('7 Hauptbereiche');
  });

  it('uses custom anzahlUnterbereiche', () => {
    const prompt = getSpecGenerationPrompt({
      anzahlUnterbereiche: [2, 5],
    });
    expect(prompt).toContain('2-5 Unterbereichen');
  });
});
