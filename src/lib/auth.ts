import { headers } from 'next/headers'
import { getPayloadClient } from './payload'

export async function getAuthenticatedUser() {
  const payload = await getPayloadClient()
  const headersList = await headers()
  const result = await payload.auth({ headers: headersList })
  return result.user ?? null
}

export async function requireAuth() {
  const user = await getAuthenticatedUser()
  if (!user) throw new Error('Nicht authentifiziert')
  return user
}

/** Route-Wrapper: Auth + Top-Level Error-Handling für API-Routes */
export function withAuth(
  handler: (
    req: Request,
    context: { user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>> } & Record<string, unknown>,
  ) => Promise<Response>,
) {
  return async (
    req: Request,
    routeContext?: Record<string, unknown>,
  ): Promise<Response> => {
    try {
      const user = await getAuthenticatedUser()
      if (!user) return new Response('Unauthorized', { status: 401 })
      return await handler(req, { user, ...routeContext })
    } catch (err) {
      console.error('[api]', err)
      return Response.json({ error: 'Interner Serverfehler' }, { status: 500 })
    }
  }
}

/** Liest Request-Body mit hartem Byte-Limit (kein Verlass auf content-length Header). */
const MAX_BODY_BYTES = 100_000
export async function readBodySafe(req: Request, limit = MAX_BODY_BYTES): Promise<{ json: unknown } | { error: Response }> {
  const reader = req.body?.getReader()
  if (!reader) return { error: new Response('No body', { status: 400 }) }

  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > limit) {
      reader.cancel()
      return { error: new Response('Payload too large', { status: 413 }) }
    }
    chunks.push(value)
  }

  try {
    const text = new TextDecoder().decode(Buffer.concat(chunks))
    return { json: JSON.parse(text) }
  } catch {
    return { error: Response.json({ error: 'Invalid JSON' }, { status: 400 }) }
  }
}
