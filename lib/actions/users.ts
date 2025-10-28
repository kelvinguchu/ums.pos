"use server";

import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { createClient } from "@/lib/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Supabase Admin client for user management
const getSupabaseAdmin = () => {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error("Missing Supabase environment variables");
  }

  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

/**
 * Checks if a user is active in the database
 */
export async function checkUserActive(userId: string): Promise<boolean> {
  const [user] = await db
    .select({ is_active: userProfiles.is_active })
    .from(userProfiles)
    .where(eq(userProfiles.id, userId))
    .limit(1);

  return user?.is_active || false;
}

export async function createUserProfile(
  userId: string,
  role: "admin" | "accountant" | "user"
) {
  const [newProfile] = await db
    .insert(userProfiles)
    .values({
      id: userId,
      role,
      is_active: true,
    })
    .returning();

  return newProfile;
}

export async function getUserProfile(userId: string) {
  const [profile] = await db
    .select({
      name: userProfiles.name,
      role: userProfiles.role,
      is_active: userProfiles.is_active,
    })
    .from(userProfiles)
    .where(eq(userProfiles.id, userId))
    .limit(1);

  if (!profile) {
    return null;
  }

  return profile;
}

export async function updateUserProfile(
  userId: string,
  updates: {
    name?: string;
    role?: "admin" | "accountant" | "user";
    is_active?: boolean;
  }
) {
  const [updatedProfile] = await db
    .update(userProfiles)
    .set({
      ...updates,
    })
    .where(eq(userProfiles.id, userId))
    .returning();

  if (!updatedProfile) {
    throw new Error("Failed to update user profile");
  }

  return updatedProfile;
}

export async function deleteUserProfile(userId: string) {
  const [deletedProfile] = await db
    .delete(userProfiles)
    .where(eq(userProfiles.id, userId))
    .returning();

  if (!deletedProfile) {
    throw new Error("Failed to delete user profile");
  }

  const response = await fetch("/api/delete-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return true;
}

export async function getUsersList() {
  const users = await db
    .select({
      id: userProfiles.id,
      name: userProfiles.name,
      role: userProfiles.role,
      isActive: userProfiles.is_active,
    })
    .from(userProfiles)
    .orderBy(asc(userProfiles.id));

  return users.map((user) => ({
    id: user.id,
    name: user.name || "N/A",
    role: user.role || "user",
    isActive: user.isActive,
  }));
}

export async function createUser(
  email: string,
  password: string,
  role: string,
  name: string
) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Create user with Supabase Admin
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) throw error;
    if (!data.user) throw new Error("Failed to create user");

    // Insert user profile
    const { error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .insert({
        id: data.user.id,
        role,
        is_active: true,
        name,
      });

    if (profileError) throw profileError;

    return {
      success: true,
      message: "User created successfully",
      user: data.user,
    };
  } catch (error: any) {
    throw new Error(error.message || "Failed to create user");
  }
}

export async function changePassword(userId: string, newPassword: string) {
  try {
    if (newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw error;
    }

    // Force sign out after password change
    await signOut();

    return { success: true };
  } catch (error: any) {
    console.error("Error changing password:", error);
    throw new Error(error.message || "Failed to change password");
  }
}

/**
 * Change a user's password using admin privileges (service role)
 */
export async function adminChangePassword(userId: string, newPassword: string) {
  try {
    if (newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    const supabaseAdmin = getSupabaseAdmin();

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

export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const profile = await getUserProfile(user.id);

    // If profile doesn't exist or user is inactive, sign them out
    if (!profile?.is_active) {
      await signOut();
      return null;
    }

    const result = {
      id: user.id,
      email: user.email || "",
      name: profile?.name,
      role: profile?.role,
      is_active: profile?.is_active,
    };

    return result;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

export async function signOut() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
    return { success: true };
  } catch (error: any) {
    console.error("Error signing out:", error);
    throw new Error(error.message || "Failed to sign out");
  }
}
