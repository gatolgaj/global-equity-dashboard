import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  MarketType,
  PortfolioSnapshot,
  HistoricalData,
  DashboardFilters,
  UploadState,
  FactorData,
} from '../types/portfolio';
import type { PerformanceRiskData, PortfolioCompositionData } from '../services/api';
import type {
  RiskMetrics,
  FactorRiskDecomposition,
  ConcentrationMetrics,
  StressTestResult,
} from '../types/risk';
import { dataLoaderApi, snapshotApi, performanceApi, compositionApi, factorApi } from '../services/supabaseApi';
import {
  calculateCoreRiskMetrics,
  calculateFactorRisk,
  calculateConcentrationRisk,
  runStressTests,
  STRESS_SCENARIOS,
} from '../services/riskCalculator';

interface PortfolioState {
  // Data
  snapshots: PortfolioSnapshot[];
  historicalData: HistoricalData | null;
  currentSnapshot: PortfolioSnapshot | null;
  performanceData: PerformanceRiskData | null;
  compositionData: PortfolioCompositionData | null;
  factorData: FactorData | null;

  // Risk data
  riskMetrics: RiskMetrics | null;
  factorRisk: FactorRiskDecomposition | null;
  concentrationRisk: ConcentrationMetrics | null;
  stressTestResults: StressTestResult[] | null;
  isCalculatingRisk: boolean;

  // Loading state
  isLoading: boolean;
  isInitialized: boolean;
  loadError: string | null;

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
  setPerformanceData: (data: PerformanceRiskData | null) => void;
  setCompositionData: (data: PortfolioCompositionData | null) => void;
  setFactorData: (data: FactorData | null) => void;
  setUploadState: (state: Partial<UploadState>) => void;
  resetUploadState: () => void;
  clearAllData: () => void;

  // Risk calculation actions
  calculateRiskMetrics: () => void;
  setRiskMetrics: (metrics: RiskMetrics | null) => void;
  setFactorRisk: (risk: FactorRiskDecomposition | null) => void;
  setConcentrationRisk: (risk: ConcentrationMetrics | null) => void;
  setStressTestResults: (results: StressTestResult[] | null) => void;

  // Supabase actions
  initializeFromSupabase: () => Promise<void>;
  saveSnapshotToSupabase: (snapshot: PortfolioSnapshot, fileName: string, fileSize?: number) => Promise<void>;
  savePerformanceToSupabase: (data: PerformanceRiskData, fileName: string, fileSize?: number) => Promise<void>;
  saveCompositionToSupabase: (data: PortfolioCompositionData, fileName: string, fileSize?: number) => Promise<void>;
  saveFactorDataToSupabase: (data: FactorData, fileName: string, fileSize?: number) => Promise<void>;
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
    (set, get) => ({
      // Initial state
      snapshots: [],
      historicalData: null,
      currentSnapshot: null,
      performanceData: null,
      compositionData: null,
      factorData: null,

      // Risk initial state
      riskMetrics: null,
      factorRisk: null,
      concentrationRisk: null,
      stressTestResults: null,
      isCalculatingRisk: false,

      isLoading: false,
      isInitialized: false,
      loadError: null,
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

      setPerformanceData: (data) =>
        set({ performanceData: data }, false, 'setPerformanceData'),

      setCompositionData: (data) =>
        set({ compositionData: data }, false, 'setCompositionData'),

      setFactorData: (data) =>
        set({ factorData: data }, false, 'setFactorData'),

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

      clearAllData: () =>
        set({
          snapshots: [],
          historicalData: null,
          currentSnapshot: null,
          performanceData: null,
          compositionData: null,
          factorData: null,
          riskMetrics: null,
          factorRisk: null,
          concentrationRisk: null,
          stressTestResults: null,
        }, false, 'clearAllData'),

      // Risk calculation actions
      calculateRiskMetrics: () => {
        const { performanceData, factorData } = get();

        set({ isCalculatingRisk: true }, false, 'calculateRiskMetrics/start');

        try {
          let riskMetrics: RiskMetrics | null = null;
          let factorRiskResult: FactorRiskDecomposition | null = null;
          let concentrationRiskResult: ConcentrationMetrics | null = null;
          let stressResults: StressTestResult[] | null = null;

          // Calculate core risk metrics from performance data
          if (performanceData) {
            riskMetrics = calculateCoreRiskMetrics(performanceData);
            stressResults = runStressTests(performanceData, STRESS_SCENARIOS);
          }

          // Calculate factor and concentration risk from factor data
          if (factorData) {
            const portfolioVol = riskMetrics?.annualizedVolatility
              ? riskMetrics.annualizedVolatility / 100
              : 0.15;
            factorRiskResult = calculateFactorRisk(factorData, portfolioVol);
            concentrationRiskResult = calculateConcentrationRisk(factorData.holdings);
          }

          set({
            riskMetrics,
            factorRisk: factorRiskResult,
            concentrationRisk: concentrationRiskResult,
            stressTestResults: stressResults,
            isCalculatingRisk: false,
          }, false, 'calculateRiskMetrics/success');
        } catch (error) {
          console.error('Failed to calculate risk metrics:', error);
          set({ isCalculatingRisk: false }, false, 'calculateRiskMetrics/error');
        }
      },

      setRiskMetrics: (metrics) =>
        set({ riskMetrics: metrics }, false, 'setRiskMetrics'),

      setFactorRisk: (risk) =>
        set({ factorRisk: risk }, false, 'setFactorRisk'),

      setConcentrationRisk: (risk) =>
        set({ concentrationRisk: risk }, false, 'setConcentrationRisk'),

      setStressTestResults: (results) =>
        set({ stressTestResults: results }, false, 'setStressTestResults'),

      // Supabase actions
      initializeFromSupabase: async () => {
        const { filters, isInitialized } = get();

        // Prevent double initialization
        if (isInitialized) return;

        set({ isLoading: true, loadError: null }, false, 'initializeFromSupabase/start');

        try {
          const { snapshot, performanceData, compositionData, factorData } =
            await dataLoaderApi.loadAllData(filters.marketType);

          set({
            currentSnapshot: snapshot,
            performanceData,
            compositionData,
            factorData,
            snapshots: snapshot ? [snapshot] : [],
            isLoading: false,
            isInitialized: true,
            loadError: null,
          }, false, 'initializeFromSupabase/success');
        } catch (error) {
          set({
            isLoading: false,
            isInitialized: true, // Mark as initialized even on error
            loadError: error instanceof Error ? error.message : 'Failed to load data',
          }, false, 'initializeFromSupabase/error');
        }
      },

      saveSnapshotToSupabase: async (snapshot, fileName, fileSize) => {
        try {
          await snapshotApi.save(snapshot, fileName, fileSize);
        } catch (error) {
          console.error('Failed to save snapshot to Supabase:', error);
          throw error;
        }
      },

      savePerformanceToSupabase: async (data, fileName, fileSize) => {
        try {
          await performanceApi.save(data, fileName, fileSize);
        } catch (error) {
          console.error('Failed to save performance data to Supabase:', error);
          throw error;
        }
      },

      saveCompositionToSupabase: async (data, fileName, fileSize) => {
        try {
          await compositionApi.save(data, fileName, fileSize);
        } catch (error) {
          console.error('Failed to save composition data to Supabase:', error);
          throw error;
        }
      },

      saveFactorDataToSupabase: async (data, fileName, fileSize) => {
        try {
          await factorApi.save(data, fileName, fileSize);
        } catch (error) {
          console.error('Failed to save factor data to Supabase:', error);
          throw error;
        }
      },
    }),
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

// Risk selectors
export const selectRiskMetrics = (state: PortfolioState) => state.riskMetrics;
export const selectFactorRisk = (state: PortfolioState) => state.factorRisk;
export const selectConcentrationRisk = (state: PortfolioState) => state.concentrationRisk;
export const selectStressTestResults = (state: PortfolioState) => state.stressTestResults;
