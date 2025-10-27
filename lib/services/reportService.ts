import { format, differenceInDays } from 'date-fns';

export interface ReportMetrics {
  totalSales: number;
  averageDailySales: number;
  totalMeters: number;
  metersByType: { [key: string]: number };
}

export const calculateReportMetrics = (sales: any[], startDate: Date, endDate: Date): ReportMetrics => {
  const totalSales = sales.reduce((sum, sale) => sum + sale.total_price, 0);
  const daysDiff = differenceInDays(endDate, startDate) + 1;
  const averageDailySales = totalSales / daysDiff;
  const totalMeters = sales.reduce((sum, sale) => sum + sale.batch_amount, 0);

  const metersByType = sales.reduce((acc: { [key: string]: number }, sale) => {
    acc[sale.meter_type] = (acc[sale.meter_type] || 0) + sale.batch_amount;
    return acc;
  }, {});

  return {
    totalSales,
    averageDailySales,
    totalMeters,
    metersByType,
  };
};

export const filterSalesByDateRange = (sales: any[], startDate: Date, endDate: Date) => {
  return sales.filter(sale => {
    const saleDate = new Date(sale.sale_date);
    return saleDate >= startDate && saleDate <= endDate;
  });
};
