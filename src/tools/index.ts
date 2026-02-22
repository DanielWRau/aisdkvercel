import { InferUITools, UIMessage, UIDataTypes } from 'ai';
import { askQuestions } from './ask-questions';

export const tools = {
  askQuestions,
};

// Typen aus den Tool-Definitionen ableiten
export type ChatTools = InferUITools<typeof tools>;
export type ChatMessage = UIMessage<never, UIDataTypes, ChatTools>;
