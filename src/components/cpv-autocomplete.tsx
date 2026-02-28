'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { searchCpv, getCpvByCode, type CpvCode } from '@/lib/cpv-search'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CpvAutocompleteProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function CpvAutocomplete({
  value,
  onChange,
  placeholder = 'CPV-Code suchen...',
  className,
}: CpvAutocompleteProps) {
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<CpvCode[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Derive selected CPV from the controlled value prop
  const selectedCpv = useMemo(() => (value ? getCpvByCode(value) ?? null : null), [value])

  const handleSearch = useCallback((query: string) => {
    setInputValue(query)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (query.length >= 2) {
        const found = searchCpv(query, 15)
        setResults(found)
        setIsOpen(found.length > 0)
        setHighlightedIndex(-1)
      } else {
        setResults([])
        setIsOpen(false)
      }
    }, 300)
  }, [])

  const handleSelect = useCallback(
    (cpv: CpvCode) => {
      setInputValue('')
      setIsOpen(false)
      setResults([])
      onChange(cpv.code)
    },
    [onChange],
  )

  const handleClear = useCallback(() => {
    setInputValue('')
    onChange('')
    inputRef.current?.focus()
  }, [onChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev))
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1))
          break
        case 'Enter':
          e.preventDefault()
          if (highlightedIndex >= 0 && results[highlightedIndex]) {
            handleSelect(results[highlightedIndex])
          }
          break
        case 'Escape':
          setIsOpen(false)
          break
      }
    },
    [isOpen, results, highlightedIndex, handleSelect],
  )

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex])

  return (
    <div className={cn('relative', className)}>
      {selectedCpv ? (
        <div className="bg-background flex items-center gap-2 rounded-md border p-2">
          <Badge variant="secondary" className="font-mono text-xs">
            {selectedCpv.code}
          </Badge>
          <span className="flex-1 truncate text-sm">{selectedCpv.name}</span>
          <button
            type="button"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => inputValue.length >= 2 && setIsOpen(results.length > 0)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            placeholder={placeholder}
            className="pl-9"
          />
        </div>
      )}

      {isOpen && results.length > 0 && (
        <div className="bg-popover absolute z-[100] mt-1 max-h-[250px] w-full overflow-y-auto rounded-md border shadow-lg">
          <div ref={listRef} className="p-1">
            {results.map((cpv, index) => (
              <button
                key={cpv.code}
                type="button"
                onClick={() => handleSelect(cpv)}
                className={cn(
                  'flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
                  'hover:bg-accent hover:text-accent-foreground',
                  highlightedIndex === index && 'bg-accent text-accent-foreground',
                )}
              >
                <Badge variant="outline" className="shrink-0 font-mono text-xs">
                  {cpv.code}
                </Badge>
                <span className="line-clamp-2">{cpv.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
