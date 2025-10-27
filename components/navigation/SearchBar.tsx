"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Check, DollarSign, User, Loader2, X } from "lucide-react";
import { superSearchMeter } from "@/lib/actions/meters";
import { useDebounce } from "@/hooks/use-debounce";

interface CachedResult {
  timestamp: number;
  data: any;
}

const searchCache: { [key: string]: CachedResult } = {};
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

interface SearchBarProps {
  onAgentInventoryOpen: (agentId: string, agentName: string) => void;
}

export function SearchBar({ onAgentInventoryOpen }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(searchTerm, 500);

  // Clean cache function
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

  // Search effect
  useEffect(() => {
    const searchMeters = async () => {
      if (debouncedSearch.length === 0) {
        setSearchResults([]);
        return;
      }

      setIsLoading(true);
      try {
        cleanCache();

        const cachedResult = searchCache[debouncedSearch];
        if (
          cachedResult &&
          Date.now() - cachedResult.timestamp < CACHE_DURATION
        ) {
          setSearchResults(cachedResult.data);
          setIsLoading(false);
          return;
        }

        const results = await superSearchMeter(debouncedSearch);

        const shouldCache = results.some(
          (result) => result.status === "sold" || result.status === "with_agent"
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
      }
    };

    searchMeters();
  }, [debouncedSearch, cleanCache]);

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

  return (
    <div className='relative flex-1 max-w-2xl mx-8' ref={searchRef}>
      <div className='relative w-full'>
        <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
        <Input
          type='text'
          placeholder='Search Serial Number...'
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value.toUpperCase());
            setIsSearchOpen(true);
          }}
          className='pl-8 pr-8 w-full bg-gray-50/50 border-gray-200 focus:bg-white transition-colors'
          onFocus={() => setIsSearchOpen(true)}
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm("");
              setSearchResults([]);
            }}
            className='absolute right-2 top-2.5 text-gray-400 hover:text-gray-600'>
            <X className='h-4 w-4' />
          </button>
        )}
        {isLoading && !searchTerm && (
          <div className='absolute right-2 top-2.5'>
            <Loader2 className='h-4 w-4 animate-spin' />
          </div>
        )}
      </div>

      {searchTerm.length > 0 && (
        <div className='absolute mt-1 w-full bg-white rounded-md border shadow-lg z-50'>
          <div className='max-h-[60vh] lg:max-h-[400px] overflow-y-auto p-2'>
            {isLoading ? (
              <div className='flex items-center justify-center py-4'>
                <Loader2 className='h-6 w-6 animate-spin text-[#000080]' />
              </div>
            ) : searchResults.length === 0 ? (
              <div className='text-center py-4 text-gray-500'>
                No meters found
              </div>
            ) : (
              <div className='space-y-2'>
                {searchResults.map((result) => (
                  <div
                    key={result.serial_number}
                    className='flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 hover:bg-gray-50 rounded-md gap-2 border-b last:border-0'>
                    <div>
                      <div className='font-medium text-[#000080] flex items-center gap-2'>
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
                      </div>
                      {result.type && (
                        <div className='text-sm text-gray-500 mt-1'>
                          Type: {result.type}
                        </div>
                      )}
                      {result.status === "sold" && result.sale_details && (
                        <div className='text-sm text-gray-500 space-y-1 mt-2'>
                          <div className='flex items-center gap-2'>
                            <User className='h-3 w-3' />
                            {result.sale_details.seller_name
                              ? `${result.sale_details.seller_name} (${result.sale_details.seller_role})`
                              : result.sale_details.sold_by}
                          </div>
                          <div>
                            Sold on:{" "}
                            {new Date(
                              result.sale_details.sold_at
                            ).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          <div>
                            Price: KES{" "}
                            {result.sale_details?.unit_price?.toLocaleString()}
                          </div>
                          <div className='flex items-center gap-1'>
                            To: {result.sale_details.recipient}
                            <span className='text-gray-400'>•</span>
                            {result.sale_details.destination}
                          </div>
                        </div>
                      )}
                    </div>
                    {result.status === "with_agent" && (
                      <div className='flex flex-col gap-2 sm:items-end mt-2 sm:mt-0'>
                        <Badge className='bg-orange-500 whitespace-nowrap'>
                          <User className='mr-1 h-3 w-3' />
                          With {result.agent.name}
                        </Badge>
                        <Button
                          variant='outline'
                          size='sm'
                          className='h-7 text-[#000080] hover:text-white hover:bg-[#000080] w-full sm:w-auto'
                          onClick={() => {
                            onAgentInventoryOpen(
                              result.agent.id,
                              result.agent.name
                            );
                          }}>
                          View Inventory
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
