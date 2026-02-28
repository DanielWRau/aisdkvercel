'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import type { NavGroup, NavItem } from '@/components/app-sidebar'

const borderInactive = 'border-slate-200'

function resolveHref(href: string | undefined, projectId: string | null) {
  if (!href || !projectId) return href
  if (href.startsWith('#')) return `/projects/${projectId}/${href.slice(1)}`
  return href
}

export function NavMain({
  workflowGroups,
  bottomItems,
}: {
  workflowGroups: NavGroup[]
  bottomItems: NavItem[]
}) {
  const pathname = usePathname()
  const isInProject = pathname.startsWith('/projects/') && pathname !== '/projects'
  const projectId = isInProject ? pathname.split('/')[2] : null

  return (
    <div className="flex flex-col overflow-x-hidden">
      <SidebarGroup className="px-3 py-3 group-data-[collapsible=icon]:px-2">
        <SidebarMenu>
          <div className="flex flex-col gap-2 group-data-[collapsible=icon]:gap-1">
            {workflowGroups.map((group, gi) => (
              <div
                key={gi}
                className={cn(
                  'border overflow-hidden transition-colors',
                  group.pill ? 'rounded-full' : 'rounded-xl',
                  borderInactive,
                  'group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:rounded-none',
                )}
              >
                {group.items.map((item, ii) => {
                  const href = resolveHref(item.href, projectId)
                  const isActive = href ? pathname.startsWith(href) && !href.startsWith('#') : false
                  return (
                    <React.Fragment key={item.title}>
                      {ii > 0 && <div className="h-px mx-3 bg-slate-100" />}
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          tooltip={item.title}
                          isActive={isActive}
                          asChild={isInProject}
                          disabled={!isInProject}
                          className={cn(
                            'rounded-none h-11 px-4 text-sm',
                            group.pill && 'rounded-full',
                          )}
                        >
                          {isInProject ? (
                            <a href={href}>
                              <item.icon />
                              <span>{item.title}</span>
                            </a>
                          ) : (
                            <>
                              <item.icon />
                              <span>{item.title}</span>
                            </>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </React.Fragment>
                  )
                })}
              </div>
            ))}
          </div>
        </SidebarMenu>
      </SidebarGroup>

      <SidebarSeparator />

      <SidebarGroup className="px-3 py-3 group-data-[collapsible=icon]:px-2">
        <SidebarMenu>
          {bottomItems.map((item) => {
            const href = resolveHref(item.href, projectId)
            const isActive = href ? pathname.startsWith(href) && !href.startsWith('#') : false
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isActive}
                  asChild={isInProject}
                  disabled={!isInProject}
                  className="h-11 px-4 text-sm"
                >
                  {isInProject ? (
                    <a href={href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  ) : (
                    <>
                      <item.icon />
                      <span>{item.title}</span>
                    </>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroup>
    </div>
  )
}
