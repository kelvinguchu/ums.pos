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
import {
  getAgentInventoryBySerial,
  returnMetersFromAgent,
} from "@/lib/actions/agents";
import { X, Loader2 } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import MeterReturnReceipt from "../sharedcomponents/MeterReturnReceipt";

interface ReturnMetersFromAgentProps {
  agent: {
    id: string;
    name: string;
    location: string;
  };
  currentUser: {
    id: string;
    name?: string;
  };
}

interface MeterToReturn {
  id: string;
  serialNumber: string;
  type: string;
  assignedAt: Date | null;
}

export default function ReturnMetersFromAgent({
  agent,
  currentUser,
}: ReturnMetersFromAgentProps) {
  const [serialNumber, setSerialNumber] = useState("");
  const [meters, setMeters] = useState<MeterToReturn[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const serialInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (serialInputRef.current) {
      serialInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (!isSubmitting && serialInputRef.current) {
      serialInputRef.current.focus();
    }
  }, [isSubmitting]);

  const handleSerialNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSerialNumber(e.target.value);
  };

  useEffect(() => {
    const checkSerialNumber = async () => {
      if (!serialNumber.trim()) {
        setErrorMessage("");
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
        const meter = await getAgentInventoryBySerial(serialNumber, agent.id);
        if (!meter) {
          setErrorMessage("Meter not found in agent's inventory");
          setSerialNumber("");
          return;
        }

        setMeters([
          {
            id: meter.id,
            serialNumber: meter.serial_number,
            type: meter.type,
            assignedAt: meter.assigned_at,
          },
          ...meters,
        ]);
        setSerialNumber("");
        setErrorMessage("");

        toast.success("Meter added to return list");
      } catch (error) {
        console.error("Error retrieving meter:", error);
        setErrorMessage("Failed to retrieve meter. Please try again.");
        setSerialNumber("");
      } finally {
        setIsChecking(false);
      }
    };

    const timeoutId = setTimeout(checkSerialNumber, 300);
    return () => clearTimeout(timeoutId);
  }, [serialNumber, meters, agent.id, toast]);

  const handleRemoveMeter = (index: number) => {
    setMeters(meters.filter((_, i) => i !== index));
  };

  const handleReturnMeters = async () => {
    if (meters.length === 0) {
      setErrorMessage("No meters to return");
      return;
    }

    setIsSubmitting(true);
    try {
      await returnMetersFromAgent({
        agentId: agent.id,
        meters: meters.map((meter) => ({
          meter_id: meter.id,
          serial_number: meter.serialNumber,
          type: meter.type,
        })),
        returnedBy: currentUser.id,
        returnerName: currentUser.name || "System Return",
      });

      // Store return details for receipt
      const returnDetails = {
        meters,
        agentName: agent.name,
        agentLocation: agent.location,
        returnedBy: currentUser.name || "Admin",
        returnDate: new Date().toISOString(),
      };

      localStorage.setItem("lastReturnDetails", JSON.stringify(returnDetails));

      setMeters([]);
      setIsSubmitted(true);

      toast.success("Meters returned successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to return meters");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadReceipt = async () => {
    try {
      const returnDetails = JSON.parse(
        localStorage.getItem("lastReturnDetails") || "{}"
      );

      const blob = await pdf(
        <MeterReturnReceipt {...returnDetails} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `meter-return-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      localStorage.removeItem("lastReturnDetails");
      setIsSubmitted(false);

      toast.success("Receipt downloaded successfully!");
    } catch (error) {
      console.error("Error downloading receipt:", error);
      toast.error("Failed to download receipt");
    }
  };

  return (
    <div className='bg-white rounded-lg p-6'>
      <div className='flex flex-col min-h-[600px]'>
        <div className='flex-1'>
          <div className='space-y-4 mb-6'>
            <Input
              ref={serialInputRef}
              type='text'
              placeholder='Scan Serial Number'
              value={serialNumber.toUpperCase()}
              onChange={handleSerialNumberChange}
              className='w-full'
            />
            {errorMessage && (
              <p className='text-red-500 text-sm'>{errorMessage}</p>
            )}
          </div>

          {isSubmitted && meters.length === 0 && (
            <div className='mb-6 relative'>
              <Button
                onClick={handleDownloadReceipt}
                className='w-full bg-[#2ECC40] hover:bg-[#28a035] text-white'>
                Download Return Receipt
              </Button>
              <Button
                onClick={() => setIsSubmitted(false)}
                variant='ghost'
                size='icon'
                className='absolute -right-2 -top-2 h-6 w-6 rounded-full bg-gray-200 hover:bg-gray-300'
                aria-label='Dismiss'>
                <X className='h-4 w-4' />
              </Button>
            </div>
          )}

          {meters.length > 0 && (
            <>
              <Button
                onClick={handleReturnMeters}
                className='w-full bg-primary hover:bg-[#000066] text-white mb-6'
                disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Processing Return...
                  </>
                ) : (
                  `Return ${meters.length} Meter${
                    meters.length !== 1 ? "s" : ""
                  } from Agent`
                )}
              </Button>

              <div className='mt-6'>
                <div className='flex justify-between items-center mb-2'>
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
                        <TableHead>Assigned Date</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {meters.map((meter, index) => (
                        <TableRow key={index}>
                          <TableCell>{meter.serialNumber}</TableCell>
                          <TableCell>{meter.type}</TableCell>
                          <TableCell>
                            {meter.assignedAt
                              ? new Date(meter.assignedAt).toLocaleDateString()
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            <Button
                              onClick={() => handleRemoveMeter(index)}
                              variant='ghost'
                              size='sm'
                              className='hover:bg-red-100'>
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
      </div>
    </div>
  );
}
