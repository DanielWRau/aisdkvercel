import {
  convertMarkdownToLexical,
  convertLexicalToMarkdown,
  editorConfigFactory,
} from '@payloadcms/richtext-lexical'
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'
import { getPayloadClient } from '@/lib/payload'
import type { SerializedEditorState } from 'lexical'
import type { SanitizedServerEditorConfig } from '@payloadcms/richtext-lexical'
import { isLexicalData } from '@/lib/is-lexical-data'

let cachedEditorConfig: SanitizedServerEditorConfig | null = null

async function getEditorConfig(): Promise<SanitizedServerEditorConfig> {
  if (cachedEditorConfig) return cachedEditorConfig
  const payload = await getPayloadClient()
  cachedEditorConfig = await editorConfigFactory.default({
    config: payload.config,
  })
  return cachedEditorConfig
}

/**
 * Convert a Markdown string to Lexical SerializedEditorState.
 * Server-only — requires Payload config for editor features.
 */
export async function markdownToLexical(
  markdown: string,
): Promise<SerializedEditorState> {
  const editorConfig = await getEditorConfig()
  return convertMarkdownToLexical({ editorConfig, markdown })
}

/**
 * Convert Lexical SerializedEditorState back to Markdown.
 * Server-only — requires Payload config for editor features.
 */
export async function lexicalToMarkdown(
  data: SerializedEditorState,
): Promise<string> {
  const editorConfig = await getEditorConfig()
  return convertLexicalToMarkdown({ data, editorConfig })
}

/**
 * Extract plaintext from Lexical data. No config needed.
 */
export function lexicalToPlaintext(data: SerializedEditorState): string {
  return convertLexicalToPlaintext({ data })
}

// Re-export for server-side consumers
export { isLexicalData }

/**
 * Universal read-API: always returns Markdown, regardless of whether
 * content is a legacy string or Lexical JSON.
 */
export async function getContentAsMarkdown(
  content: unknown,
): Promise<string> {
  if (!content) return ''
  if (typeof content === 'string') return content
  if (isLexicalData(content)) return lexicalToMarkdown(content)
  return ''
}
