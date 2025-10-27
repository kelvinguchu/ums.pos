import { useState, useCallback } from "react";
import { addMeters, addMeterPurchaseBatch } from "@/lib/actions/meters";

interface Meter {
  serialNumber: string;
  type: string;
  addedBy: string;
  addedAt: string;
  adderName: string;
}

interface BatchDetails {
  purchaseDate: string;
  batchGroups: Array<{
    type: string;
    count: number;
    unitPrice: string;
    totalCost: string;
  }>;
}

interface SubmissionCallbacks {
  onSuccess: () => void;
  onError: (error: any) => void;
  onSaveData: (data: {
    meters: Meter[];
    adderName: string;
    batchDetails: BatchDetails;
  }) => void;
}

export function useMeterSubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitMeters = useCallback(
    async (
      meters: Meter[],
      batchDetails: BatchDetails,
      adderName: string,
      currentUserId: string,
      callbacks: SubmissionCallbacks
    ) => {
      if (!adderName) {
        throw new Error("User name is required");
      }

      if (!batchDetails) {
        throw new Error("Please add purchase details first");
      }

      setIsSubmitting(true);
      try {
        // Create batch record first
        const batchData = await addMeterPurchaseBatch({
          purchaseDate: new Date(batchDetails.purchaseDate),
          addedBy: currentUserId,
          batchGroups: batchDetails.batchGroups.map((group) => ({
            type: group.type,
            count: group.count,
            totalCost: group.totalCost,
          })),
        });

        // Then add meters with batch reference
        const metersToSubmit = meters.map((meter) => ({
          serial_number: meter.serialNumber,
          type: meter.type.toLowerCase(),
          added_by: meter.addedBy,
          added_at: new Date(meter.addedAt),
          adder_name: adderName,
          batch_id: batchData.id.toString(),
        }));

        await addMeters(metersToSubmit);

        // Save submission details for receipt
        callbacks.onSaveData({
          meters,
          adderName,
          batchDetails,
        });

        callbacks.onSuccess();
      } catch (error: any) {
        console.error("Error adding meters:", error);
        callbacks.onError(error);
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  return {
    isSubmitting,
    submitMeters,
  };
}
