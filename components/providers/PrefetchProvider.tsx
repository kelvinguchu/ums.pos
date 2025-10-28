"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSaleBatches, getSalesChartData } from "@/lib/actions/sales";
import { getUsersList } from "@/lib/actions/users";
import { getAgentsList, getAgentTransactions } from "@/lib/actions/agents";
import {
  getRemainingMetersByType,
  getAgentInventoryCount,
  getDetailedSalesToday,
  getDetailedSalesYesterday,
  getTopSellingUsers,
  getMostSellingProduct,
  getCustomerTypeCounts,
} from "@/lib/actions/reports";

const CACHE_TIME = 1000 * 60 * 5;
const STALE_TIME = 1000 * 30;

let hasGloballyPrefetched = false;

export function PrefetchProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const queryClient = useQueryClient();
  const hasPrefetched = useRef(false);

  useEffect(() => {
    if (hasGloballyPrefetched || hasPrefetched.current) return;
    hasPrefetched.current = true;
    hasGloballyPrefetched = true;

    const timer = setTimeout(() => {
      const criticalPrefetches = [
        queryClient.prefetchQuery({
          queryKey: ["salesChartData", 30],
          queryFn: () => getSalesChartData(30),
          staleTime: STALE_TIME,
          gcTime: CACHE_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: ["saleBatches", 1, 10, undefined],
          queryFn: () => getSaleBatches(1, 10),
          staleTime: STALE_TIME,
          gcTime: CACHE_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: ["agents", "list"],
          queryFn: () => getAgentsList(),
          staleTime: 60 * 60 * 1000,
          gcTime: CACHE_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: ["agentTransactions", 1, 10, ""],
          queryFn: () => getAgentTransactions(1, 10, ""),
          staleTime: STALE_TIME,
          gcTime: CACHE_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: ["remainingMetersByType"],
          queryFn: () => getRemainingMetersByType(),
          staleTime: STALE_TIME * 2,
          gcTime: CACHE_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: ["agentInventory"],
          queryFn: () => getAgentInventoryCount(),
          staleTime: STALE_TIME * 2,
          gcTime: CACHE_TIME,
        }),
      ];

      const secondaryPrefetches = [
        queryClient.prefetchQuery({
          queryKey: ["users", false],
          queryFn: () => getUsersList(),
          staleTime: 30 * 60 * 1000,
          gcTime: CACHE_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: ["detailedSales", "today"],
          queryFn: () => getDetailedSalesToday(),
          staleTime: STALE_TIME,
          gcTime: CACHE_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: ["detailedSales", "yesterday"],
          queryFn: () => getDetailedSalesYesterday(),
          staleTime: STALE_TIME,
          gcTime: CACHE_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: ["topSellers"],
          queryFn: () => getTopSellingUsers(),
          staleTime: STALE_TIME,
          gcTime: CACHE_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: ["mostSellingProduct"],
          queryFn: () => getMostSellingProduct(),
          staleTime: STALE_TIME,
          gcTime: CACHE_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: ["customerTypes"],
          queryFn: () => getCustomerTypeCounts(),
          staleTime: STALE_TIME,
          gcTime: CACHE_TIME,
        }),
      ];

      Promise.allSettled(criticalPrefetches)
        .then(() => Promise.allSettled(secondaryPrefetches))
        .catch((error) => {
          console.warn("Auto-prefetch failed:", error);
        });
    }, 500);

    return () => clearTimeout(timer);
  }, [queryClient]);

  return <>{children}</>;
}
