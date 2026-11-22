import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createMockSupabaseClient, getSupabasePublicKey, isSupabaseConfigured } from "./mock";

export async function createClient() {
  if (!isSupabaseConfigured()) {
    return createMockSupabaseClient();
  }
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabasePublicKey()!,
    { cookies: {
      get(name: string) { return cookieStore.get(name)?.value; },
      set(name: string, value: string, options: any) { try { cookieStore.set({name,value,...options}); } catch {} },
      remove(name: string, options: any) { try { cookieStore.set({name,value:"",...options}); } catch {} }
    }}
  );
}