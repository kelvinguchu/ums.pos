import { ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, X } from "lucide-react";

import { CUSTOMER_TYPES } from "@/lib/constants/locationData";
import { CalendarDate } from "@internationalized/date";

interface DateRangeValue {
  start: CalendarDate | null;
  end: CalendarDate | null;
}

interface MeterSalesFilterBarProps {
  searchUser: string;
  selectedType: string | null;
  selectedCustomerType: string | null;
  dateRange: DateRangeValue | null;
  selectedDate: CalendarDate | null;
  hasActiveFilters: boolean;
  onSearchUserChange: (value: string) => void;
  onMeterTypeChange: (value: string | null) => void;
  onCustomerTypeChange: (value: string | null) => void;
  onDateRangeChange: (value: DateRangeValue | null) => void;
  onSelectedDateChange: (value: CalendarDate | null) => void;
  onClearFilters: () => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
}

export function MeterSalesFilterBar({
  searchUser,
  selectedType,
  selectedCustomerType,
  dateRange,
  selectedDate,
  hasActiveFilters,
  onSearchUserChange,
  onMeterTypeChange,
  onCustomerTypeChange,
  onDateRangeChange,
  onSelectedDateChange,
  onClearFilters,
  onExportCSV,
  onExportPDF,
}: MeterSalesFilterBarProps) {
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchUserChange(event.target.value);
  };

  return (
    <div className='mb-6 space-y-4'>
      <div className='bg-white p-4 rounded-lg border shadow-sm'>
        <div className='flex flex-wrap items-center gap-3'>
          <Input
            type='text'
            placeholder='Search by seller or recipient...'
            value={searchUser}
            onChange={handleSearchChange}
            className='w-[200px]'
          />

          <Select
            value={selectedType || "all"}
            onValueChange={(value) =>
              onMeterTypeChange(value === "all" ? null : value)
            }>
            <SelectTrigger className='w-[140px] cursor-pointer'>
              <SelectValue placeholder='Meter Type' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Types</SelectItem>
              <SelectItem value='split'>Split</SelectItem>
              <SelectItem value='integrated'>Integrated</SelectItem>
              <SelectItem value='gas'>Gas</SelectItem>
              <SelectItem value='water'>Water</SelectItem>
              <SelectItem value='3 Phase'>3 Phase</SelectItem>
              <SelectItem value='Smart'>Smart</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={selectedCustomerType || "all"}
            onValueChange={(value) =>
              onCustomerTypeChange(value === "all" ? null : value)
            }>
            <SelectTrigger className='w-[140px] cursor-pointer'>
              <SelectValue placeholder='Customer Type' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Customers</SelectItem>
              {CUSTOMER_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className='w-[130px]'>
            <DatePicker
              value={selectedDate}
              onChange={onSelectedDateChange}
              label='Single date'
            />
          </div>

          <div className='w-[200px]'>
            <DateRangePicker
              value={dateRange}
              onChange={onDateRangeChange}
              label='Date range'
            />
          </div>

          <div className='flex items-center gap-2 ml-auto'>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' size='sm' className='cursor-pointer'>
                  <Download className='mr-2 h-4 w-4' />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem onClick={onExportPDF}>PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={onExportCSV}>CSV</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {hasActiveFilters && (
              <Button
                variant='ghost'
                size='icon'
                onClick={onClearFilters}
                className='text-muted-foreground hover:text-foreground cursor-pointer'>
                <X className='h-4 w-4' />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
