export type MarketResearchPromptOptions = {
  /** Welche Infos pro Anbieter gesammelt werden sollen */
  anbieterFelder?: (
    | 'name'
    | 'beschreibung'
    | 'website'
    | 'email'
    | 'telefon'
    | 'adresse'
    | 'stadt'
    | 'staerken'
    | 'groesse'
    | 'reichweite'
    | 'spezialisierung'
    | 'region'
    | 'mitarbeiteranzahl'
    | 'zertifizierungen'
  )[];
  /** Aktualitätsfilter für die Perplexity-Suche */
  suchAktualitaet?: 'day' | 'week' | 'month' | 'year';
  /** Suchtiefe für Perplexity */
  suchKontextGroesse?: 'low' | 'medium' | 'high';
  /** Regionale Einschränkung, z.B. "NRW", "Bayern" */
  region?: string;
  /** Bevorzugte Unternehmensgröße */
  groessenPraeferenz?: 'klein' | 'mittel' | 'gross' | 'alle';
};

const DEFAULT_FELDER = [
  'name',
  'beschreibung',
  'website',
  'email',
  'telefon',
  'adresse',
  'stadt',
  'staerken',
  'groesse',
  'reichweite',
  'spezialisierung',
  'region',
  'mitarbeiteranzahl',
  'zertifizierungen',
] as const;

const FELD_BESCHREIBUNGEN: Record<string, string> = {
  name: 'Vollständiger Firmenname',
  beschreibung: 'Kurzbeschreibung der Leistungen',
  website: 'Website-URL',
  email: 'E-Mail-Adresse (aus Impressum oder Kontaktseite)',
  telefon: 'Telefonnummer (aus Impressum oder Kontaktseite)',
  adresse: 'Straße und Hausnummer',
  stadt: 'PLZ und Stadt',
  staerken: 'Stärken und Alleinstellungsmerkmale',
  groesse: 'Unternehmensgröße: "klein" (<50 MA), "mittel" (50-500 MA), "gross" (>500 MA)',
  reichweite: 'Geografische Reichweite: "lokal", "regional", "ueberregional", "bundesweit"',
  spezialisierung: 'Fachliche Spezialisierung (Freitext)',
  region: 'Bundesland des Hauptsitzes (z.B. "NRW", "Bayern")',
  mitarbeiteranzahl: 'Geschätzte Mitarbeiterzahl (z.B. "ca. 200")',
  zertifizierungen: 'Zertifizierungen (falls verfügbar)',
};

export function getMarketResearchPrompt(
  options: MarketResearchPromptOptions = {},
): string {
  const {
    anbieterFelder = [...DEFAULT_FELDER],
    region,
    groessenPraeferenz,
  } = options;

  const felderListe = anbieterFelder
    .map(f => `- ${FELD_BESCHREIBUNGEN[f]}`)
    .join('\n');

  let regionBlock = '';
  if (region) {
    regionBlock = `\n**REGIONALE EINSCHRÄNKUNG:**
Suche bevorzugt nach Anbietern aus der Region: ${region}
Mindestens die Hälfte der Anbieter sollte ihren Hauptsitz in oder in der Nähe von ${region} haben.\n`;
  }

  let groessenBlock = '';
  if (groessenPraeferenz && groessenPraeferenz !== 'alle') {
    const labels: Record<string, string> = {
      klein: 'kleine Unternehmen (<50 Mitarbeiter)',
      mittel: 'mittelständische Unternehmen (50-500 Mitarbeiter)',
      gross: 'große Unternehmen (>500 Mitarbeiter)',
    };
    groessenBlock = `\n**GRÖSSENPRÄFERENZ:**
Bevorzuge ${labels[groessenPraeferenz]}. Die Mehrheit der Anbieter sollte dieser Größenklasse entsprechen.\n`;
  }

  return `Du bist ein Experte für Marktrecherche und Anbieteridentifikation.

Suche nach Unternehmen/Anbietern/Dienstleistern für die angegebene Suchanfrage.

**FÜR JEDEN ANBIETER SAMMLE:**
${felderListe}

**UNTERNEHMENSGRÖSSE — KLASSIFIKATION:**
Ordne jeden Anbieter einer Größenklasse zu:
- "klein": Unter 50 Mitarbeiter
- "mittel": 50 bis 500 Mitarbeiter
- "gross": Über 500 Mitarbeiter

**REICHWEITE — KLASSIFIKATION:**
Ordne jeden Anbieter nach geografischer Reichweite ein:
- "lokal": Nur in einer Stadt/einem Landkreis aktiv
- "regional": In einem Bundesland oder einer Region aktiv
- "ueberregional": In mehreren Bundesländern aktiv
- "bundesweit": Deutschlandweit aktiv

**SPEZIALISIERUNG:**
Beschreibe die fachliche Spezialisierung des Anbieters als Freitext (z.B. "Industriereinigung", "IT-Security für KMU").
${regionBlock}${groessenBlock}
**KONTAKTDATEN — HÖCHSTE PRIORITÄT:**
Für JEDEN Anbieter MUSST du die Kontaktdaten recherchieren:
1. Öffne die Website des Anbieters und suche nach Impressum, Kontakt oder "Über uns"
2. E-Mail: Suche nach info@, kontakt@, office@ oder der E-Mail im Impressum. Fast jede deutsche Firma hat eine E-Mail im Impressum (§5 TMG Pflicht)
3. Telefon: Steht immer im Impressum oder auf der Kontaktseite. Format: +49 XXX XXXXXXX
4. Adresse + Stadt: Straße, Hausnummer, PLZ und Ort aus dem Impressum
5. Wenn trotz Suche nicht auffindbar → null setzen (NICHT weglassen, NICHT erfinden)

**QUALITÄTSKRITERIEN:**
- Nur reale, existierende Unternehmen
- Aktuelle, vertrauenswürdige Quellen
- Keine erfundenen Informationen — lieber null als geraten

WICHTIG: Antworte AUSSCHLIESSLICH mit einem JSON-Array. Kein Markdown, keine Erklärungen.
Beginne direkt mit [ und ende mit ]

Format:
[
  {
    "name": "Firmenname GmbH",
    "description": "Kurzbeschreibung der Leistungen",
    "website": "https://www.example.de",
    "email": "info@example.de",
    "phone": "+49 30 123456",
    "address": "Musterstraße 1",
    "city": "12345 Berlin",
    "strengths": ["Stärke 1", "Stärke 2"],
    "groesse": "mittel",
    "reichweite": "regional",
    "spezialisierung": "Gebäudereinigung für Gewerbeimmobilien",
    "region": "Berlin",
    "mitarbeiteranzahl": "ca. 200",
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
