'use client'

import { Loader2, AlertCircle } from 'lucide-react'
import { KnowledgeSearchResults } from './knowledge-search-results'

type KnowledgeSearchPartProps = {
  part: {
    type: string
    state: string
    input?: { query?: string }
    output?: {
      status?: string
      count?: number
      results?: Array<{ text: string; source: string; similarity: number; docTitle?: string }>
      error?: string
      message?: string
    }
    preliminary?: boolean
  }
}

export function KnowledgeSearchPart({ part }: KnowledgeSearchPartProps) {
  const { state, output } = part

  // Input still streaming — don't show anything
  if (state === 'input-streaming') return null

  // Input ready — show what we're searching for
  if (state === 'input-available') {
    return (
      <div className="flex items-center gap-2 py-1">
        <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Suche nach: &ldquo;{part.input?.query}&rdquo;
        </span>
      </div>
    )
  }

  // Error state
  if (state === 'output-error') {
    return (
      <div className="flex items-center gap-2 py-1 text-destructive">
        <AlertCircle className="size-3.5" />
        <span className="text-xs">
          Bei der Suche ist ein Fehler aufgetreten.
        </span>
      </div>
    )
  }

  // Output available
  if (state === 'output-available' && output) {
    // Preliminary: show progress status
    if (part.preliminary) {
      const statusLabels: Record<string, string> = {
        checking: 'Dokumente werden geprüft...',
        embedding: output.count
          ? `${output.count} Dokumente werden indexiert...`
          : 'Dokumente werden indexiert...',
        searching: 'Vektorsuche läuft...',
      }
      const label = statusLabels[output.status ?? ''] ?? 'Verarbeitung...'
      return (
        <div className="flex items-center gap-2 py-1">
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      )
    }

    // Error in output
    if (output.error) {
      return (
        <div className="flex items-center gap-2 py-1 text-destructive">
          <AlertCircle className="size-3.5" />
          <span className="text-xs">{output.error}</span>
        </div>
      )
    }

    // Info message (e.g. no documents found)
    if (output.message && (!output.results || output.results.length === 0)) {
      return (
        <p className="text-xs text-muted-foreground italic py-1">
          {output.message}
        </p>
      )
    }

    // Final results
    if (output.results) {
      return <KnowledgeSearchResults results={output.results} />
    }
  }

  return null
}
