'use client'

import { useEffect, useState, useCallback } from 'react'
import { LexicalComposer } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposer'
import { RichTextPlugin } from '@payloadcms/richtext-lexical/lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@payloadcms/richtext-lexical/lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@payloadcms/richtext-lexical/lexical/react/LexicalHistoryPlugin'
import { ListPlugin } from '@payloadcms/richtext-lexical/lexical/react/LexicalListPlugin'
import { LinkPlugin } from '@payloadcms/richtext-lexical/lexical/react/LexicalLinkPlugin'
import { MarkdownShortcutPlugin } from '@payloadcms/richtext-lexical/lexical/react/LexicalMarkdownShortcutPlugin'
import { HEADING, QUOTE as MD_QUOTE, UNORDERED_LIST, ORDERED_LIST, BOLD_STAR, BOLD_UNDERSCORE, ITALIC_STAR, ITALIC_UNDERSCORE, BOLD_ITALIC_STAR, BOLD_ITALIC_UNDERSCORE } from '@payloadcms/richtext-lexical/lexical/markdown'
import { OnChangePlugin } from '@payloadcms/richtext-lexical/lexical/react/LexicalOnChangePlugin'
import { LexicalErrorBoundary } from '@payloadcms/richtext-lexical/lexical/react/LexicalErrorBoundary'
import { HeadingNode, QuoteNode, $createHeadingNode, $isHeadingNode, $createQuoteNode, $isQuoteNode } from '@payloadcms/richtext-lexical/lexical/rich-text'
import { ListNode, ListItemNode, INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND, $isListNode } from '@payloadcms/richtext-lexical/lexical/list'
import { LinkNode, AutoLinkNode } from '@payloadcms/richtext-lexical/lexical/link'
import { HorizontalRuleNode } from '@payloadcms/richtext-lexical/lexical/react/LexicalHorizontalRuleNode'
import { $getSelection, $isRangeSelection, $isRootOrShadowRoot, FORMAT_TEXT_COMMAND, SELECTION_CHANGE_COMMAND, COMMAND_PRIORITY_CRITICAL, $createParagraphNode } from '@payloadcms/richtext-lexical/lexical'
import type { SerializedEditorState } from 'lexical'
import { $setBlocksType } from '@payloadcms/richtext-lexical/lexical/selection'
import { $findMatchingParent } from '@payloadcms/richtext-lexical/lexical/utils'
import { useLexicalComposerContext } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const MARKDOWN_TRANSFORMERS = [
  HEADING,
  MD_QUOTE,
  UNORDERED_LIST,
  ORDERED_LIST,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
]

/* ── Theme ── */

const theme = {
  paragraph: 'mb-2 leading-relaxed',
  heading: {
    h1: 'text-2xl font-bold mb-4 mt-5',
    h2: 'text-xl font-semibold mb-3 mt-4',
    h3: 'text-lg font-semibold mb-2 mt-3',
  },
  list: {
    ul: 'list-disc ml-6 mb-2',
    ol: 'list-decimal ml-6 mb-2',
    listitem: 'mb-1',
    nested: {
      listitem: 'list-none',
    },
  },
  quote: 'border-l-4 border-border pl-4 italic text-muted-foreground my-2',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
  },
  link: 'text-primary underline cursor-pointer',
}

/* ── Toolbar ── */

type ToolbarButtonProps = {
  active?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}

function ToolbarButton({ active, onClick, title, children }: ToolbarButtonProps) {
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

function Toolbar() {
  const [editor] = useLexicalComposerContext()
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [blockType, setBlockType] = useState<string>('paragraph')

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if (!$isRangeSelection(selection)) return

    setIsBold(selection.hasFormat('bold'))
    setIsItalic(selection.hasFormat('italic'))
    setIsUnderline(selection.hasFormat('underline'))

    const anchorNode = selection.anchor.getNode()
    let element =
      anchorNode.getKey() === 'root'
        ? anchorNode
        : $findMatchingParent(anchorNode, (e) => {
            const parent = e.getParent()
            return parent !== null && $isRootOrShadowRoot(parent)
          })
    if (element === null) {
      element = anchorNode.getTopLevelElementOrThrow()
    }

    if ($isHeadingNode(element)) {
      setBlockType(element.getTag())
    } else if ($isListNode(element)) {
      const listType = element.getListType()
      setBlockType(listType === 'number' ? 'ol' : 'ul')
    } else if ($isQuoteNode(element)) {
      setBlockType('quote')
    } else {
      setBlockType('paragraph')
    }
  }, [])

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateToolbar()
        return false
      },
      COMMAND_PRIORITY_CRITICAL,
    )
  }, [editor, updateToolbar])

  // Also update on editor state changes (covers keyboard formatting)
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar()
      })
    })
  }, [editor, updateToolbar])

  const formatHeading = (tag: 'h1' | 'h2' | 'h3') => {
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      if (blockType === tag) {
        $setBlocksType(selection, () => $createParagraphNode())
      } else {
        $setBlocksType(selection, () => $createHeadingNode(tag))
      }
    })
  }

  const formatQuote = () => {
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      if (blockType === 'quote') {
        $setBlocksType(selection, () => $createParagraphNode())
      } else {
        $setBlocksType(selection, () => $createQuoteNode())
      }
    })
  }

  const formatList = (type: 'ul' | 'ol') => {
    if (blockType === type) {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
    } else {
      editor.dispatchCommand(
        type === 'ul' ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND,
        undefined,
      )
    }
  }

  return (
    <div className="flex items-center gap-0.5 border-b px-2 py-1.5 flex-wrap">
      <ToolbarButton
        active={isBold}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        title="Fett (Ctrl+B)"
      >
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        active={isItalic}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        title="Kursiv (Ctrl+I)"
      >
        <Italic className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        active={isUnderline}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        title="Unterstrichen (Ctrl+U)"
      >
        <Underline className="size-4" />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-border" />

      <ToolbarButton
        active={blockType === 'h1'}
        onClick={() => formatHeading('h1')}
        title="Überschrift 1"
      >
        <Heading1 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        active={blockType === 'h2'}
        onClick={() => formatHeading('h2')}
        title="Überschrift 2"
      >
        <Heading2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        active={blockType === 'h3'}
        onClick={() => formatHeading('h3')}
        title="Überschrift 3"
      >
        <Heading3 className="size-4" />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-border" />

      <ToolbarButton
        active={blockType === 'ul'}
        onClick={() => formatList('ul')}
        title="Aufzählung"
      >
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        active={blockType === 'ol'}
        onClick={() => formatList('ol')}
        title="Nummerierte Liste"
      >
        <ListOrdered className="size-4" />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-border" />

      <ToolbarButton
        active={blockType === 'quote'}
        onClick={formatQuote}
        title="Zitat"
      >
        <Quote className="size-4" />
      </ToolbarButton>
    </div>
  )
}

/* ── Editor Component ── */

type LexicalEditorProps = {
  initialData: SerializedEditorState | null
  onSave: (data: SerializedEditorState) => Promise<void>
  onCancel: () => void
  saving?: boolean
}

export function LexicalEditor({ initialData, onSave, onCancel, saving }: LexicalEditorProps) {
  const [currentState, setCurrentState] = useState<SerializedEditorState | null>(initialData)

  const initialConfig = {
    namespace: 'FileDetailEditor',
    theme,
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, AutoLinkNode, HorizontalRuleNode],
    onError: (error: Error) => {
      console.error('Lexical editor error:', error)
    },
    editorState: initialData ? JSON.stringify(initialData) : undefined,
  }

  const handleChange = useCallback(
    (editorState: { toJSON: () => SerializedEditorState }) => {
      setCurrentState(editorState.toJSON())
    },
    [],
  )

  const handleSave = async () => {
    if (!currentState) return
    await onSave(currentState)
  }

  return (
    <div className="flex flex-col h-full">
      <LexicalComposer initialConfig={initialConfig}>
        <Toolbar />
        <div className="flex-1 min-h-0 overflow-y-auto relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="min-h-[300px] p-4 text-sm outline-none" />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <MarkdownShortcutPlugin transformers={MARKDOWN_TRANSFORMERS} />
        <OnChangePlugin onChange={handleChange} />
      </LexicalComposer>

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
