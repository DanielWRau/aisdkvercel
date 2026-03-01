'use client'

import { Button } from '@/components/ui/button'
import { DinoIcon } from '@/components/DinoIcon'

type ChatEmptyStateProps = {
  title?: string
  description?: string
  suggestions?: { label: string; prompt: string }[]
  onSuggestionClick?: (prompt: string) => void
}

export function ChatEmptyState({
  title = 'Chat',
  description = 'Stellen Sie eine Frage.',
  suggestions = [],
  onSuggestionClick,
}: ChatEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 text-center p-6">
      <DinoIcon size={40} className="text-muted-foreground/40" />
      <div>
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      {suggestions.length > 0 && onSuggestionClick && (
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {suggestions.map((s) => (
            <Button
              key={s.prompt}
              variant="outline"
              size="sm"
              onClick={() => onSuggestionClick(s.prompt)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
