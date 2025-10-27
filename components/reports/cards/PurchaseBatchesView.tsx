import { getPurchaseBatches } from "@/lib/actions/meters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
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
import Loader from "@/components/ui/Loader";

interface PurchaseBatch {
  id: string;
  batch_number: string;
  meter_type: string;
  quantity: number;
  total_cost: string;
  purchase_date: Date | null;
  added_by: string;
  created_at: Date | null;
  remaining_meters: number;
  user_name: string | null;
  user_profiles: {
    name: string | null;
  } | null;
}

// Update sorting function
const sortBatches = (batches: PurchaseBatch[]) => {
  return [...batches].sort((a, b) => {
    // Sort by remaining meters (highest first)
    return b.remaining_meters - a.remaining_meters;
  });
};

export default function PurchaseBatchesView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const {
    data: batches,
    isLoading,
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
      await refetch();
      toast.success("Purchase batches data refreshed");
    } catch (err) {
      console.error("Failed to refresh data:", err);
      toast.error("Failed to refresh data");
    }
  };

  if (error) {
    return (
      <div className='flex items-center justify-center p-4 text-red-500'>
        Error loading purchase batches
      </div>
    );
  }

  if (!batches || batches.length === 0) {
    return (
      <div className='flex items-center justify-center p-4'>
        No purchase batches found
      </div>
    );
  }

  // Filter batches
  let filteredBatches =
    batches?.filter((batch: PurchaseBatch) => {
      const matchesSearch =
        searchTerm === "" ||
        batch.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.user_profiles?.name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesType =
        selectedType === "" ||
        batch.meter_type.toLowerCase() === selectedType.toLowerCase();

      const matchesDate =
        !selectedDate ||
        (batch.purchase_date &&
          format(new Date(batch.purchase_date), "yyyy-MM-dd") ===
            format(selectedDate, "yyyy-MM-dd"));

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
    return searchTerm || selectedType || selectedDate;
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedType("");
    setSelectedDate(undefined);
    setCurrentPage(1);
  };

  return (
    <Card className='mt-6'>
      <CardHeader className='p-4 md:p-6'>
        <div className='flex justify-between items-center'>
          <CardTitle className='text-lg md:text-xl'>Purchase Batches</CardTitle>
          <Button
            variant='outline'
            size='icon'
            onClick={handleRefresh}
            className='hover:bg-gray-100'>
            <RefreshCw className='h-4 w-4' />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className='flex justify-center items-center min-h-[200px]'>
            <Loader />
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
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className='w-[200px]'
                  />

                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className='w-[140px]'>
                      <SelectValue>{selectedType || "Meter Type"}</SelectValue>
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

                  <div className='w-[130px]'>
                    <DatePicker
                      value={selectedDate}
                      onChange={setSelectedDate}
                    />
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
                  {currentBatches.map((batch: PurchaseBatch) => {
                    let variant: "default" | "destructive" | "secondary";
                    if (batch.remaining_meters === 0) {
                      variant = "destructive";
                    } else if (batch.remaining_meters < batch.quantity * 0.2) {
                      variant = "secondary";
                    } else {
                      variant = "default";
                    }
                    return (
                      <TableRow key={batch.id}>
                        <TableCell>
                          <Badge variant='outline'>{batch.batch_number}</Badge>
                        </TableCell>
                        <TableCell className='font-medium'>
                          {batch.meter_type.charAt(0).toUpperCase() +
                            batch.meter_type.slice(1)}
                        </TableCell>
                        <TableCell>{batch.quantity}</TableCell>
                        <TableCell>
                          <Badge variant={variant}>
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
                            ? format(new Date(batch.purchase_date), "dd/MM/yyyy")
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          {batch.user_profiles?.name || "Unknown User"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
                      <Fragment key={page}>
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
                      </Fragment>
                    ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setCurrentPage((page) => Math.min(totalPages, page + 1))
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
