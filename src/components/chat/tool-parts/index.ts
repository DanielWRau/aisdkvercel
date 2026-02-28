import { KnowledgeSearchPart } from './knowledge-search-progress'

export { KnowledgeSearchPart } from './knowledge-search-progress'
export { KnowledgeSearchResults } from './knowledge-search-results'

export const knowledgeChatRenderers = {
  'tool-knowledgeSearch': KnowledgeSearchPart,
} as Record<string, React.ComponentType<{ part: unknown }>>
