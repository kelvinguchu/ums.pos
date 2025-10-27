"use client";

import { memo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Meter {
  id?: string;
  serialNumber: string;
  type: string;
  addedBy: string;
  addedAt: string;
  adderName: string;
}

interface MetersListProps {
  meters: Meter[];
  onRemoveMeter: (index: number) => void;
}

export const MetersList = memo(function MetersList({
  meters,
  onRemoveMeter,
}: MetersListProps) {
  if (meters.length === 0) {
    return null;
  }

  return (
    <div className='mt-6'>
      <div className='flex justify-between items-center mb-2'>
        <h3 className='text-lg font-semibold text-gray-700'>Added Meters</h3>
        <span className='text-sm text-gray-500'>
          Total: {meters.length} meter{meters.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className='max-h-[400px] overflow-y-auto border border-gray-200 rounded-md'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='bg-gray-50'>Serial Number</TableHead>
              <TableHead className='bg-gray-50'>Type</TableHead>
              <TableHead className='bg-gray-50'>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meters.map((meter, index) => (
              <TableRow
                key={`${meter.serialNumber}-${index}`}
                data-row-index={index}
                className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <TableCell>{meter.serialNumber}</TableCell>
                <TableCell>
                  {meter.type.charAt(0).toUpperCase() + meter.type.slice(1)}
                </TableCell>
                <TableCell>
                  <Button
                    onClick={() => onRemoveMeter(index)}
                    variant='ghost'
                    size='sm'
                    className='hover:bg-red-100 hover:text-red-600 transition-colors'>
                    <X className='h-4 w-4' />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
});
