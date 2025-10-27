"use server";

import { db } from "../db";
import { notifications, userProfiles } from "../db/schema";
import { eq, lt, count, desc, sql, arrayContains } from "drizzle-orm";
import type { Notification } from "../db/schema";

/**
 * Creates a new notification in the system
 */
export async function createNotification({
  type,
  message,
  metadata,
  createdBy,
}: {
  type: string;
  message: string;
  metadata?: any;
  createdBy: string;
}): Promise<Notification> {
  try {
    const [notification] = await db
      .insert(notifications)
      .values({
        type: type as any, // Drizzle expects the enum value
        message,
        metadata,
        created_by: createdBy,
        created_at: new Date(),
      })
      .returning();

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

/**
 * Fetches notifications for a user with optional pagination
 */
export async function getNotifications(
  userId: string,
  limit: number = 5,
  lastId?: string | null
): Promise<Notification[]> {
  try {
    const queryBuilder = db.select().from(notifications);

    const finalQuery = lastId
      ? queryBuilder.where(lt(notifications.id, lastId))
      : queryBuilder;

    return finalQuery.orderBy(desc(notifications.created_at)).limit(limit);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw error;
  }
}

/**
 * Marks a specific notification as read for a user
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<void> {
  try {
    // First get the current notification to read existing read_by array
    const [notification] = await db
      .select({ read_by: notifications.read_by })
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1);

    if (!notification) {
      throw new Error("Notification not found");
    }

    // Create new read_by array with the userId
    const readBy = Array.isArray(notification.read_by)
      ? notification.read_by
      : [];
    if (!readBy.includes(userId)) {
      readBy.push(userId);
    }

    // Update the notification
    await db
      .update(notifications)
      .set({
        read_by: readBy,
        is_read: false, // Only mark as globally read if all users have read it
      })
      .where(eq(notifications.id, notificationId));
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
}

/**
 * Marks all notifications as read for a specific user
 */
export async function markAllNotificationsAsRead(
  userId: string
): Promise<{ success: boolean }> {
  try {
    // Get all unread notifications for this user
    const unreadNotifications = await db
      .select({ id: notifications.id, read_by: notifications.read_by })
      .from(notifications)
      .where(
        sql`NOT (${arrayContains(notifications.read_by, [userId])} OR ${notifications.read_by} IS NULL)`
      );

    if (unreadNotifications.length === 0) {
      return { success: true };
    }

    // Update each notification
    const updates = unreadNotifications.map((notification) => {
      const readBy = (notification.read_by as string[]) || [];
      const updatedReadBy = Array.from(new Set([...readBy, userId]));

      return db
        .update(notifications)
        .set({
          read_by: updatedReadBy,
          is_read: true, // Mark as read when user reads it
        })
        .where(eq(notifications.id, notification.id));
    });

    // Execute all updates
    await Promise.all(updates);

    return { success: true };
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
}

/**
 * Gets the count of unread notifications for a user
 */
export async function getUnreadNotificationsCount(
  userId: string
): Promise<number> {
  try {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(sql`NOT (${userId} = ANY(read_by))`);

    return result.count;
  } catch (error) {
    console.error("Error getting unread notifications count:", error);
    return 0;
  }
}

/**
 * Toggles push notification settings for a user
 * Note: This function is better placed in users.ts but included here for completeness
 */
export async function togglePushNotifications(
  userId: string,
  enabled: boolean
): Promise<boolean> {
  try {
    const [user] = await db
      .update(userProfiles)
      .set({ push_enabled: enabled })
      .where(eq(userProfiles.id, userId))
      .returning({ push_enabled: userProfiles.push_enabled });

    // Return the actual status from the database
    return user?.push_enabled === true;
  } catch (error) {
    console.error("Error toggling push notifications:", error);
    throw error;
  }
}

/**
 * Gets the push notification status for a user
 * Note: This function is better placed in users.ts but included here for completeness
 */
export async function getPushNotificationStatus(
  userId: string
): Promise<boolean> {
  try {
    const [user] = await db
      .select({ push_enabled: userProfiles.push_enabled })
      .from(userProfiles)
      .where(eq(userProfiles.id, userId))
      .limit(1);

    // Explicitly return boolean
    return user?.push_enabled === true;
  } catch (error) {
    console.error("Error getting push notification status:", error);
    return false;
  }
}

/**
 * Creates a notification for a meter sale
 * This is a helper function that creates a standardized notification for meter sales
 */
export async function createMeterSaleNotification({
  userName,
  meterType,
  batchAmount,
  destination,
  recipient,
  totalPrice,
  unitPrice,
  customerType,
  customerCounty,
  customerContact,
  batchId,
  createdBy,
}: {
  userName: string;
  meterType: string;
  batchAmount: number;
  destination: string;
  recipient: string;
  totalPrice: string;
  unitPrice: string;
  customerType: string;
  customerCounty: string;
  customerContact: string;
  batchId: number;
  createdBy: string;
}): Promise<Notification> {
  return createNotification({
    type: "METER_SALE",
    message: `${userName} sold ${batchAmount} ${meterType} meter${batchAmount > 1 ? "s" : ""} to ${recipient} in ${destination}`,
    metadata: {
      batchId,
      meterType,
      batchAmount,
      destination,
      recipient,
      totalPrice,
      unitPrice,
      customerType,
      customerCounty,
      customerContact,
    },
    createdBy,
  });
}

/**
 * Gets notifications by type for reporting or analytics
 */
export async function getNotificationsByType(
  type: string,
  limit: number = 50
): Promise<Notification[]> {
  try {
    const result = await db
      .select()
      .from(notifications)
      .where(eq(notifications.type, type as any))
      .orderBy(desc(notifications.created_at))
      .limit(limit);

    return result;
  } catch (error) {
    console.error("Error getting notifications by type:", error);
    throw error;
  }
}

/**
 * Gets all notifications for admin users with pagination
 */
export async function getAllNotifications(
  page: number = 1,
  pageSize: number = 20
): Promise<{
  notifications: Notification[];
  totalCount: number;
  totalPages: number;
}> {
  try {
    const offset = (page - 1) * pageSize;

    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(notifications);

    const totalCount = countResult?.count || 0;

    // Get paginated results
    const result = await db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.created_at))
      .limit(pageSize)
      .offset(offset);

    return {
      notifications: result,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  } catch (error) {
    console.error("Error getting all notifications:", error);
    throw error;
  }
}

// Client-side realtime helpers live in lib/services/notificationsClient.ts
