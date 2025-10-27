export interface TopSeller {
  user_name: string;
  total_sales: number;
}

export interface MeterTypeEarnings {
  meter_type: string;
  total_earnings: number;
}

export interface RemainingMetersByType {
  type: string;
  remaining_meters: number;
}

export interface AgentInventory {
  type: string;
  with_agents: number;
}

export interface CustomerTypeData {
  type: string;
  count: number;
}

export interface EmptyStateProps {
  icon: any;
  message: string;
} 