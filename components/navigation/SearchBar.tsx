"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Search,
  Check,
  DollarSign,
  User,
  Loader2,
  X,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { superSearchMeter } from "@/lib/actions/meters";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

interface CachedResult {
  timestamp: number;
  data: any;
}

const searchCache: { [key: string]: CachedResult } = {};
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

type MeterStatus = "in_stock" | "with_agent" | "sold" | "replaced" | "faulty";

type SearchResult = {
  serial_number: string;
  type: string | null;
  status: MeterStatus;
  agent?: {
    id: string | null;
    name: string | null;
    location: string | null;
  } | null;
  sale_details?: {
    sold_at: string | Date | null;
    sold_by: string | null;
    destination: string | null;
    recipient: string | null;
    customer_contact: string | null;
    unit_price: number | string | null;
    batch_id: string | null;
    seller_name?: string | null;
    seller_role?: string | null;
  } | null;
  replacement_details?: {
    replacement_serial: string | null;
    replacement_date: string | Date | null;
    replacement_by: string | null;
    replacement_by_role?: string | null;
  } | null;
  fault_details?: {
    returned_at: string | Date | null;
    returner_name: string | null;
    fault_description: string | null;
    fault_status: string | null;
  } | null;
};

interface SearchBarProps {
  onAgentInventoryOpen: (agentId: string, agentName: string) => void;
}

export function SearchBar(props: Readonly<SearchBarProps>) {
  const { onAgentInventoryOpen } = props;
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isManualRefreshPending, setIsManualRefreshPending] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bypassCacheRef = useRef(false);
  const debouncedSearch = useDebounce(searchTerm, 500);
  const showDropdown = isSearchOpen && searchTerm.length > 0;

  const formatDate = (value: string | Date | null | undefined) => {
    if (!value) return null;
    const date = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return null;
    const numericValue = typeof value === "string" ? Number(value) : value;
    if (!Number.isFinite(numericValue)) return String(value);
    return numericValue.toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatRole = (role: string | null | undefined) => {
    if (!role) return null;
    return role
      .replaceAll("_", " ")
      .split(" ")
      .map((segment) =>
        segment.length > 0
          ? segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
          : segment
      )
      .join(" ");
  };

  // Keyboard shortcut effect (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Clean cache function
  const cleanCache = useMemo(() => {
    return () => {
      const now = Date.now();
      for (const [key, cached] of Object.entries(searchCache)) {
        if (now - cached.timestamp > CACHE_DURATION) {
          delete searchCache[key];
        }
      }
    };
  }, []);

  // Search effect
  useEffect(() => {
    const searchMeters = async () => {
      if (debouncedSearch.length === 0) {
        setSearchResults([]);
        setIsSearchOpen(false);
        bypassCacheRef.current = false;
        setIsManualRefreshPending(false);
        return;
      }

      setIsLoading(true);
      try {
        cleanCache();

        const skipCache = bypassCacheRef.current;

        if (!skipCache) {
          const cachedResult = searchCache[debouncedSearch];
          if (
            cachedResult &&
            Date.now() - cachedResult.timestamp < CACHE_DURATION
          ) {
            setSearchResults(cachedResult.data);
            setIsLoading(false);
            return;
          }
        } else {
          delete searchCache[debouncedSearch];
        }

        const results = await superSearchMeter(debouncedSearch);

        const shouldCache = results.some(
          (result) =>
            result.status === "sold" ||
            result.status === "with_agent" ||
            result.status === "replaced"
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
        setIsLoading(false);
        if (bypassCacheRef.current) {
          bypassCacheRef.current = false;
          setIsManualRefreshPending(false);
        }
      }
    };

    searchMeters();
  }, [debouncedSearch, cleanCache, refreshNonce]);

  // Cache cleanup on unmount
  useEffect(() => {
    return () => {
      cleanCache();
    };
  }, [cleanCache]);

  // Click outside handler
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderResults = () => {
    if (isLoading) {
      return (
        <div className='flex items-center justify-center py-4'>
          <Loader2 className='h-6 w-6 animate-spin text-primary' />
        </div>
      );
    }

    if (searchResults.length === 0) {
      return (
        <div className='text-center py-4 text-gray-500'>No meters found</div>
      );
    }

    return (
      <div className='space-y-2'>
        {searchResults.map((result) => (
          <div
            key={result.serial_number}
            className='flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 hover:bg-gray-50 rounded-md gap-2 border-b last:border-0'>
            <div>
              <div className='font-medium text-primary flex items-center gap-2'>
                {result.serial_number}
                {result.status === "in_stock" && (
                  <Badge className='bg-green-500'>
                    <Check className='mr-1 h-3 w-3' />
                    In Stock
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
                    <RefreshCw className='mr-1 h-3 w-3' />
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
              {(result.status === "sold" || result.status === "replaced") &&
                result.sale_details && (
                  <div className='text-sm text-gray-500 space-y-1 mt-2'>
                    <div className='flex items-center gap-2'>
                      <User className='h-3 w-3' />
                      {(() => {
                        const { seller_name, seller_role, sold_by } =
                          result.sale_details ?? {};
                        if (!seller_name) return sold_by;
                        const roleLabel = formatRole(seller_role);
                        return roleLabel
                          ? `${seller_name} (${roleLabel})`
                          : seller_name;
                      })()}
                    </div>
                    {formatDate(result.sale_details.sold_at) && (
                      <div>
                        Sold on: {formatDate(result.sale_details.sold_at)}
                      </div>
                    )}
                    {formatCurrency(result.sale_details.unit_price) && (
                      <div>
                        Price: KES{" "}
                        {formatCurrency(result.sale_details.unit_price)}
                      </div>
                    )}
                    <div className='flex items-center gap-1'>
                      To: {result.sale_details.recipient}
                      <span className='text-gray-400'>•</span>
                      {result.sale_details.destination}
                    </div>
                  </div>
                )}
              {result.status === "replaced" && result.replacement_details && (
                <div className='text-sm text-gray-500 space-y-1 mt-2'>
                  <div>
                    Replacement Serial:{" "}
                    {result.replacement_details.replacement_serial}
                  </div>
                  {formatDate(result.replacement_details.replacement_date) && (
                    <div>
                      Replaced on:{" "}
                      {formatDate(result.replacement_details.replacement_date)}
                    </div>
                  )}
                  {(() => {
                    const { replacement_by, replacement_by_role } =
                      result.replacement_details ?? {};
                    if (!replacement_by) return null;
                    const roleLabel = formatRole(replacement_by_role);
                    return (
                      <div>
                        Replaced by:{" "}
                        {roleLabel
                          ? `${replacement_by} (${roleLabel})`
                          : replacement_by}
                      </div>
                    );
                  })()}
                </div>
              )}
              {result.fault_details && (
                <div className='text-sm text-gray-500 space-y-1 mt-2 border-t pt-2'>
                  <div className='font-medium text-gray-600'>Fault Report</div>
                  {result.fault_details.returned_at && (
                    <div>
                      Reported on:{" "}
                      {formatDate(result.fault_details.returned_at)}
                    </div>
                  )}
                  {result.fault_details.returner_name && (
                    <div>Reported by: {result.fault_details.returner_name}</div>
                  )}
                  {result.fault_details.fault_description && (
                    <div>
                      Description: {result.fault_details.fault_description}
                    </div>
                  )}
                  {result.fault_details.fault_status && (
                    <div>
                      Status:{" "}
                      {formatRole(result.fault_details.fault_status) ??
                        result.fault_details.fault_status}
                    </div>
                  )}
                </div>
              )}
            </div>
            {result.status === "with_agent" && (
              <div className='flex flex-col gap-2 sm:items-end mt-2 sm:mt-0'>
                <Badge className='bg-orange-500 whitespace-nowrap'>
                  <User className='mr-1 h-3 w-3' />
                  With {result.agent?.name ?? "Unknown"}
                </Badge>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-7 text-primary hover:text-white hover:bg-primary w-full sm:w-auto'
                  onClick={() => {
                    if (result.agent?.id && result.agent.name) {
                      onAgentInventoryOpen(result.agent.id, result.agent.name);
                    }
                  }}>
                  View Inventory
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className='relative flex-1 max-w-2xl mx-8' ref={searchRef}>
      <div className='relative w-full'>
        <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
        <Input
          ref={inputRef}
          type='text'
          placeholder='Search Serial Number...'
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value.toUpperCase());
            setIsSearchOpen(true);
          }}
          className='pl-8 pr-20 w-full bg-gray-50/50 border-gray-200 focus:bg-white transition-colors'
          onFocus={() => setIsSearchOpen(true)}
        />
        {!searchTerm && (
          <div className='absolute right-2 top-2 flex items-center gap-1'>
            <Kbd className='hidden sm:inline-flex'>Ctrl</Kbd>
            <Kbd className='hidden sm:inline-flex'>K</Kbd>
          </div>
        )}
        {searchTerm && (
          <>
            <button
              type='button'
              onClick={() => {
                if (!searchTerm.trim() || isLoading) return;
                bypassCacheRef.current = true;
                setIsManualRefreshPending(true);
                setRefreshNonce((nonce) => nonce + 1);
                setIsSearchOpen(true);
              }}
              className='absolute right-8 top-2.5 text-gray-400 hover:text-gray-600 disabled:opacity-50'
              disabled={isLoading}>
              <RefreshCw
                className={cn(
                  "h-4 w-4 transition-transform",
                  isManualRefreshPending && "animate-spin"
                )}
              />
            </button>
            <button
              onClick={() => {
                setSearchTerm("");
                setSearchResults([]);
                setIsSearchOpen(false);
                setIsManualRefreshPending(false);
              }}
              className='absolute right-2 top-2.5 text-gray-400 hover:text-gray-600'>
              <X className='h-4 w-4' />
            </button>
          </>
        )}
        {isLoading && !searchTerm && (
          <div className='absolute right-2 top-2.5'>
            <Loader2 className='h-4 w-4 animate-spin' />
          </div>
        )}
      </div>

      {showDropdown && (
        <div className='absolute mt-1 w-full bg-white rounded-md border shadow-lg z-50'>
          <div className='max-h-[60vh] lg:max-h-[400px] overflow-y-auto p-2'>
            {renderResults()}
          </div>
        </div>
      )}
    </div>
  );
}
