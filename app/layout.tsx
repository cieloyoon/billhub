import type { Metadata } from "next"
import type React from "react"
import Link from "next/link"
import "./globals.css"
import { 
  Search,
  Menu
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
                <Link className="mr-6 flex items-center space-x-2" href="/">
                  <div className="h-6 w-6 rounded-sm bg-primary" />
                  <span className="hidden font-bold sm:inline-block">
                    Billhub
                  </span>
                </Link>
                <nav className="flex items-center space-x-6 text-sm font-medium">
                  <Link
                    className="transition-colors hover:text-foreground/80 text-foreground"
                    href="/bill"
                  >
                    Bill
                  </Link>

                  <Link
                    className="transition-colors hover:text-foreground/80 text-foreground/60"
                    href="/bill/mybill"
                  >
                    MyBill
                  </Link>
                  <Link
                    className="transition-colors hover:text-foreground/80 text-foreground/60"
                    href="/bill/updatedbill"
                  >
                    UpdatedBill
                  </Link>
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
              <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
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
