"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationsCount,
} from "@/lib/actions/notifications";
import { subscribeToNotifications } from "@/lib/services/notificationsClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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

type MeterSaleMetadata = {
  batchId: number;
  meterType: string;
  batchAmount: number;
  destination: string;
  recipient: string;
  totalPrice: string | number;
  unitPrice: string | number;
  customerType: string;
  customerCounty: string;
  customerContact: string;
};

const isMeterSaleMetadata = (
  metadata: unknown
): metadata is MeterSaleMetadata => {
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    "recipient" in metadata &&
    "destination" in metadata &&
    "totalPrice" in metadata &&
    "unitPrice" in metadata
  );
};

const buildNotificationDescription = (notification: Notification) => {
  if (
    notification.type === "METER_SALE" &&
    isMeterSaleMetadata(notification.metadata)
  ) {
    const metadata = notification.metadata;
    const totalPriceNumber = Number(metadata.totalPrice);
    const unitPriceNumber = Number(metadata.unitPrice);

    return (
      <div className='space-y-1 text-left'>
        <div>
          <span className='font-medium'>Recipient:</span> {metadata.recipient}
        </div>
        <div>
          <span className='font-medium'>Destination:</span>{" "}
          {metadata.destination}
        </div>
        <div>
          <span className='font-medium'>Contact:</span>{" "}
          {metadata.customerContact || "N/A"}
        </div>
        <div>
          <span className='font-medium'>County:</span>{" "}
          {metadata.customerCounty || "N/A"}
        </div>
        <div>
          <span className='font-medium'>Meters:</span> {metadata.batchAmount}{" "}
          {metadata.meterType}
        </div>
        <div>
          <span className='font-medium'>Total:</span> KES{" "}
          {Number.isFinite(totalPriceNumber)
            ? totalPriceNumber.toLocaleString()
            : metadata.totalPrice}
        </div>
        <div>
          <span className='font-medium'>Unit Price:</span> KES{" "}
          {Number.isFinite(unitPriceNumber)
            ? unitPriceNumber.toLocaleString()
            : metadata.unitPrice}
        </div>
      </div>
    );
  }

  if (typeof notification.metadata === "string") {
    return notification.metadata;
  }

  return notification.type;
};

interface NotificationContextType {
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query for unread count - only fetches when user is available
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications", "unread-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      return await getUnreadNotificationsCount(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false, // No polling - rely on real-time updates
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!user?.id) return;

      try {
        // Optimistically update unread count
        queryClient.setQueryData(
          ["notifications", "unread-count", user.id],
          (old: number = 0) => Math.max(0, old - 1)
        );

        await markNotificationAsRead(notificationId, user.id);

        // Invalidate to ensure consistency
        queryClient.invalidateQueries({
          queryKey: ["notifications", user.id],
        });
        queryClient.invalidateQueries({
          queryKey: ["notifications", "unread-count", user.id],
        });
      } catch (error) {
        console.error("Error marking notification as read:", error);
        toast.error("Failed to mark notification as read");

        // Revert optimistic update on error
        queryClient.invalidateQueries({
          queryKey: ["notifications", "unread-count", user.id],
        });
      }
    },
    [queryClient, user?.id]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Optimistically set unread count to 0
      queryClient.setQueryData(["notifications", "unread-count", user.id], 0);

      await markAllNotificationsAsRead(user.id);

      // Invalidate to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ["notifications", user.id],
      });

      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast.error("Failed to mark all notifications as read");

      // Revert on error
      queryClient.invalidateQueries({
        queryKey: ["notifications", "unread-count", user.id],
      });
    }
  }, [queryClient, user?.id]);

  // Setup real-time subscription for new notifications
  useEffect(() => {
    if (!user?.id) return;

    let channel: any;

    const handleNewNotification = (notification: Notification) => {
      // Increment the unread count optimistically
      queryClient.setQueryData(
        ["notifications", "unread-count", user.id],
        (old: number = 0) => old + 1
      );

      // Invalidate notifications list to refetch
      queryClient.invalidateQueries({
        queryKey: ["notifications", user.id],
      });

      // Show toast notification with optional metadata and quick action
      toast.info(notification.message, {
        description: buildNotificationDescription(notification),
        duration: 8000,
        action: {
          label: "Mark as read",
          onClick: () => {
            void markAsRead(notification.id);
          },
        },
      });
    };

    const setupSubscription = async () => {
      channel = await subscribeToNotifications(handleNewNotification);
    };

    void setupSubscription();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [user?.id, queryClient, markAsRead]);

  const contextValue = useMemo(
    () => ({
      unreadCount,
      markAsRead,
      markAllAsRead,
    }),
    [unreadCount, markAsRead, markAllAsRead]
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
