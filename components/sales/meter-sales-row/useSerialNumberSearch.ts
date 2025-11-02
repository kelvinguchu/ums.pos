import { useEffect, useMemo, useState } from "react";

import type { SoldMeter } from "./types";

interface UseSerialNumberSearchResult {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filteredMeters: SoldMeter[];
  currentMeters: SoldMeter[];
  currentPage: number;
  totalPages: number;
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
}

export function useSerialNumberSearch(
  meters: SoldMeter[],
  itemsPerPage: number
): UseSerialNumberSearchResult {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, meters]);

  const filteredMeters = useMemo(() => {
    return meters.filter((meter) =>
      meter.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [meters, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMeters.length / Math.max(itemsPerPage, 1))
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const currentMeters = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMeters.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMeters, currentPage, itemsPerPage]);

  const goToPage = (page: number) => {
    if (!Number.isFinite(page)) {
      return;
    }

    setCurrentPage((prev) => {
      const next = Math.max(1, Math.min(page, totalPages));
      return next === prev ? prev : next;
    });
  };

  const goToNextPage = () => {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  };

  const goToPreviousPage = () => {
    setCurrentPage((page) => Math.max(1, page - 1));
  };

  return {
    searchTerm,
    setSearchTerm,
    filteredMeters,
    currentMeters,
    currentPage,
    totalPages,
    goToPage,
    goToNextPage,
    goToPreviousPage,
  };
}
