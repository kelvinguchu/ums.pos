/**
 * Page Prefetching Hook - Enhanced Version
 *
 * This hook implements an aggressive data prefetching system for navigation pages.
 * It prefetches data BEFORE users navigate, ensuring instant page loads.
 *
 * Strategy:
 * 1. Prefetch all critical pages on app mount (dashboard, sales, agents)
 * 2. Use exact query keys that match component implementations
 * 3. Set appropriate stale times to prevent unnecessary refetches
 * 4. Prefetch in background without blocking UI
 *
 * CRITICAL: Query keys MUST match exactly with component usage
 * - Dashboard: ["salesChartData", 30]
 * - Sales: ["saleBatches", 1, 10, undefined] (page, limit, filters)
 * - Reports: Multiple queries with specific keys
 * - Users: ["users", false]
 * - Agents: ["agents", "list"]
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

const CACHE_TIME = 1000 * 60 * 5; // 5 minutes - keep in memory
const STALE_TIME = 1000 * 30; // 30 seconds - refetch if older

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
 * Prefetching data aggressively improves perceived performance
 */
export function usePagePrefetch() {
  const queryClient = useQueryClient();

  /**
   * Prefetch dashboard page data
   * MUST match SalesBarchart component query key exactly
   */
  const prefetchDashboard = useCallback(async () => {
    await queryClient.prefetchQuery({
      queryKey: ["salesChartData", 30], // Matches SalesBarchart default
      queryFn: () => getSalesChartData(30),
      staleTime: STALE_TIME,
    });
  }, [queryClient]);

  /**
   * Prefetch sales page data
   * MUST match useMeterSalesData hook query key exactly
   */
  const prefetchSales = useCallback(async () => {
    await queryClient.prefetchQuery({
      queryKey: ["saleBatches", 1, 10, undefined], // Matches useMeterSalesData default (page 1, limit 10, no filters)
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
        queryKey: ["saleBatches", 1, 1000, undefined], // Match component's initial fetch
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
      staleTime: 30 * 60 * 1000, // 30 minutes - users data changes infrequently
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
      staleTime: 60 * 60 * 1000, // 1 hour - agents data rarely changes
    });
  }, [queryClient]);

  /**
   * Prefetch all critical pages at once
   * Call this on app mount for aggressive prefetching
   */
  const prefetchAllPages = useCallback(async () => {
    // Prefetch in priority order - most visited pages first
    const criticalPrefetches = [
      prefetchDashboard(),
      prefetchSales(),
      prefetchAgents(),
    ];

    // Secondary prefetches
    const secondaryPrefetches = [
      prefetchUsers(),
      prefetchReports(),
      prefetchDailyReports(),
    ];

    // Run critical prefetches first
    await Promise.allSettled(criticalPrefetches);

    // Run secondary prefetches in background
    Promise.allSettled(secondaryPrefetches).catch((error) => {
      console.warn("Secondary prefetch failed:", error);
    });
  }, [
    prefetchDashboard,
    prefetchSales,
    prefetchAgents,
    prefetchUsers,
    prefetchReports,
    prefetchDailyReports,
  ]);

  /**
   * Map of page URLs to their prefetch functions
   * Used for on-demand prefetching (e.g., on hover)
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
    prefetchAllPages,
    prefetchDashboard,
    prefetchSales,
    prefetchReports,
    prefetchDailyReports,
    prefetchUsers,
    prefetchAgents,
  };
}
