import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

import { Users } from './collections/Users'
import { Projects } from './collections/Projects'
import { Documents } from './collections/Documents'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || 'CHANGE-ME-IN-PRODUCTION-min-32-chars!!',

  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
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

  collections: [Users, Projects, Documents],
})
