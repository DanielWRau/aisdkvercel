import { streamText, UIMessage, convertToModelMessages, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { tools } from '@/tools/index';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system: `Du bist ein hilfreicher Assistent für Bedarfsermittlung.

Wenn du Informationen vom Benutzer brauchst, nutze das askQuestions-Tool.
Schicke ALLE zusammengehörigen Fragen in EINEM Tool-Aufruf als Fragebogen.

WICHTIG: Rufe das Tool DIREKT auf, schreibe KEINEN Text davor. Kein "Ich helfe dir gerne", kein "Lass mich fragen" — einfach direkt das Tool aufrufen.

Vorgehen:
1. Analysiere das Anliegen und rufe sofort das askQuestions-Tool auf mit allen grundlegenden Fragen.
2. Nachdem der Benutzer geantwortet hat, analysiere die Antworten.
3. Falls Vertiefungsfragen nötig sind, rufe das Tool erneut auf — aber nur mit Fragen, die sich aus den bisherigen Antworten ergeben. Auch hier KEIN Text davor.
4. Stelle keine Fragen, die durch bereits gegebene Antworten überflüssig sind.
5. Erst wenn du ALLE Informationen hast und KEINE weiteren Fragen mehr nötig sind, schreibe eine ausführliche Zusammenfassung und Empfehlung als Text.`,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
