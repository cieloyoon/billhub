"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileText, Heart, Bell, Home, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "홈", icon: Home },
  { href: "/bill", label: "의안", icon: FileText },
  { href: "/bill/today", label: "오늘의 의안", icon: Calendar },
  { href: "/bill/mybill", label: "관심 의안", icon: Heart },
  { href: "/notifications", label: "알림", icon: Bell },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t md:hidden safe-area-inset-bottom">
      <div className="flex items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || 
            (item.href === "/bill" && pathname.startsWith("/bill/") && pathname !== "/bill/mybill" && pathname !== "/bill/today")
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "bottom-nav-item",
                isActive && "active"
              )}
            >
              <Icon className={cn("h-5 w-5 mb-1", isActive && "text-primary")} />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
} 