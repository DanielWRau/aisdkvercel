import { ToolLoopAgent, stepCountIs } from 'ai';
import { ai } from '@/lib/ai';
import { tools } from '@/tools/index';
import { getSystemPrompt, type SystemPromptOptions } from '@/prompts';

export function createAgent(options?: SystemPromptOptions) {
  const allowedTools = options?.tools
  const selectedTools = allowedTools
    ? Object.fromEntries(
        Object.entries(tools).filter(([name]) =>
          (allowedTools as readonly string[]).includes(name)
        )
      )
    : tools

  return new ToolLoopAgent({
    model: ai.languageModel('fast'),
    tools: selectedTools,
    instructions: getSystemPrompt(options),
    stopWhen: stepCountIs(7),
  });
}

// Backward-compatible default export
export const agent = createAgent();
