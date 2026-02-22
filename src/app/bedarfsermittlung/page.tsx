'use client';

import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai';
import { useState } from 'react';
import Markdown from 'react-markdown';
import { tools, type ChatMessage } from '@/tools/index';
import { QuestionWizard } from '@/components/QuestionWizard';
import { MarketResearchResults } from '@/components/MarketResearchResults';
import { SpecDocument } from '@/components/SpecDocument';

type AnswerItem = {
  question: string;
  selectedOptions: string[];
  freeText?: string;
};

export default function Bedarfsermittlung() {
  const [topic, setTopic] = useState('');
  const [started, setStarted] = useState(false);

  const { messages, sendMessage, addToolOutput, status } =
    useChat<ChatMessage>({
      transport: new DefaultChatTransport({ api: '/api/chat' }),
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    });

  const isLoading = status === 'submitted' || status === 'streaming';

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setStarted(true);
    sendMessage({ text: topic });
  };

  // --- Typisierte Tool-Parts sammeln ---
  type QuestionPart = Extract<
    ChatMessage['parts'][number],
    { type: 'tool-askQuestions' }
  >;
  type ResearchPart = Extract<
    ChatMessage['parts'][number],
    { type: 'tool-marketResearch' }
  >;
  type SpecPart = Extract<
    ChatMessage['parts'][number],
    { type: 'tool-generateSpec' }
  >;

  const questionParts: QuestionPart[] = [];
  const researchParts: ResearchPart[] = [];
  const specParts: SpecPart[] = [];

  for (const message of messages) {
    if (message.role !== 'assistant') continue;
    for (const part of message.parts) {
      if (part.type === 'tool-askQuestions') {
        questionParts.push(part);
      } else if (part.type === 'tool-marketResearch') {
        researchParts.push(part);
      } else if (part.type === 'tool-generateSpec') {
        specParts.push(part);
      }
    }
  }

  const activeWizard = questionParts.find(p => p.state === 'input-available');
  const streamingWizard = questionParts.find(p => p.state === 'input-streaming');
  const completedWizards = questionParts.filter(p => p.state === 'output-available');

  const activeResearch = researchParts.find(
    p => p.state === 'input-streaming' || p.state === 'input-available',
  );
  const completedResearch = researchParts.filter(p => p.state === 'output-available');

  const activeSpec = specParts.find(
    p => p.state === 'input-streaming' || p.state === 'input-available',
  );
  const completedSpecs = specParts.filter(p => p.state === 'output-available');

  // Alle beantworteten Fragen zusammenführen
  const allAnswers: AnswerItem[] = [];
  for (const wp of completedWizards) {
    try {
      const items: AnswerItem[] = JSON.parse(wp.output);
      for (const item of items) {
        if (item.selectedOptions?.length > 0 || item.freeText) {
          allAnswers.push(item);
        }
      }
    } catch {
      /* ignore */
    }
  }

  // Finaler Text: Nur aus Assistant-Nachrichten OHNE Tool-Calls
  let finalText = '';
  for (const message of messages) {
    if (message.role !== 'assistant') continue;
    const hasToolCall = message.parts.some(
      p => p.type === 'tool-askQuestions' || p.type === 'tool-marketResearch' || p.type === 'tool-generateSpec',
    );
    if (hasToolCall) continue;

    const text = message.parts
      .filter((p): p is Extract<typeof p, { type: 'text' }> =>
        p.type === 'text' && !!p.text.trim(),
      )
      .map(p => p.text)
      .join('\n\n');
    if (text) finalText = text;
  }

  // --- Landing Page ---
  if (!started) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-lg text-center space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Bedarfsermittlung</h1>
            <p className="text-gray-500">
              Beschreiben Sie Ihr Anliegen und wir stellen Ihnen die richtigen
              Fragen.
            </p>
          </div>

          <form onSubmit={handleStart} className="space-y-4">
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="z.B. Ich brauche ein Angebot für Gartenpflege"
              className="w-full p-4 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!topic.trim()}
              className="w-full py-3 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Starten
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Wizard-Ansicht ---
  return (
    <div className="w-full max-w-2xl mx-auto min-h-screen py-12 px-4 space-y-6">
      {/* Gesamtübersicht aller bisherigen Antworten */}
      {allAnswers.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">
              Ihre Angaben
            </p>
            <p className="text-sm text-gray-400">
              {allAnswers.length}{' '}
              {allAnswers.length === 1 ? 'Frage' : 'Fragen'} beantwortet
            </p>
          </div>
          {allAnswers.map((item, i) => (
            <div key={i} className="text-sm">
              <span className="text-gray-500">{item.question}</span>
              <br />
              <span className="font-medium">
                {item.selectedOptions?.join(', ')}
                {item.freeText ? ` — ${item.freeText}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Ladezustand */}
      {(streamingWizard || (isLoading && !activeWizard && !activeResearch && !activeSpec)) && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center animate-pulse">
          <p className="text-gray-400 text-lg">
            {streamingWizard
              ? 'Fragebogen wird erstellt...'
              : 'Antworten werden ausgewertet...'}
          </p>
        </div>
      )}

      {/* Aktiver Wizard */}
      {activeWizard && (
        <QuestionWizard
          key={activeWizard.toolCallId}
          title={activeWizard.input.title}
          questions={activeWizard.input.questions}
          onSubmit={result => {
            addToolOutput({
              tool: 'askQuestions',
              toolCallId: activeWizard.toolCallId,
              output: result,
            });
          }}
        />
      )}

      {/* Marktrecherche läuft */}
      {activeResearch && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center animate-pulse">
          <p className="text-gray-400 text-lg">
            Marktrecherche läuft...
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Suche nach: &ldquo;{activeResearch.state === 'input-available' ? activeResearch.input.query : '...'}&rdquo;
          </p>
        </div>
      )}

      {/* Marktrecherche-Ergebnisse */}
      {completedResearch.map(rp => (
        <MarketResearchResults key={rp.toolCallId} result={rp.output} />
      ))}

      {/* Leistungsbeschreibung läuft */}
      {activeSpec && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center animate-pulse">
          <p className="text-gray-400 text-lg">
            Leistungsbeschreibung wird erstellt...
          </p>
        </div>
      )}

      {/* Leistungsbeschreibung-Ergebnisse */}
      {completedSpecs.map(sp => (
        <SpecDocument key={sp.toolCallId} result={sp.output} />
      ))}

      {/* Error-State */}
      {[...questionParts, ...researchParts, ...specParts].some(p => p.state === 'output-error') && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <p className="text-red-600 dark:text-red-400">
            Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.
          </p>
        </div>
      )}

      {/* Finales Ergebnis */}
      {finalText && !activeWizard && !isLoading && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4">
          <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">
            Ergebnis
          </p>
          <div className="prose dark:prose-invert max-w-none">
            <Markdown>{finalText}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
}
