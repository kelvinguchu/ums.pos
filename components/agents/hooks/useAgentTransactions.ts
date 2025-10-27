import { useQuery } from "@tanstack/react-query";
import { getAgentTransactions } from "@/lib/actions/agents";

export function useAgentTransactions(
  page: number = 1,
  limit: number = 10,
  searchTerm: string = ""
) {
  return useQuery({
    queryKey: ["agentTransactions", page, limit, searchTerm],
    queryFn: () => getAgentTransactions(page, limit, searchTerm),
    staleTime: 1000 * 60 * 2, // Consider data fresh for 2 minutes
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
  });
}
