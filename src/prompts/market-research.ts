export type MarketResearchPromptOptions = {
  /** Welche Infos pro Anbieter gesammelt werden sollen */
  anbieterFelder?: (
    | 'name'
    | 'beschreibung'
    | 'website'
    | 'staerken'
    | 'kategorie'
    | 'zertifizierungen'
  )[];
  /** Anbieter-Kategorien für die Gruppierung */
  kategorien?: string[];
  /** Aktualitätsfilter für die Perplexity-Suche */
  suchAktualitaet?: 'day' | 'week' | 'month' | 'year';
  /** Suchtiefe für Perplexity */
  suchKontextGroesse?: 'low' | 'medium' | 'high';
};

const DEFAULT_FELDER = [
  'name',
  'beschreibung',
  'website',
  'staerken',
  'kategorie',
  'zertifizierungen',
] as const;

const DEFAULT_KATEGORIEN = [
  'groß/überregional',
  'mittelständisch/regional',
  'spezialisiert',
];

const FELD_BESCHREIBUNGEN: Record<string, string> = {
  name: 'Vollständiger Firmenname',
  beschreibung: 'Kurzbeschreibung der Leistungen',
  website: 'Website',
  staerken: 'Stärken und Alleinstellungsmerkmale',
  kategorie: 'Kategorie',
  zertifizierungen: 'Zertifizierungen (falls verfügbar)',
};

export function getMarketResearchPrompt(
  options: MarketResearchPromptOptions = {},
): string {
  const {
    anbieterFelder = [...DEFAULT_FELDER],
    kategorien = DEFAULT_KATEGORIEN,
  } = options;

  const felderListe = anbieterFelder
    .map(f => `- ${FELD_BESCHREIBUNGEN[f]}`)
    .join('\n');

  const kategorienStr = kategorien.map(k => `"${k}"`).join(', ');

  return `Du bist ein Experte für Marktrecherche und Anbieteridentifikation.

Suche nach Unternehmen/Anbietern/Dienstleistern für die angegebene Suchanfrage.

**FÜR JEDEN ANBIETER SAMMLE:**
${felderListe}

**KATEGORIE-OPTIONEN:** ${kategorienStr}

**QUALITÄTSKRITERIEN:**
- Nur reale, existierende Unternehmen
- Aktuelle, vertrauenswürdige Quellen
- Keine erfundenen Informationen

WICHTIG: Antworte AUSSCHLIESSLICH mit einem JSON-Array. Kein Markdown, keine Erklärungen.
Beginne direkt mit [ und ende mit ]

Format:
[
  {
    "name": "Firmenname",
    "description": "Kurzbeschreibung",
    "website": "https://...",
    "strengths": ["Stärke 1", "Stärke 2"],
    "category": "${kategorien[0]}",
    "certifications": ["ISO 9001"]
  }
]`;
}

/** Perplexity API Parameter */
export function getPerplexityConfig(
  options: MarketResearchPromptOptions = {},
) {
  const {
    suchAktualitaet = 'month',
    suchKontextGroesse = 'high',
  } = options;

  return {
    model: 'sonar-pro' as const,
    search_recency_filter: suchAktualitaet,
    web_search_options: {
      search_context_size: suchKontextGroesse,
    },
  };
}
