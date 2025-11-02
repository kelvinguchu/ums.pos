import { ReactNode } from "react";

import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

interface MeterSalesHeaderProps {
  title?: string;
  actions?: ReactNode;
  onRefresh: () => void;
  isRefreshing: boolean;
  disableRefresh?: boolean;
}

export function MeterSalesHeader({
  title = "Meter Sales",
  actions,
  onRefresh,
  isRefreshing,
  disableRefresh = false,
}: MeterSalesHeaderProps) {
  const isDisabled = disableRefresh || isRefreshing;

  return (
    <CardHeader className='p-4 md:p-6'>
      <div className='flex justify-between items-center'>
        <CardTitle className='text-lg md:text-xl'>{title}</CardTitle>
        <div className='flex items-center gap-2'>
          {actions}
          <Button
            variant='outline'
            size='icon'
            onClick={onRefresh}
            className='hover:bg-gray-100 cursor-pointer'
            disabled={isDisabled}
            aria-label='Refresh sales data'>
            <RefreshCw
              className={cn(
                "h-4 w-4 transition-transform",
                isRefreshing && "animate-spin",
                isDisabled ? "opacity-50" : "opacity-100"
              )}
            />
          </Button>
        </div>
      </div>
    </CardHeader>
  );
}
