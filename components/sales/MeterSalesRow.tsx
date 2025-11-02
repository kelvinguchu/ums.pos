"use client";

import { useCallback, useState } from "react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { generateCSV } from "@/lib/utils/csvGenerator";
import { toast } from "sonner";

import { SaleBatch } from "./hooks/useMeterSalesData";
import { SaleDetailsHeader } from "./meter-sales-row/SaleDetailsHeader";
import { SaleSummaryCards } from "./meter-sales-row/SaleSummaryCards";
import { SaleToolbar } from "./meter-sales-row/SaleToolbar";
import { SerialNumbersSection } from "./meter-sales-row/SerialNumbersSection";
import { ScrollTopButton } from "./meter-sales-row/ScrollTopButton";
import { useMeterSaleDetails } from "./meter-sales-row/useMeterSaleDetails";
import { useScrollContainer } from "./meter-sales-row/useScrollContainer";
import { useSerialNumberSearch } from "./meter-sales-row/useSerialNumberSearch";

interface MeterSalesRowProps {
  batch: SaleBatch;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenNoteDialog: (batch: SaleBatch) => void;
}

const ITEMS_PER_PAGE = 20;

export function MeterSalesRow({
  batch,
  isOpen,
  onOpenChange,
  onOpenNoteDialog,
}: Readonly<MeterSalesRowProps>) {
  const { meters, transactionRef, loading, isRefLoading } = useMeterSaleDetails(
    batch.id,
    isOpen
  );
  const {
    searchTerm,
    setSearchTerm,
    filteredMeters,
    currentMeters,
    currentPage,
    totalPages,
    goToPage,
    goToNextPage,
    goToPreviousPage,
  } = useSerialNumberSearch(meters, ITEMS_PER_PAGE);
  const { scrollRef, showScrollTop, scrollToTop, preserveScrollPosition } =
    useScrollContainer();
  const [isCopying, setIsCopying] = useState(false);

  const handleDownloadSerials = useCallback(() => {
    const csvData = meters.map((meter) => ({
      "SN#": meter.serial_number,
    }));

    const filename = transactionRef
      ? `meter_serials_${transactionRef.replaceAll("/", "-")}`
      : `meter_serials_batch_${batch.id}`;

    generateCSV(csvData, filename);
  }, [meters, transactionRef, batch.id]);

  const handleCopyToClipboard = useCallback(async () => {
    if (!transactionRef) {
      return;
    }

    try {
      await navigator.clipboard.writeText(transactionRef);
      setIsCopying(true);
      toast.success("Reference number copied to clipboard");

      setTimeout(() => {
        setIsCopying(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy reference number:", error);
      toast.error("Failed to copy reference number");
    }
  }, [transactionRef]);

  const handlePageChange = useCallback(
    (page: number) => {
      preserveScrollPosition(() => goToPage(page));
    },
    [goToPage, preserveScrollPosition]
  );

  const handleNextPage = useCallback(() => {
    preserveScrollPosition(goToNextPage);
  }, [goToNextPage, preserveScrollPosition]);

  const handlePreviousPage = useCallback(() => {
    preserveScrollPosition(goToPreviousPage);
  }, [goToPreviousPage, preserveScrollPosition]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className='min-w-[60vw] w-full bg-gray-50 border-l border-gray-200 px-2 gap-2'>
        <SaleDetailsHeader
          transactionRef={transactionRef}
          isRefLoading={isRefLoading}
          isCopying={isCopying}
          onCopy={handleCopyToClipboard}
          onOpenNoteDialog={() => onOpenNoteDialog(batch)}
          hasNote={Boolean(batch.notes)}
          saleDate={batch.sale_date}
        />

        <div
          ref={scrollRef}
          className='mt-2 space-y-6 max-h-[80vh] overflow-y-auto relative pr-2'>
          <SaleSummaryCards batch={batch} />

          <SaleToolbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onDownload={handleDownloadSerials}
          />

          <SerialNumbersSection
            loading={loading}
            filteredMeters={filteredMeters}
            totalMeters={meters.length}
            currentMeters={currentMeters}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onNextPage={handleNextPage}
            onPreviousPage={handlePreviousPage}
            hasSearchTerm={Boolean(searchTerm)}
          />
        </div>

        <ScrollTopButton visible={showScrollTop} onClick={scrollToTop} />
      </SheetContent>
    </Sheet>
  );
}
