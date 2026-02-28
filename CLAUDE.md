# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

`pnpm dev` / `pnpm build` (requires DATABASE_URL) / `pnpm lint` / `pnpm test` / `pnpm test:evals` (real APIs, 120s timeout)
Single test: `pnpm vitest run src/tools/__tests__/market-research.test.ts`
Payload: `pnpm payload:importmap` / `pnpm payload:generate-types` (via Docker)

### Migrationen

**Nie manuelle SQL-Migrationen schreiben — immer über Payload.**

- Dev-Modus: Payload 3 + Drizzle nutzt standardmäßig **Schema-Push** beim Start von `pnpm dev`. Schema-Änderungen werden automatisch auf die DB angewendet wenn der Dev-Server startet.
- Produktion: `npx tsx node_modules/.pnpm/payload@3.77.0_graphql@16.12.0_typescript@5.9.3/node_modules/payload/dist/bin/index.js migrate:create <name>` und `migrate` (mit `source .env` vorher). Direkt über `node_modules/.bin/payload` funktioniert nicht wegen Node 25 + tsx Kompatibilität.
- Hilfs-Skripte für Daten-Migrationen liegen in `src/scripts/` und werden mit `npx tsx src/scripts/<name>.ts` ausgeführt.

## Vectorize

`ENABLE_VECTORIZE=true` (opt-in) aktiviert payloadcms-vectorize; in dev wird der IVFFlat-Index im `afterSchemaInitHook` übersprungen (`extraConfig: undefined`), weil Drizzle Kit custom Index-Typen bei jedem Schema-Push droppt/recreated und damit die DB blockiert — in prod läuft der Index normal über Migrationen.

**Wichtig**: `vectorize-config.ts` darf **nicht** `lexical-utils.ts` importieren (zirkuläre Abhängigkeit: `payload.config.ts` → TLA → `vectorize-config` → `lexical-utils` → `getPayloadClient` → `@payload-config` → deadlock). Stattdessen direkt `is-lexical-data.ts` und `@payloadcms/richtext-lexical/plaintext` verwenden.

## Env Vars

`DATABASE_URL`, `PAYLOAD_SECRET` (min 32 chars), `ANTHROPIC_API_KEY`, `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY` (Embeddings via OpenRouter)

## Architecture

German-language AI procurement assistant. Next.js 16 + AI SDK v6 + Payload CMS 3. pnpm, Tailwind v4, Zod v4.

**Agent**: `src/agent.ts` — `ToolLoopAgent` (claude-haiku-4-5-20251001, max 7 steps). Route: `src/app/(app)/api/chat/route.ts` via `createAgentUIStreamResponse`. Frontend: `useChat` + `DefaultChatTransport` + `lastAssistantMessageIsCompleteWithToolCalls`.

**Tools** (`src/tools/`): `askQuestions` (UI tool, no execute), `marketResearch` (Perplexity + Claude web search enrichment), `generateSpec` (Claude → structured spec). Typed via `InferUITools`, rendered by `part.type` + `part.state`.

**Prompts** (`src/prompts/`): Factory functions with typed options — reused across evals and production.

**Routes**: `/` (chat UI), `/bedarfsermittlung` (guided wizard with `?project=<id>`).

**Payload**: Route groups `(app)` / `(payload)`. Collections: Users, Projects, Documents. `importMap.js` is committed — regenerate when adding Payload components. Server actions in `src/actions/` via `getPayloadClient()`.

**Path aliases**: `@/*` → `./src/*`, `@payload-config` → `./src/payload.config.ts`

## Testing

Unit tests mock AI SDK (`MockLanguageModelV3` from `ai/test`) + fetch. Helpers in `__tests__/helpers/`. Evals (`src/evals/`) use real APIs with custom scoring (`schemaValid`, `fieldsPopulated`, `minItems`).

## Domain Language

All UI, prompts, and many field names are **German** (Bedarfsermittlung, Leistungsbeschreibung, groessenPraeferenz, etc.).
