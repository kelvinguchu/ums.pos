"use client";
import React, { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSalesData } from "./hooks/useSalesData";
import {
  useRemainingMetersByType,
  useAgentInventory,
} from "./hooks/useReportsData";
import { SalesTable } from "./SalesTable";
import { DailyReportsFilters } from "./DailyReportsFilters";
import { DailyReportsSummary } from "./DailyReportsSummary";
import type {
  DateRange,
  MeterDetail,
  SaleWithMeters,
} from "@/components/dailyreports/types";
import { ErrorBoundary } from "./ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { pdf } from "@react-pdf/renderer";
import TableReportPDF from "@/components/sharedcomponents/TableReportPDF";
import { generateCSV } from "@/lib/utils/csvGenerator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DailyReportsProps {
  selectedDateRange: DateRange | null;
  setSelectedDateRange: (range: DateRange | null) => void;
}

const METER_TYPES = [
  "integrated",
  "split",
  "gas",
  "water",
  "smart",
  "3 phase",
] as const;
type MeterType = (typeof METER_TYPES)[number];

interface RemainingMetersByType {
  type: MeterType;
  remaining_meters: number;
}

interface AgentInventory {
  type: MeterType;
  with_agents: number;
}

const formatSerials = (meters?: MeterDetail[], separator: string = ", ") => {
  if (!meters?.length) {
    return "N/A";
  }

  return meters.map((meter) => meter.serial_number).join(separator);
};

export default function DailyReports({
  selectedDateRange,
  setSelectedDateRange,
}: DailyReportsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchUser, setSearchUser] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const itemsPerPage = 10;

  const { salesData, isLoading, isFetching, isError, error, refetch } =
    useSalesData();

  // Use React Query hooks instead of useEffect - shares cache with parent
  const remainingMetersQuery = useRemainingMetersByType();
  const agentInventoryQuery = useAgentInventory();

  // Normalize data with memoization
  const remainingMetersByType = useMemo(() => {
    const rawData = remainingMetersQuery.data || [];
    return METER_TYPES.map((type) => {
      const existing = rawData.find(
        (meter: any) => meter.type.toLowerCase() === type.toLowerCase()
      );
      return {
        type: type,
        remaining_meters: existing?.remaining_meters || 0,
      };
    });
  }, [remainingMetersQuery.data]);

  const agentInventory = useMemo(() => {
    const rawData = agentInventoryQuery.data || [];
    return METER_TYPES.map((type) => {
      const existing = rawData.find(
        (inventory: any) => inventory.type.toLowerCase() === type.toLowerCase()
      );
      return {
        type: type,
        with_agents: existing?.with_agents || 0,
      };
    });
  }, [agentInventoryQuery.data]);

  // Memoize filtered sales
  const filteredSales = useMemo(() => {
    let filtered = salesData.todaySales as SaleWithMeters[];

    if (searchUser) {
      filtered = filtered.filter((sale) =>
        sale.user_name.toLowerCase().includes(searchUser.toLowerCase())
      );
    }

    if (selectedType && selectedType !== "all") {
      filtered = filtered.filter(
        (sale) => sale.meter_type.toLowerCase() === selectedType.toLowerCase()
      );
    }

    return filtered;
  }, [salesData.todaySales, searchUser, selectedType, selectedDateRange]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const currentItems = filteredSales.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchUser(value);
    setCurrentPage(1);
  }, []);

  const handleTypeChange = useCallback((value: string) => {
    setSelectedType(value);
    setCurrentPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchUser("");
    setSelectedType("all");
    setCurrentPage(1);
  }, []);

  const hasActiveFilters = () => {
    return searchUser || selectedType !== "all";
  };

  const handleExportPDF = async () => {
    const dataToExport = hasActiveFilters() ? currentItems : filteredSales;

    const headers = [
      "Seller's Name",
      "Meter Type",
      "Amount",
      "Total Price",
      "Time",
      "Customer Type",
      "County",
      "Contact",
      "Serial Numbers",
    ];
    const data = dataToExport.map((sale) => [
      sale.user_name,
      sale.meter_type,
      sale.batch_amount.toString(),
      `KES ${sale.total_price.toLocaleString()}`,
      new Date(sale.sale_date || new Date()).toLocaleTimeString(),
      sale.customer_type || "",
      sale.customer_county || "",
      sale.customer_contact || "",
      formatSerials(sale.meters, "\n"),
    ]);

    const blob = await pdf(
      <TableReportPDF
        title='Daily Sales Report'
        headers={headers}
        data={data}
      />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `daily-sales-report-${
      new Date().toISOString().split("T")[0]
    }.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const dataToExport = hasActiveFilters() ? currentItems : filteredSales;

    // Transform the data into the format expected by generateCSV
    const csvData = dataToExport.map((sale) => ({
      "Seller's Name": sale.user_name,
      "Meter Type": sale.meter_type,
      Amount: sale.batch_amount.toString(),
      "Total Price": sale.total_price.toString(),
      Time: new Date(sale.sale_date || new Date()).toLocaleTimeString(),
      "Customer Type": sale.customer_type,
      County: sale.customer_county,
      Contact: sale.customer_contact,
      "Serial Numbers": formatSerials(sale.meters),
    }));

    generateCSV(csvData, "daily_sales_report");
  };

  // Manual refresh handler
  const handleRefresh = async () => {
    try {
      await Promise.all([
        refetch({ throwOnError: true }),
        agentInventoryQuery.refetch({
          cancelRefetch: false,
          throwOnError: true,
        }),
      ]);
      toast.success("Data refreshed successfully");
    } catch (error) {
      toast.error("Failed to refresh data");
    }
  };

  const isRefreshing =
    (isFetching && !isLoading) ||
    agentInventoryQuery.isFetching ||
    remainingMetersQuery.isFetching;

  if (isError) {
    return (
      <div className='text-center py-8 text-red-500'>
        Error loading data: {error?.message}
      </div>
    );
  }

  return (
    <div className='w-full h-full'>
      <ErrorBoundary>
        <Card className='col-span-full shadow-md hover:shadow-xl'>
          <CardHeader>
            <div className='flex justify-between items-center'>
              <CardTitle>
                {selectedDateRange ? selectedDateRange.label : "Today's Sales"}
                {selectedDateRange && (
                  <span className='text-sm text-muted-foreground ml-2'>
                    ({selectedDateRange.startDate.toLocaleDateString()} -{" "}
                    {selectedDateRange.endDate.toLocaleDateString()})
                  </span>
                )}
              </CardTitle>
              <Button
                variant='outline'
                size='icon'
                onClick={handleRefresh}
                disabled={isLoading || isRefreshing}>
                <RefreshCw
                  className={cn(
                    "h-4 w-4 transition-transform",
                    (isLoading || isRefreshing) && "animate-spin"
                  )}
                />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className='mb-6'>
              <div className='flex flex-col sm:flex-row gap-4 mb-2 justify-between'>
                <DailyReportsFilters
                  searchUser={searchUser}
                  selectedType={selectedType}
                  onSearchChange={handleSearchChange}
                  onTypeChange={handleTypeChange}
                  onClearFilters={handleClearFilters}
                  hasActiveFilters={!!searchUser || selectedType !== "all"}
                />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant='outline'>
                      <Download className='mr-2 h-4 w-4' />
                      Export Table as
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleExportPDF}>
                      PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportCSV}>
                      CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <SalesTable
              sales={currentItems}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </CardContent>
        </Card>

        <DailyReportsSummary
          totalEarnings={filteredSales.reduce(
            (sum, sale) => sum + sale.total_price,
            0
          )}
          remainingMetersByType={remainingMetersByType}
          agentInventory={agentInventory}
        />
      </ErrorBoundary>
    </div>
  );
}
