import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getSaleBatchMeterDetails } from "@/lib/actions/sales";

import type { SoldMeter } from "./types";

interface CachedBatch {
  meters: SoldMeter[];
  transactionRef: string | null;
}

interface UseMeterSaleDetailsResult {
  meters: SoldMeter[];
  transactionRef: string | null;
  loading: boolean;
  isRefLoading: boolean;
}

const batchCache = new Map<string, CachedBatch>();
const pendingRequests = new Map<string, Promise<CachedBatch>>();

async function fetchBatchData(batchId: string): Promise<CachedBatch> {
  const cached = batchCache.get(batchId);
  if (cached) {
    return cached;
  }

  const existingRequest = pendingRequests.get(batchId);
  if (existingRequest) {
    return existingRequest;
  }

  const request = (async () => {
    try {
      const { meters: meterRows, transactionRef: refNumber } =
        await getSaleBatchMeterDetails(batchId);

      const result: CachedBatch = {
        meters: meterRows,
        transactionRef: refNumber,
      };

      batchCache.set(batchId, result);
      return result;
    } finally {
      pendingRequests.delete(batchId);
    }
  })();

  pendingRequests.set(batchId, request);
  return request;
}

export function prefetchMeterSaleDetails(batchId: string) {
  if (!batchId || batchCache.has(batchId) || pendingRequests.has(batchId)) {
    return;
  }

  fetchBatchData(batchId).catch((error) => {
    console.error("Prefetch meter details failed:", error);
  });
}

export function useMeterSaleDetails(
  batchId: string,
  isOpen: boolean
): UseMeterSaleDetailsResult {
  const [meters, setMeters] = useState<SoldMeter[]>([]);
  const [transactionRef, setTransactionRef] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRefLoading, setIsRefLoading] = useState(true);
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const cached = batchCache.get(batchId);
    if (cached) {
      setMeters(cached.meters);
      setTransactionRef(cached.transactionRef);
      setLoading(false);
      setIsRefLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setIsRefLoading(true);
    setMeters([]);
    setTransactionRef(null);

    fetchBatchData(batchId)
      .then((result) => {
        if (!cancelled) {
          setMeters(result.meters);
          setTransactionRef(result.transactionRef);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Error fetching meter details:", error);
          toast.error("Unable to load meter details");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setIsRefLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [batchId, isOpen]);

  return { meters, transactionRef, loading, isRefLoading };
}
