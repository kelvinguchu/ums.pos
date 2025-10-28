import { getPurchaseBatches } from "@/lib/actions/reports";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay, startOfDay } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, X, Loader2, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useState, Fragment } from "react";
import { cn } from "@/lib/utils";

interface PurchaseBatch {
  id: string;
  batch_number: string;
  meter_type: string;
  quantity: number;
  total_cost: string;
  purchase_date: Date | null;
  added_by: string | null;
  created_at: Date | null;
  remaining_meters: number;
  user_profiles: {
    name: string | null;
  } | null;
}

// Update sorting function
const sortBatches = (batches: PurchaseBatch[]) => {
  const getTimestamp = (batch: PurchaseBatch) => {
    const purchase = batch.purchase_date
      ? new Date(batch.purchase_date).getTime()
      : null;
    const created = batch.created_at
      ? new Date(batch.created_at).getTime()
      : null;

    return purchase ?? created ?? 0;
  };

  return [...batches].sort((a, b) => {
    const timeDiff = getTimestamp(b) - getTimestamp(a);
    if (timeDiff !== 0) {
      return timeDiff;
    }

    // Fallback to remaining meters if timestamps are identical
    return b.remaining_meters - a.remaining_meters;
  });
};

const remainingBadgeClass = (remaining: number, quantity: number) => {
  if (remaining <= 0) {
    return "bg-red-100 text-red-800 border-transparent";
  }

  if (quantity > 0 && remaining < quantity * 0.2) {
    return "bg-amber-100 text-amber-800 border-transparent";
  }

  return "bg-emerald-100 text-emerald-800 border-transparent";
};

export default function PurchaseBatchesView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const itemsPerPage = 5;

  const {
    data: batches = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<PurchaseBatch[]>({
    queryKey: ["purchaseBatches"],
    queryFn: getPurchaseBatches,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

  const handleRefresh = async () => {
    try {
      await refetch({ throwOnError: true });
      toast.success("Purchase batches data refreshed");
    } catch (err) {
      console.error("Failed to refresh data:", err);
      toast.error("Failed to refresh data");
    }
  };

  const isRefreshing = isFetching && !isLoading;

  if (error) {
    return (
      <div className='flex items-center justify-center p-4 text-red-500'>
        Error loading purchase batches
      </div>
    );
  }

  if (!isLoading && batches.length === 0) {
    return (
      <div className='flex items-center justify-center p-4'>
        No purchase batches found
      </div>
    );
  }

  // Filter batches
  let filteredBatches =
    batches.filter((batch: PurchaseBatch) => {
      const matchesSearch =
        searchTerm === "" ||
        batch.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.user_profiles?.name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesType =
        selectedType === "" ||
        !selectedType ||
        selectedType === "all" ||
        batch.meter_type.toLowerCase() === selectedType.toLowerCase();

      // Improved date filtering - normalize both dates to start of day
      const matchesDate =
        !selectedDate ||
        (batch.purchase_date &&
          isSameDay(
            startOfDay(new Date(batch.purchase_date)),
            startOfDay(selectedDate)
          ));

      return matchesSearch && matchesType && matchesDate;
    }) || [];

  // Apply sorting after filtering
  filteredBatches = sortBatches(filteredBatches);

  // Pagination
  const totalPages = Math.ceil(filteredBatches.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBatches = filteredBatches.slice(startIndex, endIndex);

  const hasActiveFilters = () => {
    return Boolean(
      searchTerm || (selectedType && selectedType !== "all") || selectedDate
    );
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedType("");
    setSelectedDate(undefined);
    setCurrentPage(1);
  };

  return (
    <div className='flex flex-col h-full overflow-hidden'>
      {/* Header - aligned with Sheet close button */}
      <div className='flex-none bg-gray-50 pb-4 pt-2 px-6 border-b border-gray-200'>
        <div className='flex justify-between items-center mb-4 pr-12'>
          <h2 className='text-2xl font-bold'>Purchase Batches</h2>
          <Button
            variant='outline'
            size='icon'
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            aria-label='Refresh purchase batch data'
            className='hover:bg-gray-100 cursor-pointer'>
            <RefreshCw
              className={cn(
                "h-4 w-4 transition-transform",
                (isLoading || isRefreshing) && "animate-spin"
              )}
            />
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className='flex-1 overflow-y-auto px-6 py-4'>
        {isLoading ? (
          <div className='flex justify-center items-center min-h-[200px]'>
            <div>
              <Loader2 className='h-3 w-3 animate-spin' />
            </div>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className='mb-6 space-y-4'>
              <div className='bg-white p-4 rounded-lg border shadow-sm'>
                <div className='flex flex-wrap items-center gap-3'>
                  <Input
                    type='text'
                    placeholder='Search by batch number or user...'
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className='w-[200px]'
                  />

                  <Select
                    value={selectedType || undefined}
                    onValueChange={(value) => {
                      setSelectedType(value);
                      setCurrentPage(1);
                    }}>
                    <SelectTrigger className='w-[140px] cursor-pointer'>
                      <SelectValue placeholder='Meter Type' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All Types</SelectItem>
                      <SelectItem value='split'>Split</SelectItem>
                      <SelectItem value='integrated'>Integrated</SelectItem>
                      <SelectItem value='gas'>Gas</SelectItem>
                      <SelectItem value='water'>Water</SelectItem>
                      <SelectItem value='3 Phase'>3 Phase</SelectItem>
                      <SelectItem value='Smart'>Smart</SelectItem>
                    </SelectContent>
                  </Select>

                  <Popover
                    open={isCalendarOpen}
                    onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant='outline'
                        className='w-[200px] justify-start text-left font-normal cursor-pointer'>
                        <CalendarIcon className='mr-2 h-4 w-4' />
                        {selectedDate ? (
                          format(selectedDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-auto p-0' align='start'>
                      <Calendar
                        mode='single'
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          setCurrentPage(1);
                          setIsCalendarOpen(false);
                        }}
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>

                  {hasActiveFilters() && (
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={clearFilters}
                      className='text-muted-foreground hover:text-foreground cursor-pointer'>
                      <X className='h-4 w-4' />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className='rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Cost (KES)</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Added By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentBatches.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className='text-center py-8 text-muted-foreground'>
                        No batches found matching the selected filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentBatches.map((batch: PurchaseBatch) => {
                      return (
                        <TableRow key={batch.id}>
                          <TableCell>
                            <Badge variant='outline'>
                              {batch.batch_number}
                            </Badge>
                          </TableCell>
                          <TableCell className='font-medium'>
                            {batch.meter_type.charAt(0).toUpperCase() +
                              batch.meter_type.slice(1)}
                          </TableCell>
                          <TableCell>{batch.quantity}</TableCell>
                          <TableCell>
                            <Badge
                              variant='outline'
                              className={cn(
                                "min-w-[40px] justify-center",
                                remainingBadgeClass(
                                  batch.remaining_meters,
                                  batch.quantity
                                )
                              )}>
                              {batch.remaining_meters}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className='space-y-1'>
                              <div>
                                Total:{" "}
                                {Number.parseFloat(
                                  batch.total_cost
                                ).toLocaleString()}
                              </div>
                              <div className='text-sm text-muted-foreground'>
                                Unit:{" "}
                                {(
                                  Number.parseFloat(batch.total_cost) /
                                  batch.quantity
                                ).toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {batch.purchase_date
                              ? format(
                                  new Date(batch.purchase_date),
                                  "dd/MM/yyyy"
                                )
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {batch.user_profiles?.name || "Unknown User"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
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
                          ? "pointer-events-none opacity-50 cursor-pointer"
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
                    .map((page, i, arr) => (
                      <Fragment key={page}>
                        {i > 0 && arr[i - 1] !== page - 1 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}
                        <PaginationItem>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className='cursor-pointer'>
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      </Fragment>
                    ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setCurrentPage((page) => Math.min(totalPages, page + 1))
                      }
                      className={
                        currentPage === totalPages
                          ? "pointer-events-none opacity-50 cursor-pointer"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
