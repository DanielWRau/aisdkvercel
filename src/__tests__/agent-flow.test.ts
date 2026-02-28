import { describe, it, expect } from 'vitest';
import { MockLanguageModelV3 } from 'ai/test';
import { ToolLoopAgent, stepCountIs, tool } from 'ai';
import { z } from 'zod';
import {
  makeGenerateResult,
  makeToolCallResult,
} from './helpers/mock-generate-result';
import { SAMPLE_PROVIDERS, SAMPLE_SPEC } from './helpers/sample-data';

/**
 * Creates test tools with mock execute functions so ToolLoopAgent
 * can actually execute them (unlike the real askQuestions which is a UI tool).
 */
function createMockTools() {
  const callOrder: string[] = [];

  const askQuestions = tool({
    description: 'Stelle Fragen',
    inputSchema: z.object({
      title: z.string(),
      questions: z.array(
        z.object({
          question: z.string(),
          options: z.array(z.string()),
          allowFreeText: z.boolean(),
          freeTextPlaceholder: z.string().optional(),
        }),
      ),
    }),
    execute: async () => {
      callOrder.push('askQuestions');
      return JSON.stringify({ answers: ['Option A'] });
    },
  });

  const marketResearch = tool({
    description: 'Marktrecherche',
    inputSchema: z.object({ query: z.string() }),
    execute: async () => {
      callOrder.push('marketResearch');
      return {
        providers: SAMPLE_PROVIDERS,
        citations: ['https://example.com'],
        searchResults: [],
        query: 'test',
      };
    },
  });

  const generateSpec = tool({
    description: 'Leistungsbeschreibung erstellen',
    inputSchema: z.object({
      anforderungen: z.string(),
      marktkontext: z.string().optional(),
    }),
    execute: async () => {
      callOrder.push('generateSpec');
      return SAMPLE_SPEC;
    },
  });

  return {
    tools: { askQuestions, marketResearch, generateSpec },
    callOrder,
  };
}

describe('Agent flow', () => {
  it('calls askQuestions first, then marketResearch, then generateSpec', async () => {
    const { tools, callOrder } = createMockTools();

    const mockModel = new MockLanguageModelV3({
      doGenerate: async (options) => {
        const toolResultMessages = options.prompt.filter(
          (m) => m.role === 'tool',
        );

        if (toolResultMessages.length === 0) {
          return makeToolCallResult('askQuestions', {
            title: 'BEDARFSERMITTLUNG',
            questions: [
              {
                question: 'Welche Art?',
                options: ['A', 'B'],
                allowFreeText: false,
              },
            ],
          });
        } else if (toolResultMessages.length === 1) {
          return makeToolCallResult('marketResearch', {
            query: 'Gebäudereinigung Berlin',
          });
        } else if (toolResultMessages.length === 2) {
          return makeToolCallResult('generateSpec', {
            anforderungen: 'Gebäudereinigung für 5000m²',
            marktkontext: 'Es gibt 3 Anbieter',
          });
        } else {
          return makeGenerateResult(
            'Hier ist Ihre Zusammenfassung mit Empfehlungen.',
          );
        }
      },
    });

    const agent = new ToolLoopAgent({
      model: mockModel,
      tools,
      instructions: 'test',
      stopWhen: stepCountIs(7),
    });

    const result = await agent.generate({
      messages: [
        { role: 'user', content: 'Ich brauche Gebäudereinigung in Berlin' },
      ],
    });

    expect(callOrder).toEqual([
      'askQuestions',
      'marketResearch',
      'generateSpec',
    ]);
    expect(result.text).toContain('Zusammenfassung');
  });

  it('stops after maxSteps even without final text', async () => {
    const { tools } = createMockTools();

    const mockModel = new MockLanguageModelV3({
      doGenerate: async () => {
        return makeToolCallResult('askQuestions', {
          title: 'TEST',
          questions: [
            {
              question: 'Q?',
              options: ['A'],
              allowFreeText: false,
            },
          ],
        });
      },
    });

    const agent = new ToolLoopAgent({
      model: mockModel,
      tools,
      instructions: 'test',
      stopWhen: stepCountIs(3),
    });

    const result = await agent.generate({
      messages: [{ role: 'user', content: 'test' }],
    });

    expect(result.steps.length).toBeLessThanOrEqual(3);
  });
});
