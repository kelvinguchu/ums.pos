import { useQuery } from "@tanstack/react-query";
import { getSaleBatches } from "@/lib/actions/sales";

export interface SaleBatch {
  id: string;
  user_name: string;
  meter_type: string;
  batch_amount: number;
  sale_date: Date | null;
  destination: string;
  recipient: string;
  total_price: number;
  unit_price: number;
  customer_type: string | null;
  customer_county: string | null;
  customer_contact: string | null;
  transaction_id: string | null;
  notes: string | null;
  note_by: string | null;
}

const CACHE_TIME = 1000 * 60 * 5;
const STALE_TIME = 1000 * 30;

export function useMeterSalesData(
  page: number = 1,
  limit: number = 10,
  filters?: {
    searchUser?: string;
    meterType?: string;
    customerType?: string;
    dateRange?: { start: Date; end: Date };
    specificDate?: Date;
  }
) {
  // Fetch sales data with caching and server-side pagination
  const salesQuery = useQuery({
    queryKey: ["saleBatches", page, limit, filters],
    queryFn: async () => {
      const data = await getSaleBatches(page, limit, filters);
      return data;
    },
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
    placeholderData: (previousData) => previousData,
  });

  return {
    saleBatches: salesQuery.data?.batches || [],
    pagination: salesQuery.data?.pagination || {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    },
    isLoading: salesQuery.isLoading,
    isFetching: salesQuery.isFetching,
    isError: salesQuery.isError,
    error: salesQuery.error,
    refetch: async (options?: { throwOnError?: boolean }) => {
      return salesQuery.refetch({
        cancelRefetch: false,
        throwOnError: options?.throwOnError ?? false,
      });
    },
  };
}
