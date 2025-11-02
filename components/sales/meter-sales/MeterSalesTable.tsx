import React from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { MeterSalesRow } from "../MeterSalesRow";
import { prefetchMeterSaleDetails } from "../meter-sales-row/useMeterSaleDetails";
import type { SaleBatch } from "../hooks/useMeterSalesData";

interface MeterSalesTableProps {
  batches: SaleBatch[];
  selectedBatchId: string | null;
  onToggleBatch: (batchId: string) => void;
  onSheetOpenChange: (batchId: string, open: boolean) => void;
  onOpenNoteDialog: (batch: SaleBatch) => void;
  formatDate: (date: Date | null) => string;
}

function MobileBatchCard({
  batch,
  isOpen,
  onToggleBatch,
  onSheetOpenChange,
  onOpenNoteDialog,
  formatDate,
}: {
  batch: SaleBatch;
  isOpen: boolean;
  onToggleBatch: (batchId: string) => void;
  onSheetOpenChange: (batchId: string, open: boolean) => void;
  onOpenNoteDialog: (batch: SaleBatch) => void;
  formatDate: (date: Date | null) => string;
}) {
  return (
    <div className='space-y-2'>
      <button
        type='button'
        className='w-full bg-white p-4 rounded-lg border shadow-sm space-y-2 text-left cursor-pointer focus-visible:outline-none focus-visible:ring focus-visible:ring-offset-2 focus-visible:ring-blue-500'
        onClick={() => onToggleBatch(batch.id)}
        onMouseEnter={() => prefetchMeterSaleDetails(batch.id)}
        onFocus={() => prefetchMeterSaleDetails(batch.id)}
        onTouchStart={() => prefetchMeterSaleDetails(batch.id)}>
        <div className='flex justify-between items-start'>
          <div>
            <p className='font-medium'>{batch.user_name}</p>
            <p className='text-sm text-muted-foreground'>
              {formatDate(batch.sale_date)}
            </p>
          </div>
          <Badge variant='outline' className='bg-blue-100'>
            {batch.customer_type}
          </Badge>
        </div>
        <div className='grid grid-cols-2 gap-2 text-sm'>
          <div>
            <p className='text-muted-foreground'>Meter Type</p>
            <p>{batch.meter_type}</p>
          </div>
          <div>
            <p className='text-muted-foreground'>Amount</p>
            <p>{batch.batch_amount}</p>
          </div>
          <div>
            <p className='text-muted-foreground'>Sale Amount</p>
            <p>KES {Math.round(batch.total_price).toLocaleString()}</p>
          </div>
          <div>
            <p className='text-muted-foreground'>County</p>
            <Badge variant='outline' className='bg-green-100'>
              {batch.customer_county}
            </Badge>
          </div>
        </div>
      </button>
      <MeterSalesRow
        batch={batch}
        isOpen={isOpen}
        onOpenChange={(open) => onSheetOpenChange(batch.id, open)}
        onOpenNoteDialog={onOpenNoteDialog}
      />
    </div>
  );
}

function DesktopBatchRow({
  batch,
  isOpen,
  onToggleBatch,
  onSheetOpenChange,
  onOpenNoteDialog,
  formatDate,
}: {
  batch: SaleBatch;
  isOpen: boolean;
  onToggleBatch: (batchId: string) => void;
  onSheetOpenChange: (batchId: string, open: boolean) => void;
  onOpenNoteDialog: (batch: SaleBatch) => void;
  formatDate: (date: Date | null) => string;
}) {
  return (
    <React.Fragment key={batch.id}>
      <TableRow
        className='cursor-pointer hover:bg-muted/50'
        onClick={() => onToggleBatch(batch.id)}
        onMouseEnter={() => prefetchMeterSaleDetails(batch.id)}
        onFocus={() => prefetchMeterSaleDetails(batch.id)}
        onTouchStart={() => prefetchMeterSaleDetails(batch.id)}>
        <TableCell>{batch.user_name}</TableCell>
        <TableCell>{batch.meter_type}</TableCell>
        <TableCell className='text-center'>{batch.batch_amount}</TableCell>
        <TableCell>
          KES {Math.round(batch.total_price).toLocaleString()}
        </TableCell>
        <TableCell>{formatDate(batch.sale_date)}</TableCell>
        <TableCell className='max-w-[200px] truncate'>
          {batch.recipient}
        </TableCell>
        <TableCell>
          <Badge variant='outline' className='bg-blue-100'>
            {batch.customer_type}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant='outline' className='bg-green-100'>
            {batch.customer_county}
          </Badge>
        </TableCell>
      </TableRow>
      <MeterSalesRow
        batch={batch}
        isOpen={isOpen}
        onOpenChange={(open) => onSheetOpenChange(batch.id, open)}
        onOpenNoteDialog={onOpenNoteDialog}
      />
    </React.Fragment>
  );
}

export function MeterSalesTable({
  batches,
  selectedBatchId,
  onToggleBatch,
  onSheetOpenChange,
  onOpenNoteDialog,
  formatDate,
}: MeterSalesTableProps) {
  if (!batches.length) {
    return null;
  }

  return (
    <div className='overflow-x-auto'>
      <div className='md:hidden space-y-4 p-4'>
        {batches.map((batch) => (
          <MobileBatchCard
            key={batch.id}
            batch={batch}
            isOpen={selectedBatchId === batch.id}
            onToggleBatch={onToggleBatch}
            onSheetOpenChange={onSheetOpenChange}
            onOpenNoteDialog={onOpenNoteDialog}
            formatDate={formatDate}
          />
        ))}
      </div>

      <div className='hidden md:block'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[18%]'>Seller</TableHead>
              <TableHead className='w-[6%]'>Type</TableHead>
              <TableHead className='w-[7%] text-center'>Quantity</TableHead>
              <TableHead className='w-[15%]'>Sale Amount</TableHead>
              <TableHead className='w-[12%]'>Sale Date</TableHead>
              <TableHead className='w-[16%]'>Recipient</TableHead>
              <TableHead className='w-[16%]'>Customer Type</TableHead>
              <TableHead className='w-[11%]'>County</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((batch) => (
              <DesktopBatchRow
                key={batch.id}
                batch={batch}
                isOpen={selectedBatchId === batch.id}
                onToggleBatch={onToggleBatch}
                onSheetOpenChange={onSheetOpenChange}
                onOpenNoteDialog={onOpenNoteDialog}
                formatDate={formatDate}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
