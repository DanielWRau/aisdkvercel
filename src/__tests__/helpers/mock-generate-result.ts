import type { LanguageModelV3GenerateResult } from '@ai-sdk/provider';

/**
 * Factory for creating MockLanguageModelV3 doGenerate results.
 * Uses the V3 content-array format required by AI SDK v6.
 */
export function makeGenerateResult(
  text: string,
  overrides: Partial<LanguageModelV3GenerateResult> = {},
): LanguageModelV3GenerateResult {
  return {
    content: [{ type: 'text', text }],
    finishReason: { unified: 'stop', raw: 'stop' },
    usage: {
      inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
      outputTokens: { total: 20, noCache: 20 },
    },
    ...overrides,
  };
}

/**
 * Creates a result with a tool-call (for agent flow testing).
 */
export function makeToolCallResult(
  toolName: string,
  args: Record<string, unknown>,
  overrides: Partial<LanguageModelV3GenerateResult> = {},
): LanguageModelV3GenerateResult {
  return {
    content: [
      {
        type: 'tool-call',
        toolCallId: `call_${toolName}_1`,
        toolName,
        input: JSON.stringify(args),
      },
    ],
    finishReason: { unified: 'tool-calls', raw: 'tool_use' },
    usage: {
      inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
      outputTokens: { total: 20, noCache: 20 },
    },
    ...overrides,
  };
}
