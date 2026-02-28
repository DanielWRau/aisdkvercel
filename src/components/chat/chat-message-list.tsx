'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChatMessageBubble } from './chat-message-bubble'
import { ChatTypingIndicator } from './chat-typing-indicator'
import { ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

type MessagePart = {
  type: string
  text?: string
  [key: string]: unknown
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  parts: MessagePart[]
}

type ChatMessageListProps = {
  messages: Message[]
  status: 'ready' | 'submitted' | 'streaming' | 'error'
  renderToolPart?: (part: MessagePart) => ReactNode
  emptyState?: ReactNode
}

export function ChatMessageList({
  messages,
  status,
  renderToolPart,
  emptyState,
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [showScrollDown, setShowScrollDown] = useState(false)

  // Check if user is near bottom
  const isNearBottom = () => {
    const el = scrollRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100
  }

  // Auto-scroll when new messages arrive (only if near bottom)
  useEffect(() => {
    if (isNearBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, status])

  // Track scroll position for the scroll-down button
  const handleScroll = () => {
    setShowScrollDown(!isNearBottom())
  }

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  if (messages.length === 0 && emptyState) {
    return <div className="flex flex-1 h-full items-center justify-center p-4">{emptyState}</div>
  }

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto p-4 space-y-4"
      onScroll={handleScroll}
    >
      {messages.map((message) => (
        <ChatMessageBubble
          key={message.id}
          message={message}
          renderToolPart={renderToolPart}
        />
      ))}

      {status === 'submitted' && <ChatTypingIndicator />}

      <div ref={bottomRef} />

      {showScrollDown && (
        <div className="sticky bottom-2 flex justify-center">
          <Button
            variant="outline"
            size="icon-sm"
            className="rounded-full shadow-md"
            onClick={scrollToBottom}
          >
            <ArrowDown className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
