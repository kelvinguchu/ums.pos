// Re-export types from the existing constants
export type { KenyaCounty, CustomerType } from "@/lib/constants/locationData";

// Additional types specific to database operations
export type UserRole = 'Admin' | 'Accountant' | 'User';

export type NotificationType =
  | 'METER_SALE'
  | 'AGENT_ASSIGNMENT'
  | 'METER_RETURN'
  | 'FAULTY_METER'
  | 'SYSTEM_UPDATE';

export type TransactionType = 'assignment' | 'return';

export type MeterStatus = 'active' | 'replaced' | 'faulty';

export type FaultyMeterStatus = 'pending' | 'repaired' | 'unrepairable';