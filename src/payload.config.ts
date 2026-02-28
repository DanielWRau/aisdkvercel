import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

import { seedFormTemplates } from './data/form-template-seeds'
import { Users } from './collections/Users'
import { Projects } from './collections/Projects'
import { Documents } from './collections/Documents'
import { Media } from './collections/Media'
import { UserSettings } from './collections/UserSettings'
import { FormTemplates } from './collections/FormTemplates'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const enableVector = process.env.ENABLE_VECTORIZE === 'true'

async function buildVectorConfig() {
  if (!enableVector) return { hooks: [], plugins: [] }

  const { createVectorizeIntegration } = await import('payloadcms-vectorize')
  const { documentsToPool, mediaToPool } = await import('./lib/vectorize-config')
  const { embedQuery, embedDocs } = await import('./lib/embeddings')

  const isDev = process.env.NODE_ENV !== 'production'

  const { afterSchemaInitHook, payloadcmsVectorize } = createVectorizeIntegration({
    vector_embeddings: { dims: 1536, ivfflatLists: isDev ? 10 : 100 },
  })

  // In dev mode, wrap the hook to skip the IVFFlat index definition.
  // Drizzle Kit can't properly diff custom index types (.using('ivfflat') + .with({ lists }))
  // and drops/recreates the index on every schema push, which blocks for seconds to minutes.
  // The vector column is still created — only the index is skipped (fine for small dev data).
  const devSafeHook: typeof afterSchemaInitHook = isDev
    ? async ({ extendTable, ...rest }) => {
        const wrappedExtendTable =
          typeof extendTable === 'function'
            ? (opts: Parameters<typeof extendTable>[0]) =>
                extendTable({ ...opts, extraConfig: undefined })
            : extendTable
        return afterSchemaInitHook({ extendTable: wrappedExtendTable, ...rest })
      }
    : afterSchemaInitHook

  return {
    hooks: [devSafeHook],
    plugins: [
      payloadcmsVectorize({
        knowledgePools: {
          vector_embeddings: {
            collections: {
              documents: {
                shouldEmbedFn: async () => false,
                toKnowledgePool: documentsToPool,
              },
              media: {
                shouldEmbedFn: async () => false,
                toKnowledgePool: mediaToPool,
              },
            },
            extensionFields: [{ name: 'projectId', type: 'text' }],
            embeddingConfig: {
              version: 'v1',
              queryFn: embedQuery,
              realTimeIngestionFn: embedDocs,
            },
          },
        },
      }),
    ],
  }
}

const vectorConfig = await buildVectorConfig()

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET!,

  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
    ...(enableVector ? { extensions: ['vector'] } : {}),
    afterSchemaInit: vectorConfig.hooks,
    // In dev, the devSafeHook above strips the IVFFlat index from the schema
    // so Drizzle Kit can push without interactive prompts. The vector column
    // type (vector(1536)) is still created — only the index is skipped.
    // The index is created in production via migrations.
  }),

  editor: lexicalEditor(),

  sharp,

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  admin: {
    user: 'users',
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },

  collections: [Users, Projects, Documents, Media, UserSettings, FormTemplates],

  async onInit(payload) {
    await seedFormTemplates(payload)
  },

  plugins: vectorConfig.plugins,
})
