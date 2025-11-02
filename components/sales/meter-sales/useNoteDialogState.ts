import { useCallback, useState } from "react";

import type { SaleBatch } from "../hooks/useMeterSalesData";

export function useNoteDialogState() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<SaleBatch | null>(null);

  const openDialog = useCallback((batch: SaleBatch) => {
    setSelectedBatch(batch);
    setIsOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
  }, []);

  const resetDialog = useCallback(() => {
    setIsOpen(false);
    setSelectedBatch(null);
  }, []);

  return {
    isOpen,
    selectedBatch,
    openDialog,
    closeDialog,
    resetDialog,
  };
}
