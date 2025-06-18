import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/env";

export function createClient() {
  const config = getSupabaseConfig();
  
  if (!config) {
    throw new Error('Supabase configuration is not available');
  }
  
  return createBrowserClient(config.url, config.key);
}
