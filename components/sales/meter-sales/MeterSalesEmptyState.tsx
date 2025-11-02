import { PackageOpen } from "lucide-react";

interface MeterSalesEmptyStateProps {
  message: string;
}

export function MeterSalesEmptyState({ message }: MeterSalesEmptyStateProps) {
  return (
    <div className='flex flex-col items-center justify-center p-8 text-gray-500'>
      <PackageOpen className='w-12 h-12 mb-4' />
      <p className='text-sm'>{message}</p>
    </div>
  );
}
