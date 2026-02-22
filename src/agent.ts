import { ToolLoopAgent, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { tools } from '@/tools/index';
import { getSystemPrompt } from '@/prompts';

export const agent = new ToolLoopAgent({
  model: anthropic('claude-haiku-4-5-20251001'),
  tools,
  instructions: getSystemPrompt(),
  stopWhen: stepCountIs(7),
});
