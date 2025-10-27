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

const CACHE_TIME = 1000 * 60 * 10; // 10 minutes - increased for better performance
const STALE_TIME = 1000 * 60 * 2; // 2 minutes - data refreshes less frequently

export function useMeterSalesData() {
  // Fetch sales data with caching
  const salesQuery = useQuery({
    queryKey: ["saleBatches"],
    queryFn: async () => {
      const data = await getSaleBatches();
      return data.map((batch) => ({
        ...batch,
        total_price: Number(batch.total_price),
        unit_price: Number(batch.unit_price),
      }));
    },
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });

  return {
    saleBatches: salesQuery.data || [],
    isLoading: salesQuery.isLoading,
    isError: salesQuery.isError,
    error: salesQuery.error,
    refetch: () => {
      salesQuery.refetch();
    },
  };
}
