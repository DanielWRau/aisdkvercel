import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
const mockCreateAgent = vi.fn(() => ({ type: 'agent' }))
vi.mock('@/agent', () => ({
  createAgent: (...args: Parameters<typeof mockCreateAgent>) => mockCreateAgent(...args),
}))

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>()
  return {
    ...actual,
    createAgentUIStreamResponse: vi.fn(async () => new Response('ok')),
    consumeStream: vi.fn(),
  }
})

vi.mock('next/server', () => ({
  after: vi.fn(),
}))

vi.mock('@/lib/session-context', () => ({
  runWithSession: vi.fn((_ctx: unknown, fn: () => unknown) => fn()),
}))

const mockPayload = {
  findByID: vi.fn().mockResolvedValue({ id: 'p1', name: 'Test' }),
  find: vi.fn().mockResolvedValue({ docs: [] }),
}
vi.mock('@/lib/payload', () => ({
  getPayloadClient: vi.fn(async () => mockPayload),
}))

vi.mock('@/lib/persist-tool-result', () => ({
  persistToolResult: vi.fn(),
}))

const mockUser = { id: 'u1', email: 'test@test.de', role: 'admin' }
vi.mock('@/lib/auth', () => ({
  withAuth: (handler: (req: Request, ctx: { user: typeof mockUser }) => Promise<Response>) => {
    return (req: Request) => handler(req, { user: mockUser })
  },
  readBodySafe: vi.fn(async (req: Request) => {
    const text = await req.text()
    return { json: JSON.parse(text) }
  }),
}))

const { POST } = await import('../route')

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-project-id': 'p1',
      'x-session-id': 'session1',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

const validBody = {
  messages: [
    { id: 'm1', role: 'user', content: 'Hallo' },
  ],
}

describe('Chat API Route', () => {
  beforeEach(() => {
    mockCreateAgent.mockClear()
    mockPayload.findByID.mockResolvedValue({ id: 'p1', name: 'Test' })
  })

  it('returns 400 for unknown x-chat-mode', async () => {
    const req = makeRequest(validBody, { 'x-chat-mode': 'invalid' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Ungültiger Chat-Modus')
  })

  it('accepts workflow mode', async () => {
    const req = makeRequest(validBody, { 'x-chat-mode': 'workflow' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockCreateAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'workflow',
        tools: expect.arrayContaining(['askQuestions', 'marketResearch', 'generateSpec', 'knowledgeSearch']),
      }),
    )
  })

  it('knowledge mode passes only knowledgeSearch tool', async () => {
    const req = makeRequest(validBody, { 'x-chat-mode': 'knowledge' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockCreateAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'knowledge',
        tools: ['knowledgeSearch'],
      }),
    )
  })

  it('defaults to workflow mode when no header', async () => {
    const req = makeRequest(validBody)
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockCreateAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'workflow',
      }),
    )
  })
})
