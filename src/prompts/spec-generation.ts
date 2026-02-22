export type SpecPromptOptions = {
  /** Detailtiefe der Leistungsbeschreibung */
  detailtiefe?: 'kurz' | 'standard' | 'erweitert';
  /** Sprachstil */
  stil?: 'formal' | 'einfach';
  /** Anzahl Hauptbereiche */
  anzahlBereiche?: number;
  /** Anzahl Unterbereiche pro Bereich */
  anzahlUnterbereiche?: [number, number];
  /** Ob Zeitplanung enthalten sein soll */
  mitZeitplanung?: boolean;
};

const DETAIL_PRESETS: Record<
  string,
  { bereiche: number; unterbereiche: string; absaetze: string }
> = {
  kurz: {
    bereiche: 2,
    unterbereiche: '1-2 Unterbereichen',
    absaetze: '1 Absatz pro Unterbereich',
  },
  standard: {
    bereiche: 3,
    unterbereiche: '2-3 Unterbereichen',
    absaetze: 'mehrere Absätze pro Unterbereich',
  },
  erweitert: {
    bereiche: 5,
    unterbereiche: '3-4 Unterbereichen',
    absaetze: 'ausführliche Absätze pro Unterbereich mit konkreten Anforderungen',
  },
};

const STIL_ANWEISUNGEN: Record<string, string> = {
  formal:
    'Kurze, aktive Sätze — fachlich präzise, aber verständlich. Verwende Fachbegriffe.',
  einfach:
    'Einfache, verständliche Sprache. Vermeide Fachbegriffe wo möglich, erkläre sie wenn nötig.',
};

export function getSpecGenerationPrompt(
  options: SpecPromptOptions = {},
): string {
  const {
    detailtiefe = 'standard',
    stil = 'formal',
    anzahlBereiche,
    anzahlUnterbereiche,
    mitZeitplanung = true,
  } = options;

  const preset = DETAIL_PRESETS[detailtiefe];
  const bereiche = anzahlBereiche ?? preset.bereiche;
  const unterbereiche = anzahlUnterbereiche
    ? `${anzahlUnterbereiche[0]}-${anzahlUnterbereiche[1]} Unterbereichen`
    : preset.unterbereiche;
  const stilAnweisung = STIL_ANWEISUNGEN[stil];

  const strukturTeile = [
    '1. Titel und Leistungstyp',
    '2. Bedarf (Ausgangssituation, Problemstellung, Bedarfsumfang)',
    '3. Ziel (Gewünschte Ergebnisse, Nutzen, Erfolgskriterien)',
    `4. Leistungsbeschreibung (${bereiche} Hauptbereiche mit je ${unterbereiche}, ${preset.absaetze})`,
  ];

  if (mitZeitplanung) {
    strukturTeile.push(
      '5. Zeitplanung (Gesamtdauer, Meilensteine mit Aktivitäten und Liefergegenständen)',
    );
  }

  const zeitplanungJson = mitZeitplanung
    ? `,
  "zeitplanung": {
    "gesamtdauer_monate": 6,
    "meilensteine": [
      {
        "phase": "Phasenname",
        "dauer_wochen": 4,
        "aktivitaeten": ["Aktivität 1"],
        "liefergegenstaende": ["Liefergegenstand 1"]
      }
    ]
  }`
    : '';

  return `Du bist ein Experte für die Erstellung von Leistungsbeschreibungen.

DEINE AUFGABE:
Erstelle eine UMFASSENDE, DETAILLIERTE Leistungsbeschreibung basierend auf dem Bedarf und ggf. der Marktrecherche.

WICHTIGE PRINZIPIEN:
1. Maximale Detailtiefe — Jeder Bereich wird in Unterbereiche gegliedert
2. Präzise, messbare und überprüfbare Formulierungen
3. Produktneutral und technologieoffen
4. ${stilAnweisung}
5. Keine Platzhalter — nur vollständige, ausformulierte Texte

STRUKTUR:
${strukturTeile.join('\n')}

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt. Kein Markdown, keine Erklärungen.

JSON-Format:
{
  "titel": "Aussagekräftiger Titel",
  "leistungstyp": "dienstleistung|lieferleistung|bauleistung|sonstige",
  "bedarf": {
    "ausgangssituation": "2-3 Absätze",
    "problemstellung": "1-2 Absätze",
    "bedarfsumfang": "Konkrete Anforderungen"
  },
  "ziel": {
    "gewuenschte_ergebnisse": "Konkrete, messbare Lieferobjekte",
    "nutzen": "Erwarteter Mehrwert",
    "erfolgskriterien": ["Kriterium 1", "Kriterium 2", "Kriterium 3"]
  },
  "leistungsbeschreibung": {
    "bereiche": [
      {
        "titel": "Bereichstitel",
        "beschreibung": "Einleitungstext",
        "unterbereiche": [
          { "titel": "Unterbereich", "inhalt": "Mehrere Absätze Fließtext" }
        ]
      }
    ]
  }${zeitplanungJson}
}`;
}
