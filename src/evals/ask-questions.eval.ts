import { describe, it, expect } from 'vitest';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { askQuestions } from '@/tools/ask-questions';
import {
  minItems,
  weightedAverage,
  formatScore,
} from './helpers/scoring';

const questionSchema = z.object({
  title: z.string().min(1),
  questions: z
    .array(
      z.object({
        question: z.string().min(5),
        options: z.array(z.string()).min(2),
        allowFreeText: z.boolean(),
        freeTextPlaceholder: z.string().optional(),
      }),
    )
    .min(3),
});

function scoreToolCall(args: unknown) {
  const parsed = questionSchema.safeParse(args);
  if (!parsed.success) {
    return { overall: 0, schemaValid: 0, questionCount: 0, optionQuality: 0, hasFreeText: 0 };
  }

  const data = parsed.data;
  const schemaScore = 1.0;
  const questionCount = minItems(data.questions, 4);

  // Check that questions have good options
  const optionQuality =
    data.questions.reduce((sum, q) => {
      const optScore = minItems(q.options, 3);
      return sum + optScore;
    }, 0) / data.questions.length;

  // Check if at least one question allows free text
  const hasFreeText = data.questions.some((q) => q.allowFreeText) ? 1.0 : 0.5;

  const overall = weightedAverage([
    { score: schemaScore, weight: 3 },
    { score: questionCount, weight: 2 },
    { score: optionQuality, weight: 2 },
    { score: hasFreeText, weight: 1 },
  ]);

  return {
    overall,
    schemaValid: schemaScore,
    questionCount,
    optionQuality,
    hasFreeText,
  };
}

const TEST_CASES = [
  {
    name: 'Gartenpflege',
    topic: 'Ich brauche einen Dienstleister für die Pflege unserer Außenanlagen.',
  },
  {
    name: 'IT-Sicherheit',
    topic: 'Wir möchten unsere IT-Infrastruktur auf Sicherheitslücken prüfen lassen.',
  },
  {
    name: 'Gebäudereinigung',
    topic: 'Wir suchen einen neuen Anbieter für die Reinigung unserer Bürogebäude.',
  },
];

describe('Ask Questions Evals', () => {
  for (const tc of TEST_CASES) {
    it(`${tc.name}: generiert guten Fragebogen`, async () => {
      const result = await generateText({
        model: anthropic('claude-haiku-4-5-20251001'),
        tools: { askQuestions },
        toolChoice: { type: 'tool', toolName: 'askQuestions' },
        prompt: tc.topic,
        system:
          'Du bist ein Assistent für Bedarfsermittlung. Stelle dem Benutzer strukturierte Fragen als Fragebogen mit askQuestions. Stelle mindestens 4 Fragen mit je mindestens 3 Optionen. Mindestens eine Frage sollte Freitexteingabe erlauben.',
      });

      const toolCall = result.toolCalls[0];
      expect(toolCall).toBeDefined();
      expect(toolCall.toolName).toBe('askQuestions');

      const scores = scoreToolCall('input' in toolCall ? toolCall.input : undefined);
      console.log(
        formatScore(tc.name, scores.overall, {
          schema: scores.schemaValid,
          questions: scores.questionCount,
          options: scores.optionQuality,
          freeText: scores.hasFreeText,
        }),
      );

      expect(scores.overall).toBeGreaterThanOrEqual(0.6);
    });
  }
});
