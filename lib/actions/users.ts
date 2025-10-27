"use server";

import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { createClient } from "@/lib/utils/supabase/server";

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
      updated_at: new Date(),
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
  const response = await fetch("/api/create-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role, name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}

// Invite functionality removed - no longer needed

export async function togglePushNotifications(
  userId: string,
  enabled: boolean
) {
  const [data] = await db
    .update(userProfiles)
    .set({ push_enabled: enabled })
    .where(eq(userProfiles.id, userId))
    .returning({ push_enabled: userProfiles.push_enabled });

  return data?.push_enabled === true;
}

export async function getPushNotificationStatus(userId: string) {
  const [data] = await db
    .select({ push_enabled: userProfiles.push_enabled })
    .from(userProfiles)
    .where(eq(userProfiles.id, userId))
    .limit(1);

  return data?.push_enabled === true;
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
