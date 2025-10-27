"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationsCount,
} from "@/lib/actions/notifications";
import { subscribeToNotifications } from "@/lib/services/notificationsClient";
import { getCurrentUser } from "@/lib/actions/users";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  message: string;
  created_at: Date | null;
  read_by: string[] | null;
  metadata: unknown;
  created_by: string;
  is_read: boolean;
}

interface NotificationCache {
  notifications: Notification[];
  hasMore: boolean;
  lastFetched: number;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string, userId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  refreshNotifications: (userId: string) => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastFetchedId, setLastFetchedId] = useState<string | null>(null);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  const NOTIFICATIONS_PER_PAGE = 10;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const getCachedNotifications = useCallback((): NotificationCache | null => {
    if (typeof globalThis.localStorage === "undefined") return null;

    const cached = localStorage.getItem("notificationsCache");
    if (!cached) return null;

    const parsedCache = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - parsedCache.lastFetched > CACHE_DURATION) {
      localStorage.removeItem("notificationsCache");
      return null;
    }

    return parsedCache;
  }, [CACHE_DURATION]);

  const updateCache = useCallback((newData: NotificationCache) => {
    if (typeof globalThis.localStorage === "undefined") return;

    localStorage.setItem(
      "notificationsCache",
      JSON.stringify({
        ...newData,
        lastFetched: Date.now(),
      })
    );
  }, []);

  const refreshUnreadCount = useCallback(async (userId: string) => {
    try {
      const count = await getUnreadNotificationsCount(userId);
      setTotalUnreadCount(count);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  }, []);

  const refreshNotifications = useCallback(
    async (userId: string) => {
      try {
        // First check cache
        const cache = getCachedNotifications();
        if (cache) {
          setNotifications(cache.notifications);
          setHasMore(cache.hasMore);
          return;
        }

        const data = await getNotifications(userId, NOTIFICATIONS_PER_PAGE);
        const processedData = data.map((notification) => ({
          ...notification,
          is_read: notification.read_by?.includes(userId) || false,
        }));

        setNotifications(processedData);
        setHasMore(data.length === NOTIFICATIONS_PER_PAGE);
        setLastFetchedId(data.at(-1)?.id ?? null);

        // Update cache
        updateCache({
          notifications: processedData,
          hasMore: data.length === NOTIFICATIONS_PER_PAGE,
          lastFetched: Date.now(),
        });

        // Refresh unread count
        await refreshUnreadCount(userId);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    },
    [
      getCachedNotifications,
      updateCache,
      refreshUnreadCount,
      NOTIFICATIONS_PER_PAGE,
    ]
  );

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
        if (user) {
          await refreshNotifications(user.id);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const markAsRead = useCallback(
    async (notificationId: string, userId: string) => {
      try {
        await markNotificationAsRead(notificationId, userId);
        await refreshNotifications(userId);
      } catch (error) {
        console.error("Error marking notification as read:", error);
        toast.error("Failed to mark notification as read");
      }
    },
    [refreshNotifications]
  );

  const markAllAsRead = useCallback(
    async (userId: string) => {
      try {
        await markAllNotificationsAsRead(userId);
        await refreshNotifications(userId);
        toast.success("All notifications marked as read");
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
        toast.error("Failed to mark all notifications as read");
      }
    },
    [refreshNotifications]
  );

  useEffect(() => {
    if (!currentUser) return;

    let channel: any;

    const setupSubscription = async () => {
      channel = await subscribeToNotifications((notification) => {
        setNotifications((prev) => {
          const exists = prev.some((n) => n.id === notification.id);
          if (exists) return prev;
          return [notification, ...prev];
        });

        toast.info(notification.message, {
          description: notification.type,
          duration: 5000,
        });
      });
    };

    setupSubscription();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [currentUser]);

  const loadMore = useCallback(async () => {
    if (!currentUser || !lastFetchedId) return;

    try {
      const data = await getNotifications(
        currentUser.id,
        NOTIFICATIONS_PER_PAGE,
        lastFetchedId.toString()
      );

      const processedData = data.map((notification) => ({
        ...notification,
        is_read: notification.read_by?.includes(currentUser.id) || false,
      }));

      setNotifications((prev) => {
        const combined = [...prev, ...processedData];
        updateCache({
          notifications: combined,
          hasMore: data.length === NOTIFICATIONS_PER_PAGE,
          lastFetched: Date.now(),
        });
        return combined;
      });
      setHasMore(data.length === NOTIFICATIONS_PER_PAGE);
      if (data.length > 0) {
        setLastFetchedId(data.at(-1)?.id ?? null);
      }
    } catch (error) {
      console.error("Error loading more notifications:", error);
    }
  }, [currentUser, lastFetchedId, updateCache, NOTIFICATIONS_PER_PAGE]);

  // Refresh unread count periodically
  useEffect(() => {
    if (!currentUser) return;

    // Initial fetch
    refreshUnreadCount(currentUser.id);

    // Refresh every minute
    const interval = setInterval(() => {
      refreshUnreadCount(currentUser.id);
    }, 60000);

    return () => clearInterval(interval);
  }, [currentUser, refreshUnreadCount]);

  const contextValue = useMemo(
    () => ({
      notifications,
      unreadCount: totalUnreadCount,
      markAsRead,
      markAllAsRead,
      refreshNotifications,
      loadMore,
      hasMore,
    }),
    [
      notifications,
      totalUnreadCount,
      hasMore,
      markAsRead,
      markAllAsRead,
      refreshNotifications,
      loadMore,
    ]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
}
