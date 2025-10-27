import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import React, { useState } from "react";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RefreshCw, AlertCircle, X } from "lucide-react";
import { getMeterReplacements } from "@/lib/actions/reports";
import { EmptyState } from "./EmptyState";
import { useQuery } from "@tanstack/react-query";
import Loader from "@/components/ui/Loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Replacement {
  id: string;
  serial_number: string;
  recipient: string | null;
  customer_contact: string | null;
  replacement_serial: string | null;
  replacement_date: Date | null;
  replacement_by: string | null;
}

export default function ReplacementsView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const {
    data: replacements,
    isLoading,
    error,
    refetch,
  } = useQuery<Replacement[]>({
    queryKey: ["replacements"],
    queryFn: getMeterReplacements,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success("Replacement data refreshed");
    } catch (err) {
      toast.error("Failed to refresh data");
    }
  };

  const filteredReplacements = replacements?.filter((replacement) => {
    const matchesSearch =
      searchTerm === "" ||
      replacement.serial_number
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      replacement.replacement_serial
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      false ||
      replacement.recipient?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false ||
      replacement.replacement_by
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      false;

    const matchesDate =
      !selectedDate ||
      !replacement.replacement_date ||
      format(replacement.replacement_date, "yyyy-MM-dd") ===
        format(selectedDate, "yyyy-MM-dd");

    return matchesSearch && matchesDate;
  });

  // Pagination logic
  const totalPages = Math.ceil(
    (filteredReplacements?.length || 0) / itemsPerPage
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentReplacements = filteredReplacements?.slice(startIndex, endIndex);

  if (error) {
    return (
      <div className='p-4 text-center text-red-500 flex items-center justify-center gap-2'>
        <AlertCircle className='h-4 w-4' />
        Failed to load replacement data
      </div>
    );
  }

  const hasActiveFilters = () => {
    return searchTerm || selectedDate;
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedDate(undefined);
  };

  return (
    <div className='space-y-4'>
      <SheetHeader>
        <div className='flex justify-between items-center'>
          <SheetTitle className='flex items-center gap-2'>
            <RefreshCw className='h-5 w-5 text-blue-500' />
            Meter Replacements
          </SheetTitle>
          <Button
            variant='outline'
            size='icon'
            onClick={handleRefresh}
            className='hover:bg-gray-100 mr-4'>
            <RefreshCw className='h-4 w-4' />
          </Button>
        </div>
      </SheetHeader>

      {isLoading ? (
        <div className='flex justify-center items-center min-h-[200px]'>
          <Loader />
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className='bg-white p-4 rounded-lg border shadow-sm'>
            <div className='flex flex-wrap items-center gap-3'>
              <Input
                type='text'
                placeholder='Search by serial, customer, or staff...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='w-[300px]'
              />

              <div className='w-[130px]'>
                <DatePicker value={selectedDate} onChange={setSelectedDate} />
              </div>

              {hasActiveFilters() && (
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={clearFilters}
                  className='text-muted-foreground hover:text-foreground'>
                  <X className='h-4 w-4' />
                </Button>
              )}
            </div>
          </div>

          {filteredReplacements && filteredReplacements.length > 0 ? (
            <div className='space-y-4'>
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow className='bg-gray-50'>
                      <TableHead>Original Serial</TableHead>
                      <TableHead>Replacement Serial</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Replaced By</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(currentReplacements || []).map((replacement) => (
                      <TableRow key={replacement.id}>
                        <TableCell className='font-mono'>
                          {replacement.serial_number}
                        </TableCell>
                        <TableCell className='font-mono'>
                          {replacement.replacement_serial || "-"}
                        </TableCell>
                        <TableCell>{replacement.recipient || "-"}</TableCell>
                        <TableCell>
                          {replacement.customer_contact || "-"}
                        </TableCell>
                        <TableCell>
                          {replacement.replacement_by || "-"}
                        </TableCell>
                        <TableCell>
                          {replacement.replacement_date
                            ? replacement.replacement_date.toLocaleDateString()
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className='mt-4'>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            setCurrentPage((page) => Math.max(1, page - 1))
                          }
                          className={
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : ""
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
                        .map((page, i, arr) => (
                          <React.Fragment key={page}>
                            {i > 0 && arr[i - 1] !== page - 1 && (
                              <PaginationItem>
                                <PaginationEllipsis />
                              </PaginationItem>
                            )}
                            <PaginationItem>
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}>
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          </React.Fragment>
                        ))}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setCurrentPage((page) =>
                              Math.min(totalPages, page + 1)
                            )
                          }
                          className={
                            currentPage === totalPages
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={RefreshCw}
              message='No meter replacements found'
            />
          )}
        </>
      )}
    </div>
  );
}
