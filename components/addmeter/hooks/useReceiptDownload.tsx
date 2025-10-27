import { useCallback } from "react";
import { pdf } from "@react-pdf/renderer";
import MeterAdditionReceipt from "../MeterAdditionReceipt";

interface Meter {
  serialNumber: string;
  type: string;
  addedBy: string;
  addedAt: string;
  adderName: string;
}

export function useReceiptDownload() {
  const downloadReceipt = useCallback(async (submittedData: any) => {
    if (!submittedData?.meters || !submittedData?.adderName) {
      throw new Error("Receipt data not found");
    }

    // Generate meter counts from the stored data
    const meterCounts = submittedData.meters.reduce(
      (acc: any[], meter: Meter) => {
        const existingType = acc.find((item) => item.type === meter.type);
        if (existingType) {
          existingType.count += 1;
        } else {
          acc.push({ type: meter.type, count: 1 });
        }
        return acc;
      },
      []
    );

    const blob = await pdf(
      <MeterAdditionReceipt
        meterCounts={meterCounts}
        adderName={submittedData.adderName}
        batchDetails={submittedData.batchDetails}
      />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `meter-addition-${new Date().toISOString().split("T")[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, []);

  return { downloadReceipt };
}
