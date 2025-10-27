import { useState, useEffect } from "react";

interface Meter {
  serialNumber: string;
  type: string;
  addedBy: string;
  addedAt: string;
  adderName: string;
}

interface BatchDetails {
  purchaseDate: string;
  batchGroups: Array<{
    type: string;
    count: number;
    unitPrice: string;
    totalCost: string;
  }>;
}

const CACHE_KEYS = {
  METERS: "cachedAddMeters",
  BATCH_DETAILS: "cachedBatchDetails",
  METERS_TABLE: "cachedMetersTable",
  SUBMITTED_METERS: "lastSubmittedMeters",
};

export function useMeterCache() {
  const [meters, setMeters] = useState<Meter[]>(() => {
    if (typeof globalThis.window === "undefined") return [];
    const cached = localStorage.getItem(CACHE_KEYS.METERS);
    return cached ? JSON.parse(cached) : [];
  });

  const [batchDetails, setBatchDetails] = useState<BatchDetails | null>(() => {
    if (typeof globalThis.window === "undefined") return null;
    const cached = localStorage.getItem(CACHE_KEYS.BATCH_DETAILS);
    return cached ? JSON.parse(cached) : null;
  });

  // Cache meters whenever they change
  useEffect(() => {
    if (meters.length > 0) {
      localStorage.setItem(CACHE_KEYS.METERS, JSON.stringify(meters));
      localStorage.setItem(CACHE_KEYS.METERS_TABLE, JSON.stringify(meters));
    }
  }, [meters]);

  // Cache batch details whenever they change
  useEffect(() => {
    if (batchDetails) {
      localStorage.setItem(
        CACHE_KEYS.BATCH_DETAILS,
        JSON.stringify(batchDetails)
      );
    }
  }, [batchDetails]);

  // Handle beforeunload to cache data
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (meters.length > 0) {
        localStorage.setItem(CACHE_KEYS.METERS_TABLE, JSON.stringify(meters));
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [meters]);

  const clearCache = () => {
    localStorage.removeItem(CACHE_KEYS.METERS);
    localStorage.removeItem(CACHE_KEYS.BATCH_DETAILS);
    localStorage.removeItem(CACHE_KEYS.METERS_TABLE);
    setMeters([]);
    setBatchDetails(null);
  };

  const clearSubmittedCache = () => {
    localStorage.removeItem(CACHE_KEYS.SUBMITTED_METERS);
  };

  const saveSubmittedData = (data: {
    meters: Meter[];
    adderName: string;
    batchDetails: BatchDetails;
  }) => {
    localStorage.setItem(CACHE_KEYS.SUBMITTED_METERS, JSON.stringify(data));
  };

  const getSubmittedData = (): any => {
    const data = localStorage.getItem(CACHE_KEYS.SUBMITTED_METERS);
    return data ? JSON.parse(data) : null;
  };

  return {
    meters,
    setMeters,
    batchDetails,
    setBatchDetails,
    clearCache,
    clearSubmittedCache,
    saveSubmittedData,
    getSubmittedData,
  };
}
