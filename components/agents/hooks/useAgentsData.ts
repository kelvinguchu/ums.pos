import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAgentsList } from "@/lib/actions/agents";
import { getUserProfile, getCurrentUser } from "@/lib/actions/users";
import { supabase } from "@/lib/supabase";
import { KenyaCounty } from "@/lib/constants/locationData";

// Define interfaces
interface Agent {
  id: string;
  name: string;
  phone_number: string;
  location: string;
  county: KenyaCounty;
  is_active: boolean;
  total_meters: number;
}

// Query keys
const AGENTS_KEYS = {
  all: ["agents"] as const,
  lists: () => [...AGENTS_KEYS.all, "list"] as const,
} as const;

// 1 hour stale time since agent data changes less frequently
const STALE_TIME = 60 * 60 * 1000; // 1 hour

export function useAgentsData() {
  const queryClient = useQueryClient();

  // Setup real-time subscription
  useEffect(() => {
    const agentsChannel = supabase
      .channel("agents_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agents",
        },
        () => {
          // Invalidate and refetch agents data
          queryClient.invalidateQueries({ queryKey: AGENTS_KEYS.lists() });
        }
      )
      .subscribe();

    return () => {
      agentsChannel.unsubscribe();
    };
  }, [queryClient]);

  // Query for agents list with longer cache duration
  const {
    data: agents = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: AGENTS_KEYS.lists(),
    queryFn: getAgentsList,
    staleTime: STALE_TIME, // Data will be considered fresh for 1 hour
    gcTime: STALE_TIME * 2, // Cache will be kept for 2 hours
  });

  // Query for current user with user profile data
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const user = await getCurrentUser();
      if (user) {
        const profile = await getUserProfile(user.id);
        return {
          ...user,
          name: profile?.name || user.email,
        };
      }
      return null;
    },
    staleTime: STALE_TIME,
    gcTime: STALE_TIME * 2,
  });

  return {
    agentsData: {
      agents,
      currentUser,
    },
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  };
}
