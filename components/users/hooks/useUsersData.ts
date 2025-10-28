import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  getUsersList,
  getUserProfile,
  getCurrentUser,
  updateUserProfile,
  deleteUserProfile,
} from "@/lib/actions/users";
// Real-time subscriptions removed as we're migrating from Supabase

interface User {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
  email: string;
}

// Query keys
const USERS_KEYS = {
  all: ["users"] as const,
  lists: () => [...USERS_KEYS.all, "list"] as const,
  current: () => [...USERS_KEYS.all, "current"] as const,
} as const;

// 30 minutes stale time since user data doesn't change frequently
const STALE_TIME = 30 * 60 * 1000;

export function useUsersData(showDeactivated: boolean) {
  const queryClient = useQueryClient();

  // Real-time subscriptions removed during Supabase to Drizzle migration
  // Manual refresh will be required for real-time updates

  // Query for users list
  const {
    data: users = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["users", showDeactivated],
    queryFn: () => getUsersList(),
    staleTime: STALE_TIME, // Data will be considered fresh for 30 minutes
    gcTime: STALE_TIME * 2, // Cache will be kept for 1 hour
    select: (data) =>
      showDeactivated ? data : data.filter((user) => user.isActive),
  });

  // Query for current user
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    staleTime: STALE_TIME,
    gcTime: STALE_TIME * 2,
  });

  // Mutation for updating user
  const { mutateAsync: updateUser, isPending } = useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string;
      updates: any;
    }) => {
      const result = await updateUserProfile(userId, updates);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => deleteUserProfile(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEYS.lists() });
    },
  });

  return {
    users,
    currentUser,
    isLoading,
    isFetching,
    error,
    updateUser,
    isPending,
    refetch: (options?: { throwOnError?: boolean }) =>
      refetch({
        cancelRefetch: false,
        throwOnError: options?.throwOnError ?? false,
      }),
    deleteUser: deleteUserMutation.mutate,
    isDeleting: deleteUserMutation.isPending,
  };
}
