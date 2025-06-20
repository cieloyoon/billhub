'use client'

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { getSiteUrl } from "@/lib/env"
import { SupabaseClient } from "@supabase/supabase-js"
import { useEffect, useState } from "react"

export default function SocialLoginButtons() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    try {
      const client = createClient()
      setSupabase(client)
    } catch {
      // Supabase 클라이언트 생성 실패 시 로그인 버튼 비활성화
      console.warn('Supabase client could not be created')
    }
  }, [])

  const handleOAuthLogin = async (provider: 'google' | 'kakao') => {
    if (!supabase) return
    
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${getSiteUrl()}/auth/callback`,
          ...(provider === 'google' && {
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          }),
        },
      })

      if (error) {
        console.error(`${provider} 로그인 에러:`, error.message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Supabase 클라이언트가 준비되지 않았으면 비활성화
  const isDisabled = !supabase || isLoading

  return (
    <div className="space-y-3">
      {/* Kakao */}
      <Button
        onClick={() => handleOAuthLogin('kakao')}
        disabled={isDisabled}
        className="w-full bg-[#FEE500] hover:bg-[#FEE500]/90 text-black border-0 rounded-lg h-10 px-4 flex items-center justify-center space-x-3 text-base font-medium"
      >
        <svg width="20" height="20" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <path fill="#000000" d="M255.5 48C299.345 48 339.897 56.5332 377.156 73.5996C414.415 90.666 443.871 113.873 465.522 143.22C487.174 172.566 498 204.577 498 239.252C498 273.926 487.174 305.982 465.522 335.42C443.871 364.857 414.46 388.109 377.291 405.175C340.122 422.241 299.525 430.775 255.5 430.775C241.607 430.775 227.262 429.781 212.467 427.795C148.233 472.402 114.042 494.977 109.892 495.518C107.907 496.241 106.012 496.15 104.208 495.248C103.486 494.706 102.945 493.983 102.584 493.08C102.223 492.177 102.043 491.365 102.043 490.642V489.559C103.126 482.515 111.335 453.169 126.672 401.518C91.8486 384.181 64.1974 361.2 43.7185 332.575C23.2395 303.951 13 272.843 13 239.252C13 204.577 23.8259 172.566 45.4777 143.22C67.1295 113.873 96.5849 90.666 133.844 73.5996C171.103 56.5332 211.655 48 255.5 48Z"/>
        </svg>
        <span>{isDisabled ? '로딩 중...' : '카카오로 로그인하기'}</span>
      </Button>

      {/* Google */}
      <Button
        variant="outline"
        onClick={() => handleOAuthLogin('google')}
        disabled={isDisabled}
        className="w-full bg-white hover:bg-gray-50 text-black border border-gray-300 rounded-lg h-10 px-4 flex items-center justify-center space-x-3 text-base font-medium"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span>{isDisabled ? '로딩 중...' : '구글로 로그인하기'}</span>
      </Button>
    </div>
  )
}
