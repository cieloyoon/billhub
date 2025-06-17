import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // "next" 파라미터가 있으면 리다이렉트 URL로 사용
  let next = searchParams.get('next') ?? '/'
  
  if (!next.startsWith('/')) {
    // "next"가 상대 URL이 아닌 경우 기본값 사용
    next = '/'
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // 오류 발생 시 에러 페이지로 리다이렉트
  return NextResponse.redirect(`${origin}/auth/error?error=Authentication failed`)
} 