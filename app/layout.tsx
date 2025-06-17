import type { Metadata } from "next"
import type React from "react"
import "./globals.css"
import { 
  Search,
  Github,
  Twitter,
  Menu,
  Moon,
  Sun
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { HeaderAuth } from "@/components/header-auth"
import { BillSyncProvider } from "@/hooks/use-bill-sync"


export const metadata: Metadata = {
  title: "Billhub",
  description: "법률 정보 관리 시스템",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-background font-sans antialiased">
        <BillSyncProvider>
          <div className="relative flex min-h-screen flex-col">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto flex h-14 max-w-screen-2xl items-center px-4">
              <div className="mr-4 hidden md:flex">
                <a className="mr-6 flex items-center space-x-2" href="/">
                  <div className="h-6 w-6 rounded-sm bg-primary" />
                  <span className="hidden font-bold sm:inline-block">
                    Billhub
                  </span>
                </a>
                <nav className="flex items-center space-x-6 text-sm font-medium">
                  <a
                    className="transition-colors hover:text-foreground/80 text-foreground"
                    href="/bill"
                  >
                    Bill
                  </a>

                  <a
                    className="transition-colors hover:text-foreground/80 text-foreground/60"
                    href="/bill/mybill"
                  >
                    MyBill
                  </a>
                  <a
                    className="transition-colors hover:text-foreground/80 text-foreground/60"
                    href="/bill/updatedbill"
                  >
                    UpdatedBill
                  </a>
                  <a
                    className="transition-colors hover:text-foreground/80 text-foreground/60"
                    href="/charts"
                  >
                    Charts
                  </a>
                  <a
                    className="transition-colors hover:text-foreground/80 text-foreground/60"
                    href="/themes"
                  >
                    Themes
                  </a>
                  <a
                    className="transition-colors hover:text-foreground/80 text-foreground/60"
                    href="/examples"
                  >
                    Examples
                  </a>
                  <a
                    className="transition-colors hover:text-foreground/80 text-foreground/60"
                    href="/colors"
                  >
                    Colors
                  </a>
                </nav>
              </div>
              <Button
                variant="ghost"
                className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
              <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                <div className="w-full flex-1 md:w-auto md:flex-none">
                  <Button
                    variant="outline"
                    className="relative h-8 w-full justify-start rounded-[0.5rem] bg-background text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64"
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Search documentation...
                    <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                      <span className="text-xs">⌘</span>K
                    </kbd>
                  </Button>
                </div>
                <nav className="flex items-center space-x-2">
                  <HeaderAuth />
                </nav>
              </div>
            </div>
          </header>
          <main className="flex-1">
            {children}
          </main>
        </div>
        </BillSyncProvider>
      </body>
    </html>
  )
}
