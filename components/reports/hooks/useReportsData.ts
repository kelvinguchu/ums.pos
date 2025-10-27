import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUserProfile,
} from '@/lib/actions/users';
import {
  getTopSellingUsers,
  getMostSellingProduct,
  getEarningsByMeterType,
  getRemainingMetersByType,
  getAgentInventoryCount,
  getCustomerTypeCounts,
} from '@/lib/actions/reports';
import type {
  TopSeller,
  MeterTypeEarnings,
  RemainingMetersByType,
  AgentInventory,
  CustomerTypeData
} from '../types';

// Define query keys
const QUERY_KEYS = {
  remainingMeters: 'remainingMeters',
  topSellers: 'topSellers',
  mostSellingProduct: 'mostSellingProduct',
  earnings: 'earnings',
  agentInventory: 'agentInventory',
  customerTypes: 'customerTypes',
  userRole: 'userRole'
} as const;

export function useReportsData() {
  const queryClient = useQueryClient();
  const { user, userRole, isAuthenticated } = useAuth();

  // User role query - using data from AuthContext instead of separate query
  const userRoleQuery = useQuery({
    queryKey: [QUERY_KEYS.userRole],
    queryFn: async () => {
      if (!isAuthenticated || !user) throw new Error('No user found');
      const profile = await getUserProfile(user.id);
      return profile?.role || '';
    },
    enabled: isAuthenticated && !!user,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour,
    initialData: userRole || '',
  });

  // Remaining meters query
  const remainingMetersQuery = useQuery({
    queryKey: [QUERY_KEYS.remainingMeters],
    queryFn: getRemainingMetersByType,
    staleTime: 1000 * 30, // 30 seconds
  });

  // Top sellers query
  const topSellersQuery = useQuery({
    queryKey: [QUERY_KEYS.topSellers],
    queryFn: async () => {
      const topUsers = await getTopSellingUsers();
      return topUsers.reduce((acc: TopSeller[], seller) => {
        const existingSeller = acc.find(s => s.user_name === seller.user_name);
        if (existingSeller) {
          existingSeller.total_sales += parseFloat(seller.total_sales);
        } else {
          acc.push({
            user_name: seller.user_name,
            total_sales: parseFloat(seller.total_sales)
          });
        }
        return acc;
      }, []).sort((a, b) => b.total_sales - a.total_sales);
    },
    staleTime: 1000 * 60, // 1 minute
  });

  // Most selling product query
  const mostSellingProductQuery = useQuery({
    queryKey: [QUERY_KEYS.mostSellingProduct],
    queryFn: getMostSellingProduct,
    staleTime: 1000 * 60, // 1 minute
  });

  // Agent inventory query
  const agentInventoryQuery = useQuery({
    queryKey: [QUERY_KEYS.agentInventory],
    queryFn: getAgentInventoryCount,
    staleTime: 1000 * 30, // 30 seconds
  });

  // Customer types query
  const customerTypesQuery = useQuery({
    queryKey: [QUERY_KEYS.customerTypes],
    queryFn: getCustomerTypeCounts,
    staleTime: 1000 * 60, // 1 minute
  });

  // Earnings query (admin only)
  const earningsQuery = useQuery({
    queryKey: [QUERY_KEYS.earnings],
    queryFn: getEarningsByMeterType,
    enabled: userRoleQuery.data === 'admin',
    staleTime: 1000 * 60, // 1 minute
  });

  const isLoading = 
    userRoleQuery.isLoading ||
    remainingMetersQuery.isLoading ||
    topSellersQuery.isLoading ||
    mostSellingProductQuery.isLoading ||
    agentInventoryQuery.isLoading ||
    customerTypesQuery.isLoading ||
    (userRoleQuery.data === 'admin' && earningsQuery.isLoading);

  const error = 
    userRoleQuery.error ||
    remainingMetersQuery.error ||
    topSellersQuery.error ||
    mostSellingProductQuery.error ||
    agentInventoryQuery.error ||
    customerTypesQuery.error ||
    (userRoleQuery.data === 'admin' && earningsQuery.error);

  return {
    data: {
      remainingMetersByType: remainingMetersQuery.data || [],
      topSellers: topSellersQuery.data || [],
      mostSellingProduct: mostSellingProductQuery.data || '',
      earningsByMeterType: earningsQuery.data || [],
      totalEarnings: earningsQuery.data?.reduce((sum, item) => sum + item.total_earnings, 0) || 0,
      userRole: userRoleQuery.data || '',
      agentInventory: agentInventoryQuery.data || [],
      customerTypeData: customerTypesQuery.data || [],
    },
    isLoading,
    error,
    refetch: () => {
      queryClient.invalidateQueries();
    }
  };
} 