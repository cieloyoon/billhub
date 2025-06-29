"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "../ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { LogOut, User, Settings, Star } from "lucide-react"
import { createClient, isConfigured } from "@/lib/supabase/client"
import { NotificationDropdown } from "@/components/navigation/notification-dropdown"
import type { User as SupabaseUser, AuthChangeEvent, Session } from "@supabase/supabase-js"

export function HeaderAuth() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [configured, setConfigured] = useState(false)
  const [avatarError, setAvatarError] = useState(false)

  useEffect(() => {
    // Supabase 설정 확인
    const isSupabaseConfigured = isConfigured()
    setConfigured(isSupabaseConfigured)
    
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    const supabase = createClient()
    
    // 현재 사용자 가져오기
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        setAvatarError(false) // 새 사용자일 때 에러 상태 리셋
      } catch (error) {
        console.warn('Failed to get user:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // 인증 상태 변화 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null)
      setAvatarError(false) // 인증 상태 변화 시 에러 상태 리셋
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    if (!configured) return
    
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch (error) {
      console.warn('Failed to sign out:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
      </div>
    )
  }

  // Supabase가 설정되지 않은 경우
  if (!configured) {
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" disabled>
          로그인 (설정 필요)
        </Button>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex gap-2">
        <Button asChild size="sm" variant="ghost" className="mobile-button">
          <Link href="/auth/login">로그인</Link>
        </Button>
        <Button asChild size="sm" variant="default" className="mobile-button">
          <Link href="/auth/sign-up">회원가입</Link>
        </Button>
      </div>
    )
  }

  const getInitials = (email: string) => {
    return email.slice(0, 2).toUpperCase()
  }

  return (
    <div className="flex items-center gap-2">
      <NotificationDropdown />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage 
                src={!avatarError && user.user_metadata?.avatar_url ? user.user_metadata.avatar_url : undefined}
                alt={user.email || "User"}
                onError={() => setAvatarError(true)}
              />
              <AvatarFallback>
                {user.email ? getInitials(user.email) : "U"}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.user_metadata?.full_name || user.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard">
              <User className="mr-2 h-4 w-4" />
              프로필
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/bill/mybill">
              <Star className="mr-2 h-4 w-4" />
              즐겨찾기
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            설정
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  )
} 