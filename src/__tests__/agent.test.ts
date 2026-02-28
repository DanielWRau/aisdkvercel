import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the AI provider
vi.mock('@/lib/ai', () => ({
  ai: { languageModel: vi.fn(() => ({ modelId: 'mock-model' })) },
}))

// Mock the prompts module
vi.mock('@/prompts', () => ({
  getSystemPrompt: vi.fn((opts) => `mock-prompt-${opts?.mode ?? 'workflow'}`),
}))

// Mock tools
vi.mock('@/tools/index', () => ({
  tools: {
    askQuestions: { type: 'tool', description: 'ask' },
    marketResearch: { type: 'tool', description: 'research' },
    generateSpec: { type: 'tool', description: 'spec' },
    knowledgeSearch: { type: 'tool', description: 'knowledge' },
  },
}))

// Mock ToolLoopAgent
const mockToolLoopAgent = vi.fn()
vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>()
  return {
    ...actual,
    ToolLoopAgent: class {
      tools: Record<string, unknown>
      instructions: string
      constructor(opts: { tools: Record<string, unknown>; instructions: string }) {
        this.tools = opts.tools
        this.instructions = opts.instructions
        mockToolLoopAgent(opts)
      }
    },
    stepCountIs: actual.stepCountIs,
  }
})

const { createAgent } = await import('../agent')

describe('createAgent', () => {
  beforeEach(() => {
    mockToolLoopAgent.mockClear()
  })

  it('creates agent with all tools by default', () => {
    createAgent()
    const opts = mockToolLoopAgent.mock.calls[0][0]
    expect(Object.keys(opts.tools)).toEqual([
      'askQuestions',
      'marketResearch',
      'generateSpec',
      'knowledgeSearch',
    ])
  })

  it('filters tools when options.tools is specified', () => {
    createAgent({ tools: ['knowledgeSearch'] })
    const opts = mockToolLoopAgent.mock.calls[0][0]
    expect(Object.keys(opts.tools)).toEqual(['knowledgeSearch'])
  })

  it('filters to only specified tools subset', () => {
    createAgent({ tools: ['askQuestions', 'knowledgeSearch'] })
    const opts = mockToolLoopAgent.mock.calls[0][0]
    expect(Object.keys(opts.tools)).toEqual(['askQuestions', 'knowledgeSearch'])
  })

  it('passes mode to getSystemPrompt', () => {
    createAgent({ mode: 'knowledge', tools: ['knowledgeSearch'] })
    const opts = mockToolLoopAgent.mock.calls[0][0]
    expect(opts.instructions).toBe('mock-prompt-knowledge')
  })
})
