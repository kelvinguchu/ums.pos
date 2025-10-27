import { createClient } from '@supabase/supabase-js';

// Create a single instance of Supabase client
let supabaseInstance: any = null;

export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          storageKey: 'pos-auth-token'
        }
      }
    );
  }
  return supabaseInstance;
};

// Export a singleton instance
export const supabase = getSupabaseClient();
