import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  MarketType,
  PortfolioSnapshot,
  HistoricalData,
  DashboardFilters,
  UploadState,
} from '../types/portfolio';

interface PortfolioState {
  // Data
  snapshots: PortfolioSnapshot[];
  historicalData: HistoricalData | null;
  currentSnapshot: PortfolioSnapshot | null;

  // Filters
  filters: DashboardFilters;

  // Upload state
  upload: UploadState;

  // Actions
  setMarketType: (marketType: MarketType) => void;
  setDateRange: (start: string, end: string) => void;
  setSelectedQuarter: (quarter: string | null) => void;
  setCurrentSnapshot: (snapshot: PortfolioSnapshot | null) => void;
  addSnapshot: (snapshot: PortfolioSnapshot) => void;
  setHistoricalData: (data: HistoricalData) => void;
  setUploadState: (state: Partial<UploadState>) => void;
  resetUploadState: () => void;
}

const initialFilters: DashboardFilters = {
  marketType: 'EM',
  dateRange: {
    start: '2004-01-01',
    end: new Date().toISOString().split('T')[0],
  },
  selectedQuarter: null,
};

const initialUploadState: UploadState = {
  isUploading: false,
  progress: 0,
  error: null,
  lastUploadDate: null,
};

export const usePortfolioStore = create<PortfolioState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        snapshots: [],
        historicalData: null,
        currentSnapshot: null,
        filters: initialFilters,
        upload: initialUploadState,

        // Actions
        setMarketType: (marketType) =>
          set(
            (state) => ({
              filters: { ...state.filters, marketType },
            }),
            false,
            'setMarketType'
          ),

        setDateRange: (start, end) =>
          set(
            (state) => ({
              filters: { ...state.filters, dateRange: { start, end } },
            }),
            false,
            'setDateRange'
          ),

        setSelectedQuarter: (quarter) =>
          set(
            (state) => ({
              filters: { ...state.filters, selectedQuarter: quarter },
            }),
            false,
            'setSelectedQuarter'
          ),

        setCurrentSnapshot: (snapshot) =>
          set({ currentSnapshot: snapshot }, false, 'setCurrentSnapshot'),

        addSnapshot: (snapshot) =>
          set(
            (state) => ({
              snapshots: [...state.snapshots, snapshot],
              currentSnapshot: snapshot,
            }),
            false,
            'addSnapshot'
          ),

        setHistoricalData: (data) =>
          set({ historicalData: data }, false, 'setHistoricalData'),

        setUploadState: (uploadState) =>
          set(
            (state) => ({
              upload: { ...state.upload, ...uploadState },
            }),
            false,
            'setUploadState'
          ),

        resetUploadState: () =>
          set({ upload: initialUploadState }, false, 'resetUploadState'),
      }),
      {
        name: 'portfolio-storage',
        partialize: (state) => ({
          filters: state.filters,
          snapshots: state.snapshots,
          currentSnapshot: state.currentSnapshot,
        }),
      }
    ),
    { name: 'PortfolioStore' }
  )
);

// Selectors
export const selectCurrentHoldings = (state: PortfolioState) =>
  state.currentSnapshot?.holdings ?? [];

export const selectTopHoldings = (state: PortfolioState, limit = 50) =>
  state.currentSnapshot?.holdings
    .slice()
    .sort((a, b) => b.portfolioWeight - a.portfolioWeight)
    .slice(0, limit) ?? [];

export const selectSectorAllocations = (state: PortfolioState) =>
  state.currentSnapshot?.sectorAllocations ?? [];

export const selectCountryAllocations = (state: PortfolioState) =>
  state.currentSnapshot?.countryAllocations ?? [];

export const selectRegionAllocations = (state: PortfolioState) =>
  state.currentSnapshot?.regionAllocations ?? [];

export const selectStatistics = (state: PortfolioState) =>
  state.currentSnapshot?.statistics ?? null;
