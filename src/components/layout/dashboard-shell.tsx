'use client'

import { type ReactNode } from 'react'
import { AuthProvider, AuthGate } from '@/providers/auth-provider'
import { BreadcrumbProvider } from '@/providers/breadcrumb-provider'
import { StatusFooterProvider } from '@/providers/status-footer-provider'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppSidebar } from '@/components/app-sidebar'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import { StatusFooter } from '@/components/status-footer'

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthGate>
        <BreadcrumbProvider>
          <StatusFooterProvider>
            <TooltipProvider>
              <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                  <DashboardHeader />
                  <div className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden">
                    {children}
                  </div>
                  <StatusFooter />
                </SidebarInset>
              </SidebarProvider>
            </TooltipProvider>
          </StatusFooterProvider>
        </BreadcrumbProvider>
      </AuthGate>
    </AuthProvider>
  )
}
