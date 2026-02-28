'use client'

import { useState, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'
import { useStatusFooter } from '@/providers/status-footer-provider'

export function StatusFooter() {
  const { statusText, copyContent } = useStatusFooter()
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!copyContent) return
    try {
      await navigator.clipboard.writeText(copyContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API may fail in some contexts
    }
  }, [copyContent])

  return (
    <div className="h-10 border-t bg-muted/30 flex items-center justify-between px-4 text-[11px] text-muted-foreground shrink-0">
      <span>{statusText ? `Status: ${statusText}` : '\u00A0'}</span>
      {copyContent && (
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="size-3.5" />
              <span>Kopiert</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Kopieren</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}
