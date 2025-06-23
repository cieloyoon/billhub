import type { Metadata, Viewport } from "next"
import type React from "react"
import Link from "next/link"
import "./globals.css"
import { HeaderAuth } from "@/components/auth/header-auth"
import { BillSyncProvider } from "@/hooks/use-bill-sync"
import { CacheSyncProvider } from "@/components/cache-sync-provider"
import { BottomNav } from "@/components/navigation/bottom-nav"
import { DesktopNav } from "@/components/navigation/desktop-nav"
import { FloatingWindowManager } from "@/components/floating-window-manager"
import { FloatingWindowProvider } from "@/hooks/use-floating-window"
import { NotificationProvider } from "@/contexts/notification-context"

export const metadata: Metadata = {
  title: "Billhub",
  description: "법률 정보 관리 시스템",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" }
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-background font-sans antialiased touch-optimized mobile-scroll">
        <FloatingWindowProvider>
          <BillSyncProvider>
            <CacheSyncProvider>
              <NotificationProvider>
                <div className="relative flex min-h-screen flex-col">
              <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="mx-auto flex h-14 max-w-screen-2xl items-center px-4">
                  {/* Mobile logo (left) */}
                  <div className="flex md:hidden">
                    <Link className="flex items-center space-x-2 touch-optimized" href="/">
                      <div className="h-6 w-6 rounded-sm bg-primary" />
                      <span className="font-bold">Billhub</span>
                    </Link>
                  </div>
                  
                  {/* Desktop navigation */}
                  <div className="mr-4 hidden md:flex">
                    <Link className="mr-6 flex items-center space-x-2" href="/">
                      <div className="h-6 w-6 rounded-sm bg-primary" />
                      <span className="hidden font-bold sm:inline-block">
                        Billhub
                      </span>
                    </Link>
                    <DesktopNav />
                  </div>
                  
                  <div className="flex flex-1 items-center justify-end space-x-2">
                    <nav className="flex items-center space-x-2">
                      <HeaderAuth />
                    </nav>
                  </div>
                </div>
              </header>
              <main className="flex-1 pb-16 md:pb-0">
                {children}
              </main>
              <BottomNav />
              <FloatingWindowManager />
                </div>
              </NotificationProvider>
            </CacheSyncProvider>
          </BillSyncProvider>
        </FloatingWindowProvider>
      </body>
    </html>
  )
}
