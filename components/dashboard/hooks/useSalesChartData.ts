import { useQuery } from "@tanstack/react-query";
import { getSalesChartData } from "@/lib/actions/sales";

const CACHE_TIME = 1000 * 60 * 5; // 5 minutes - keep in cache
const STALE_TIME = 1000 * 30; // 30 seconds - refetch after this time

export function useSalesChartData(days: number) {
  return useQuery({
    queryKey: ["salesChartData", days],
    queryFn: () => getSalesChartData(days),
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
}
