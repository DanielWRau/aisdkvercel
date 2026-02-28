import { embed, embedMany } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

const model = openrouter.textEmbeddingModel('openai/text-embedding-3-small')

export async function embedQuery(text: string): Promise<number[]> {
  const { embedding } = await embed({ model, value: text })
  return Array.from(embedding)
}

export async function embedDocs(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const { embeddings } = await embedMany({ model, values: texts })
  return embeddings.map((e) => Array.from(e))
}
