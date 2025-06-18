import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/env";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  // 이미 생성된 클라이언트가 있으면 반환
  if (client) {
    return client;
  }
  
  const config = getSupabaseConfig();
  
  if (!config) {
    // 환경변수가 없을 때 더미 클라이언트 반환
    const dummyClient = {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: () => Promise.resolve({ error: null }),
      },
      from: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
      }),
    } as ReturnType<typeof createBrowserClient>;
    
    return dummyClient;
  }
  
  client = createBrowserClient(config.url, config.key);
  return client;
}

export function isConfigured(): boolean {
  return getSupabaseConfig() !== null;
}
