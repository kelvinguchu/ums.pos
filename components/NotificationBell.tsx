"use client";

import { Bell, MoveUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useNotifications } from "@/contexts/NotificationContext";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useRef, useCallback, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { getNotifications } from "@/lib/actions/notifications";
import { useAuth } from "@/contexts/AuthContext";

// Type for notification metadata
type MeterSaleMetadata = {
  customerType: string;
  customerCounty: string;
  customerContact: string;
  totalPrice: number;
  unitPrice: number;
};

type NotificationWithMetadata = {
  id: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string | null;
  metadata: unknown;
};

// Helper to check if metadata is MeterSaleMetadata
function isMeterSaleMetadata(metadata: unknown): metadata is MeterSaleMetadata {
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    "customerType" in metadata &&
    "customerCounty" in metadata &&
    "customerContact" in metadata &&
    "totalPrice" in metadata &&
    "unitPrice" in metadata
  );
}

// NotificationList component extracted outside
type NotificationListProps = Readonly<{
  notifications: NotificationWithMetadata[];
  isMobile: boolean;
  currentUserId: string;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  onScrollToTop: () => void;
  onMarkAsRead: (notificationId: string) => Promise<void>;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}>;

function NotificationList({
  notifications,
  isMobile,
  currentUserId,
  scrollContainerRef,
  onScrollToTop,
  onMarkAsRead,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: NotificationListProps) {
  const handleNotificationClick = (notification: NotificationWithMetadata) => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
  };

  // Intersection Observer for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <ScrollArea ref={scrollContainerRef} className='h-full'>
      <div className='space-y-4 pr-4'>
        <Button
          variant='outline'
          size='icon'
          className='h-8 w-8 rounded-full fixed bottom-4 right-4 z-50 bg-white shadow-md hover:bg-gray-50 border-gray-200 cursor-pointer'
          onClick={onScrollToTop}
          title='Scroll to top'>
          <MoveUp className='h-4 w-4 text-gray-700' />
        </Button>

        {notifications.length === 0 ? (
          <div className='text-center text-gray-500 py-8'>No notifications</div>
        ) : (
          <>
            {notifications.map((notification) => {
              const metadata =
                notification.type === "METER_SALE" &&
                isMeterSaleMetadata(notification.metadata)
                  ? notification.metadata
                  : null;

              return (
                <button
                  key={notification.id}
                  type='button'
                  className={`w-full p-4 rounded-lg border border-gray-200 cursor-pointer text-left transition-colors ${
                    notification.is_read
                      ? "bg-white hover:bg-gray-50"
                      : "bg-blue-50 hover:bg-blue-100"
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                  aria-label={`Notification: ${notification.message}`}>
                  <div className='font-medium text-gray-900'>
                    {notification.message}
                  </div>
                  {metadata && (
                    <div className='mt-2 space-y-1 text-sm text-gray-600'>
                      <div className='flex flex-wrap gap-2'>
                        <Badge
                          variant='outline'
                          className='bg-blue-100 text-blue-800 border-blue-200'>
                          Type: {metadata.customerType}
                        </Badge>
                        <Badge
                          variant='outline'
                          className='bg-green-100 text-green-800 border-green-200'>
                          County: {metadata.customerCounty}
                        </Badge>
                        <Badge
                          variant='outline'
                          className='bg-yellow-100 text-yellow-800 border-yellow-200'>
                          Contact: {metadata.customerContact}
                        </Badge>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span>
                          Total Price: KES{" "}
                          {metadata.totalPrice.toLocaleString()}
                        </span>
                        <span>•</span>
                        <span>
                          Unit Price: KES {metadata.unitPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className='text-xs text-gray-500 mt-2'>
                    {notification.created_at
                      ? format(new Date(notification.created_at), "PPp")
                      : "Unknown date"}
                  </div>
                </button>
              );
            })}

            {/* Intersection observer trigger */}
            {hasNextPage && (
              <div ref={loadMoreRef} className='p-4 text-center'>
                {isFetchingNextPage ? (
                  <div className='text-sm text-gray-500'>Loading more...</div>
                ) : (
                  <div className='text-sm text-gray-400'>Scroll for more</div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </ScrollArea>
  );
}

// HeaderContent component extracted outside
type HeaderContentProps = Readonly<{
  unreadCount: number;
  onMarkAllAsRead: () => Promise<void>;
  queryClient: ReturnType<typeof useQueryClient>;
}>;

function HeaderContent({
  unreadCount,
  onMarkAllAsRead,
  queryClient,
}: HeaderContentProps) {
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);

  const handleMarkAllAsRead = async () => {
    setIsMarkingAsRead(true);
    try {
      await onMarkAllAsRead();
      // Invalidate the notifications query to refetch with updated data
      await queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });
    } catch (error) {
      console.error("Error marking all as read:", error);
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  return (
    <div className='flex items-center gap-3 pr-8'>
      <span className='text-lg font-semibold text-gray-900'>Notifications</span>
      {unreadCount > 0 && (
        <Button
          variant='outline'
          size='sm'
          onClick={handleMarkAllAsRead}
          disabled={isMarkingAsRead}
          className='text-xs bg-white hover:bg-gray-100 text-gray-700 border-gray-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'>
          {isMarkingAsRead ? "Marking..." : "Mark all as read"}
        </Button>
      )}
    </div>
  );
}

export function NotificationBell() {
  const { unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const NOTIFICATIONS_PER_PAGE = 10;

  // TanStack Query infinite query - only fetch when sheet is open
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["notifications", user?.id],
      queryFn: async ({ pageParam }) => {
        if (!user?.id) return { notifications: [], hasMore: false };

        const notifications = await getNotifications(
          user.id,
          NOTIFICATIONS_PER_PAGE,
          pageParam
        );

        // Process notifications to add is_read flag
        const processedNotifications = notifications.map((notification) => ({
          ...notification,
          is_read: notification.read_by?.includes(user.id) || false,
        }));

        return {
          notifications: processedNotifications,
          hasMore: notifications.length === NOTIFICATIONS_PER_PAGE,
          lastId: notifications.at(-1)?.id ?? null,
        };
      },
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) => {
        return lastPage.hasMore ? lastPage.lastId : undefined;
      },
      enabled: !!user?.id && isOpen,
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false, // Don't refetch on window focus to reduce requests
    });

  // Flatten all pages into a single array and remove duplicates
  const allNotifications =
    data?.pages.flatMap((page) => page.notifications) ?? [];
  const uniqueNotifications = Array.from(
    new Map(allNotifications.map((n) => [n.id, n])).values()
  );

  const handleScrollToTop = useCallback(() => {
    const scrollArea = scrollContainerRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    );
    if (scrollArea) {
      scrollArea.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, []);

  if (!user) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className={`relative cursor-pointer ${
            isMobile ? "w-full justify-start" : ""
          }`}>
          <Bell className={`h-5 w-5 ${isMobile ? "mr-2" : ""}`} />
          {isMobile && <span>Notifications</span>}
          {unreadCount > 0 && (
            <Badge
              variant='destructive'
              className={`absolute h-5 w-5 flex items-center justify-center p-0 ${
                isMobile ? "top-1 right-1" : "-top-2 -right-2"
              }`}>
              {unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side='right'
        className={`bg-gray-50 border-l border-gray-200 px-2 ${
          isMobile ? "w-[90vw]" : "min-w-[30vw]"
        }`}>
        <SheetHeader className='pb-4 border-b border-gray-200'>
          <SheetTitle className='text-gray-900'>
            <HeaderContent
              unreadCount={unreadCount}
              onMarkAllAsRead={markAllAsRead}
              queryClient={queryClient}
            />
          </SheetTitle>
        </SheetHeader>
        {isLoading ? (
          <div className='flex items-center justify-center h-full'>
            <div className='text-sm text-gray-500'>
              Loading notifications...
            </div>
          </div>
        ) : (
          <NotificationList
            notifications={uniqueNotifications as NotificationWithMetadata[]}
            isMobile={isMobile}
            currentUserId={user.id}
            scrollContainerRef={scrollContainerRef}
            onScrollToTop={handleScrollToTop}
            onMarkAsRead={markAsRead}
            fetchNextPage={fetchNextPage}
            hasNextPage={!!hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
