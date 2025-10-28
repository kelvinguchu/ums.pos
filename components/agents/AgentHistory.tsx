"use client";

import { useState } from "react";
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
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAgentTransactions } from "./hooks/useAgentTransactions";
import { RefreshCw, Search, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import Loader from "@/components/ui/Loader";

const EmptyState = () => (
  <div className='flex flex-col items-center justify-center p-8 text-gray-500'>
    <div className='relative'>
      <History className='w-12 h-12 mb-4 text-gray-400' />
      <span className='absolute -bottom-1 -right-1 flex h-3 w-3'>
        <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75'></span>
        <span className='relative inline-flex rounded-full h-3 w-3 bg-primary'></span>
      </span>
    </div>
    <p className='text-sm font-medium'>No transaction history yet</p>
    <p className='text-xs text-gray-400 mt-1'>
      Agent transactions will appear here
    </p>
  </div>
);

const getTransactionTypeBadge = (type: string) => {
  const variants: Record<string, { variant: any; className: string }> = {
    assignment: {
      variant: "outline",
      className: "bg-blue-100 text-blue-800 border-blue-300",
    },
    sale: {
      variant: "outline",
      className: "bg-green-100 text-green-800 border-green-300",
    },
    return: {
      variant: "outline",
      className: "bg-orange-100 text-orange-800 border-orange-300",
    },
  };

  const config = variants[type] || variants.assignment;

  return (
    <Badge variant={config.variant} className={config.className}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </Badge>
  );
};

const getMeterTypeBadge = (type: string) => {
  return (
    <Badge variant='secondary' className='bg-gray-100 text-gray-800'>
      {type}
    </Badge>
  );
};

export default function AgentHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data, isLoading, isError, error, refetch, isFetching } =
    useAgentTransactions(currentPage, itemsPerPage, searchTerm);

  const handleRefresh = async () => {
    try {
      await refetch({ cancelRefetch: false, throwOnError: true });
      toast.success("Transaction history refreshed");
    } catch (error) {
      console.error("Failed to refresh data:", error);
      toast.error("Failed to refresh data");
    }
  };

  const isRefreshing = isFetching && !isLoading;

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className='relative flex items-center justify-center h-64'>
        <Loader />
      </div>
    );
  }

  if (isError) {
    return <div>Error: {error?.message}</div>;
  }

  const { transactions = [], pagination } = data || {
    transactions: [],
    pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
  };

  return (
    <div className='space-y-4'>
      {/* Search and Actions Bar */}
      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        <div className='relative flex-1 w-full sm:max-w-sm'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
          <Input
            type='text'
            placeholder='Search by agent name...'
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className='pl-10'
          />
        </div>

        <div className='flex items-center gap-2'>
          <div className='text-sm text-gray-600'>
            Total: <span className='font-semibold'>{pagination.total}</span>{" "}
            transactions
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={handleRefresh}
            className='gap-2 cursor-pointer'
            disabled={isRefreshing}>
            <RefreshCw
              className={cn(
                "w-4 h-4 transition-transform",
                isRefreshing && "animate-spin"
              )}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Desktop View */}
      <div className='hidden md:block'>
        <Table>
          <TableHeader>
            <TableRow className='bg-gray-50'>
              <TableHead className='font-semibold'>Date</TableHead>
              <TableHead className='font-semibold'>Agent Name</TableHead>
              <TableHead className='font-semibold'>Transaction Type</TableHead>
              <TableHead className='font-semibold'>Meter Type</TableHead>
              <TableHead className='font-semibold text-right'>
                Quantity
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length > 0 ? (
              transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {transaction.transaction_date
                      ? format(
                          new Date(transaction.transaction_date),
                          "MMM dd, yyyy HH:mm"
                        )
                      : "N/A"}
                  </TableCell>
                  <TableCell className='font-medium'>
                    {transaction.agent_name || "Unknown Agent"}
                  </TableCell>
                  <TableCell>
                    {getTransactionTypeBadge(transaction.transaction_type)}
                  </TableCell>
                  <TableCell>
                    {getMeterTypeBadge(transaction.meter_type)}
                  </TableCell>
                  <TableCell className='text-right font-semibold'>
                    {transaction.quantity}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View */}
      <div className='block md:hidden space-y-4'>
        {transactions.length > 0 ? (
          transactions.map((transaction) => (
            <div
              key={transaction.id}
              className='border rounded-lg p-4 space-y-3'>
              <div className='flex items-start justify-between'>
                <div>
                  <p className='font-semibold text-sm'>
                    {transaction.agent_name || "Unknown Agent"}
                  </p>
                  <p className='text-xs text-gray-500'>
                    {transaction.transaction_date
                      ? format(
                          new Date(transaction.transaction_date),
                          "MMM dd, yyyy HH:mm"
                        )
                      : "N/A"}
                  </p>
                </div>
                <div className='text-right'>
                  <p className='text-lg font-bold'>{transaction.quantity}</p>
                  <p className='text-xs text-gray-500'>Meters</p>
                </div>
              </div>

              <div className='flex items-center gap-2 flex-wrap'>
                {getTransactionTypeBadge(transaction.transaction_type)}
                {getMeterTypeBadge(transaction.meter_type)}
              </div>
            </div>
          ))
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className='mt-4 flex justify-center'>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  className={cn(
                    "cursor-pointer",
                    currentPage === 1 && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>

              {Array.from({ length: pagination.totalPages }).map((_, i) => {
                const page = i + 1;
                if (
                  page === 1 ||
                  page === pagination.totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={page === currentPage}
                        className='cursor-pointer'>
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }
                if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }
                return null;
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(prev + 1, pagination.totalPages)
                    )
                  }
                  className={cn(
                    "cursor-pointer",
                    currentPage === pagination.totalPages &&
                      "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
