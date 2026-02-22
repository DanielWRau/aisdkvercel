import { describe, it, expect } from 'vitest';
import { askQuestions } from '../ask-questions';

describe('askQuestions', () => {
  describe('inputSchema', () => {
    const schema = askQuestions.inputSchema;

    it('accepts valid input with all fields', () => {
      const input = {
        title: 'BEDARFSERMITTLUNG',
        questions: [
          {
            question: 'Welche Art von Reinigung benötigen Sie?',
            options: ['Unterhaltsreinigung', 'Grundreinigung', 'Sonderreinigung'],
            allowFreeText: true,
            freeTextPlaceholder: 'Weitere Details...',
          },
        ],
      };
      const result = schema.parse(input);
      expect(result.title).toBe('BEDARFSERMITTLUNG');
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].allowFreeText).toBe(true);
    });

    it('accepts input without optional freeTextPlaceholder', () => {
      const input = {
        title: 'TEST',
        questions: [
          {
            question: 'Frage 1',
            options: ['A', 'B'],
            allowFreeText: false,
          },
        ],
      };
      const result = schema.parse(input);
      expect(result.questions[0].freeTextPlaceholder).toBeUndefined();
    });

    it('rejects input with missing title', () => {
      const input = {
        questions: [
          {
            question: 'Frage 1',
            options: ['A'],
            allowFreeText: false,
          },
        ],
      };
      expect(() => schema.parse(input)).toThrow();
    });

    it('rejects input with missing questions array', () => {
      const input = { title: 'TEST' };
      expect(() => schema.parse(input)).toThrow();
    });

    it('rejects question with missing required fields', () => {
      const input = {
        title: 'TEST',
        questions: [{ question: 'Frage 1' }],
      };
      expect(() => schema.parse(input)).toThrow();
    });

    it('accepts multiple questions', () => {
      const input = {
        title: 'Fragebogen',
        questions: [
          { question: 'Q1', options: ['A', 'B'], allowFreeText: false },
          { question: 'Q2', options: ['C', 'D'], allowFreeText: true },
          { question: 'Q3', options: ['E'], allowFreeText: false },
        ],
      };
      const result = schema.parse(input);
      expect(result.questions).toHaveLength(3);
    });
  });
});
