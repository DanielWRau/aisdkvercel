import { tool } from 'ai';
import { z } from 'zod';

export const askQuestions = tool({
  description:
    'Stelle dem Benutzer mehrere Fragen auf einmal als strukturierten Fragebogen mit Fortschrittsanzeige.',
  outputSchema: z.string().describe('JSON-String mit den Benutzerantworten'),
  inputSchema: z.object({
    title: z
      .string()
      .describe('Titel des Fragebogens, z.B. BEDARFSERMITTLUNG'),
    questions: z.array(
      z.object({
        question: z.string().describe('Die Frage'),
        options: z
          .array(z.string())
          .describe('Antwortmöglichkeiten zur Auswahl'),
        allowFreeText: z
          .boolean()
          .describe('Ob ein Freitextfeld angezeigt werden soll'),
        freeTextPlaceholder: z
          .string()
          .optional()
          .describe('Placeholder-Text für das Freitextfeld'),
      }),
    ),
  }),
});
