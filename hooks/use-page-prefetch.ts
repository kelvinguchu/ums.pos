/**
 * Page Prefetching Hook
 *
 * This hook implements an intelligent data prefetching system for navigation pages.
 * It leverages TanStack Query's prefetchQuery to preload data when users hover over
 * navigation items, significantly improving perceived performance.
 *
 * How it works:
 * 1. When a user hovers over a navigation item (onMouseEnter), the corresponding
 *    page's data is prefetched in the background
 * 2. The prefetched data is stored in TanStack Query's cache
 * 3. When the user clicks to navigate, the data is already available, providing
 *    instant page loads
 * 4. Cache invalidation is handled automatically via staleTime settings
 *
 * Server Actions Called:
 * - Dashboard: getSalesChartData (30 day default)
 * - Sales: getSaleBatches (all sale batches with full details)
 * - Reports: getRemainingMetersByType, getTopSellingUsers, getMostSellingProduct,
 *           getEarningsByMeterType, getAgentInventoryCount, getCustomerTypeCounts
 * - Daily Reports: getSaleBatches, getRemainingMetersByType
 * - Users: getUsersList
 * - Agents: getAgentsList
 *
 * Cache Strategy:
 * - Most queries: 30 seconds stale time (STALE_TIME)
 * - Users: 30 minutes (less frequently changing)
 * - Agents: 1 hour (rarely changes)
 * - Reports metrics: 1 minute (balance between freshness and performance)
 *
 * All prefetch operations are non-blocking and fail gracefully with console warnings
 * if they encounter errors.
 *
 * @see NavigationMenu component for usage
 */

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

// Import server actions
import { getSaleBatches, getSalesChartData } from "@/lib/actions/sales";
import { getUsersList } from "@/lib/actions/users";
import { getAgentsList } from "@/lib/actions/agents";
import {
  getRemainingMetersByType,
  getTopSellingUsers,
  getMostSellingProduct,
  getEarningsByMeterType,
  getAgentInventoryCount,
  getCustomerTypeCounts,
} from "@/lib/actions/reports";

const CACHE_TIME = 1000 * 60 * 5; // 5 minutes
const STALE_TIME = 1000 * 30; // 30 seconds

/**
 * Helper function to aggregate top sellers data
 * Extracted to reduce nesting levels
 */
function aggregateTopSellers(topUsers: any[]) {
  const aggregated = topUsers.reduce((acc: any[], seller) => {
    const existingSeller = acc.find((s) => s.user_name === seller.user_name);
    if (existingSeller) {
      existingSeller.total_sales += Number.parseFloat(seller.total_sales);
    } else {
      acc.push({
        user_name: seller.user_name,
        total_sales: Number.parseFloat(seller.total_sales),
      });
    }
    return acc;
  }, []);
  return aggregated.sort((a, b) => b.total_sales - a.total_sales);
}
/**
 * Hook that provides prefetch functions for all navigation pages
 * Prefetching data on hover improves perceived performance
 */
export function usePagePrefetch() {
  const queryClient = useQueryClient();

  /**
   * Prefetch dashboard page data
   * - Sales chart data for default 30 days period
   */
  const prefetchDashboard = useCallback(async () => {
    await queryClient.prefetchQuery({
      queryKey: ["salesChartData", 30],
      queryFn: () => getSalesChartData(30),
      staleTime: STALE_TIME,
    });
  }, [queryClient]);

  /**
   * Prefetch sales page data
   * - All sale batches with transaction details
   */
  const prefetchSales = useCallback(async () => {
    await queryClient.prefetchQuery({
      queryKey: ["saleBatches", 1, 10],
      queryFn: async () => {
        const data = await getSaleBatches(1, 10);
        return data;
      },
      staleTime: STALE_TIME,
    });
  }, [queryClient]);

  /**
   * Prefetch reports page data
   * - Remaining meters by type
   * - Top selling users
   * - Most selling product
   * - Earnings by meter type (for admin users)
   * - Agent inventory counts
   * - Customer type counts
   */
  const prefetchReports = useCallback(async () => {
    const topSellersFn = async () => {
      const topUsers = await getTopSellingUsers();
      return aggregateTopSellers(topUsers);
    };

    // Prefetch all reports data in parallel
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ["remainingMeters"],
        queryFn: getRemainingMetersByType,
        staleTime: STALE_TIME,
      }),
      queryClient.prefetchQuery({
        queryKey: ["topSellers"],
        queryFn: topSellersFn,
        staleTime: 1000 * 60, // 1 minute
      }),
      queryClient.prefetchQuery({
        queryKey: ["mostSellingProduct"],
        queryFn: getMostSellingProduct,
        staleTime: 1000 * 60, // 1 minute
      }),
      queryClient.prefetchQuery({
        queryKey: ["agentInventory"],
        queryFn: getAgentInventoryCount,
        staleTime: STALE_TIME,
      }),
      queryClient.prefetchQuery({
        queryKey: ["customerTypes"],
        queryFn: getCustomerTypeCounts,
        staleTime: 1000 * 60, // 1 minute
      }),
      queryClient.prefetchQuery({
        queryKey: ["earnings"],
        queryFn: getEarningsByMeterType,
        staleTime: 1000 * 60, // 1 minute
      }),
    ]);
  }, [queryClient]);

  /**
   * Prefetch daily reports page data
   * - Sale batches (reuses sales query)
   * - Remaining meters by type
   */
  const prefetchDailyReports = useCallback(async () => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ["sales"],
        queryFn: () => getSaleBatches(1, 1000),
        staleTime: STALE_TIME,
      }),
      queryClient.prefetchQuery({
        queryKey: ["remainingMeters"],
        queryFn: getRemainingMetersByType,
        staleTime: STALE_TIME,
      }),
    ]);
  }, [queryClient]);

  /**
   * Prefetch users page data
   * - All users list
   */
  const prefetchUsers = useCallback(async () => {
    await queryClient.prefetchQuery({
      queryKey: ["users", false], // false = don't show deactivated users by default
      queryFn: getUsersList,
      staleTime: 30 * 60 * 1000, // 30 minutes
    });
  }, [queryClient]);

  /**
   * Prefetch agents page data
   * - All agents list with inventory counts
   */
  const prefetchAgents = useCallback(async () => {
    await queryClient.prefetchQuery({
      queryKey: ["agents", "list"],
      queryFn: getAgentsList,
      staleTime: 60 * 60 * 1000, // 1 hour
    });
  }, [queryClient]);

  /**
   * Map of page URLs to their prefetch functions
   */
  const prefetchMap = {
    "/dashboard": prefetchDashboard,
    "/sales": prefetchSales,
    "/reports": prefetchReports,
    "/daily-reports": prefetchDailyReports,
    "/users": prefetchUsers,
    "/agents": prefetchAgents,
  } as const;

  /**
   * Prefetch data for a specific page URL
   * @param url - The page URL to prefetch data for
   */
  const prefetchPage = useCallback(
    (url: string) => {
      const prefetchFn = prefetchMap[url as keyof typeof prefetchMap];
      if (prefetchFn) {
        // Run prefetch in background, don't block UI
        prefetchFn().catch((error) => {
          console.warn(`Failed to prefetch data for ${url}:`, error);
        });
      }
    },
    [
      prefetchDashboard,
      prefetchSales,
      prefetchReports,
      prefetchDailyReports,
      prefetchUsers,
      prefetchAgents,
    ]
  );

  return {
    prefetchPage,
    prefetchDashboard,
    prefetchSales,
    prefetchReports,
    prefetchDailyReports,
    prefetchUsers,
    prefetchAgents,
  };
}
