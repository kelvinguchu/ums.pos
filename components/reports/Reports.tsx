"use client";
import React, { Suspense } from "react";
import { useReportsData } from "./hooks/useReportsData";
import Loader from "@/components/ui/Loader";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { MeterInventoryCard } from "./cards/MeterInventoryCard";
import { BestSellerCard } from "./cards/BestSellerCard";
import { EarningsByTypeCard } from "./cards/EarningsByTypeCard";
import { TotalEarningsCard } from "./cards/TotalEarningsCard";
import { CustomerDistributionCard } from "./cards/CustomerDistributionCard";

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

// Lazy load each card component
const LazyCard = ({ children }: { children: React.ReactNode }) => (
  <Suspense
    fallback={
      <div className='h-[300px] animate-pulse bg-gray-100 rounded-lg' />
    }>
    {children}
  </Suspense>
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
    error,
    refetch,
  } = useReportsData();

  const hasReportsAccess = userRole === "admin" || userRole === "accountant";

  const handleRefresh = () => {
    refetch();
    toast.success("Reports data refreshed");
  };

  if (error) {
    return <ErrorState message={error.message} onRetry={handleRefresh} />;
  }

  if (isLoading) {
    return <Loader />;
  }

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
          className='hover:bg-gray-100'>
          <RefreshCw className='h-4 w-4' />
        </Button>
      </div>

      <div className='grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'>
        {/* MeterInventoryCard now spans full width on mobile and 3 columns on larger screens */}
        <div className='col-span-1 lg:col-span-2 xl:col-span-3'>
          <LazyCard>
            <MeterInventoryCard
              remainingMetersByType={remainingMetersByType}
              agentInventory={agentInventory}
              sidebarState='expanded'
            />
          </LazyCard>
        </div>

        <LazyCard>
          <BestSellerCard product={mostSellingProduct} />
        </LazyCard>

        {hasReportsAccess && (
          <>
            <LazyCard>
              <EarningsByTypeCard earnings={earningsByMeterType} />
            </LazyCard>
            <LazyCard>
              <TotalEarningsCard total={totalEarnings} />
            </LazyCard>
          </>
        )}

        <LazyCard>
          <CustomerDistributionCard
            data={customerTypeData}
            sidebarState='expanded'
          />
        </LazyCard>
      </div>
    </div>
  );
}
