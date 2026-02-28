import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock payloadcms-vectorize
vi.mock('payloadcms-vectorize', () => ({
  getVectorizedPayload: vi.fn(() => ({
    search: vi.fn().mockResolvedValue([
      { chunkText: 'Test result', sourceCollection: 'documents', docId: 'd1', similarity: 0.85 },
    ]),
  })),
}))

// Mock payload client
const mockPayload = {
  find: vi.fn().mockResolvedValue({ docs: [], hasNextPage: false }),
  delete: vi.fn().mockResolvedValue({}),
}
vi.mock('@/lib/payload', () => ({
  getPayloadClient: vi.fn(async () => mockPayload),
}))

// Mock vectorize config
vi.mock('@/lib/vectorize-config', () => ({
  directEmbedDocuments: vi.fn(),
}))

// Mock session context — key piece for rate-limit testing
const mockSessionContext = {
  sessionId: 'session-1',
  user: { id: 'user-1', role: 'admin', email: 'test@test.de' },
  projectId: 'project-1',
}
vi.mock('@/lib/session-context', () => ({
  getSessionContext: vi.fn(() => ({ ...mockSessionContext })),
}))

// Import after mocks
const { knowledgeSearch } = await import('../knowledge-search')

async function collectYields(gen: AsyncGenerator<unknown>) {
  const results: unknown[] = []
  for await (const val of gen) {
    results.push(val)
  }
  return results
}

describe('knowledgeSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset rate limits by re-importing (the Map is module-level)
    // We use different user/project combos per test to avoid rate-limit collisions
  })

  describe('rate-limit key', () => {
    it('uses userId:projectId for rate limiting (not sessionId)', async () => {
      // Set up context: same user, different sessionIds
      const { getSessionContext } = await import('@/lib/session-context')
      const mock = getSessionContext as unknown as ReturnType<typeof vi.fn>

      // First call with session-A
      mock.mockReturnValue({
        sessionId: 'session-A',
        user: { id: 'rate-user-1', role: 'admin', email: 't@t.de' },
        projectId: 'rate-project-1',
      })

      // Exhaust rate limit (5 calls) with "session-A"
      for (let i = 0; i < 5; i++) {
        mockPayload.find.mockResolvedValue({ docs: [], hasNextPage: false })
        const gen = knowledgeSearch.execute!({ query: `test ${i}`, limit: 1 }, {
          toolCallId: `call-${i}`,
          messages: [],
          abortSignal: new AbortController().signal,
        })
        await collectYields(gen as AsyncGenerator<unknown>)
      }

      // 6th call with DIFFERENT sessionId but same userId:projectId — should still be rate-limited
      mock.mockReturnValue({
        sessionId: 'session-B',
        user: { id: 'rate-user-1', role: 'admin', email: 't@t.de' },
        projectId: 'rate-project-1',
      })

      const gen = knowledgeSearch.execute!({ query: 'one more', limit: 1 }, {
        toolCallId: 'call-extra',
        messages: [],
        abortSignal: new AbortController().signal,
      })
      const results = await collectYields(gen as AsyncGenerator<unknown>)
      const last = results[results.length - 1] as { error?: string }
      expect(last.error).toBe('Zu viele Suchanfragen. Bitte warten.')
    })
  })

  describe('error handling', () => {
    it('does not expose internal error details', async () => {
      const { getSessionContext } = await import('@/lib/session-context')
      const mock = getSessionContext as unknown as ReturnType<typeof vi.fn>
      mock.mockReturnValue({
        sessionId: 'err-session',
        user: { id: 'err-user', role: 'admin', email: 't@t.de' },
        projectId: 'err-project',
      })

      // Make find throw an internal error
      mockPayload.find.mockRejectedValueOnce(new Error('database connection lost at 10.0.0.1:5432'))

      const gen = knowledgeSearch.execute!({ query: 'test', limit: 1 }, {
        toolCallId: 'call-err',
        messages: [],
        abortSignal: new AbortController().signal,
      })
      const results = await collectYields(gen as AsyncGenerator<unknown>)
      const last = results[results.length - 1] as { error?: string }

      // Should NOT contain the internal error message
      expect(last.error).not.toContain('database')
      expect(last.error).not.toContain('10.0.0.1')
      expect(last.error).toBe('Bei der Suche ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.')
    })
  })
})
