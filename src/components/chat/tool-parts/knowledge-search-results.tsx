'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

type SearchResult = {
  text: string
  source: string
  similarity: number
  docTitle?: string
}

const SOURCE_LABELS: Record<string, string> = {
  documents: 'Dokument',
  media: 'Datei',
}

function similarityColor(pct: number): string {
  if (pct >= 80) return 'text-green-600 dark:text-green-400'
  if (pct >= 60) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-muted-foreground'
}

export function KnowledgeSearchResults({ results }: { results: SearchResult[] }) {
  const [open, setOpen] = useState(false)

  if (results.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Keine relevanten Ergebnisse gefunden.
      </p>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
        <FileText className="size-3.5" />
        <span>Quellen ({results.length})</span>
        <ChevronDown
          className={cn('size-3.5 transition-transform', open && 'rotate-180')}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {results.map((r, i) => {
          const pct = Math.round(r.similarity * 100)
          return (
            <div
              key={i}
              className="rounded-md border bg-muted/30 p-3 space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {SOURCE_LABELS[r.source] ?? r.source}
                </Badge>
                {r.docTitle && (
                  <span className="text-[11px] font-medium text-foreground/70 truncate max-w-[300px]">
                    {r.docTitle}
                  </span>
                )}
                <span className={cn('text-[10px] font-mono ml-auto shrink-0', similarityColor(pct))}>
                  {pct}%
                </span>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed">
                {r.text.length > 200 ? `${r.text.slice(0, 200)}...` : r.text}
              </p>
            </div>
          )
        })}
      </CollapsibleContent>
    </Collapsible>
  )
}
