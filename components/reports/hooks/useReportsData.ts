import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  getTopSellingUsers,
  getMostSellingProduct,
  getEarningsByMeterType,
  getCustomerTypeCounts,
} from "@/lib/actions/reports";
import {
  useRemainingMetersByType,
  useAgentInventory,
} from "@/components/dailyreports/hooks/useReportsData";
import type { TopSeller } from "../types";

// Define query keys
const QUERY_KEYS = {
  topSellers: "topSellers",
  mostSellingProduct: "mostSellingProduct",
  earnings: "earnings",
  customerTypes: "customerTypes",
} as const;

const GC_TIME = 1000 * 60 * 5; // 5 minutes
const STALE_TIME = 1000 * 60; // 1 minute

export function useReportsData() {
  const { userRole } = useAuth();

  // Use shared hooks for data that's used across multiple pages
  const remainingMetersQuery = useRemainingMetersByType();
  const agentInventoryQuery = useAgentInventory();

  // Determine if user has reports access (avoid extra query)
  const hasReportsAccess = userRole === "admin" || userRole === "accountant";

  // Top sellers query
  const topSellersQuery = useQuery({
    queryKey: [QUERY_KEYS.topSellers],
    queryFn: async () => {
      const topUsers = await getTopSellingUsers();
      return topUsers
        .reduce((acc: TopSeller[], seller) => {
          const existingSeller = acc.find(
            (s) => s.user_name === seller.user_name
          );
          if (existingSeller) {
            existingSeller.total_sales += Number.parseFloat(seller.total_sales);
          } else {
            acc.push({
              user_name: seller.user_name,
              total_sales: Number.parseFloat(seller.total_sales),
            });
          }
          return acc;
        }, [])
        .sort((a, b) => b.total_sales - a.total_sales);
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  // Most selling product query
  const mostSellingProductQuery = useQuery({
    queryKey: [QUERY_KEYS.mostSellingProduct],
    queryFn: getMostSellingProduct,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  // Customer types query
  const customerTypesQuery = useQuery({
    queryKey: [QUERY_KEYS.customerTypes],
    queryFn: getCustomerTypeCounts,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  // Earnings query (admin/accountant only) - enabled conditionally
  const earningsQuery = useQuery({
    queryKey: [QUERY_KEYS.earnings],
    queryFn: getEarningsByMeterType,
    enabled: hasReportsAccess,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  // Optimized loading check - only check required queries
  const isLoading =
    remainingMetersQuery.isLoading ||
    topSellersQuery.isLoading ||
    mostSellingProductQuery.isLoading ||
    agentInventoryQuery.isLoading ||
    customerTypesQuery.isLoading ||
    (hasReportsAccess && earningsQuery.isLoading);

  const isFetching =
    remainingMetersQuery.isFetching ||
    topSellersQuery.isFetching ||
    mostSellingProductQuery.isFetching ||
    agentInventoryQuery.isFetching ||
    customerTypesQuery.isFetching ||
    (hasReportsAccess && earningsQuery.isFetching);

  // Optimized error check
  const error =
    remainingMetersQuery.error ||
    topSellersQuery.error ||
    mostSellingProductQuery.error ||
    agentInventoryQuery.error ||
    customerTypesQuery.error ||
    (hasReportsAccess && earningsQuery.error);

  return {
    data: {
      remainingMetersByType: remainingMetersQuery.data || [],
      topSellers: topSellersQuery.data || [],
      mostSellingProduct: mostSellingProductQuery.data || "",
      earningsByMeterType: earningsQuery.data || [],
      totalEarnings:
        earningsQuery.data?.reduce(
          (sum, item) => sum + item.total_earnings,
          0
        ) || 0,
      userRole: userRole || "",
      agentInventory: agentInventoryQuery.data || [],
      customerTypeData: customerTypesQuery.data || [],
    },
    isLoading,
    isFetching,
    error,
    refetch: async (options?: { throwOnError?: boolean }) => {
      const refetchOptions = {
        cancelRefetch: false,
        throwOnError: options?.throwOnError ?? false,
      } as const;

      const queries: Array<Promise<unknown>> = [
        topSellersQuery.refetch(refetchOptions),
        mostSellingProductQuery.refetch(refetchOptions),
        customerTypesQuery.refetch(refetchOptions),
        remainingMetersQuery.refetch(refetchOptions),
        agentInventoryQuery.refetch(refetchOptions),
      ];

      if (hasReportsAccess) {
        queries.push(earningsQuery.refetch(refetchOptions));
      }

      await Promise.all(queries);
    },
  };
}
