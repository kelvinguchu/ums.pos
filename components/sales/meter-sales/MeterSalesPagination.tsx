import React from "react";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface MeterSalesPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function MeterSalesPagination({
  currentPage,
  totalPages,
  onPageChange,
}: MeterSalesPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const goToPrevious = () => {
    onPageChange(Math.max(1, currentPage - 1));
  };

  const goToNext = () => {
    onPageChange(Math.min(totalPages, currentPage + 1));
  };

  return (
    <div className='mt-4 md:mt-6'>
      <Pagination>
        <PaginationContent className='flex-wrap justify-center gap-2'>
          <PaginationItem>
            <PaginationPrevious
              onClick={(event) => {
                event.preventDefault();
                goToPrevious();
              }}
              isActive={currentPage !== 1}
              className={
                currentPage === 1
                  ? "opacity-50 pointer-events-none"
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
              <React.Fragment key={page}>
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
                    isActive={page === currentPage}
                    className='cursor-pointer'>
                    {page}
                  </PaginationLink>
                </PaginationItem>
              </React.Fragment>
            ))}

          <PaginationItem>
            <PaginationNext
              onClick={(event) => {
                event.preventDefault();
                goToNext();
              }}
              isActive={currentPage !== totalPages}
              className={
                currentPage === totalPages
                  ? "opacity-50 pointer-events-none"
                  : "cursor-pointer"
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
