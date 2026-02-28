'use client'

import { useRef, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Loader2,
  Undo2,
  Redo2,
  Link,
  Strikethrough,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'
import DOMPurify from 'dompurify'
import { cn } from '@/lib/utils'

type MarkdownEditorProps = {
  initialMarkdown: string
  onSave: (markdown: string) => Promise<void>
  onCancel: () => void
  saving?: boolean
}

function createTurndown() {
  const td = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
  })
  td.use(gfm)
  return td
}

const mdProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeStringify)

function markdownToHtml(md: string): string {
  const result = mdProcessor.processSync(md)
  return DOMPurify.sanitize(String(result))
}

/* ── Toolbar helpers ── */

/** Browser rich-text command wrapper (document.execCommand is the standard contentEditable API). */
function richTextCommand(command: string, value?: string) {
  // execCommand is the only way to manipulate contentEditable
  document.execCommand(command, false, value)
}

function queryCommandActive(command: string): boolean {
  return document.queryCommandState(command)
}

/* ── Toolbar ── */

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex items-center justify-center size-8 rounded-md transition-colors',
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px bg-border" />
}

function useFormatState() {
  const [state, setState] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  })

  const update = useCallback(() => {
    setState({
      bold: queryCommandActive('bold'),
      italic: queryCommandActive('italic'),
      underline: queryCommandActive('underline'),
      strikethrough: queryCommandActive('strikeThrough'),
    })
  }, [])

  return { state, update }
}

function Toolbar({
  editorRef,
  formatState,
  onFormatUpdate,
}: {
  editorRef: React.RefObject<HTMLDivElement | null>
  formatState: { bold: boolean; italic: boolean; underline: boolean; strikethrough: boolean }
  onFormatUpdate: () => void
}) {
  const run = useCallback(
    (command: string, value?: string) => {
      editorRef.current?.focus()
      richTextCommand(command, value)
      onFormatUpdate()
    },
    [editorRef, onFormatUpdate],
  )

  const formatBlock = useCallback(
    (tag: string) => {
      editorRef.current?.focus()
      richTextCommand('formatBlock', tag)
      onFormatUpdate()
    },
    [editorRef, onFormatUpdate],
  )

  const insertLink = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const url = prompt('URL eingeben:')
    if (url) {
      run('createLink', url)
    }
  }, [run])

  return (
    <div className="flex items-center gap-0.5 border-b px-2 py-1.5 flex-wrap">
      <ToolbarButton onClick={() => run('undo')} title="Rückgängig (Ctrl+Z)">
        <Undo2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => run('redo')} title="Wiederholen (Ctrl+Y)">
        <Redo2 className="size-4" />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton active={formatState.bold} onClick={() => run('bold')} title="Fett (Ctrl+B)">
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton active={formatState.italic} onClick={() => run('italic')} title="Kursiv (Ctrl+I)">
        <Italic className="size-4" />
      </ToolbarButton>
      <ToolbarButton active={formatState.underline} onClick={() => run('underline')} title="Unterstrichen (Ctrl+U)">
        <Underline className="size-4" />
      </ToolbarButton>
      <ToolbarButton active={formatState.strikethrough} onClick={() => run('strikeThrough')} title="Durchgestrichen">
        <Strikethrough className="size-4" />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton onClick={() => formatBlock('h1')} title="Überschrift 1">
        <Heading1 className="size-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => formatBlock('h2')} title="Überschrift 2">
        <Heading2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => formatBlock('h3')} title="Überschrift 3">
        <Heading3 className="size-4" />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton onClick={() => run('insertUnorderedList')} title="Aufzählung">
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => run('insertOrderedList')} title="Nummerierte Liste">
        <ListOrdered className="size-4" />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton onClick={() => formatBlock('blockquote')} title="Zitat">
        <Quote className="size-4" />
      </ToolbarButton>
      <ToolbarButton onClick={insertLink} title="Link einfügen">
        <Link className="size-4" />
      </ToolbarButton>
    </div>
  )
}

/* ── Editor ── */

export function MarkdownEditor({ initialMarkdown, onSave, onCancel, saving }: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const turndown = useMemo(() => createTurndown(), [])
  const [initialHtml] = useState(() => markdownToHtml(initialMarkdown))
  const { state: formatState, update: updateFormat } = useFormatState()

  // Populate editor via DOM after mount
  useEffect(() => {
    if (!editorRef.current) return
    editorRef.current.textContent = ''
    const wrapper = document.createElement('div')
    wrapper.innerHTML = initialHtml
    while (wrapper.firstChild) {
      editorRef.current.appendChild(wrapper.firstChild)
    }
  }, [initialHtml])

  // Track selection changes to update toolbar state
  useEffect(() => {
    const handler = () => updateFormat()
    document.addEventListener('selectionchange', handler)
    return () => document.removeEventListener('selectionchange', handler)
  }, [updateFormat])

  const getMarkdown = useCallback(() => {
    if (!editorRef.current) return initialMarkdown
    return turndown.turndown(editorRef.current.innerHTML)
  }, [initialMarkdown, turndown])

  const handleSave = useCallback(async () => {
    await onSave(getMarkdown())
  }, [getMarkdown, onSave])

  return (
    <div className="flex flex-col h-full">
      <Toolbar editorRef={editorRef} formatState={formatState} onFormatUpdate={updateFormat} />

      {/* Content — WYSIWYG */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="min-h-[300px] p-4 prose prose-sm dark:prose-invert max-w-none outline-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 border-t px-4 py-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Abbrechen
        </Button>
        <Button size="sm" disabled={saving} onClick={handleSave}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : 'Speichern'}
        </Button>
      </div>
    </div>
  )
}
