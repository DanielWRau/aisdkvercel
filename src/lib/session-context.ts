import { AsyncLocalStorage } from 'node:async_hooks'

export type SessionContext = {
  sessionId: string
  user?: { id: string | number; role: string; email: string; [key: string]: unknown }
  projectId?: string | number
}

const storage = new AsyncLocalStorage<SessionContext>()

/**
 * Backward-compatible: accepts a string (sessionId) or full SessionContext.
 */
export function runWithSession<T>(
  input: string | SessionContext,
  fn: () => T,
): T {
  const ctx = typeof input === 'string' ? { sessionId: input } : input
  return storage.run(ctx, fn)
}

export function getSessionId(): string | undefined {
  return storage.getStore()?.sessionId
}

export function getSessionContext(): SessionContext | undefined {
  return storage.getStore()
}
