import React, { useState, useEffect, useRef, useMemo } from "react";
import { useMetersData, MeterStatusFilter } from "../hooks/useMetersData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getMeterTypeBadgeClass } from "../utils/meterTypeConfig";
import {
  Search,
  Package,
  User,
  ShoppingCart,
  AlertTriangle,
  RefreshCw,
  AlertCircle,
  Loader2,
  X,
  Check,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { generateCSV } from "@/lib/utils/csvGenerator";
import { getAllMetersForExport, MeterWithStatus } from "@/lib/actions/exports";
import { superSearchMeter } from "@/lib/actions/meters";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Define meter types
const METER_TYPES = [
  "integrated",
  "split",
  "gas",
  "water",
  "smart",
  "3 phase",
] as const;

const STATUS_ICONS = {
  in_stock: <Package className='h-4 w-4' />,
  with_agent: <User className='h-4 w-4' />,
  sold: <ShoppingCart className='h-4 w-4' />,
  replaced: <RefreshCw className='h-4 w-4' />,
  faulty: <AlertTriangle className='h-4 w-4' />,
};

const STATUS_COLORS = {
  in_stock: "bg-green-200 text-green-900",
  with_agent: "bg-blue-200 text-blue-900",
  sold: "bg-purple-200 text-purple-900",
  replaced: "bg-orange-200 text-orange-900",
  faulty: "bg-red-200 text-red-900",
};

// Add cache outside component to persist between renders
interface CachedResult {
  timestamp: number;
  data: any;
}

const searchCache: { [key: string]: CachedResult } = {};
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

// Debounce function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function (...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const AllMetersView: React.FC = () => {
  const {
    meters,
    totalCount,
    isLoading,
    isFetching,
    error,
    pagination,
    filters,
    refetch,
  } = useMetersData(25); // Reduce to 25 entries per page

  const [searchInput, setSearchInput] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Advanced search state
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Add function to check and clean cache
  const cleanCache = useMemo(() => {
    return () => {
      const now = Date.now();
      Object.keys(searchCache).forEach((key) => {
        if (now - searchCache[key].timestamp > CACHE_DURATION) {
          delete searchCache[key];
        }
      });
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // Apply the search filter directly
      filters.handleSearchChange(searchInput);
      setIsSearchOpen(false);
    } else if (e.key === "Escape") {
      // Clear search when Escape is pressed
      clearSearch();
    }
  };

  // Advanced search functionality
  useEffect(() => {
    const searchMeters = async () => {
      if (debouncedSearch.length < 3) {
        setSearchResults([]);
        return;
      }

      setIsSearchLoading(true);
      try {
        // Clean old cache entries
        cleanCache();

        // Check cache first
        const cachedResult = searchCache[debouncedSearch];
        if (
          cachedResult &&
          Date.now() - cachedResult.timestamp < CACHE_DURATION
        ) {
          setSearchResults(cachedResult.data);
          setIsSearchLoading(false);
          return;
        }

        // If not in cache, fetch from API
        const results = await superSearchMeter(debouncedSearch);

        // Cache the results if meter is sold or with agent
        const shouldCache = results.some(
          (result: any) =>
            result.status === "sold" || result.status === "with_agent"
        );

        if (shouldCache) {
          searchCache[debouncedSearch] = {
            timestamp: Date.now(),
            data: results,
          };
        }

        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setIsSearchLoading(false);
      }
    };

    searchMeters();
  }, [debouncedSearch, cleanCache]);

  // Handle debounced search input
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setSearchInput(value);

    // Only update debounced search if length is sufficient
    if (value.length >= 3 || value.length === 0) {
      setDebouncedSearch(value);
      setIsSearchOpen(value.length >= 3);
    }

    // If search is cleared, also clear the filter in useMetersData
    if (value.length === 0) {
      filters.handleSearchChange("");
    }
  };

  // Clear search and reset filters
  const clearSearch = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setSearchResults([]);
    filters.handleSearchChange("");
    setIsSearchOpen(false);
  };

  // Handle click outside search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);

      // Get all meters based on current filters
      const allMeters = await getAllMetersForExport(
        filters.statusFilter,
        filters.typeFilter,
        filters.searchTerm
      );

      if (!allMeters.length) {
        toast.error("No meters found to export with the current filters");
        setIsExporting(false);
        return;
      }

      // Format the data for CSV
      const csvData = allMeters.map((meter: MeterWithStatus) => {
        const baseData = {
          "Serial Number": meter.serial_number,
          Type: meter.type,
          Status: meter.status,
        };

        let additionalData = {};

        // Handle different meter statuses
        switch (meter.status) {
          case "with_agent":
            if (meter.agent_details) {
              additionalData = {
                "Agent Name": meter.agent_details.agent_name,
                "Agent Phone": meter.agent_details.agent_phone,
                "Agent Location": meter.agent_details.agent_location,
                "Assigned Date": meter.agent_details.assigned_at
                  ? format(
                      new Date(meter.agent_details.assigned_at),
                      "yyyy-MM-dd"
                    )
                  : "",
              };
            }
            break;

          case "sold":
            if (meter.sale_details) {
              additionalData = {
                "Sold Date": meter.sale_details.sold_at
                  ? format(new Date(meter.sale_details.sold_at), "yyyy-MM-dd")
                  : "",
                "Sold By": meter.sale_details.sold_by,
                Recipient: meter.sale_details.recipient,
                Destination: meter.sale_details.destination,
                "Customer Contact": meter.sale_details.customer_contact,
                "Unit Price": meter.sale_details.unit_price,
              };
            }
            break;

          case "replaced":
            if (meter.sale_details) {
              additionalData = {
                "Sold Date": meter.sale_details.sold_at
                  ? format(new Date(meter.sale_details.sold_at), "yyyy-MM-dd")
                  : "",
                "Sold By": meter.sale_details.sold_by,
                Recipient: meter.sale_details.recipient,
                Destination: meter.sale_details.destination,
                "Customer Contact": meter.sale_details.customer_contact,
                "Unit Price": meter.sale_details.unit_price,
              };

              if (meter.replacement_details) {
                additionalData = {
                  ...additionalData,
                  "Replacement Serial":
                    meter.replacement_details.replacement_serial,
                  "Replacement Date": meter.replacement_details.replacement_date
                    ? format(
                        new Date(meter.replacement_details.replacement_date),
                        "yyyy-MM-dd"
                      )
                    : "",
                  "Replaced By": meter.replacement_details.replacement_by,
                };
              }
            }
            break;

          case "faulty":
            if (meter.fault_details) {
              additionalData = {
                "Reported Date": meter.fault_details.reported_at
                  ? format(
                      new Date(meter.fault_details.reported_at),
                      "yyyy-MM-dd"
                    )
                  : "",
                "Reported By": meter.fault_details.reported_by,
                "Returner Name": meter.fault_details.returner_name,
                "Fault Description": meter.fault_details.fault_description,
                "Fault Status": meter.fault_details.fault_status,
              };
            }

            if (meter.sale_details) {
              additionalData = {
                ...additionalData,
                "Sold Date": meter.sale_details.sold_at
                  ? format(new Date(meter.sale_details.sold_at), "yyyy-MM-dd")
                  : "",
                "Sold By": meter.sale_details.sold_by,
                Recipient: meter.sale_details.recipient,
                Destination: meter.sale_details.destination,
              };
            }
            break;

          case "in_stock":
            // No additional data needed for in_stock meters
            break;

          default:
            break;
        }

        return {
          ...baseData,
          ...additionalData,
        };
      });

      // Generate and download the CSV
      generateCSV(
        csvData,
        `meters-report-${filters.statusFilter || "all"}-${
          new Date().toISOString().split("T")[0]
        }`
      );

      toast.success(`Exported ${allMeters.length} meters`);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error(
        "An error occurred while exporting the data. Please try again."
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await refetch({ throwOnError: true });
      toast.success("Meter data has been refreshed");
    } catch (error) {
      console.error("Failed to refresh meter data:", error);
      toast.error("Failed to refresh meter data");
    }
  };

  const isRefreshing = isFetching && !isLoading;

  const renderMeterDetails = (meter: MeterWithStatus) => {
    return (
      <div className='space-y-1 text-sm'>
        {meter.status === "with_agent" && meter.agent_details && (
          <div>
            <p className='text-muted-foreground'>
              <span className='font-medium'>Agent:</span>{" "}
              {meter.agent_details.agent_name}
            </p>
            <p className='text-muted-foreground'>
              <span className='font-medium'>Phone:</span>{" "}
              {meter.agent_details.agent_phone}
            </p>
            <p className='text-muted-foreground'>
              <span className='font-medium'>Location:</span>{" "}
              {meter.agent_details.agent_location}
            </p>
            <p className='text-muted-foreground'>
              <span className='font-medium'>Assigned on:</span>{" "}
              {meter.agent_details.assigned_at
                ? format(
                    new Date(meter.agent_details.assigned_at),
                    "MMM d, yyyy"
                  )
                : "Unknown"}
            </p>
          </div>
        )}

        {(meter.status === "sold" || meter.status === "replaced") &&
          meter.sale_details && (
            <div>
              <p className='text-muted-foreground'>
                <span className='font-medium'>Sold on:</span>{" "}
                {format(new Date(meter.sale_details.sold_at), "MMM d, yyyy")}
              </p>
              <p className='text-muted-foreground'>
                <span className='font-medium'>Sold by:</span>{" "}
                {meter.sale_details.sold_by}
              </p>
              <p className='text-muted-foreground'>
                <span className='font-medium'>Destination:</span>{" "}
                {meter.sale_details.destination}
              </p>
              <p className='text-muted-foreground'>
                <span className='font-medium'>Recipient:</span>{" "}
                {meter.sale_details.recipient}
              </p>
              {meter.sale_details.customer_contact && (
                <p className='text-muted-foreground'>
                  <span className='font-medium'>Contact:</span>{" "}
                  {meter.sale_details.customer_contact}
                </p>
              )}
            </div>
          )}

        {meter.status === "replaced" && meter.replacement_details && (
          <div className='mt-2 pt-2 border-t'>
            <p className='text-muted-foreground'>
              <span className='font-medium'>Replaced with:</span>{" "}
              {meter.replacement_details.replacement_serial}
            </p>
            <p className='text-muted-foreground'>
              <span className='font-medium'>Replaced on:</span>{" "}
              {format(
                new Date(meter.replacement_details.replacement_date),
                "MMM d, yyyy"
              )}
            </p>
          </div>
        )}

        {meter.status === "faulty" && meter.fault_details && (
          <div>
            <p className='text-muted-foreground'>
              <span className='font-medium'>Returned on:</span>{" "}
              {format(
                new Date(meter.fault_details.returned_at || ""),
                "MMM d, yyyy"
              )}
            </p>
            <p className='text-muted-foreground'>
              <span className='font-medium'>Returned by:</span>{" "}
              {meter.fault_details.returner_name || ""}
            </p>
            <p className='text-muted-foreground'>
              <span className='font-medium'>Fault:</span>{" "}
              {meter.fault_details.fault_description}
            </p>
            <p className='text-muted-foreground'>
              <span className='font-medium'>Status:</span>{" "}
              <Badge
                variant='outline'
                className={
                  meter.fault_details.fault_status === "repaired"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }>
                {meter.fault_details.fault_status || ""}
              </Badge>
            </p>
          </div>
        )}
      </div>
    );
  };

  // Skeleton loader component
  const TableSkeleton = () => (
    <div className='space-y-3'>
      <div className='flex items-center space-x-4'>
        <Skeleton className='h-8 w-[250px]' />
        <Skeleton className='h-8 w-[100px]' />
      </div>
      {Array(5)
        .fill(0)
        .map((_, i) => (
          <div key={i} className='flex items-center space-x-4'>
            <Skeleton className='h-12 w-full' />
          </div>
        ))}
    </div>
  );

  const CardSkeleton = () => (
    <div className='space-y-4'>
      {Array(3)
        .fill(0)
        .map((_, i) => (
          <Card key={i} className='p-4'>
            <div className='space-y-3'>
              <div className='flex justify-between'>
                <Skeleton className='h-5 w-[120px]' />
                <Skeleton className='h-5 w-[80px]' />
              </div>
              <Skeleton className='h-4 w-[180px]' />
              <Skeleton className='h-4 w-full' />
            </div>
          </Card>
        ))}
    </div>
  );

  return (
    <div className='flex flex-col h-full overflow-hidden'>
      <div className='flex-none bg-gray-50 pb-4 pt-2 px-6 border-b border-gray-200'>
        <div className='flex justify-between items-center mb-4 pr-12'>
          <h2 className='text-2xl font-bold'>All Meters</h2>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              aria-label='Refresh meter data'
              className='cursor-pointer'>
              <RefreshCw
                className={cn(
                  "h-4 w-4 mr-2 transition-transform",
                  (isLoading || isRefreshing) && "animate-spin"
                )}
              />
              Refresh
            </Button>

            {/* Advanced Search Input */}
            <div className='relative w-64' ref={searchRef}>
              <div className='relative w-full'>
                <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  type='text'
                  placeholder='Search by serial number...'
                  value={searchInput}
                  onChange={handleSearchInputChange}
                  onKeyDown={handleKeyDown}
                  className='pl-8 pr-8 w-full bg-gray-50/50 border-gray-200 focus:bg-white transition-colors'
                  onFocus={() => setIsSearchOpen(searchInput.length >= 3)}
                />
                {searchInput && (
                  <button
                    onClick={clearSearch}
                    className='absolute right-2 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer'>
                    <X className='h-4 w-4' />
                  </button>
                )}
                {isSearchLoading && (
                  <div className='absolute right-2 top-2.5'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                  </div>
                )}
              </div>

              {/* Search Results Popover */}
              {isSearchOpen && searchInput.length >= 3 && (
                <div className='absolute mt-1 w-[350px] right-0 bg-white rounded-md border shadow-lg z-50'>
                  <div className='max-h-[60vh] overflow-y-auto p-2'>
                    {isSearchLoading ? (
                      <div className='flex items-center justify-center py-4'>
                        <Loader2 className='h-6 w-6 animate-spin text-primary' />
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className='text-center py-4 text-gray-500'>
                        No meters found
                      </div>
                    ) : (
                      <div className='space-y-2'>
                        {searchResults.map((result: any) => (
                          <div
                            key={result.serial_number}
                            className='flex flex-col p-3 hover:bg-gray-50 rounded-md gap-2 border-b last:border-0 cursor-pointer'
                            onClick={() => {
                              // Set the filter to match this meter's status
                              filters.handleStatusFilterChange(
                                result.status as MeterStatusFilter
                              );
                              // Set search term to this meter's serial number
                              filters.handleSearchChange(result.serial_number);
                              setSearchInput(result.serial_number);
                              setIsSearchOpen(false);
                            }}>
                            <div>
                              <div className='font-medium text-primary flex items-center gap-2'>
                                {result.serial_number}
                                {result.status === "in_stock" && (
                                  <Badge className='bg-green-500'>
                                    <Check className='mr-1 h-3 w-3' />
                                    In Stock
                                  </Badge>
                                )}
                                {result.status === "with_agent" && (
                                  <Badge className='bg-orange-500'>
                                    <User className='mr-1 h-3 w-3' />
                                    With Agent
                                  </Badge>
                                )}
                                {result.status === "sold" && (
                                  <Badge className='bg-blue-500'>
                                    <DollarSign className='mr-1 h-3 w-3' />
                                    Sold
                                  </Badge>
                                )}
                                {result.status === "replaced" && (
                                  <Badge className='bg-purple-500'>
                                    <AlertCircle className='mr-1 h-3 w-3' />
                                    Replaced
                                  </Badge>
                                )}
                                {result.status === "faulty" && (
                                  <Badge className='bg-red-500'>
                                    <AlertTriangle className='mr-1 h-3 w-3' />
                                    Faulty
                                  </Badge>
                                )}
                              </div>
                              {result.type && (
                                <div className='text-sm text-gray-500 mt-1'>
                                  Type: {result.type}
                                </div>
                              )}
                              {result.status === "with_agent" &&
                                result.agent && (
                                  <div className='text-sm text-gray-500 mt-1'>
                                    Agent: {result.agent.name},{" "}
                                    {result.agent.location}
                                  </div>
                                )}
                              {(result.status === "sold" ||
                                result.status === "replaced") &&
                                result.sale_details && (
                                  <div className='text-sm text-gray-500 space-y-1 mt-2'>
                                    <div>
                                      Sold on:{" "}
                                      {format(
                                        new Date(result.sale_details.sold_at),
                                        "MMM d, yyyy"
                                      )}
                                    </div>
                                    <div>
                                      Sold by: {result.sale_details.sold_by}
                                    </div>
                                    <div>
                                      To: {result.sale_details.recipient},{" "}
                                      {result.sale_details.destination}
                                    </div>
                                  </div>
                                )}
                              {result.status === "faulty" &&
                                result.fault_details && (
                                  <div className='text-sm text-gray-500 space-y-1 mt-2'>
                                    <div>
                                      Fault:{" "}
                                      {result.fault_details.fault_description}
                                    </div>
                                    {result.fault_details.returned_at && (
                                      <div>
                                        Returned on:{" "}
                                        {format(
                                          new Date(
                                            result.fault_details.returned_at
                                          ),
                                          "MMM d, yyyy"
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Button
              variant='outline'
              size='sm'
              onClick={handleExportCSV}
              disabled={isExporting || isLoading}
              className='ml-2 cursor-pointer'>
              {isExporting ? (
                <>
                  <span className='animate-spin mr-2'>⏳</span>
                  Exporting...
                </>
              ) : (
                "Export CSV"
              )}
            </Button>
          </div>
        </div>

        <Tabs
          defaultValue='in_stock'
          className='w-full'
          value={filters.statusFilter}
          onValueChange={(value) => {
            filters.handleStatusFilterChange(value as MeterStatusFilter);
          }}>
          <div className='flex justify-between items-center mb-4'>
            <TabsList>
              <TabsTrigger value='in_stock' className='cursor-pointer'>
                In Stock
              </TabsTrigger>
              <TabsTrigger value='with_agent' className='cursor-pointer'>
                With Agent
              </TabsTrigger>
              <TabsTrigger value='sold' className='cursor-pointer'>
                Sold
              </TabsTrigger>
              <TabsTrigger value='replaced' className='cursor-pointer'>
                Replaced
              </TabsTrigger>
              <TabsTrigger value='faulty' className='cursor-pointer'>
                Faulty
              </TabsTrigger>
            </TabsList>

            <Select
              value={filters.typeFilter || ""}
              onValueChange={(value) => {
                filters.handleTypeFilterChange(value || null);
              }}>
              <SelectTrigger className='w-[150px] cursor-pointer'>
                <SelectValue placeholder='All Types' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Types</SelectItem>
                {METER_TYPES.map((type: string) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Tabs>
      </div>

      <div className='flex-1 overflow-y-auto px-6 py-4'>
        <Tabs
          defaultValue='in_stock'
          className='w-full'
          value={filters.statusFilter}
          onValueChange={(value) => {
            filters.handleStatusFilterChange(value as MeterStatusFilter);
          }}>
          {/* Content for each tab */}
          {["in_stock", "with_agent", "sold", "replaced", "faulty"].map(
            (status) => (
              <TabsContent key={status} value={status} className='mt-0'>
                {isLoading ? (
                  <div>
                    {/* Mobile skeleton */}
                    <div className='md:hidden'>
                      <CardSkeleton />
                    </div>
                    {/* Desktop skeleton */}
                    <div className='hidden md:block'>
                      <TableSkeleton />
                    </div>
                  </div>
                ) : error ? (
                  <div className='flex flex-col justify-center items-center h-64'>
                    <AlertCircle className='h-8 w-8 text-red-500 mb-2' />
                    <p className='text-red-500'>Error loading meters</p>
                    <Button
                      variant='outline'
                      size='sm'
                      className='mt-2 cursor-pointer'
                      onClick={() => refetch()}>
                      Retry
                    </Button>
                  </div>
                ) : meters.length === 0 ? (
                  <div className='flex flex-col justify-center items-center h-64'>
                    <Package className='h-8 w-8 text-gray-400 mb-2' />
                    <p className='text-gray-500'>No meters found</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile view */}
                    <div className='md:hidden space-y-4'>
                      {(meters as MeterWithStatus[]).map((meter) => (
                        <Card key={meter.serial_number} className='p-4'>
                          <div className='flex justify-between items-start'>
                            <div>
                              <p className='font-medium'>
                                {meter.serial_number}
                              </p>
                              <Badge
                                className={getMeterTypeBadgeClass(meter.type)}>
                                {meter.type}
                              </Badge>
                            </div>
                          </div>
                          {renderMeterDetails(meter)}
                        </Card>
                      ))}
                    </div>

                    {/* Desktop view */}
                    <div className='hidden md:block'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Serial Number</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(meters as MeterWithStatus[]).map((meter) => (
                            <TableRow key={meter.serial_number}>
                              <TableCell className='font-medium'>
                                {meter.serial_number}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={getMeterTypeBadgeClass(
                                    meter.type
                                  )}>
                                  {meter.type}
                                </Badge>
                              </TableCell>
                              <TableCell>{renderMeterDetails(meter)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}

                {/* Pagination */}
                {meters.length > 0 && (
                  <div className='flex justify-end mt-4'>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() =>
                              pagination.handlePageChange(pagination.page - 1)
                            }
                            className={
                              pagination.page === 1
                                ? "opacity-50 pointer-events-none"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>

                        {/* First page */}
                        {pagination.page > 2 && (
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => pagination.handlePageChange(1)}
                              className='cursor-pointer'>
                              1
                            </PaginationLink>
                          </PaginationItem>
                        )}

                        {/* Ellipsis if needed */}
                        {pagination.page > 3 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}

                        {/* Previous page if not on first page */}
                        {pagination.page > 1 && (
                          <PaginationItem>
                            <PaginationLink
                              onClick={() =>
                                pagination.handlePageChange(pagination.page - 1)
                              }
                              className='cursor-pointer'>
                              {pagination.page - 1}
                            </PaginationLink>
                          </PaginationItem>
                        )}

                        {/* Current page */}
                        <PaginationItem>
                          <PaginationLink isActive>
                            {pagination.page}
                          </PaginationLink>
                        </PaginationItem>

                        {/* Next page if not on last page */}
                        {pagination.page < pagination.totalPages && (
                          <PaginationItem>
                            <PaginationLink
                              onClick={() =>
                                pagination.handlePageChange(pagination.page + 1)
                              }
                              className='cursor-pointer'>
                              {pagination.page + 1}
                            </PaginationLink>
                          </PaginationItem>
                        )}

                        {/* Ellipsis if needed */}
                        {pagination.page < pagination.totalPages - 2 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}

                        {/* Last page */}
                        {pagination.page < pagination.totalPages - 1 && (
                          <PaginationItem>
                            <PaginationLink
                              onClick={() =>
                                pagination.handlePageChange(
                                  pagination.totalPages
                                )
                              }
                              className='cursor-pointer'>
                              {pagination.totalPages}
                            </PaginationLink>
                          </PaginationItem>
                        )}

                        <PaginationItem>
                          <PaginationNext
                            onClick={() =>
                              pagination.handlePageChange(pagination.page + 1)
                            }
                            className={
                              pagination.page === pagination.totalPages
                                ? "opacity-50 pointer-events-none"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </TabsContent>
            )
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default AllMetersView;
