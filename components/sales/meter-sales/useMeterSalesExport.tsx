import { useCallback } from "react";

import { pdf } from "@react-pdf/renderer";

import TableReportPDF from "../../sharedcomponents/TableReportPDF";
import { generateCSV } from "../../../lib/utils/csvGenerator";

import type { SaleBatch } from "../hooks/useMeterSalesData";

interface UseMeterSalesExportOptions {
  formatDate: (date: Date | null) => string;
}

export function useMeterSalesExport(
  batches: SaleBatch[],
  { formatDate }: UseMeterSalesExportOptions
) {
  const handleExportPDF = useCallback(async () => {
    if (!batches.length) {
      return;
    }

    const headers = [
      "Seller",
      "Meter Type",
      "Amount",
      "Sale Amount",
      "Sale Date",
      "Customer Type",
      "County",
      "Contact",
    ];

    const data = batches.map((batch) => [
      batch.user_name,
      batch.meter_type,
      batch.batch_amount.toString(),
      `KES ${Math.round(batch.total_price).toLocaleString()}`,
      formatDate(batch.sale_date),
      batch.customer_type || "N/A",
      batch.customer_county || "N/A",
      batch.customer_contact || "N/A",
    ]);

    const blob = await pdf(
      <TableReportPDF
        title='Meter Sales Report'
        headers={headers}
        data={data}
      />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `meter-sales-report-${
      new Date().toISOString().split("T")[0]
    }.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [batches, formatDate]);

  const handleExportCSV = useCallback(() => {
    if (!batches.length) {
      return;
    }

    const csvData = batches.map((batch) => ({
      Seller: batch.user_name,
      "Meter Type": batch.meter_type,
      Amount: batch.batch_amount.toString(),
      "Sale Amount": batch.total_price.toString(),
      "Sale Date": formatDate(batch.sale_date),
      Destination: batch.destination,
      Recipient: batch.recipient,
      "Customer Type": batch.customer_type || "N/A",
      County: batch.customer_county || "N/A",
      Contact: batch.customer_contact || "N/A",
    }));

    generateCSV(csvData, "meter_sales_report");
  }, [batches, formatDate]);

  return {
    handleExportPDF,
    handleExportCSV,
  };
}
