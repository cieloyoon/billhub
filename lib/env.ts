export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Supabase environment variables are missing in development');
    }
    return null;
  }
  
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

export function getSiteUrl(): string {
  // 프로덕션에서는 NEXT_PUBLIC_SITE_URL 환경변수 사용
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  
  // 개발환경에서는 localhost 사용
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  
  // 기본값으로 현재 origin 사용 (fallback)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // 서버사이드에서는 빈 문자열 반환 (런타임에 처리)
  return '';
} 