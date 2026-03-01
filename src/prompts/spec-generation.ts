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
  /** Benutzerdefinierte Gliederung — ersetzt die Standard-Struktur im Prompt */
  gliederung?: string[];
};

const DETAIL_PRESETS: Record<
  string,
  { bereiche: number; unterbereiche: string; absaetze: string }
> = {
  kurz: {
    bereiche: 2,
    unterbereiche: '1-2 Unterbereichen',
    absaetze: '1-2 Sätze pro Unterbereich',
  },
  standard: {
    bereiche: 3,
    unterbereiche: '2-3 Unterbereichen',
    absaetze: '1 kurzer Absatz pro Unterbereich (3-5 Sätze)',
  },
  erweitert: {
    bereiche: 5,
    unterbereiche: '3-4 Unterbereichen',
    absaetze: '1-2 Absätze pro Unterbereich mit konkreten Anforderungen',
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
    gliederung,
  } = options;

  const preset = DETAIL_PRESETS[detailtiefe];
  const bereiche = anzahlBereiche ?? preset.bereiche;
  const unterbereiche = anzahlUnterbereiche
    ? `${anzahlUnterbereiche[0]}-${anzahlUnterbereiche[1]} Unterbereichen`
    : preset.unterbereiche;
  const stilAnweisung = STIL_ANWEISUNGEN[stil];

  const hasCustomGliederung = gliederung && gliederung.length > 0;

  // Benutzerdefinierte Gliederung hat Vorrang
  let strukturTeile: string[];
  if (hasCustomGliederung) {
    strukturTeile = [...gliederung];
  } else {
    strukturTeile = [
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

  // When custom gliederung is provided, add explicit mapping instruction
  const gliederungAnweisung = hasCustomGliederung
    ? `\nWICHTIG — BENUTZERDEFINIERTE GLIEDERUNG:
Erstelle für JEDEN der ${gliederung.length} Gliederungspunkte oben EXAKT einen Bereich in "leistungsbeschreibung.bereiche".
Der "titel" jedes Bereichs muss dem jeweiligen Gliederungspunkt entsprechen.
Die Unterbereiche sollen die in Klammern genannten Aspekte abdecken.
Weiche NICHT von der vorgegebenen Gliederung ab — keine Punkte weglassen, keine hinzufügen.`
    : '';

  return `Du bist ein Experte für die Erstellung von Leistungsbeschreibungen.

DEINE AUFGABE:
Erstelle eine KOMPAKTE Leistungsbeschreibung basierend auf dem Bedarf und ggf. der Marktrecherche.

WICHTIGE PRINZIPIEN:
1. KÜRZE — Jeder Abschnitt auf das Wesentliche beschränkt, keine Wiederholungen
2. Präzise, messbare und überprüfbare Formulierungen
3. Produktneutral und technologieoffen
4. ${stilAnweisung}
5. Keine Platzhalter — nur vollständige, ausformulierte Texte

STRUKTUR:
${strukturTeile.join('\n')}
${gliederungAnweisung}
Antworte AUSSCHLIESSLICH mit einem JSON-Objekt. Kein Markdown, keine Erklärungen.

JSON-Format:
{
  "titel": "Aussagekräftiger Titel",
  "leistungstyp": "dienstleistung|lieferleistung|bauleistung|sonstige",
  "bedarf": {
    "ausgangssituation": "2-3 Sätze",
    "problemstellung": "2-3 Sätze",
    "bedarfsumfang": "Stichpunktartig, konkret"
  },
  "ziel": {
    "gewuenschte_ergebnisse": "Konkrete, messbare Lieferobjekte (2-3 Sätze)",
    "nutzen": "Erwarteter Mehrwert (1-2 Sätze)",
    "erfolgskriterien": ["Kriterium 1", "Kriterium 2", "Kriterium 3"]
  },
  "leistungsbeschreibung": {
    "bereiche": [
      {
        "titel": "Bereichstitel",
        "beschreibung": "1 Satz Einleitung",
        "unterbereiche": [
          { "titel": "Unterbereich", "inhalt": "Kurzer Fließtext (${preset.absaetze})" }
        ]
      }
    ]
  }${zeitplanungJson}
}`;
}
