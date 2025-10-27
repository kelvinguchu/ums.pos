"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getTransactionByReferenceNumber } from "@/lib/actions/sales";
import { pdf } from "@react-pdf/renderer";
import MeterSalesReceipt from "@/components/sharedcomponents/MeterSalesReceipt";
import {
  FileText,
  Loader2,
  AlertCircle,
  Download,
  SearchIcon,
} from "lucide-react";
import { toast } from "sonner";

interface GenerateReceiptDialogProps {
  trigger?: React.ReactNode;
}

export default function GenerateReceiptDialog({
  trigger,
}: GenerateReceiptDialogProps) {
  const [referenceNumber, setReferenceNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Reset all state when dialog closes
  useEffect(() => {
    if (!open) {
      // Only reset when dialog is closed
      handleReset();
    }
  }, [open]);

  const handleSearch = async () => {
    if (!referenceNumber) {
      setError("Please enter a reference number");
      return;
    }

    setIsLoading(true);
    setError(null);
    setReceiptData(null);

    try {
      const data = await getTransactionByReferenceNumber(referenceNumber);

      if (!data) {
        setError("No transaction found with this reference number");
        return;
      }

      if (!data.meters || data.meters.length === 0) {
        setError("Transaction found but no meter data available");
        return;
      }

      setReceiptData(data);
    } catch (err) {
      console.error("Error fetching transaction:", err);
      setError("Failed to retrieve transaction data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (
      !receiptData ||
      !receiptData.meters ||
      receiptData.meters.length === 0
    ) {
      toast.error("No meter data available for receipt");
      return;
    }

    setIsDownloading(true);
    try {
      const { transactionData, meters, unitPrices, userName } = receiptData;

      const blob = await pdf(
        <MeterSalesReceipt
          meters={meters}
          destination={transactionData.destination}
          recipient={transactionData.recipient}
          unitPrices={unitPrices}
          userName={userName}
          customerType={transactionData.customer_type}
          customerCounty={transactionData.customer_county}
          customerContact={transactionData.customer_contact}
          saleDate={transactionData.sale_date}
          referenceNumber={transactionData.reference_number}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `receipt-${transactionData.reference_number.replace(
        /\//g,
        "-"
      )}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Receipt downloaded successfully!");

      setOpen(false);
    } catch (err) {
      console.error("Error generating receipt:", err);
      toast.error("Failed to generate receipt");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReset = () => {
    setReferenceNumber("");
    setReceiptData(null);
    setError(null);
  };

  // Group meters by type for display
  const metersByType = receiptData?.meters
    ? receiptData.meters.reduce((acc: Record<string, number>, meter: any) => {
        if (!acc[meter.type]) acc[meter.type] = 0;
        acc[meter.type]++;
        return acc;
      }, {})
    : {};

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        // If dialog is closing, we'll let the useEffect handle the reset
        setOpen(newOpen);
      }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant='outline' className='gap-2'>
            <FileText className='h-4 w-4' />
            Generate Past Receipt
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className='sm:max-w-[550px]'>
        <DialogHeader>
          <DialogTitle className='text-[#000080] text-xl'>
            Past Sale Receipt
          </DialogTitle>
        </DialogHeader>

        <div className='grid gap-4 py-4'>
          <div className='flex items-center space-x-2'>
            <div className='relative flex-1'>
              <Input
                id='reference'
                placeholder='Enter reference number (SR/YYYY/00000)'
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className='pr-12'
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button
                size='sm'
                onClick={handleSearch}
                disabled={isLoading}
                className='absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-2.5 bg-[#000080] hover:bg-[#000066] text-white'>
                {isLoading ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <SearchIcon className='h-4 w-4' />
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className='bg-red-50 p-3 rounded-lg flex items-start gap-3 text-sm text-red-700'>
              <AlertCircle className='h-5 w-5 flex-shrink-0' />
              <p>{error}</p>
            </div>
          )}

          {receiptData && (
            <div className='mt-2 bg-blue-50/50 p-4 rounded-lg border border-blue-100'>
              {receiptData.isSyntheticData && (
                <div className='mb-3 px-3 py-2 bg-yellow-100 border border-yellow-400 rounded text-sm text-yellow-800'>
                  Note: Original serial numbers not available. Receipt will use
                  estimated data based on transaction records.
                </div>
              )}
              <div className='space-y-2 text-sm'>
                <p>
                  <span className='font-medium text-blue-600'>Reference:</span>{" "}
                  {receiptData.transactionData.reference_number}
                </p>
                <p>
                  <span className='font-medium text-blue-600'>Date:</span>{" "}
                  {new Date(
                    receiptData.transactionData.sale_date
                  ).toLocaleDateString()}
                </p>
                <p>
                  <span className='font-medium text-blue-600'>Recipient:</span>{" "}
                  {receiptData.transactionData.recipient}
                </p>
                <p>
                  <span className='font-medium text-blue-600'>Meters:</span>{" "}
                  {receiptData.meters.length} total
                </p>
                <div className='ml-4'>
                  {Object.entries(metersByType).map(([type, count]) => (
                    <p key={type}>
                      - {type}: {String(count)} unit
                      {Number(count) !== 1 ? "s" : ""}
                    </p>
                  ))}
                </div>
                <p className='font-semibold text-green-700'>
                  <span className='font-medium text-blue-600'>
                    Total Amount:
                  </span>{" "}
                  KES{" "}
                  {receiptData.transactionData.total_amount.toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {receiptData ? (
            <div className='flex gap-2'>
              <Button
                variant='outline'
                onClick={handleReset}
                disabled={isDownloading}>
                Reset
              </Button>
              <Button
                onClick={handleDownloadReceipt}
                disabled={isDownloading}
                className='gap-2 bg-[#000080] hover:bg-[#000066] text-white'>
                {isDownloading ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className='h-4 w-4' />
                    Download Receipt
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button variant='outline' onClick={() => setOpen(false)}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
