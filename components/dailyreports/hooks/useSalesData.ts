import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSaleBatches } from "@/lib/actions/sales";
import { getRemainingMetersByType } from "@/lib/actions/reports";
import type { SaleBatch, RemainingMetersByType } from "../types";
import { startOfDay, endOfDay } from "date-fns";

interface SalesData {
  todaySales: SaleBatch[];
  totalSales: number;
  totalEarnings: number;
  remainingMetersByType: RemainingMetersByType[];
}

const GC_TIME = 1000 * 60 * 5; // 5 minutes
const STALE_TIME = 1000 * 30; // 30 seconds

export function useSalesData() {
  // Note: Real-time subscriptions removed during migration to Drizzle ORM
  // Consider implementing polling or server-sent events for real-time updates in the future

  // Fetch sales data with caching
  const salesQuery = useQuery({
    queryKey: ["sales"],
    queryFn: () => getSaleBatches(1, 1000), // Fetch first 1000 records for dashboard
    gcTime: GC_TIME,
    staleTime: STALE_TIME,
  });

  // Fetch remaining meters with caching
  const remainingMetersQuery = useQuery({
    queryKey: ["remainingMeters"],
    queryFn: getRemainingMetersByType,
    gcTime: GC_TIME,
    staleTime: STALE_TIME,
  });

  // Combine and transform the data
  const salesData: SalesData = useMemo(() => {
    const salesResponse = salesQuery.data;
    const sales = salesResponse?.batches || [];
    const remainingMeters = remainingMetersQuery.data || [];

    // Filter for today's sales
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    const todaySales = sales.filter((sale) => {
      if (!sale.sale_date) return false;
      const saleDate = new Date(sale.sale_date);
      return saleDate >= todayStart && saleDate <= todayEnd;
    });

    return {
      todaySales,
      totalSales: todaySales.length,
      totalEarnings: todaySales.reduce(
        (sum, sale) => sum + sale.total_price,
        0
      ),
      remainingMetersByType: remainingMeters,
    };
  }, [salesQuery.data, remainingMetersQuery.data]);

  return {
    salesData,
    isLoading: salesQuery.isLoading || remainingMetersQuery.isLoading,
    isError: salesQuery.isError || remainingMetersQuery.isError,
    error: salesQuery.error || remainingMetersQuery.error,
    refetch: () => {
      salesQuery.refetch();
      remainingMetersQuery.refetch();
    },
  };
}
