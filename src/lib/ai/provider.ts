import { anthropic } from '@ai-sdk/anthropic'
import { customProvider, wrapLanguageModel } from 'ai'
import { loggingMiddleware } from './middleware'

const HAIKU = 'claude-haiku-4-5-20251001'

const withLogging = (modelId: string) =>
  wrapLanguageModel({ model: anthropic(modelId), middleware: [loggingMiddleware] })

export const ai = customProvider({
  languageModels: {
    fast: withLogging(HAIKU),
  },
})
