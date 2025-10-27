import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StockSettings {
  minimumLevels: {
    [key: string]: number;
  };
  setMinimumLevel: (meterType: string, level: number) => void;
}

export const useStockSettings = create<StockSettings>()(
  persist(
    (set) => ({
      minimumLevels: {
        integrated: 10,
        split: 10,
        gas: 10,
        water: 10,
        smart: 10,
        '3 phase': 10,
      },
      setMinimumLevel: (meterType, level) =>
        set((state) => ({
          minimumLevels: {
            ...state.minimumLevels,
            [meterType]: level,
          },
        })),
    }),
    {
      name: 'stock-settings',
    }
  )
); 