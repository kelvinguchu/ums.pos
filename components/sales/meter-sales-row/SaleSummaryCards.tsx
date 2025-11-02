import { Badge } from "@/components/ui/badge";
import { SaleBatch } from "../hooks/useMeterSalesData";

interface SaleSummaryCardsProps {
  batch: SaleBatch;
}

export function SaleSummaryCards({ batch }: SaleSummaryCardsProps) {
  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
      <div className='space-y-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100'>
        <h3 className='font-medium text-blue-800'>Sale Information</h3>
        <div className='space-y-2'>
          <div>
            <p className='text-sm text-blue-600'>Seller</p>
            <p className='font-medium'>{batch.user_name}</p>
          </div>
          <div>
            <p className='text-sm text-blue-600'>Meter Type</p>
            <p className='font-medium'>{batch.meter_type}</p>
          </div>
          <div>
            <p className='text-sm text-blue-600'>Quantity</p>
            <p className='font-medium'>{batch.batch_amount} units</p>
          </div>
        </div>
      </div>

      <div className='space-y-4 p-4 bg-green-50/50 rounded-lg border border-green-100'>
        <h3 className='font-medium text-green-800'>Customer Information</h3>
        <div className='space-y-2'>
          <div>
            <p className='text-sm text-green-600'>Recipient</p>
            <p className='font-medium'>{batch.recipient}</p>
          </div>
          <div>
            <p className='text-sm text-green-600'>Customer Type</p>
            <p className='font-medium capitalize'>
              {batch.customer_type || "N/A"}
            </p>
          </div>
          <div>
            <p className='text-sm text-green-600'>Contact</p>
            <p className='font-medium'>{batch.customer_contact || "N/A"}</p>
          </div>
        </div>
      </div>

      <div className='space-y-4 p-4 bg-purple-50/50 rounded-lg border border-purple-100'>
        <h3 className='font-medium text-purple-800'>Price Information</h3>
        <div className='space-y-2'>
          <div>
            <p className='text-sm text-purple-600'>Total Amount</p>
            <p className='font-medium'>
              KES {Math.round(batch.total_price).toLocaleString()}
            </p>
          </div>
          <div>
            <p className='text-sm text-purple-600'>Unit Price</p>
            <p className='font-medium'>
              KES {Math.round(batch.unit_price).toLocaleString()}
            </p>
          </div>
          <div>
            <p className='text-sm text-purple-600'>Location</p>
            <div className='flex flex-col items-left gap-2'>
              <div>
                <Badge variant='outline' className='bg-purple-100'>
                  county: {batch.customer_county || "N/A"}
                </Badge>
              </div>
              <div>
                <Badge variant='outline' className='bg-green-100'>
                  destination: {batch.destination}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
