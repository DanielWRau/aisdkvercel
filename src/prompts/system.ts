export type SystemPromptOptions = {
  /** Welche Tools verfügbar sind */
  tools?: ('askQuestions' | 'marketResearch' | 'generateSpec')[];
  /** Ob der Assistent Text vor Tool-Aufrufen vermeiden soll */
  directToolCalls?: boolean;
  /** Maximale Anzahl an Fragebogen-Runden bevor Recherche startet */
  maxFrageRunden?: number;
  /** Ob die Leistungsbeschreibung automatisch erstellt werden soll */
  autoGenerateSpec?: boolean;
};

const TOOL_DESCRIPTIONS: Record<string, string> = {
  askQuestions:
    'askQuestions: Stelle dem Benutzer strukturierte Fragen mit Antwortmöglichkeiten.',
  marketResearch:
    'marketResearch: Führe eine Marktrecherche mit Perplexity durch, um Anbieter zu finden. Unterstützt optionale Filterung nach Region (z.B. "NRW", "Bayern") und Unternehmensgröße (klein/mittel/gross).',
  generateSpec:
    'generateSpec: Erstelle eine detaillierte Leistungsbeschreibung basierend auf den gesammelten Anforderungen und der Marktrecherche.',
};

export function getSystemPrompt(options: SystemPromptOptions = {}): string {
  const {
    tools = ['askQuestions', 'marketResearch', 'generateSpec'],
    directToolCalls = true,
    maxFrageRunden = 2,
    autoGenerateSpec = true,
  } = options;

  const toolList = tools.map(t => `- ${TOOL_DESCRIPTIONS[t]}`).join('\n');

  const steps: string[] = [
    '1. Analysiere das Anliegen und rufe sofort askQuestions auf mit allen grundlegenden Fragen.',
    '2. Nachdem der Benutzer geantwortet hat, analysiere die Antworten.',
  ];

  if (maxFrageRunden > 1) {
    steps.push(
      `3. Falls Vertiefungsfragen nötig sind, rufe askQuestions erneut auf (maximal ${maxFrageRunden} Runden).`,
    );
  }

  if (tools.includes('marketResearch')) {
    steps.push(
      `${steps.length + 1}. Wenn du genug Informationen hast, formuliere eine präzise Suchanfrage und rufe marketResearch auf.`,
    );
  }

  if (tools.includes('generateSpec') && autoGenerateSpec) {
    steps.push(
      `${steps.length + 1}. Nachdem die Marktrecherche abgeschlossen ist, fasse alle Anforderungen und den Marktkontext zusammen und rufe generateSpec auf.`,
    );
  }

  steps.push(
    `${steps.length + 1}. Schreibe eine kurze Zusammenfassung mit Empfehlungen.`,
  );

  const directCallRule = directToolCalls
    ? `\nWICHTIG: Rufe Tools DIREKT auf, schreibe KEINEN Text davor. Kein "Ich helfe dir gerne", kein "Lass mich fragen" — einfach direkt das Tool aufrufen.`
    : '';

  return `Du bist ein hilfreicher Assistent für Bedarfsermittlung, Marktrecherche und Leistungsbeschreibungen.

Du hast ${tools.length === 1 ? 'ein Tool' : `${tools.length} Tools`}:
${toolList}
${directCallRule}

Vorgehen:
${steps.join('\n')}`;
}
