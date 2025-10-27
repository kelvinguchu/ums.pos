import { useState, useEffect, useCallback } from "react";
import {
  checkMeterExists,
  checkMeterExistsInSoldMeters,
  checkMeterExistsInAgentInventory,
} from "@/lib/actions/meters";

interface Meter {
  serialNumber: string;
  type: string;
}

export const normalizeSerialNumber = (serial: string) => {
  return serial.replace(/^0+/, "").toUpperCase();
};

export const findExistingMeter = (serialNumber: string, meters: Meter[]) => {
  return meters.findIndex(
    (m) =>
      normalizeSerialNumber(m.serialNumber) ===
      normalizeSerialNumber(serialNumber)
  );
};

interface ValidationResult {
  exists: boolean;
  message: string | React.ReactNode;
  existingIndex?: number;
}

export function useMeterValidation(
  serialNumber: string,
  meters: Meter[],
  onToast: (message: {
    title: string;
    description: string;
    variant?: string;
  }) => void
) {
  const [isChecking, setIsChecking] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    exists: false,
    message: "Input Serial Number",
  });

  const handleRemoveHighlight = useCallback((element: Element | null) => {
    element?.classList.remove("bg-yellow-100");
  }, []);

  const handleViewEntry = useCallback(
    (existingIndex: number) => {
      const element = document.querySelector(
        `[data-row-index="${existingIndex}"]`
      );
      element?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      element?.classList.add("bg-yellow-100");
      setTimeout(() => handleRemoveHighlight(element), 2000);
    },
    [handleRemoveHighlight]
  );

  useEffect(() => {
    let isSubscribed = true;

    const checkSerialNumber = async () => {
      if (!serialNumber.trim()) {
        setValidationResult({
          exists: false,
          message: "Input Serial Number",
        });
        setIsChecking(false);
        return;
      }

      setIsChecking(true);
      try {
        const normalizedSerial = normalizeSerialNumber(serialNumber);

        // Check if it exists in current batch
        const existingIndex = findExistingMeter(normalizedSerial, meters);
        if (existingIndex !== -1) {
          setValidationResult({
            exists: true,
            message: (
              <div className='flex items-center gap-2'>
                <span>Serial Number Already in the Table</span>
                <button
                  className='text-blue-500 hover:underline'
                  onClick={() => handleViewEntry(existingIndex)}>
                  View Entry
                </button>
              </div>
            ),
            existingIndex,
          });
          setIsChecking(false);
          return;
        }

        // Check database
        const exists = await checkMeterExists(normalizedSerial);

        if (isSubscribed) {
          if (exists) {
            setValidationResult({
              exists: true,
              message: "Serial Number Already Exists in Database",
            });
            onToast({
              title: "Error",
              description: "Serial Number Already Exists in Database",
              variant: "destructive",
            });
          } else {
            setValidationResult({
              exists: false,
              message: "",
            });
          }
        }
      } catch (error) {
        if (isSubscribed) {
          setValidationResult({
            exists: false,
            message: "Failed to check serial number",
          });
          onToast({
            title: "Error",
            description: "Failed to check serial number",
            variant: "destructive",
          });
        }
      } finally {
        if (isSubscribed) {
          setIsChecking(false);
        }
      }
    };

    const timeoutId = setTimeout(checkSerialNumber, 500);

    return () => {
      isSubscribed = false;
      clearTimeout(timeoutId);
    };
  }, [serialNumber, meters, onToast, handleViewEntry]);

  return {
    isChecking,
    exists: validationResult.exists,
    errorMessage: validationResult.message,
    setValidationResult,
  };
}

export async function validateMeterBeforeAdd(
  serialNumber: string,
  meters: Meter[]
): Promise<{ isValid: boolean; error?: string }> {
  const normalizedSerial = normalizeSerialNumber(serialNumber);

  // Check if exists in current batch
  const existingIndex = findExistingMeter(normalizedSerial, meters);
  if (existingIndex !== -1) {
    return { isValid: false, error: "Serial Number Already in the Table" };
  }

  // Check all existence conditions in parallel
  const [existsInDB, existsInSold, existsInAgent] = await Promise.all([
    checkMeterExists(normalizedSerial),
    checkMeterExistsInSoldMeters(normalizedSerial),
    checkMeterExistsInAgentInventory(normalizedSerial),
  ]);

  if (existsInDB) {
    return {
      isValid: false,
      error: "Serial Number Already Exists in Database",
    };
  }

  if (existsInSold) {
    return { isValid: false, error: "Meter already exists in sold meters" };
  }

  if (existsInAgent) {
    return { isValid: false, error: "Meter already exists in agent inventory" };
  }

  return { isValid: true };
}
