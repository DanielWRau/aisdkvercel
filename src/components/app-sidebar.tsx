'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ClipboardList, FileSearch, FileStack, Gavel, BarChart3,
  MessageSquare, Files, Settings,
} from 'lucide-react'

import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import { DinoIcon } from '@/components/DinoIcon'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'

export type NavColor = 'blue' | 'orange'

export interface NavItem {
  title: string
  icon: React.ElementType
  href?: string
}

export interface NavGroup {
  color: NavColor
  pill?: boolean
  items: NavItem[]
}

const workflowGroups: NavGroup[] = [
  { color: 'blue', items: [{ title: 'Bedarfsanalyse', icon: ClipboardList, href: '#bedarfsanalyse' }] },
  { color: 'blue', items: [{ title: 'Angebotsvergleich', icon: FileSearch, href: '#angebotsvergleich' }] },
  { color: 'blue', items: [{ title: 'Formblaetter', icon: FileStack, href: '#formblaetter' }] },
  { color: 'blue', items: [{ title: 'Verfahren', icon: Gavel, href: '#verfahren' }] },
  { color: 'blue', items: [{ title: 'Wertung', icon: BarChart3, href: '#wertung' }] },
  { color: 'blue', pill: true, items: [{ title: 'Chat', icon: MessageSquare, href: '#chat' }] },
]

const bottomItems: NavItem[] = [
  { title: 'Dateien', icon: Files, href: '#dateien' },
  { title: 'Einstellungen', icon: Settings, href: '#einstellungen' },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/projects">
                <div className="flex aspect-square size-10 items-center justify-center rounded-xl border-2 border-primary text-primary group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:rounded-lg overflow-hidden">
                  <DinoIcon size={32} />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">123DINO</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain workflowGroups={workflowGroups} bottomItems={bottomItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
