"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function QueryProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache data for 5 minutes in memory
            gcTime: 1000 * 60 * 5,
            // Consider data stale after 30 seconds (will refetch in background)
            staleTime: 1000 * 30,
            // TEMPORARILY DISABLED - Testing if this causes the spam
            refetchOnWindowFocus: false,
            // Retry failed requests once (network issues)
            retry: 1,
            // Retry delay (exponential backoff)
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),
            // CRITICAL FIX: Only refetch if data is stale, not on every mount
            refetchOnMount: false,
            // Prevent unnecessary refetches when data is still fresh
            refetchOnReconnect: false,
          },
          mutations: {
            // Retry mutations once on failure
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
