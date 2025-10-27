"use client";
import DailyReports from "./DailyReports";
import { Button } from "@/components/ui/button";
import { pdf } from "@react-pdf/renderer";
import DailyReportPDF from "./DailyReportPDF";
import { useState, useEffect } from "react";
import {
  getRemainingMetersByType,
  getAgentInventoryCount,
  getDetailedSalesToday,
  getDetailedSalesYesterday,
  getDetailedSalesByDateRange,
} from "@/lib/actions/reports";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Download } from "lucide-react";
import TimeRangeReportPDF from "./TimeRangeReportPDF";
import { calculateReportMetrics } from "@/lib/services/reportService";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MeterDetail {
  batch_id: string;
  serial_number: string;
  recipient: string;
  destination: string;
  customer_type: string | null;
  customer_county: string | null;
  customer_contact: string | null;
}

interface SaleWithMeters {
  id: string;
  user_id: string;
  user_name: string;
  meter_type: string;
  batch_amount: number;
  unit_price: number;
  total_price: number;
  destination: string;
  recipient: string;
  customer_type: string | null;
  customer_county: string | null;
  customer_contact: string | null;
  sale_date: Date | null;
  transaction_id: string | null;
  meters: MeterDetail[];
}

interface RemainingMetersByType {
  type: string;
  remaining_meters: number;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

interface AgentInventory {
  type: string;
  with_agents: number;
}

const DailyReportsPage = () => {
  const [todaySales, setTodaySales] = useState<SaleWithMeters[]>([]);
  const [yesterdaySales, setYesterdaySales] = useState<SaleWithMeters[]>([]);
  const [remainingMetersByType, setRemainingMetersByType] = useState<
    RemainingMetersByType[]
  >([]);
  const [todayTotalEarnings, setTodayTotalEarnings] = useState<number>(0);
  const [yesterdayTotalEarnings, setYesterdayTotalEarnings] =
    useState<number>(0);
  const [isGeneratingDaily, setIsGeneratingDaily] = useState(false);
  const [isGeneratingOther, setIsGeneratingOther] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | null>(
    null
  );
  const [customDateRange, setCustomDateRange] = useState<any>(null);
  const [specificDate, setSpecificDate] = useState<any>(null);
  const [agentInventory, setAgentInventory] = useState<AgentInventory[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const todaysSales = await getDetailedSalesToday();
        const yesterdaysSales = await getDetailedSalesYesterday();
        const remainingMeters = await getRemainingMetersByType();
        const agentInventoryData = await getAgentInventoryCount();

        setTodaySales(todaysSales);
        setYesterdaySales(yesterdaysSales);
        setRemainingMetersByType(remainingMeters);
        setAgentInventory(agentInventoryData);

        const todayTotal = todaysSales.reduce(
          (sum, sale) => sum + sale.total_price,
          0
        );
        const yesterdayTotal = yesterdaysSales.reduce(
          (sum, sale) => sum + sale.total_price,
          0
        );

        setTodayTotalEarnings(todayTotal);
        setYesterdayTotalEarnings(yesterdayTotal);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  const getDateRange = (option: string): DateRange => {
    const endDate = new Date();
    const startDate = new Date();

    switch (option) {
      case "yesterday":
        startDate.setDate(endDate.getDate() - 1);
        endDate.setDate(endDate.getDate() - 1);
        return { startDate, endDate, label: "Yesterday's Report" };
      case "last5days":
        startDate.setDate(endDate.getDate() - 5);
        return { startDate, endDate, label: "Last 5 Days Report" };
      case "lastWeek":
        startDate.setDate(endDate.getDate() - 7);
        return { startDate, endDate, label: "Last Week Report" };
      case "last10days":
        startDate.setDate(endDate.getDate() - 10);
        return { startDate, endDate, label: "Last 10 Days Report" };
      case "last2weeks":
        startDate.setDate(endDate.getDate() - 14);
        return { startDate, endDate, label: "Last 2 Weeks Report" };
      case "monthly":
        startDate.setDate(1);
        return { startDate, endDate, label: "Monthly Report" };
      default:
        return {
          startDate: new Date(),
          endDate: new Date(),
          label: "Today's Report",
        };
    }
  };

  // Keep this handler exclusively for daily reports
  const handleDownloadDailyReport = async () => {
    try {
      setIsGeneratingDaily(true);
      const blob = await pdf(
        <DailyReportPDF
          todaySales={todaySales}
          yesterdaySales={yesterdaySales}
          remainingMetersByType={remainingMetersByType}
          todayTotalEarnings={todayTotalEarnings}
          yesterdayTotalEarnings={yesterdayTotalEarnings}
          agentInventory={agentInventory}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `daily-report-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.remove();
      URL.revokeObjectURL(url);

      toast.success("Daily report downloaded successfully!");
    } catch (error) {
      console.error("Error downloading report:", error);
      toast.error("Failed to download daily report. Please try again.");
    } finally {
      setIsGeneratingDaily(false);
    }
  };

  // Separate handler for yesterday's report
  const handleYesterdayReport = async () => {
    try {
      setIsGeneratingOther(true);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const today = new Date(yesterday);
      today.setDate(today.getDate() + 1);

      const yesterdaySales = await getDetailedSalesByDateRange(
        yesterday,
        today
      );

      const metrics = {
        totalSales: yesterdaySales.reduce(
          (sum, sale) => sum + sale.total_price,
          0
        ),
        averageDailySales: yesterdaySales.reduce(
          (sum, sale) => sum + sale.total_price,
          0
        ),
        totalMeters: yesterdaySales.reduce(
          (sum, sale) => sum + sale.batch_amount,
          0
        ),
        metersByType: yesterdaySales.reduce(
          (acc: { [key: string]: number }, sale) => {
            acc[sale.meter_type] =
              (acc[sale.meter_type] || 0) + sale.batch_amount;
            return acc;
          },
          {}
        ),
      };

      const blob = await pdf(
        <TimeRangeReportPDF
          sales={yesterdaySales}
          dateRange={{
            startDate: yesterday,
            endDate: yesterday,
            label: "Yesterday's Report",
          }}
          metrics={metrics}
          remainingMetersByType={remainingMetersByType}
          agentInventory={agentInventory}
        />
      ).toBlob();

      handleReportDownload(blob, "yesterday's-report");
    } catch (error) {
      handleReportError(error);
    } finally {
      setIsGeneratingOther(false);
    }
  };

  // Handler for range-based reports
  const handleTimeRangeReport = async (option: string) => {
    if (option === "yesterday") {
      await handleYesterdayReport();
      return;
    }

    try {
      setIsGeneratingOther(true);
      const dateRange = getDateRange(option);
      const filteredSales = await getDetailedSalesByDateRange(
        dateRange.startDate,
        dateRange.endDate
      );
      const metrics = calculateReportMetrics(
        filteredSales,
        dateRange.startDate,
        dateRange.endDate
      );

      const blob = await pdf(
        <TimeRangeReportPDF
          sales={filteredSales}
          dateRange={dateRange}
          metrics={metrics}
          remainingMetersByType={remainingMetersByType}
          agentInventory={agentInventory}
        />
      ).toBlob();

      handleReportDownload(
        blob,
        dateRange.label.toLowerCase().replaceAll(" ", "-")
      );
    } catch (error) {
      handleReportError(error);
    } finally {
      setIsGeneratingOther(false);
    }
  };

  // Helper functions for report handling
  const handleReportDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split("T")[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.remove();
    URL.revokeObjectURL(url);

    toast.success("Report downloaded successfully!");
  };

  const handleReportError = (error: any) => {
    console.error("Error generating report:", error);
    toast.error("Failed to generate report. Please try again.");
  };

  const handleCustomRangeReport = async () => {
    if (!customDateRange?.start || !customDateRange?.end) {
      toast.error("Please select both start and end dates");
      return;
    }

    try {
      setIsGeneratingOther(true);
      const filteredSales = await getDetailedSalesByDateRange(
        new Date(customDateRange.start),
        new Date(customDateRange.end)
      );
      const metrics = calculateReportMetrics(
        filteredSales,
        new Date(customDateRange.start),
        new Date(customDateRange.end)
      );

      const blob = await pdf(
        <TimeRangeReportPDF
          sales={filteredSales}
          dateRange={{
            startDate: new Date(customDateRange.start),
            endDate: new Date(customDateRange.end),
            label: "UMS Report",
          }}
          metrics={metrics}
          remainingMetersByType={remainingMetersByType}
          agentInventory={agentInventory}
        />
      ).toBlob();

      handleReportDownload(blob, "ums-report");
    } catch (error) {
      handleReportError(error);
    } finally {
      setIsGeneratingOther(false);
    }
  };

  const handleSpecificDateReport = async () => {
    if (!specificDate) {
      toast.error("Please select a date");
      return;
    }

    try {
      setIsGeneratingOther(true);
      const selectedDate = new Date(specificDate);
      selectedDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const filteredSales = await getDetailedSalesByDateRange(
        selectedDate,
        nextDay
      );

      const metrics = calculateReportMetrics(
        filteredSales,
        selectedDate,
        selectedDate
      );

      const blob = await pdf(
        <TimeRangeReportPDF
          sales={filteredSales}
          dateRange={{
            startDate: selectedDate,
            endDate: selectedDate,
            label: "UMS Report",
          }}
          metrics={metrics}
          remainingMetersByType={remainingMetersByType}
          agentInventory={agentInventory}
        />
      ).toBlob();

      handleReportDownload(blob, "ums-report");
    } catch (error) {
      handleReportError(error);
    } finally {
      setIsGeneratingOther(false);
    }
  };

  return (
    <div className='mt-20 lg:mt-8 transition-all duration-300 ease-in-out mx-auto w-full sm:w-auto overflow-hidden px-2 sm:px-4 relative'>
      <h1 className='text-3xl font-bold text-center mb-2 drop-shadow-lg'>
        Daily Reports
      </h1>
      <div className='mb-6 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end'>
        <Button
          variant='outline'
          className='flex gap-2 items-center'
          onClick={handleDownloadDailyReport}
          disabled={isGeneratingDaily}>
          <Download className='h-4 w-4' />
          {isGeneratingDaily ? "Preparing..." : "Download Today's Report"}
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant='outline' className='flex gap-2 items-center'>
              Custom Range
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-4'>
            <div className='space-y-4'>
              <h4 className='font-medium leading-none'>Select Date Range</h4>
              <DateRangePicker
                value={customDateRange}
                onChange={setCustomDateRange}
              />
              <Button
                className='w-full text-white'
                style={{ backgroundColor: "#000080" }}
                onClick={handleCustomRangeReport}
                disabled={isGeneratingOther}>
                {isGeneratingOther ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant='outline' className='flex gap-2 items-center'>
              Specific Date
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-4'>
            <div className='space-y-4'>
              <h4 className='font-medium leading-none'>Select Date</h4>
              <DatePicker value={specificDate} onChange={setSpecificDate} />
              <Button
                className='w-full text-white'
                style={{ backgroundColor: "#000080" }}
                onClick={handleSpecificDateReport}
                disabled={isGeneratingOther}>
                {isGeneratingOther ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='outline'
              className='flex gap-2 items-center'
              disabled={isGeneratingOther}>
              {isGeneratingOther ? "Preparing..." : "Other Reports"}{" "}
              <ChevronDown className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-56'>
            <DropdownMenuItem
              onClick={() => handleTimeRangeReport("yesterday")}>
              Yesterday's Report
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleTimeRangeReport("last5days")}>
              Last 5 Days Report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleTimeRangeReport("lastWeek")}>
              Last 7 Days Report
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleTimeRangeReport("last10days")}>
              Last 10 Days Report
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleTimeRangeReport("last2weeks")}>
              Last 2 Weeks Report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleTimeRangeReport("monthly")}>
              Monthly Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DailyReports
        selectedDateRange={selectedDateRange}
        setSelectedDateRange={setSelectedDateRange}
      />
    </div>
  );
};

export default DailyReportsPage;
