'use client';

import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai';
import { useState } from 'react';
import { tools, type ChatMessage } from '@/tools/index';
import { QuestionWizard } from '@/components/QuestionWizard';
import { MarketResearchResults } from '@/components/MarketResearchResults';
import { SpecDocument } from '@/components/SpecDocument';

export default function Chat() {
  const [input, setInput] = useState('');

  const { messages, sendMessage, addToolOutput, status } =
    useChat<ChatMessage>({
      transport: new DefaultChatTransport({ api: '/api/chat' }),
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    });

  const isLoading = status === 'submitted' || status === 'streaming';

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto min-h-screen py-12 px-4">
      <h1 className="text-2xl font-bold mb-8 text-center">
        AI Chat mit Claude
      </h1>

      <div className="flex-1 space-y-4 mb-4">
        {messages.map(message => (
          <div
            key={message.id}
            className={`p-4 rounded-lg ${
              message.role === 'user'
                ? 'bg-blue-100 dark:bg-blue-900 ml-12'
                : 'bg-gray-100 dark:bg-gray-800 mr-12'
            }`}
          >
            <div className="font-semibold text-sm mb-1">
              {message.role === 'user' ? 'Du' : 'Claude'}
            </div>
            {message.parts.map((part, i) => {
              switch (part.type) {
                case 'text':
                  return (
                    <div
                      key={`${message.id}-${i}`}
                      className="whitespace-pre-wrap"
                    >
                      {part.text}
                    </div>
                  );

                case 'tool-askQuestions': {
                  switch (part.state) {
                    case 'input-streaming':
                      return (
                        <div
                          key={part.toolCallId}
                          className="animate-pulse"
                        >
                          Fragebogen wird erstellt...
                        </div>
                      );

                    case 'input-available':
                      return (
                        <QuestionWizard
                          key={part.toolCallId}
                          title={part.input.title}
                          questions={part.input.questions}
                          onSubmit={result => {
                            addToolOutput({
                              tool: 'askQuestions',
                              toolCallId: part.toolCallId,
                              output: result,
                            });
                          }}
                        />
                      );

                    case 'output-available': {
                      let summary = 'Fragebogen beantwortet';
                      try {
                        const answers = JSON.parse(part.output);
                        summary = answers
                          .filter(
                            (a: {
                              selectedOptions: string[];
                              freeText?: string;
                            }) =>
                              a.selectedOptions?.length > 0 || a.freeText,
                          )
                          .map(
                            (a: {
                              question: string;
                              selectedOptions: string[];
                              freeText?: string;
                            }) => {
                              const parts = [];
                              if (a.selectedOptions?.length)
                                parts.push(a.selectedOptions.join(', '));
                              if (a.freeText) parts.push(a.freeText);
                              return `${a.question} → ${parts.join(' — ')}`;
                            },
                          )
                          .join('\n');
                      } catch {
                        /* ignore */
                      }
                      return (
                        <div
                          key={part.toolCallId}
                          className="text-sm text-gray-500 italic whitespace-pre-wrap"
                        >
                          {summary}
                        </div>
                      );
                    }

                    case 'output-error':
                      return (
                        <div
                          key={part.toolCallId}
                          className="text-sm text-red-500"
                        >
                          Fehler: {part.errorText}
                        </div>
                      );

                    default:
                      return null;
                  }
                }

                case 'tool-marketResearch': {
                  switch (part.state) {
                    case 'input-streaming':
                    case 'input-available':
                      return (
                        <div
                          key={part.toolCallId}
                          className="animate-pulse p-4 bg-white dark:bg-gray-700 rounded-lg"
                        >
                          Marktrecherche läuft...
                        </div>
                      );
                    case 'output-available':
                      return (
                        <MarketResearchResults
                          key={part.toolCallId}
                          result={part.output}
                        />
                      );
                    case 'output-error':
                      return (
                        <div
                          key={part.toolCallId}
                          className="text-sm text-red-500"
                        >
                          Recherche-Fehler: {part.errorText}
                        </div>
                      );
                    default:
                      return null;
                  }
                }

                case 'tool-generateSpec': {
                  switch (part.state) {
                    case 'input-streaming':
                    case 'input-available':
                      return (
                        <div
                          key={part.toolCallId}
                          className="animate-pulse p-4 bg-white dark:bg-gray-700 rounded-lg"
                        >
                          Leistungsbeschreibung wird erstellt...
                        </div>
                      );
                    case 'output-available':
                      return (
                        <SpecDocument
                          key={part.toolCallId}
                          result={part.output}
                        />
                      );
                    case 'output-error':
                      return (
                        <div
                          key={part.toolCallId}
                          className="text-sm text-red-500"
                        >
                          Fehler: {part.errorText}
                        </div>
                      );
                    default:
                      return null;
                  }
                }

                default:
                  return null;
              }
            })}
          </div>
        ))}
        {isLoading && (
          <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 mr-12 animate-pulse">
            Claude denkt nach...
          </div>
        )}
      </div>

      <form
        onSubmit={e => {
          e.preventDefault();
          if (!input.trim()) return;
          sendMessage({ text: input });
          setInput('');
        }}
        className="sticky bottom-4 flex gap-2"
      >
        <input
          className="flex-1 p-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={input}
          placeholder="Schreib etwas..."
          onChange={e => setInput(e.currentTarget.value)}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Senden
        </button>
      </form>
    </div>
  );
}
