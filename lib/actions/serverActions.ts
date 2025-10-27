"use server";

import { createClient } from "@supabase/supabase-js";

/**
 * Change a user's password using admin privileges (service role)
 * This function can only be called from the server and uses the service role key
 */
export async function adminChangePassword(userId: string, newPassword: string) {
  try {
    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Use admin API to update user's password
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error: any) {
    console.error("Admin password change error:", error);
    throw new Error(error.message || "Failed to change password");
  }
}
