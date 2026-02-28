'use client'

import { useEffect } from 'react'
import { useProjectChat } from '@/hooks/use-project-chat'
import { useBreadcrumbs } from '@/providers/breadcrumb-provider'
import { useStatusFooter } from '@/providers/status-footer-provider'
import {
  ChatContainer,
  ChatMessageList,
  ChatInput,
  ChatEmptyState,
} from '@/components/chat'
import { createToolPartRenderer } from '@/components/chat/chat-tool-part'
import { knowledgeChatRenderers } from '@/components/chat/tool-parts'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'

const renderToolPart = createToolPartRenderer(knowledgeChatRenderers)

const SUGGESTIONS = [
  { label: 'Dokumente zusammenfassen', prompt: 'Fasse die wichtigsten Dokumente zusammen.' },
  { label: 'Anforderungen', prompt: 'Welche Anforderungen sind definiert?' },
  { label: 'Vertragsbedingungen', prompt: 'Welche Vertragsbedingungen gibt es?' },
]

export function ChatClient({
  projectId,
  projectName,
}: {
  projectId: string
  projectName: string
}) {
  const { messages, sendMessage, status, isLoading, clearChat } = useProjectChat({
    projectId,
    chatMode: 'knowledge',
  })

  const { setItems } = useBreadcrumbs()
  const { setStatusText, setCopyContent } = useStatusFooter()

  useEffect(() => {
    setItems([
      { label: 'Projekte', href: '/projects' },
      { label: projectName, href: `/projects/${projectId}` },
      { label: 'Chat' },
    ])
  }, [projectId, projectName, setItems])

  useEffect(() => {
    if (isLoading) {
      setStatusText('Verarbeitung...')
    } else if (messages.length > 0) {
      setStatusText('Bereit')
    } else {
      setStatusText('')
    }
    setCopyContent(null)
    return () => {
      setStatusText('')
      setCopyContent(null)
    }
  }, [isLoading, messages.length, setStatusText, setCopyContent])

  const handleSend = (text: string) => {
    sendMessage({ text })
  }

  return (
    <ChatContainer
      footer={
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <ChatInput
              onSend={handleSend}
              disabled={isLoading}
              placeholder="Frage zu Ihren Dokumenten..."
            />
          </div>
          {messages.length > 0 && (
            <div className="p-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={clearChat}
                disabled={isLoading}
                title="Neuer Chat"
              >
                <RotateCcw className="size-4" />
              </Button>
            </div>
          )}
        </div>
      }
    >
      <ChatMessageList
        messages={messages}
        status={status}
        renderToolPart={renderToolPart}
        emptyState={
          <ChatEmptyState
            title="Dokumenten-Chat"
            description="Stellen Sie Fragen zu den hochgeladenen Dokumenten Ihres Projekts."
            suggestions={SUGGESTIONS}
            onSuggestionClick={handleSend}
          />
        }
      />
    </ChatContainer>
  )
}
