import type { SaleBatch as DBSaleBatch } from "@/lib/db/schema";

export interface MeterDetail {
  batch_id: string;
  serial_number: string;
  recipient: string;
  destination: string;
  customer_type: string | null;
  customer_county: string | null;
  customer_contact: string | null;
}

// Extend the database type to convert numeric fields to numbers
export interface SaleBatch
  extends Omit<DBSaleBatch, "unit_price" | "total_price"> {
  unit_price: number;
  total_price: number;
  meters?: MeterDetail[];
}

export type SaleWithMeters = SaleBatch & { meters: MeterDetail[] };

export interface FiltersProps {
  searchUser: string;
  selectedType: string;
  onSearchChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export interface RemainingMetersByType {
  type: string;
  remaining_meters: number;
}

export interface VirtualItem {
  index: number;
  start: number;
  size: number;
  key: string | number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface MeterCount {
  type: string;
  count: number;
}

export interface DailyReportPDFProps {
  todaySales: SaleBatch[];
  yesterdaySales: SaleBatch[];
  remainingMetersByType: RemainingMetersByType[];
  todayTotalEarnings: number;
  yesterdayTotalEarnings: number;
  agentInventory: AgentInventory[];
}

export interface TimeRangeReportPDFProps {
  sales: SaleBatch[];
  dateRange: DateRange;
  metrics: ReportMetrics;
  remainingMetersByType: RemainingMetersByType[];
  agentInventory: AgentInventory[];
}

export interface ReportMetrics {
  totalSales: number;
  averageDailySales: number;
  totalMeters: number;
  metersByType: { [key: string]: number };
}

export interface AgentInventory {
  type: string;
  with_agents: number;
}
