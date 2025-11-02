import { useCallback, useState } from "react";

export function useMeterSalesSelection() {
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const toggleBatchSelection = useCallback((batchId: string) => {
    setSelectedBatchId((current) => (current === batchId ? null : batchId));
  }, []);

  const handleSheetOpenChange = useCallback(
    (batchId: string, open: boolean) => {
      setSelectedBatchId((current) => {
        if (open) {
          return batchId;
        }
        return current === batchId ? null : current;
      });
    },
    []
  );

  const resetSelection = useCallback(() => {
    setSelectedBatchId(null);
  }, []);

  return {
    selectedBatchId,
    toggleBatchSelection,
    handleSheetOpenChange,
    resetSelection,
  };
}
