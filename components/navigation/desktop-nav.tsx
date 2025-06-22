'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/bill", label: "의안" },
  { href: "/bill/mybill", label: "관심 의안" },
  { href: "/notifications", label: "알림" },
]

export function DesktopNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center space-x-6 text-sm font-medium">
      {navItems.map((item) => {
        const isActive = pathname === item.href || 
          (item.href === "/bill" && pathname.startsWith("/bill/") && pathname !== "/bill/mybill")
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "transition-colors hover:text-foreground/80 touch-optimized relative",
              isActive 
                ? "text-foreground font-semibold" 
                : "text-foreground/60"
            )}
          >
            {item.label}
            {isActive && (
              <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </Link>
        )
      })}
    </nav>
  )
} 