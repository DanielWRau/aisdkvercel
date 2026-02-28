import type { SerializedEditorState } from 'lexical'

/**
 * Check if a value is a Lexical SerializedEditorState (has root.children structure).
 * Client-safe — no server dependencies.
 */
export function isLexicalData(
  value: unknown,
): value is SerializedEditorState {
  return (
    value !== null &&
    typeof value === 'object' &&
    'root' in (value as Record<string, unknown>)
  )
}
