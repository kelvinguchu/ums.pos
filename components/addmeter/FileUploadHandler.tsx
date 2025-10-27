"use client";

import { memo, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  checkMultipleSerialNumbers,
  checkMeterExistsInSoldMeters,
  checkMeterExistsInAgentInventory,
} from "@/lib/actions/meters";
import { processCSV, processExcel } from "@/lib/utils/fileProcessors";
import { Badge } from "@/components/ui/badge";

interface FileUploadHandlerProps {
  onMetersAdd: (
    meters: Array<{
      serialNumber: string;
      type: string;
      addedBy: string;
      addedAt: string;
      adderName: string;
    }>
  ) => void;
  currentUser: {
    id: string;
    name: string;
  };
  currentMeters: Array<{
    serialNumber: string;
    type: string;
    addedBy: string;
    addedAt: string;
    adderName: string;
  }>;
}

export const FileUploadHandler = memo(function FileUploadHandler({
  onMetersAdd,
  currentUser,
  currentMeters,
}: FileUploadHandlerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const normalizeSerial = (serial: string) =>
    serial.replace(/^0+/, "").toUpperCase();

  const parseFile = async (file: File) => {
    if (file.name.endsWith(".csv")) {
      const text = await file.text();
      return processCSV(text);
    } else if (file.name.endsWith(".xlsx")) {
      const buffer = await file.arrayBuffer();
      return processExcel(buffer);
    } else {
      throw new Error("Unsupported file type");
    }
  };

  const checkForDuplicatesInFile = (
    meters: Array<{ serialNumber: string; type: string }>
  ) => {
    return meters.filter(
      (meter, index) =>
        meters.findIndex(
          (m) =>
            normalizeSerial(m.serialNumber) ===
            normalizeSerial(meter.serialNumber)
        ) !== index
    );
  };

  const checkForDuplicatesInTable = (
    newMeters: Array<{ serialNumber: string; type: string }>
  ) => {
    return newMeters.filter((meter) =>
      currentMeters.some(
        (existingMeter) =>
          normalizeSerial(existingMeter.serialNumber) ===
          normalizeSerial(meter.serialNumber)
      )
    );
  };

  const validateMeterInBatch = (
    meter: { serialNumber: string; type: string },
    idx: number,
    existingInDB: string[],
    existingInSold: boolean[],
    existingInAgent: boolean[]
  ) => {
    const normalizedSerial = normalizeSerial(meter.serialNumber);

    if (existingInDB.includes(normalizedSerial)) {
      return {
        serial: meter.serialNumber,
        reason: "Already exists in database",
      };
    } else if (existingInSold[idx]) {
      return {
        serial: meter.serialNumber,
        reason: "Already exists in sold meters",
      };
    } else if (existingInAgent[idx]) {
      return {
        serial: meter.serialNumber,
        reason: "Already exists in agent inventory",
      };
    }
    return null;
  };

  const processBatch = async (
    batch: Array<{ serialNumber: string; type: string }>,
    validMeters: Array<{
      serialNumber: string;
      type: string;
      addedBy: string;
      addedAt: string;
      adderName: string;
    }>,
    errors: Array<{ serial: string; reason: string }>
  ) => {
    const serialNumbers = batch.map((m) => normalizeSerial(m.serialNumber));

    const [existingInDB, existingInSold, existingInAgent] = await Promise.all([
      checkMultipleSerialNumbers(serialNumbers),
      Promise.all(serialNumbers.map((s) => checkMeterExistsInSoldMeters(s))),
      Promise.all(
        serialNumbers.map((s) => checkMeterExistsInAgentInventory(s))
      ),
    ]);

    for (let idx = 0; idx < batch.length; idx++) {
      const meter = batch[idx];
      const error = validateMeterInBatch(
        meter,
        idx,
        existingInDB,
        existingInSold,
        existingInAgent
      );

      if (error) {
        errors.push(error);
      } else {
        validMeters.push({
          serialNumber: normalizeSerial(meter.serialNumber),
          type: meter.type,
          addedBy: currentUser.id,
          addedAt: new Date().toISOString(),
          adderName: currentUser.name,
        });
      }
    }
  };

  const showResults = (
    validMeters: Array<{
      serialNumber: string;
      type: string;
      addedBy: string;
      addedAt: string;
      adderName: string;
    }>,
    errors: Array<{ serial: string; reason: string }>
  ) => {
    if (errors.length > 0) {
      const errorSummary = errors
        .slice(0, 3)
        .map((e) => `${e.serial}: ${e.reason}`)
        .join("\n");
      toast.error(
        `${validMeters.length} meters added. ${errors.length} meters skipped:\n${errorSummary}${errors.length > 3 ? "\n..." : ""}`
      );
    }

    if (validMeters.length > 0) {
      onMetersAdd(validMeters);
      toast.success(`Added ${validMeters.length} new meters`);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const newMeters = await parseFile(file);

      if (newMeters.length === 0) {
        toast.error("No valid meters found in file. Please check the format.");
        return;
      }

      const duplicatesInFile = checkForDuplicatesInFile(newMeters);
      if (duplicatesInFile.length > 0) {
        toast.error(
          `Found ${duplicatesInFile.length} duplicate serial numbers in the file. Please remove duplicates and try again.`
        );
        return;
      }

      const duplicatesInTable = checkForDuplicatesInTable(newMeters);
      if (duplicatesInTable.length > 0) {
        const duplicateList = duplicatesInTable
          .slice(0, 3)
          .map((m) => m.serialNumber)
          .join("\n");
        toast.error(
          `Found ${duplicatesInTable.length} meters that are already in the table:\n${duplicateList}${duplicatesInTable.length > 3 ? "\n..." : ""}`
        );
        return;
      }

      setProgress({ current: 0, total: newMeters.length });

      const errors: Array<{ serial: string; reason: string }> = [];
      const validMeters: Array<{
        serialNumber: string;
        type: string;
        addedBy: string;
        addedAt: string;
        adderName: string;
      }> = [];

      const BATCH_SIZE = 50;
      for (let i = 0; i < newMeters.length; i += BATCH_SIZE) {
        const batch = newMeters.slice(i, i + BATCH_SIZE);
        await processBatch(batch, validMeters, errors);

        setProgress((prev) => ({
          ...prev,
          current: Math.min(i + BATCH_SIZE, newMeters.length),
        }));
      }

      showResults(validMeters, errors);
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Failed to process file. Please check the format.");
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleFileSelect = (type: "csv" | "xlsx") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = type === "csv" ? ".csv" : ".xlsx";

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    };

    input.click();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className='cursor-pointer'>
          <Badge
            variant='outline'
            className={`hover:bg-gray-100 flex items-center gap-1 cursor-pointer ${
              isProcessing ? "w-[200px]" : "w-[100px]"
            } justify-center`}>
            {isProcessing ? (
              <>
                <Loader2 className='h-3 w-3 animate-spin' />
                {progress.total > 0
                  ? `Processing ${progress.current}/${progress.total}`
                  : "Processing..."}
              </>
            ) : (
              <>
                <Upload className='h-3 w-3' />
                Upload
              </>
            )}
          </Badge>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onClick={() => handleFileSelect("csv")}>
          CSV File
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleFileSelect("xlsx")}>
          Excel File
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
