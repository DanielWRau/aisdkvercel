import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ChatContainerProps = {
  children: ReactNode
  footer: ReactNode
  className?: string
}

export function ChatContainer({ children, footer, className }: ChatContainerProps) {
  return (
    <div className={cn('flex flex-col h-full min-h-0', className)}>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
      <div className="shrink-0 border-t">{footer}</div>
    </div>
  )
}
