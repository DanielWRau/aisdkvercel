import type { LanguageModelV3Middleware, LanguageModelV3StreamPart } from '@ai-sdk/provider'

const ENABLED = process.env.LOG_AI !== '0'

export const loggingMiddleware: LanguageModelV3Middleware = {
  wrapGenerate: async ({ doGenerate, model }) => {
    if (!ENABLED) return doGenerate()
    const start = Date.now()
    console.log(`[ai] generate start model=${model.modelId}`)
    const result = await doGenerate()
    console.log(
      `[ai] generate done model=${model.modelId} duration=${Date.now() - start}ms` +
      ` input=${result.usage?.inputTokens?.total ?? '?'} output=${result.usage?.outputTokens?.total ?? '?'}`,
    )
    return result
  },
  wrapStream: async ({ doStream, model }) => {
    if (!ENABLED) return doStream()
    const start = Date.now()
    console.log(`[ai] stream start model=${model.modelId}`)
    const { stream, ...rest } = await doStream()
    const transform = new TransformStream<LanguageModelV3StreamPart, LanguageModelV3StreamPart>({
      transform(chunk, controller) { controller.enqueue(chunk) },
      flush() { console.log(`[ai] stream done model=${model.modelId} duration=${Date.now() - start}ms`) },
    })
    return { stream: stream.pipeThrough(transform), ...rest }
  },
}
