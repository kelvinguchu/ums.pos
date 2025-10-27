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
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}
