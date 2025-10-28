"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { getSoldMeterBySerial, returnSoldMeter } from "@/lib/actions/sales";
import { getAvailableReplacementMeters } from "@/lib/actions/meters";
import { X, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReturnSoldMetersProps {
  currentUser: {
    id: string;
    name?: string;
  };
}

interface MeterToReturn {
  id: string;
  serialNumber: string;
  type: string;
  soldAt: Date;
  status: "healthy" | "faulty";
  faultDescription?: string;
  replacementSerial?: string;
}

export default function ReturnSoldMeters({
  currentUser,
}: ReturnSoldMetersProps) {
  const [serialNumber, setSerialNumber] = useState("");
  const [meters, setMeters] = useState<MeterToReturn[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const serialInputRef = useRef<HTMLInputElement>(null);
  const [replacements, setReplacements] = useState<
    Array<{
      original_id: string;
      new_serial: string;
      new_type: string;
    }>
  >([]);
  const [replacementSerial, setReplacementSerial] = useState("");

  useEffect(() => {
    if (serialInputRef.current) {
      serialInputRef.current.focus();
    }
  }, []);

  const handleSerialNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage("");
    setSerialNumber(e.target.value);
  };

  const handleSerialNumberSubmit = async () => {
    if (!serialNumber.trim()) {
      return;
    }

    const existingIndex = meters.findIndex(
      (m) => m.serialNumber.toLowerCase() === serialNumber.toLowerCase()
    );

    if (existingIndex !== -1) {
      setErrorMessage("Serial Number Already in the Table");
      setSerialNumber("");
      return;
    }

    setIsChecking(true);
    try {
      const meter = await getSoldMeterBySerial(serialNumber);
      if (!meter) {
        setErrorMessage(
          `Meter ${serialNumber.toUpperCase()} not found in sold meters`
        );
        setSerialNumber("");
        return;
      }

      setMeters([
        {
          id: meter.id,
          serialNumber: meter.serial_number,
          type: meter.type,
          soldAt: meter.sold_at || new Date(),
          status: "healthy",
        },
        ...meters,
      ]);
      setSerialNumber("");
      setErrorMessage("");

      toast.success("Meter added to return list");
    } catch (error: any) {
      setErrorMessage(
        error.message || "Failed to retrieve meter. Please try again."
      );
      setSerialNumber("");
    } finally {
      setIsChecking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSerialNumberSubmit();
    }
  };

  const handleStatusChange = (
    serialNumber: string,
    status: "healthy" | "faulty"
  ) => {
    setMeters(
      meters.map((meter) =>
        meter.serialNumber === serialNumber
          ? {
              ...meter,
              status,
              faultDescription:
                status === "healthy" ? undefined : meter.faultDescription,
            }
          : meter
      )
    );
  };

  const handleFaultDescriptionChange = (
    serialNumber: string,
    description: string
  ) => {
    setMeters(
      meters.map((meter) =>
        meter.serialNumber === serialNumber
          ? { ...meter, faultDescription: description }
          : meter
      )
    );
  };

  const handleRemoveMeter = (index: number) => {
    setMeters(meters.filter((_, i) => i !== index));
  };

  const handleReplacement = async (
    meter: MeterToReturn,
    replacementSerial: string
  ) => {
    try {
      // Use getAvailableReplacementMeters to fetch available meters of the same type
      const availableMeters = await getAvailableReplacementMeters(meter.type);

      // Find the replacement meter with the matching serial number
      const availableMeter = availableMeters.find(
        (m: { serial_number: string; type: string }) =>
          m.serial_number.toUpperCase() === replacementSerial.toUpperCase()
      );

      if (!availableMeter) {
        console.error(
          "Replacement meter not found or wrong type for meter:",
          meter,
          "Replacement Serial:",
          replacementSerial.toUpperCase()
        );
        toast.error("Replacement meter not found or wrong type");
        return;
      }

      setReplacements((prev) => [
        ...prev,
        {
          original_id: meter.id,
          new_serial: availableMeter.serial_number,
          new_type: availableMeter.type,
        },
      ]);

      setMeters((prev) =>
        prev.map((m) =>
          m.id === meter.id
            ? { ...m, replacementSerial: availableMeter.serial_number }
            : m
        )
      );

      toast.success("Replacement meter added");
    } catch (error) {
      console.error("Exception in handleReplacement:", error);
      toast.error("Failed to add replacement meter");
    }
  };

  const handleReturnMeters = async () => {
    if (meters.length === 0) {
      setErrorMessage("No meters to return");
      return;
    }

    // Validate fault descriptions for faulty meters
    const invalidFaultyMeter = meters.find(
      (meter) =>
        meter.status === "faulty" &&
        (!meter.faultDescription || meter.faultDescription.trim() === "")
    );

    if (invalidFaultyMeter) {
      setErrorMessage("Please provide fault description for all faulty meters");
      return;
    }

    setIsSubmitting(true);
    try {
      await returnSoldMeter({
        meters: meters.map((meter) => ({
          id: meter.id,
          serial_number: meter.serialNumber,
          type: meter.type,
          status: meter.status,
          fault_description: meter.faultDescription,
        })),
        returnedBy: currentUser.id,
        returnerName: currentUser.name || "System Return",
        replacements,
      });

      // Store return details for receipt
      const returnDetails = {
        meters,
        returnedBy: currentUser.name || "Admin",
        returnDate: new Date().toISOString(),
      };

      localStorage.setItem(
        "lastSoldReturnDetails",
        JSON.stringify(returnDetails)
      );

      setMeters([]);
      setIsSubmitted(true);

      toast.success("Meters returned successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to return meters");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='flex h-full flex-col pr-4'>
      <ScrollArea className='flex-1'>
        <div className='bg-white rounded-lg p-6 space-y-6'>
          <div className='space-y-4'>
            <Input
              ref={serialInputRef}
              type='text'
              placeholder='Scan Serial Number'
              value={serialNumber.toUpperCase()}
              onChange={handleSerialNumberChange}
              onKeyPress={handleKeyPress}
              onBlur={handleSerialNumberSubmit}
              className='w-full'
            />
            {errorMessage && (
              <div className='bg-red-50 border border-red-200 rounded-md p-3'>
                <p className='text-red-500 text-sm'>{errorMessage}</p>
              </div>
            )}
          </div>

          {meters.length > 0 && (
            <>
              <Button
                onClick={handleReturnMeters}
                className='w-full bg-primary hover:bg-[#000066] text-white cursor-pointer'
                disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Processing Return...
                  </>
                ) : (
                  `Return ${meters.length} Meter${
                    meters.length !== 1 ? "s" : ""
                  }`
                )}
              </Button>

              <div className='space-y-4'>
                <div className='flex justify-between items-center'>
                  <h3 className='text-lg font-semibold text-gray-700'>
                    Meters to Return
                  </h3>
                  <span className='text-sm text-gray-500'>
                    Total: {meters.length} meter{meters.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className='max-h-[400px] overflow-y-auto border border-gray-200 rounded-md'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Fault Description</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {meters.map((meter, index) => (
                        <TableRow key={index}>
                          <TableCell>{meter.serialNumber}</TableCell>
                          <TableCell>{meter.type}</TableCell>
                          <TableCell>
                            <RadioGroup
                              value={meter.status}
                              onValueChange={(value: "healthy" | "faulty") =>
                                handleStatusChange(meter.serialNumber, value)
                              }
                              className='flex flex-col space-y-1'>
                              <div className='flex items-center space-x-2'>
                                <RadioGroupItem
                                  value='healthy'
                                  id={`healthy-${meter.serialNumber}`}
                                />
                                <Label
                                  htmlFor={`healthy-${meter.serialNumber}`}>
                                  Healthy
                                </Label>
                              </div>
                              <div className='flex items-center space-x-2'>
                                <RadioGroupItem
                                  value='faulty'
                                  id={`faulty-${meter.serialNumber}`}
                                />
                                <Label htmlFor={`faulty-${meter.serialNumber}`}>
                                  Faulty
                                </Label>
                              </div>
                            </RadioGroup>
                          </TableCell>
                          <TableCell>
                            {meter.status === "faulty" && (
                              <div className='space-y-2'>
                                <Textarea
                                  placeholder='Describe the fault...'
                                  value={meter.faultDescription || ""}
                                  onChange={(e) =>
                                    handleFaultDescriptionChange(
                                      meter.serialNumber,
                                      e.target.value
                                    )
                                  }
                                  className='min-h-[80px]'
                                />
                                <div className='flex gap-2'>
                                  <Input
                                    placeholder='Scan replacement meter'
                                    value={replacementSerial}
                                    onChange={(e) =>
                                      setReplacementSerial(e.target.value)
                                    }
                                    className='flex-1'
                                  />
                                  <Button
                                    onClick={() => {
                                      handleReplacement(
                                        meter,
                                        replacementSerial
                                      );
                                      setReplacementSerial("");
                                    }}
                                    variant='outline'
                                    size='sm'
                                    className='cursor-pointer'>
                                    Replace
                                  </Button>
                                </div>
                                {meter.replacementSerial && (
                                  <p className='text-xs text-green-600'>
                                    Replacement: {meter.replacementSerial}
                                  </p>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              onClick={() => handleRemoveMeter(index)}
                              variant='ghost'
                              size='sm'
                              className='hover:bg-red-100 cursor-pointer'>
                              <X className='h-4 w-4 text-red-500' />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
