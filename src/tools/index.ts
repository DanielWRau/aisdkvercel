import { InferUITools, UIMessage, UIDataTypes } from 'ai';
import { askQuestions } from './ask-questions';
import { marketResearch } from './market-research';
import { generateSpec } from './generate-spec';

export const tools = {
  askQuestions,
  marketResearch,
  generateSpec,
};

export type ChatTools = InferUITools<typeof tools>;
export type ChatMessage = UIMessage<never, UIDataTypes, ChatTools>;
