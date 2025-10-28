import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import React, { useState } from "react";
import {
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  X,
  Loader2,
} from "lucide-react";
import { getFaultyMeters } from "@/lib/actions/reports";
import { EmptyState } from "./EmptyState";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { CalendarDate } from "@internationalized/date";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateFaultyMeterStatus } from "@/lib/actions/meters";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface FaultyMeter {
  id: string;
  serial_number: string;
  type: string;
  returned_by: string;
  returned_at: Date | null;
  returner_name: string;
  fault_description: string | null;
  status: string | null;
  original_sale_id: string | null;
}

export default function FaultyMetersView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<CalendarDate | null>(null);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const {
    data: faultyMeters,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<FaultyMeter[]>({
    queryKey: ["faultyMeters"],
    queryFn: getFaultyMeters,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

  const handleRefresh = async () => {
    try {
      await refetch({ throwOnError: true });
      toast.success("Faulty meters data refreshed");
    } catch (err) {
      console.error("Failed to refresh data:", err);
      toast.error("Failed to refresh data");
    }
  };

  const isRefreshing = isFetching && !isLoading;

  const filteredMeters = faultyMeters?.filter((meter) => {
    const matchesSearch =
      searchTerm === "" ||
      meter.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meter.returner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meter.fault_description
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      false;

    const matchesDate =
      !selectedDate ||
      !meter.returned_at ||
      format(meter.returned_at, "yyyy-MM-dd") ===
        `${selectedDate.year}-${String(selectedDate.month).padStart(2, "0")}-${String(selectedDate.day).padStart(2, "0")}`;

    const matchesStatus =
      !selectedStatus ||
      selectedStatus === "all" ||
      !meter.status ||
      meter.status.toLowerCase() === selectedStatus.toLowerCase();

    return matchesSearch && matchesDate && matchesStatus;
  });

  const handleStatusUpdate = async (
    meter: FaultyMeter,
    newStatus: "repaired" | "unrepairable" | "pending"
  ) => {
    if (!user) {
      toast.error("You must be logged in to perform this action");
      return;
    }

    try {
      setIsUpdating(true);
      await updateFaultyMeterStatus(
        {
          id: meter.id,
          serial_number: meter.serial_number,
          type: meter.type,
          status: newStatus,
        },
        user.id,
        user.name || user.email || "System User"
      );

      await refetch({ throwOnError: true }); // Refresh the data

      toast.success(
        newStatus === "repaired"
          ? "Meter has been restored to inventory"
          : `Meter has been marked as ${newStatus}`
      );
    } catch (error) {
      console.error("Failed to update meter status:", error);
      toast.error("Failed to update meter status");
    } finally {
      setIsUpdating(false);
    }
  };

  if (error) {
    return (
      <div className='p-4 text-center text-red-500 flex items-center justify-center gap-2'>
        <AlertCircle className='h-4 w-4' />
        Failed to load faulty meters data
      </div>
    );
  }

  const hasActiveFilters = () => {
    return (
      searchTerm || selectedDate || (selectedStatus && selectedStatus !== "all")
    );
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedDate(null);
    setSelectedStatus("all");
  };

  // Pagination logic
  const totalPages = Math.ceil((filteredMeters?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMeters = filteredMeters?.slice(startIndex, endIndex);

  return (
    <div className='flex flex-col h-full overflow-hidden'>
      <div className='flex-none bg-gray-50 pb-4 pt-2 px-6 border-b border-gray-200'>
        <div className='flex justify-between items-center mb-4 pr-12'>
          <h2 className='flex items-center gap-2 text-2xl font-bold'>
            <AlertTriangle className='h-5 w-5 text-yellow-500' />
            Faulty Meters
          </h2>
          <Button
            variant='outline'
            size='icon'
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing || isUpdating}
            aria-label='Refresh faulty meters data'
            className='hover:bg-gray-100'>
            <RefreshCw
              className={cn(
                "h-4 w-4 transition-transform",
                (isLoading || isRefreshing) && "animate-spin"
              )}
            />
          </Button>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto px-6 py-4 space-y-4'>
        {isLoading ? (
          <div className='flex justify-center items-center min-h-[200px]'>
            <div>
              <Loader2 className='h-3 w-3 animate-spin' />
            </div>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className='bg-white p-4 rounded-lg border shadow-sm'>
              <div className='flex flex-wrap items-center gap-3'>
                <Input
                  type='text'
                  placeholder='Search by serial, description, or staff...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='w-[300px]'
                />
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}>
                  <SelectTrigger className='w-[140px]'>
                    <SelectValue>Status</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Status</SelectItem>
                    <SelectItem value='pending'>Pending</SelectItem>
                    <SelectItem value='repaired'>Repaired</SelectItem>
                    <SelectItem value='unrepairable'>Unrepairable</SelectItem>
                  </SelectContent>
                </Select>

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

            {filteredMeters && filteredMeters.length > 0 ? (
              <div className='space-y-4'>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow className='bg-gray-50'>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Returned By</TableHead>
                        <TableHead>Return Date</TableHead>
                        <TableHead>Fault Description</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(currentMeters || []).map((meter) => (
                        <TableRow key={meter.id}>
                          <TableCell className='font-mono'>
                            {meter.serial_number}
                          </TableCell>
                          <TableCell className='capitalize'>
                            {meter.type}
                          </TableCell>
                          <TableCell>{meter.returner_name}</TableCell>
                          <TableCell>
                            {meter.returned_at
                              ? meter.returned_at.toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {meter.fault_description || "-"}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant='outline'
                                  className='w-full justify-start'
                                  disabled={isUpdating}>
                                  <span
                                    className={cn(
                                      "capitalize",
                                      meter.status === "pending" &&
                                        "text-yellow-600",
                                      meter.status === "repaired" &&
                                        "text-green-600",
                                      meter.status === "unrepairable" &&
                                        "text-red-600"
                                    )}>
                                    {meter.status || "Unknown"}
                                  </span>
                                </Button>
                              </DialogTrigger>
                              <DialogContent className='bg-gray-50 border-gray-200 px-2'>
                                <DialogHeader>
                                  <DialogTitle>Update Meter Status</DialogTitle>
                                  <DialogDescription>
                                    Select the new status for meter{" "}
                                    {meter.serial_number}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className='grid gap-3 py-4'>
                                  <Button
                                    variant='outline'
                                    className='justify-start'
                                    onClick={() =>
                                      handleStatusUpdate(meter, "repaired")
                                    }
                                    disabled={
                                      meter.status === "repaired" || isUpdating
                                    }>
                                    <span className='text-green-600'>
                                      Repaired
                                    </span>
                                    {meter.status === "repaired" &&
                                      " (Current)"}
                                  </Button>
                                  <Button
                                    variant='outline'
                                    className='justify-start'
                                    onClick={() =>
                                      handleStatusUpdate(meter, "unrepairable")
                                    }
                                    disabled={
                                      meter.status === "unrepairable" ||
                                      isUpdating
                                    }>
                                    <span className='text-red-600'>
                                      Unrepairable
                                    </span>
                                    {meter.status === "unrepairable" &&
                                      " (Current)"}
                                  </Button>
                                  <Button
                                    variant='outline'
                                    className='justify-start'
                                    onClick={() =>
                                      handleStatusUpdate(meter, "pending")
                                    }
                                    disabled={
                                      meter.status === "pending" || isUpdating
                                    }>
                                    <span className='text-yellow-600'>
                                      Pending
                                    </span>
                                    {meter.status === "pending" && " (Current)"}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
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
                              (page >= currentPage - 1 &&
                                page <= currentPage + 1)
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
                icon={AlertTriangle}
                message='No faulty meters found'
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
