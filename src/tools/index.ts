import { InferUITools, UIMessage, UIDataTypes } from 'ai';
import { askQuestions } from './ask-questions';
import { marketResearch } from './market-research';
import { generateSpec } from './generate-spec';
import { knowledgeSearch } from './knowledge-search';
import { saveDocument } from './save-document';

export const tools = {
  askQuestions,
  marketResearch,
  generateSpec,
  knowledgeSearch,
  saveDocument,
};

export type ChatTools = InferUITools<typeof tools>;
export type ChatMessage = UIMessage<never, UIDataTypes, ChatTools>;
