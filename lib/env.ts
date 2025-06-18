export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    if (typeof window === 'undefined') {
      // 서버 환경에서는 로그만 남기고 에러를 던지지 않음
      console.warn('Supabase environment variables are missing');
      return null;
    }
    throw new Error('Missing Supabase environment variables');
  }
  
  return { url, key };
} 