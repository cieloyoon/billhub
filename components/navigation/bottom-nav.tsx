"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileText, Heart, Bell, Home } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "홈", icon: Home },
  { href: "/bill", label: "법안", icon: FileText },
  { href: "/bill/mybill", label: "내 법안", icon: Heart },
  { href: "/bill/notification", label: "업데이트", icon: Bell },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t md:hidden safe-area-inset-bottom">
      <div className="flex items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
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