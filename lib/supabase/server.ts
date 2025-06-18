import { createServerClient, type SupabaseClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "@/lib/env";

export async function createClient() {
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
        select: () => ({
          gte: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
          eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
          order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
          limit: () => Promise.resolve({ data: [], error: null }),
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
        upsert: () => Promise.resolve({ data: null, error: null }),
      }),
    } as SupabaseClient;
    
    return dummyClient;
  }
  
  const cookieStore = await cookies();

  return createServerClient(
    config.url,
    config.key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}
