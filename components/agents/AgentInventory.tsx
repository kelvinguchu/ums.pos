"use client";

import { useState, useEffect } from "react";
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
import { Search, Package } from "lucide-react";
import { getAgentInventory } from "@/lib/actions/agents";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";

// Add cache interface
interface InventoryCache {
  [key: string]: {
    data: MeterInventory[];
    timestamp: number;
  };
}

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Initialize cache
const inventoryCache: InventoryCache = {};

interface AgentInventoryProps {
  readonly agentId: string;
}

interface MeterInventory {
  id: string;
  serial_number: string;
  type: string;
  assigned_at: Date | null;
}

export default function AgentInventory({ agentId }: AgentInventoryProps) {
  const [inventory, setInventory] = useState<MeterInventory[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        // Check cache first
        const cachedData = inventoryCache[agentId];
        const now = Date.now();

        if (cachedData && now - cachedData.timestamp < CACHE_DURATION) {
          setInventory(cachedData.data);
          setIsLoading(false);
          return;
        }

        // If no cache or expired, fetch from API
        const data = await getAgentInventory(agentId);

        // Update cache
        inventoryCache[agentId] = {
          data: data || [],
          timestamp: now,
        };

        setInventory(data || []);
      } catch (error) {
        console.error("Error fetching inventory:", error);
        toast.error("Failed to load inventory");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventory();
  }, [agentId]);

  // Filter inventory based on search term
  const filteredInventory = inventory.filter((meter) =>
    meter.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentInventory = filteredInventory.slice(startIndex, endIndex);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Get meter counts by type
  const meterCounts = inventory.reduce(
    (acc, meter) => {
      acc[meter.type] = (acc[meter.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className='p-2 sm:p-4'>
      {/* Meter Count Summary */}
      <div className='mb-6 p-4 bg-white rounded-lg border shadow-sm'>
        <div className='flex items-center gap-2 mb-3'>
          <Package className='h-5 w-5 text-primary' />
          <h3 className='text-lg font-semibold text-primary'>
            Total Meters: {inventory.length}
          </h3>
        </div>
        <div className='flex flex-wrap gap-2'>
          {Object.entries(meterCounts).map(([type, count]) => (
            <Badge key={type} variant='outline' className='bg-blue-50'>
              {type}: {count}
            </Badge>
          ))}
        </div>
      </div>

      <div className='relative mb-4'>
        <Search className='absolute left-2 top-2.5 h-4 w-4 text-primary' />
        <Input
          placeholder='Search by serial number...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className='pl-8'
        />
      </div>

      <div className='rounded-md border'>
        <div className='overflow-auto'>
          <div className='min-w-[300px]'>
            {/* Desktop View */}
            <div className='hidden sm:block'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='text-primary'>
                      Serial Number
                    </TableHead>
                    <TableHead className='text-primary'>Type</TableHead>
                    <TableHead className='text-primary'>
                      Assigned Date
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className='text-center py-8 text-primary'>
                        Loading inventory...
                      </TableCell>
                    </TableRow>
                  ) : currentInventory.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className='text-center py-8 text-primary'>
                        {searchTerm
                          ? "No meters found matching search"
                          : "No meters assigned"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentInventory.map((meter) => (
                      <TableRow key={meter.id}>
                        <TableCell className='font-medium'>
                          {meter.serial_number}
                        </TableCell>
                        <TableCell>{meter.type}</TableCell>
                        <TableCell>
                          {meter.assigned_at
                            ? new Date(meter.assigned_at).toLocaleDateString()
                            : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile View */}
            <div className='block sm:hidden'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='text-primary'>
                      Serial Number
                    </TableHead>
                    <TableHead className='text-primary text-right'>
                      Details
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        className='text-center py-8 text-primary'>
                        Loading inventory...
                      </TableCell>
                    </TableRow>
                  ) : currentInventory.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        className='text-center py-8 text-primary'>
                        {searchTerm
                          ? "No meters found matching search"
                          : "No meters assigned"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentInventory.map((meter) => (
                      <TableRow key={meter.id}>
                        <TableCell>
                          <div className='font-medium'>
                            {meter.serial_number}
                          </div>
                          <div className='text-sm text-muted-foreground mt-1'>
                            Type: {meter.type}
                          </div>
                        </TableCell>
                        <TableCell className='text-right text-sm text-muted-foreground'>
                          {meter.assigned_at
                            ? new Date(meter.assigned_at).toLocaleDateString()
                            : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='mt-4 flex justify-center'>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  className={
                    currentPage === 1 ? "pointer-events-none opacity-50" : ""
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
                  <>
                    {i > 0 && arr[i - 1] !== page - 1 && (
                      <PaginationItem key={`ellipsis-${page}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={page === currentPage}>
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  </>
                ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
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
  );
}
