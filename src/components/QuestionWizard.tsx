'use client';

import { useState } from 'react';

type QuestionAnswer = {
  selectedOptions: string[];
  freeText: string;
};

export type Question = {
  question: string;
  options: string[];
  allowFreeText: boolean;
  freeTextPlaceholder?: string;
};

export function QuestionWizard({
  title,
  questions,
  onSubmit,
}: {
  title: string;
  questions: Question[];
  onSubmit: (result: string) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuestionAnswer[]>(
    questions.map(() => ({ selectedOptions: [], freeText: '' })),
  );

  const total = questions.length;
  const current = questions[currentIndex];
  const currentAnswer = answers[currentIndex];
  const answeredCount = answers.filter(
    a => a.selectedOptions.length > 0 || a.freeText.trim(),
  ).length;

  const toggleOption = (option: string) => {
    setAnswers(prev => {
      const updated = [...prev];
      const cur = updated[currentIndex];
      updated[currentIndex] = {
        ...cur,
        selectedOptions: cur.selectedOptions.includes(option)
          ? cur.selectedOptions.filter(s => s !== option)
          : [...cur.selectedOptions, option],
      };
      return updated;
    });
  };

  const setFreeText = (text: string) => {
    setAnswers(prev => {
      const updated = [...prev];
      updated[currentIndex] = { ...updated[currentIndex], freeText: text };
      return updated;
    });
  };

  const isLast = currentIndex === total - 1;
  const anyAnswered = answers.some(
    a => a.selectedOptions.length > 0 || a.freeText.trim(),
  );

  const handleSubmit = () => {
    onSubmit(
      JSON.stringify(
        answers.map((a, i) => ({
          question: questions[i].question,
          selectedOptions: a.selectedOptions,
          freeText: a.freeText || undefined,
        })),
      ),
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-6 pt-5 pb-2">
        <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">
          {title}
        </span>
        <span className="text-sm text-gray-400">
          {answeredCount}/{total} beantwortet
        </span>
      </div>

      {/* Progress Bar */}
      <div className="px-6 pb-4">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 flex gap-0.5">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full flex-1 transition-colors ${
                i < answeredCount
                  ? 'bg-blue-500'
                  : i === currentIndex
                    ? 'bg-blue-300'
                    : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question */}
      <div className="px-6 pb-6 space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Frage {currentIndex + 1} von {total}
        </p>
        <p className="font-semibold text-lg">{current.question}</p>

        <div className="space-y-3">
          {current.options.map(option => (
            <label
              key={option}
              className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <input
                type="checkbox"
                checked={currentAnswer.selectedOptions.includes(option)}
                onChange={() => toggleOption(option)}
                className="w-5 h-5 rounded border-gray-300"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>

        {current.allowFreeText && (
          <textarea
            placeholder={current.freeTextPlaceholder || 'Weitere Angaben...'}
            value={currentAnswer.freeText}
            onChange={e => setFreeText(e.target.value)}
            className="w-full p-3 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 rounded-lg resize-none"
            rows={3}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={() => setCurrentIndex(i => i - 1)}
          disabled={currentIndex === 0}
          className="text-sm text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
        >
          ‹ Zurück
        </button>
        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={!anyAnswered}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
          >
            Absenden ›
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex(i => i + 1)}
            className="text-sm font-semibold text-blue-600 hover:text-blue-500 flex items-center gap-1"
          >
            Weiter ›
          </button>
        )}
      </div>
    </div>
  );
}
