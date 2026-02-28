import { getKnowledgeChatPrompt } from './knowledge-chat'

export type Fragenstil = 'standard' | 'technisch' | 'einfach' | 'it-fokus' | 'kaufmaennisch' | 'vergabeverfahren';

export type SystemPromptOptions = {
  /** Chat-Modus: workflow (Bedarfsermittlung) oder knowledge (Dokumenten-Q&A) */
  mode?: 'workflow' | 'knowledge';
  /** Welche Tools verfügbar sind */
  tools?: ('askQuestions' | 'marketResearch' | 'generateSpec' | 'knowledgeSearch' | 'saveDocument')[];
  /** Ob der Assistent Text vor Tool-Aufrufen vermeiden soll */
  directToolCalls?: boolean;
  /** Maximale Anzahl an Fragebogen-Runden bevor Recherche startet */
  maxFrageRunden?: number;
  /** Stil der Rückfragen in der Bedarfsanalyse */
  fragenstil?: Fragenstil;
};

const FRAGENSTIL_ANWEISUNGEN: Record<Fragenstil, string> = {
  standard: 'Ausgewogener Mix aus fachlichen und technischen Fragen.',
  technisch: 'Tiefgehende technische Fragen (Schnittstellen, Protokolle, Architektur, Performance).',
  einfach: 'Allgemeinverständliche Fragen, keine Fachbegriffe, für fachfremde Entscheider.',
  'it-fokus': 'IT-spezifische Fragen (Software, Hardware, Cloud, Netzwerk, Sicherheit).',
  kaufmaennisch: 'Wirtschaftliche Fragen (Budget, Kosten, Vertragsmodelle, Laufzeiten, ROI).',
  vergabeverfahren: 'Fragen zum Vergabeverfahren (Lose, Eignungskriterien, Zuschlagskriterien, Fristen).',
};

const TOOL_DESCRIPTIONS: Record<string, string> = {
  askQuestions:
    'askQuestions: Stelle dem Benutzer strukturierte Fragen mit Antwortmöglichkeiten.',
  marketResearch:
    'marketResearch: Führe eine Marktrecherche mit Perplexity durch, um Anbieter zu finden. Unterstützt optionale Filterung nach Region (z.B. "NRW", "Bayern") und Unternehmensgröße (klein/mittel/gross).',
  generateSpec:
    'generateSpec: Erstelle eine detaillierte Leistungsbeschreibung basierend auf den gesammelten Anforderungen und der Marktrecherche. Unterstützt optionale Parameter: detailtiefe (kurz/standard/erweitert), stil (formal/einfach), mitZeitplanung (true/false).',
  knowledgeSearch:
    'knowledgeSearch: Durchsuche die Wissensbasis des Projekts nach relevanten Informationen aus hochgeladenen Dokumenten, Marktrecherchen und Leistungsbeschreibungen. Nutze dieses Tool, wenn der Benutzer nach Inhalten aus seinen Dokumenten fragt.',
  saveDocument:
    'saveDocument: Speichere ein vom Assistenten erstelltes Dokument (z.B. Angebotsanfrage, Zusammenfassung, Vertragsentwurf) als Projektdokument. Nutze dieses Tool immer, wenn du ein Dokument für den Benutzer geschrieben hast.',
};

export function getSystemPrompt(options: SystemPromptOptions = {}): string {
  // Delegate to knowledge prompt for knowledge mode
  if (options.mode === 'knowledge') {
    return getKnowledgeChatPrompt()
  }

  const {
    tools = ['askQuestions', 'marketResearch', 'generateSpec', 'knowledgeSearch', 'saveDocument'],
    directToolCalls = true,
    maxFrageRunden = 2,
    fragenstil = 'standard',
  } = options;

  const toolList = tools.map(t => `- ${TOOL_DESCRIPTIONS[t]}`).join('\n');

  const fragenstilAnweisung = FRAGENSTIL_ANWEISUNGEN[fragenstil];

  const steps: string[] = [
    `1. Analysiere das Anliegen und rufe sofort askQuestions auf mit allen grundlegenden Fragen. Stelle Fragen im folgenden Stil: ${fragenstilAnweisung}`,
    `2. Nachdem der Benutzer geantwortet hat, analysiere die Antworten.${maxFrageRunden > 1 ? ` Falls Vertiefungsfragen nötig sind, rufe askQuestions erneut auf (maximal ${maxFrageRunden} Runden).` : ''}`,
  ];

  if (tools.includes('marketResearch')) {
    steps.push(
      `${steps.length + 1}. Rufe marketResearch NUR auf, wenn der Benutzer dich EXPLIZIT darum bittet (z.B. "Führe eine Marktrecherche durch"). Rufe es NIEMALS automatisch auf.`,
    );
  }

  if (tools.includes('generateSpec')) {
    steps.push(
      `${steps.length + 1}. Rufe generateSpec NUR auf, wenn der Benutzer dich EXPLIZIT darum bittet (z.B. "Erstelle eine Leistungsbeschreibung"). Rufe es NIEMALS automatisch auf.`,
    );
  }

  if (tools.includes('knowledgeSearch')) {
    steps.push(
      `${steps.length + 1}. Wenn der Benutzer nach Inhalten aus seinen Dokumenten fragt, nutze knowledgeSearch um relevante Informationen zu finden. Das Tool durchsucht automatisch alle hochgeladenen Dokumente, Marktrecherchen und Leistungsbeschreibungen des Projekts.`,
    );
  }

  if (tools.includes('saveDocument')) {
    steps.push(
      `${steps.length + 1}. Wenn du ein Dokument für den Benutzer erstellst (Angebotsanfrage, Zusammenfassung, Vertragsentwurf etc.), nutze saveDocument um es als Projektdokument zu speichern. Schreibe Dokumente KURZ und PRÄGNANT (max 2-3 Seiten). Keine übermäßigen Checklisten, Wiederholungen oder Fülltext.`,
    );
  }

  if (tools.includes('marketResearch') || tools.includes('generateSpec')) {
    steps.push(
      `${steps.length + 1}. Nach abgeschlossener Marktrecherche oder Leistungsbeschreibung, schreibe eine kurze Zusammenfassung.`,
    );
  }

  const directCallRule = directToolCalls
    ? `\nWICHTIG: Rufe Tools DIREKT auf, schreibe KEINEN Text davor. Kein "Ich helfe dir gerne", kein "Lass mich fragen" — einfach direkt das Tool aufrufen.`
    : '';

  return `Du bist ein hilfreicher Assistent für Bedarfsermittlung, Marktrecherche und Leistungsbeschreibungen.

Du hast ${tools.length === 1 ? 'ein Tool' : `${tools.length} Tools`}:
${toolList}
${directCallRule}

WICHTIG: Rufe marketResearch und generateSpec NIEMALS von dir aus auf.
Warte IMMER auf eine explizite Benutzeranfrage.
Nach der Beantwortung ALLER Fragerunden, schreibe eine kurze Zusammenfassung
der Anforderungen als Fließtext (2-3 Sätze). Beginne direkt mit dem Inhalt.
KEINE Überschriften wie "Zusammenfassung der Anforderungen:".
KEINE "Nächste Schritte" oder Handlungsempfehlungen anfügen.
KEINE Anzahl der Fragen erwähnen.

Vorgehen:
${steps.join('\n')}`;
}
