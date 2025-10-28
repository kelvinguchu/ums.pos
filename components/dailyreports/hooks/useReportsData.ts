import { useQuery } from "@tanstack/react-query";
import {
  getDetailedSalesToday,
  getDetailedSalesYesterday,
  getRemainingMetersByType,
  getAgentInventoryCount,
} from "@/lib/actions/reports";

const GC_TIME = 1000 * 60 * 5; // 5 minutes
const STALE_TIME = 1000 * 30; // 30 seconds

/**
 * Hook for fetching today's detailed sales
 */
export function useTodaySales() {
  return useQuery({
    queryKey: ["detailedSales", "today"],
    queryFn: getDetailedSalesToday,
    gcTime: GC_TIME,
    staleTime: STALE_TIME,
  });
}

/**
 * Hook for fetching yesterday's detailed sales
 */
export function useYesterdaySales() {
  return useQuery({
    queryKey: ["detailedSales", "yesterday"],
    queryFn: getDetailedSalesYesterday,
    gcTime: GC_TIME,
    staleTime: STALE_TIME,
  });
}

/**
 * Hook for fetching remaining meters by type
 * Shared across multiple components - high cache value
 */
export function useRemainingMetersByType() {
  return useQuery({
    queryKey: ["remainingMetersByType"],
    queryFn: getRemainingMetersByType,
    gcTime: GC_TIME * 2, // 10 minutes - less frequent changes
    staleTime: STALE_TIME * 2, // 1 minute
  });
}

/**
 * Hook for fetching agent inventory count
 * Shared across multiple components - high cache value
 */
export function useAgentInventory() {
  return useQuery({
    queryKey: ["agentInventory"],
    queryFn: getAgentInventoryCount,
    gcTime: GC_TIME * 2, // 10 minutes - less frequent changes
    staleTime: STALE_TIME * 2, // 1 minute
  });
}

/**
 * Combined hook for all reports data
 * Use this when you need multiple data sources
 */
export function useAllReportsData() {
  const todaySales = useTodaySales();
  const yesterdaySales = useYesterdaySales();
  const remainingMeters = useRemainingMetersByType();
  const agentInventory = useAgentInventory();

  return {
    todaySales: todaySales.data ?? [],
    yesterdaySales: yesterdaySales.data ?? [],
    remainingMeters: remainingMeters.data ?? [],
    agentInventory: agentInventory.data ?? [],
    isLoading:
      todaySales.isLoading ||
      yesterdaySales.isLoading ||
      remainingMeters.isLoading ||
      agentInventory.isLoading,
    isError:
      todaySales.isError ||
      yesterdaySales.isError ||
      remainingMeters.isError ||
      agentInventory.isError,
    refetch: () => {
      todaySales.refetch();
      yesterdaySales.refetch();
      remainingMeters.refetch();
      agentInventory.refetch();
    },
  };
}
