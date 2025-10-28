"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { clearMetersCache } from "@/lib/actions/meters";
import { getUserProfile } from "@/lib/actions/users";
import { toast } from "sonner";
import { MeterInputForm } from "./MeterInputForm";
import { MetersList } from "./MetersList";
import { FormActions } from "./FormActions";
import { BatchDetailsSection } from "./BatchDetailsSection";
import { useMeterCache } from "./hooks/useMeterCache";
import {
  useMeterValidation,
  validateMeterBeforeAdd,
} from "./hooks/useMeterValidation";
import { useMeterSubmission } from "./hooks/useMeterSubmission";
import { useReceiptDownload } from "./hooks/useReceiptDownload";
import { X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AddMeterFormProps {
  readonly currentUser: {
    readonly id: string;
    readonly name: string;
  };
}

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

const MAX_SERIAL_LENGTH = 12;

export default function AddMeterForm({ currentUser }: AddMeterFormProps) {
  // Local state
  const [serialNumber, setSerialNumber] = useState("");
  const [selectedType, setSelectedType] = useState("Split");
  const [adderName, setAdderName] = useState("");
  const [isBatchDetailsOpen, setIsBatchDetailsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Custom hooks
  const {
    meters,
    setMeters,
    batchDetails,
    setBatchDetails,
    clearCache,
    clearSubmittedCache,
    saveSubmittedData,
    getSubmittedData,
  } = useMeterCache();

  const validationToast = useCallback(
    (message: { title: string; description: string; variant?: string }) => {
      toast(message as any);
    },
    []
  );

  const { isChecking, exists, errorMessage, setValidationResult, lastCheck } =
    useMeterValidation(serialNumber, meters, validationToast);

  const { isSubmitting, submitMeters } = useMeterSubmission();
  const { downloadReceipt } = useReceiptDownload();

  // Fetch user profile on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const profile = await getUserProfile(currentUser.id);
        setAdderName(profile?.name || currentUser.name || "");
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setAdderName(currentUser.name || "");
      }
    };

    setAdderName(currentUser.name || "");
    fetchUserProfile();
  }, [currentUser.id, currentUser.name]);

  const handleAddMeter = useCallback(async () => {
    if (isProcessing || isChecking) return;

    if (!serialNumber.trim()) {
      toast.error("Serial number cannot be empty");
      return;
    }

    if (!adderName) {
      toast.error("User name is required");
      return;
    }

    setIsProcessing(true);
    try {
      const validation = await validateMeterBeforeAdd(
        serialNumber,
        meters,
        lastCheck ?? undefined
      );

      if (!validation.isValid) {
        toast.error(validation.error || "Invalid meter");
        return;
      }

      const newMeter: Meter = {
        serialNumber: serialNumber.replace(/^0+/, "").toUpperCase(),
        type: selectedType,
        addedBy: currentUser.id,
        addedAt: new Date().toISOString(),
        adderName,
      };

      setMeters((prev) => [newMeter, ...prev]);
      setSerialNumber("");
      setValidationResult({
        exists: false,
        message: "Input Serial Number",
      });

      toast.success("Meter added to the list");
    } catch (error) {
      console.error("Error adding meter:", error);
      toast.error("Failed to add meter");
    } finally {
      setIsProcessing(false);
    }
  }, [
    serialNumber,
    selectedType,
    currentUser.id,
    adderName,
    meters,
    toast,
    isProcessing,
    isChecking,
    setMeters,
    setValidationResult,
  ]);

  const handleRemoveMeter = useCallback(
    (index: number) => {
      setMeters((prev) => prev.filter((_, i) => i !== index));
    },
    [setMeters]
  );

  const handleBatchDetailsSubmit = (details: BatchDetails) => {
    setBatchDetails(details);
    setIsBatchDetailsOpen(false);
    toast.success("Purchase details added successfully");
  };

  const handleSubmit = useCallback(async () => {
    if (meters.length === 0) {
      toast.error("Please add at least one meter");
      return;
    }

    await submitMeters(meters, batchDetails!, adderName, currentUser.id, {
      onSuccess: () => {
        toast.success(
          "Meters added successfully! You can now download the receipt."
        );
        clearCache();
        setSerialNumber("");
        clearMetersCache();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to add meters");
      },
      onSaveData: saveSubmittedData,
    });
  }, [
    meters,
    batchDetails,
    adderName,
    currentUser.id,
    toast,
    submitMeters,
    clearCache,
    saveSubmittedData,
  ]);

  const handleDownloadReceipt = useCallback(() => {
    const submittedData = getSubmittedData();
    if (!submittedData) {
      toast.error("No receipt available to download");
      return;
    }
    downloadReceipt(submittedData);
  }, [getSubmittedData, downloadReceipt]);

  const handleClearForm = useCallback(() => {
    if (
      meters.length > 0 &&
      !confirm("Are you sure you want to clear all meters?")
    ) {
      return;
    }

    clearCache();
    clearSubmittedCache();
    setSerialNumber("");
    setSelectedType("Split");
    clearMetersCache();

    toast.success("Form cleared successfully");
  }, [meters.length, clearCache, clearSubmittedCache]);

  const handleSerialNumberChange = useCallback(
    (value: string) => {
      if (value.length > MAX_SERIAL_LENGTH) {
        toast.error("Serial number cannot be more than 12 digits");
        return;
      }
      setSerialNumber(value);
    },
    [setSerialNumber]
  );

  const handleMetersAdd = useCallback(
    (newMeters: Meter[]) => {
      setMeters((prev) => [...newMeters, ...prev]);
    },
    [setMeters]
  );

  return (
    <div className='flex h-full flex-col pr-4'>
      <ScrollArea className='flex-1'>
        <div className='space-y-6'>
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0'>
            <h2 className='text-xl sm:text-2xl font-bold text-gray-800'>
              Add Meters
            </h2>
            <FormActions
              currentUser={currentUser}
              currentMeters={meters}
              onMetersAdd={handleMetersAdd}
              onClear={handleClearForm}
            />
          </div>

          <MeterInputForm
            serialNumber={serialNumber}
            selectedType={selectedType}
            onSerialNumberChange={handleSerialNumberChange}
            onTypeChange={setSelectedType}
            onAddMeter={handleAddMeter}
            isChecking={isChecking}
            exists={exists}
            errorMessage={errorMessage}
          />

          {meters.length > 0 && (
            <BatchDetailsSection
              batchDetails={batchDetails}
              meters={meters}
              isDialogOpen={isBatchDetailsOpen}
              isSubmitting={isSubmitting}
              onDialogOpenChange={setIsBatchDetailsOpen}
              onSubmit={handleBatchDetailsSubmit}
              onFinalSubmit={handleSubmit}
            />
          )}

          <MetersList meters={meters} onRemoveMeter={handleRemoveMeter} />

          {getSubmittedData() && meters.length === 0 && (
            <div className='mt-6 relative'>
              <Button
                onClick={handleDownloadReceipt}
                className='w-full bg-[#2ECC40] hover:bg-[#28a035] cursor-pointer text-white'>
                Download Receipt
              </Button>
              <Button
                onClick={() => clearSubmittedCache()}
                variant='ghost'
                size='icon'
                className='absolute -right-2 -top-2 h-6 w-6 cursor-pointer rounded-full bg-gray-200 hover:bg-gray-300'
                aria-label='Dismiss'>
                <X className='h-4 w-4' />
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
