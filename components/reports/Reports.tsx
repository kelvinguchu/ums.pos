"use client";
import React from "react";
import { useReportsData } from "./hooks/useReportsData";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { MeterInventoryCard } from "./cards/MeterInventoryCard";
import { BestSellerCard } from "./cards/BestSellerCard";
import { EarningsByTypeCard } from "./cards/EarningsByTypeCard";
import { TotalEarningsCard } from "./cards/TotalEarningsCard";
import { CustomerDistributionCard } from "./cards/CustomerDistributionCard";
import { cn } from "@/lib/utils";

// Skeleton component for cards
const CardSkeleton = () => (
  <div className='h-[300px] animate-pulse bg-gray-100 rounded-lg' />
);

// Error component
const ErrorState = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div className='flex flex-col items-center justify-center min-h-[60vh] gap-4'>
    <div className='text-lg text-red-500'>Error: {message}</div>
    <Button onClick={onRetry} variant='outline'>
      <RefreshCw className='mr-2 h-4 w-4' />
      Retry
    </Button>
  </div>
);

export default function Reports() {
  const {
    data: {
      remainingMetersByType,
      mostSellingProduct,
      earningsByMeterType,
      totalEarnings,
      userRole,
      agentInventory,
      customerTypeData,
    },
    isLoading,
    isFetching,
    error,
    refetch,
  } = useReportsData();

  const hasReportsAccess = userRole === "admin" || userRole === "accountant";

  const handleRefresh = async () => {
    try {
      await refetch({ throwOnError: true });
      toast.success("Reports data refreshed");
    } catch (err) {
      console.error("Failed to refresh reports data:", err);
      toast.error("Failed to refresh reports data");
    }
  };

  const isRefreshing = isFetching && !isLoading;

  if (error) {
    return <ErrorState message={error.message} onRetry={handleRefresh} />;
  }

  // Progressive rendering - show layout immediately, fill in data as it loads
  return (
    <div className='container p-4 md:p-6 mx-auto'>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-2xl md:text-3xl font-bold text-center drop-shadow-lg'>
          Overall Reports
        </h1>
        <Button
          variant='outline'
          size='icon'
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
          className='hover:bg-gray-100'>
          <RefreshCw
            className={cn(
              "h-4 w-4 transition-transform",
              (isLoading || isRefreshing) && "animate-spin"
            )}
          />
        </Button>
      </div>

      <div className='grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'>
        {/* MeterInventoryCard - spans full width */}
        <div className='col-span-1 lg:col-span-2 xl:col-span-3'>
          {isLoading && !remainingMetersByType.length ? (
            <CardSkeleton />
          ) : (
            <MeterInventoryCard
              remainingMetersByType={remainingMetersByType}
              agentInventory={agentInventory}
              sidebarState='expanded'
            />
          )}
        </div>

        {/* Best Seller Card */}
        {isLoading && !mostSellingProduct ? (
          <CardSkeleton />
        ) : (
          <BestSellerCard product={mostSellingProduct} />
        )}

        {/* Earnings Cards - Admin/Accountant only */}
        {hasReportsAccess && (
          <>
            {isLoading && !earningsByMeterType.length ? (
              <CardSkeleton />
            ) : (
              <EarningsByTypeCard earnings={earningsByMeterType} />
            )}
            {isLoading && totalEarnings === 0 ? (
              <CardSkeleton />
            ) : (
              <TotalEarningsCard total={totalEarnings} />
            )}
          </>
        )}

        {/* Customer Distribution Card */}
        {isLoading && !customerTypeData.length ? (
          <CardSkeleton />
        ) : (
          <CustomerDistributionCard
            data={customerTypeData}
            sidebarState='expanded'
          />
        )}
      </div>
    </div>
  );
}
