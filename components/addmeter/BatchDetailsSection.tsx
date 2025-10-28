import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Loader2 } from "lucide-react";
import BatchDetailsDialog from "./BatchDetailsDialog";

interface BatchDetails {
  purchaseDate: string;
  batchGroups: Array<{
    type: string;
    count: number;
    unitPrice: string;
    totalCost: string;
  }>;
}

interface Meter {
  serialNumber: string;
  type: string;
}

interface BatchDetailsSectionProps {
  batchDetails: BatchDetails | null;
  meters: Meter[];
  isDialogOpen: boolean;
  isSubmitting: boolean;
  onDialogOpenChange: (open: boolean) => void;
  onSubmit: (details: BatchDetails) => void;
  onFinalSubmit: () => void;
}

export function BatchDetailsSection({
  batchDetails,
  meters,
  isDialogOpen,
  isSubmitting,
  onDialogOpenChange,
  onSubmit,
  onFinalSubmit,
}: Readonly<BatchDetailsSectionProps>) {
  const meterGroups = Object.entries(
    meters.reduce<{ [key: string]: number }>((acc, meter) => {
      const type = meter.type.toLowerCase();
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {})
  ).map(([type, count]) => ({ type, count }));

  const meterCount = meters.length;
  const meterPlural = meterCount === 1 ? "" : "s";

  if (meters.length === 0) {
    return null;
  }

  return (
    <>
      {batchDetails ? (
        <div className='space-y-4 mb-6'>
          <div className='flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg'>
            <Badge
              variant='secondary'
              className='bg-gradient-to-r from-blue-500/50 to-indigo-500/50 text-black'>
              Purchase Date:{" "}
              {new Date(batchDetails.purchaseDate).toLocaleDateString()}
            </Badge>
            {batchDetails.batchGroups.map((group) => (
              <Badge
                key={group.type}
                variant='secondary'
                className='bg-gradient-to-r from-indigo-500/50 to-purple-500/50 text-black'>
                {group.type}: KES {group.totalCost}
              </Badge>
            ))}
            <Button
              variant='ghost'
              size='sm'
              onClick={() => onDialogOpenChange(true)}
              className='ml-2 bg-yellow-500/50 to-blue-500/50 text-black cursor-pointer'>
              <Edit2 className='h-4 w-4 mr-1' />
              Edit Details
            </Button>
          </div>

          <Button
            onClick={onFinalSubmit}
            className='w-full bg-[#E46020] hover:bg-[#e46120] text-white cursor-pointer'
            disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Adding Records To the Database...
              </>
            ) : (
              `Submit ${meterCount} Meter${meterPlural}`
            )}
          </Button>
        </div>
      ) : (
        <Button
          onClick={() => onDialogOpenChange(true)}
          className='w-full bg-primary hover:bg-[#000066] mb-4 cursor-pointer'>
          Add Purchase Details
        </Button>
      )}

      <BatchDetailsDialog
        isOpen={isDialogOpen}
        onOpenChange={onDialogOpenChange}
        onSubmit={onSubmit}
        initialData={batchDetails}
        meterGroups={meterGroups}
      />
    </>
  );
}
