import { createBrowserClient } from "@supabase/ssr";
import { createMockSupabaseClient, getSupabasePublicKey, isSupabaseConfigured } from "./mock";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = getSupabasePublicKey();

export const createClient = () => {
  if (!isSupabaseConfigured()) {
    return createMockSupabaseClient();
  }
  return createBrowserClient(supabaseUrl!, supabaseKey!);
};