import { Fragment } from "react";

import { Loader2 } from "lucide-react";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import type { SoldMeter } from "./types";

interface SerialNumbersSectionProps {
  loading: boolean;
  filteredMeters: SoldMeter[];
  totalMeters: number;
  currentMeters: SoldMeter[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  hasSearchTerm: boolean;
}

export function SerialNumbersSection({
  loading,
  filteredMeters,
  totalMeters,
  currentMeters,
  currentPage,
  totalPages,
  onPageChange,
  onNextPage,
  onPreviousPage,
  hasSearchTerm,
}: SerialNumbersSectionProps) {
  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center py-12 space-y-4'>
        <Loader2 className='h-8 w-8 animate-spin text-blue-600' />
        <p className='text-sm text-muted-foreground'>Loading meters...</p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h3 className='font-medium text-gray-800'>
          Serial Numbers{" "}
          <span className='ml-2 text-sm text-muted-foreground'>
            ({filteredMeters.length} of {totalMeters})
          </span>
        </h3>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
        {currentMeters.map((meter, index) => (
          <div
            key={`${meter.serial_number}-${index}`}
            className='p-3 bg-gray-50/80 hover:bg-gray-100/80 rounded-md text-center font-mono text-sm transition-colors'>
            {meter.serial_number}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className='mt-8 flex justify-center'>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={(event) => {
                    event.preventDefault();
                    onPreviousPage();
                  }}
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (page) =>
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                )
                .map((page, index, pages) => (
                  <Fragment key={page}>
                    {index > 0 && pages[index - 1] !== page - 1 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationLink
                        onClick={(event) => {
                          event.preventDefault();
                          onPageChange(page);
                        }}
                        isActive={currentPage === page}
                        className='cursor-pointer'>
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  </Fragment>
                ))}

              <PaginationItem>
                <PaginationNext
                  onClick={(event) => {
                    event.preventDefault();
                    onNextPage();
                  }}
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {filteredMeters.length === 0 && hasSearchTerm && (
        <div className='text-center py-8 text-muted-foreground'>
          <p>No serial numbers match your search</p>
          <p className='text-sm mt-1'>Try a different search term</p>
        </div>
      )}
    </div>
  );
}
