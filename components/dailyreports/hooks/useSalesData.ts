import { useMemo } from "react";
import { useRemainingMetersByType, useTodaySales } from "./useReportsData";
import type { SaleBatch, RemainingMetersByType } from "../types";

interface SalesData {
  todaySales: SaleBatch[];
  totalSales: number;
  totalEarnings: number;
  remainingMetersByType: RemainingMetersByType[];
}

export function useSalesData() {
  // Use shared hook for today's sales - direct fetch, no filtering needed
  const todaySalesQuery = useTodaySales();

  // Use shared hook for remaining meters - avoids duplicate fetches
  const remainingMetersQuery = useRemainingMetersByType();

  // Combine and transform the data
  const salesData: SalesData = useMemo(() => {
    const todaySales = todaySalesQuery.data || [];
    const remainingMeters = remainingMetersQuery.data || [];

    return {
      todaySales,
      totalSales: todaySales.length,
      totalEarnings: todaySales.reduce(
        (sum, sale) => sum + sale.total_price,
        0
      ),
      remainingMetersByType: remainingMeters,
    };
  }, [todaySalesQuery.data, remainingMetersQuery.data]);

  return {
    salesData,
    isLoading: todaySalesQuery.isLoading || remainingMetersQuery.isLoading,
    isFetching: todaySalesQuery.isFetching || remainingMetersQuery.isFetching,
    isError: todaySalesQuery.isError || remainingMetersQuery.isError,
    error: todaySalesQuery.error || remainingMetersQuery.error,
    refetch: async (options?: { throwOnError?: boolean }) => {
      const refetchOptions = {
        cancelRefetch: false,
        throwOnError: options?.throwOnError ?? false,
      } as const;

      await Promise.all([
        todaySalesQuery.refetch(refetchOptions),
        remainingMetersQuery.refetch(refetchOptions),
      ]);
    },
  };
}
