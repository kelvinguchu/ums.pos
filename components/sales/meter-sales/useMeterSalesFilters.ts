import { useMemo, useState } from "react";

import { CalendarDate } from "@internationalized/date";

interface DateRangeValue {
  start: CalendarDate | null;
  end: CalendarDate | null;
}

interface MeterSalesFilters {
  searchUser?: string;
  meterType?: string;
  customerType?: string;
  dateRange?: { start: Date; end: Date };
  specificDate?: Date;
}

interface UseMeterSalesFiltersReturn {
  searchUser: string;
  selectedType: string | null;
  selectedCustomerType: string | null;
  dateRange: DateRangeValue | null;
  selectedDate: CalendarDate | null;
  filters: MeterSalesFilters | undefined;
  hasActiveFilters: boolean;
  setSearchUser: (value: string) => void;
  setSelectedType: (value: string | null) => void;
  setSelectedCustomerType: (value: string | null) => void;
  setDateRange: (value: DateRangeValue | null) => void;
  setSelectedDate: (value: CalendarDate | null) => void;
  clearFilters: () => void;
}

function buildFilters(
  searchUser: string,
  selectedType: string | null,
  selectedCustomerType: string | null,
  dateRange: DateRangeValue | null,
  selectedDate: CalendarDate | null
): MeterSalesFilters | undefined {
  const filterPayload: MeterSalesFilters = {};

  if (searchUser) {
    filterPayload.searchUser = searchUser;
  }
  if (selectedType) {
    filterPayload.meterType = selectedType;
  }
  if (selectedCustomerType) {
    filterPayload.customerType = selectedCustomerType;
  }
  if (dateRange?.start && dateRange?.end) {
    filterPayload.dateRange = {
      start: new Date(dateRange.start.toString()),
      end: new Date(dateRange.end.toString()),
    };
  }
  if (selectedDate) {
    filterPayload.specificDate = new Date(
      selectedDate.year,
      selectedDate.month - 1,
      selectedDate.day
    );
  }

  return Object.keys(filterPayload).length ? filterPayload : undefined;
}

export function useMeterSalesFilters(): UseMeterSalesFiltersReturn {
  const [searchUser, setSearchUser] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCustomerType, setSelectedCustomerType] = useState<
    string | null
  >(null);
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(null);
  const [selectedDate, setSelectedDate] = useState<CalendarDate | null>(null);

  const filters = useMemo(
    () =>
      buildFilters(
        searchUser,
        selectedType,
        selectedCustomerType,
        dateRange,
        selectedDate
      ),
    [searchUser, selectedType, selectedCustomerType, dateRange, selectedDate]
  );

  const hasActiveFilters = Boolean(
    searchUser ||
      selectedType ||
      selectedCustomerType ||
      dateRange ||
      selectedDate
  );

  const clearFilters = () => {
    setSearchUser("");
    setSelectedType(null);
    setSelectedCustomerType(null);
    setDateRange(null);
    setSelectedDate(null);
  };

  return {
    searchUser,
    selectedType,
    selectedCustomerType,
    dateRange,
    selectedDate,
    filters,
    hasActiveFilters,
    setSearchUser,
    setSelectedType,
    setSelectedCustomerType,
    setDateRange,
    setSelectedDate,
    clearFilters,
  };
}
