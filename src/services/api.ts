import axios from 'axios';
import type {
  MarketType,
  PortfolioSnapshot,
  HistoricalData,
} from '../types/portfolio';

// API base URL - uses environment variable or defaults to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response types
export interface UploadResponse {
  success: boolean;
  snapshot: {
    id: string;
    date: string;
    marketType: MarketType;
    quarterLabel: string;
    holdingsCount: number;
    sectorCount: number;
    countryCount: number;
    regionCount: number;
  };
}

export interface SnapshotListItem {
  id: string;
  date: string;
  marketType: MarketType;
  quarterLabel: string;
  holdingsCount: number;
}

export interface SnapshotListResponse {
  snapshots: SnapshotListItem[];
}

export interface FullSnapshotResponse {
  snapshot: PortfolioSnapshot;
}

// Upload API
export const uploadApi = {
  /**
   * Upload an Excel file for processing
   */
  uploadFile: async (
    file: File,
    marketType: MarketType,
    onProgress?: (progress: number) => void
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('marketType', marketType);

    const response = await api.post<UploadResponse>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  },

  /**
   * Get list of all uploaded snapshots
   */
  getSnapshots: async (): Promise<SnapshotListResponse> => {
    const response = await api.get<SnapshotListResponse>('/upload/snapshots');
    return response.data;
  },

  /**
   * Get a specific snapshot by ID
   */
  getSnapshot: async (id: string): Promise<FullSnapshotResponse> => {
    const response = await api.get<FullSnapshotResponse>(`/upload/snapshots/${id}`);
    return response.data;
  },
};

// Health check
export const healthApi = {
  check: async (): Promise<{ status: string; timestamp: string }> => {
    const response = await api.get('/health');
    return response.data;
  },
};

// Error handling helper
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

// Types for local data
export interface QuarterInfo {
  id: string;
  label: string;
  date: string;
  files: {
    em: string | null;
    dm: string | null;
  };
}

export interface QuartersIndex {
  quarters: QuarterInfo[];
  latestQuarter: string;
}

export interface PerformanceRiskData {
  performance: Array<{
    date: string;
    portfolioValue: number;
    benchmarkValue: number;
    portfolioReturn: number | null;
    benchmarkReturn: number | null;
    alpha: number | null;
  }>;
  summaryStats: Record<string, number | null>;
  rollingAlpha1Y: Array<{ date: string; value: number }>;
  rollingAlpha3Y: Array<{ date: string; value: number }>;
  volatility: Array<{ date: string; value: number | null }>;
  trackingError: Array<{ date: string; value: number | null }>;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface PortfolioCompositionData {
  region: Array<{ date: string; name: string; weight: number }>;
  sector: Array<{ date: string; name: string; weight: number }>;
  country: Array<{ date: string; name: string; weight: number }>;
  constituents: Array<{ date: string; count: number }>;
}

export interface Top50Data {
  marketType: MarketType;
  quarterLabel: string;
  snapshotDate: string;
  statistics: {
    alphaScore: number;
    activeShare: number;
    numberOfStocks: number;
    effectiveNumberOfStocks: number;
    volatility: number;
    trackingError: number;
  };
  holdings: Array<{
    rank: number;
    ticker: string;
    symbol: string;
    name: string;
    benchmarkWeight: number | null;
    portfolioWeight: number | null;
    activeWeight: number | null;
  }>;
  sectorAllocations: Array<{
    name: string;
    benchmarkWeight: number;
    portfolioWeight: number;
    activeWeight: number;
  }>;
  countryAllocations: Array<{
    name: string;
    benchmarkWeight: number;
    portfolioWeight: number;
    activeWeight: number;
  }>;
  regionAllocations: Array<{
    name: string;
    benchmarkWeight: number;
    portfolioWeight: number;
    activeWeight: number;
  }>;
}

// Factor data types
export interface FactorScores {
  value?: number;
  growth?: number;
  quality?: number;
  debt?: number;
  volatility?: number;
  momentum?: number;
  size?: number;
  sentiment?: number;
  mfm_score?: number;
  [key: string]: number | undefined;
}

export interface FactorHolding {
  rank: number;
  ticker: string;
  company: string;
  weight: number;
  benchmarkWeight: number;
  activeWeight: number;
  sector: string;
  country: string;
  region: string;
  factors: FactorScores;
}

export interface SectorFactorData {
  sector: string;
  count: number;
  totalWeight: number;
  value?: number;
  growth?: number;
  quality?: number;
  debt?: number;
  volatility?: number;
  momentum?: number;
  size?: number;
  sentiment?: number;
  mfm_score?: number;
}

export interface CompositionWeight {
  name: string;
  weight: number;
}

export interface FactorData {
  lastUpdated: string;
  factorExposures: {
    portfolio: FactorScores;
    benchmark: FactorScores;
    timeSeries: Array<FactorScores & { date: string }>;
  };
  holdings: FactorHolding[];
  sectorFactorHeatmap: SectorFactorData[];
  composition: {
    portfolio: {
      region: CompositionWeight[];
      sector: CompositionWeight[];
      country: CompositionWeight[];
    };
    benchmark: {
      region: CompositionWeight[];
      sector: CompositionWeight[];
      country: CompositionWeight[];
    };
  };
  factors: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

// Local data API (for demo mode)
export const localDataApi = {
  /**
   * Get quarters index
   */
  getQuarters: async (): Promise<QuartersIndex> => {
    const response = await fetch('/data/quarters_index.json');
    if (!response.ok) throw new Error('Failed to load quarters index');
    return response.json();
  },

  /**
   * Get performance & risk data
   */
  getPerformanceRisk: async (): Promise<PerformanceRiskData> => {
    const response = await fetch('/data/performance_risk.json');
    if (!response.ok) throw new Error('Failed to load performance data');
    return response.json();
  },

  /**
   * Get portfolio composition data
   */
  getPortfolioComposition: async (): Promise<PortfolioCompositionData> => {
    const response = await fetch('/data/portfolio_composition.json');
    if (!response.ok) throw new Error('Failed to load composition data');
    return response.json();
  },

  /**
   * Get enhanced factor data
   */
  getFactorData: async (): Promise<FactorData> => {
    const response = await fetch('/data/factor_data.json');
    if (!response.ok) throw new Error('Failed to load factor data');
    return response.json();
  },

  /**
   * Get TOP 50 portfolio data for a specific quarter
   */
  getTop50: async (quarterId: string, marketType: MarketType): Promise<Top50Data | null> => {
    const quarters = await localDataApi.getQuarters();
    const quarter = quarters.quarters.find(q => q.id === quarterId);

    if (!quarter) return null;

    const fileName = marketType === 'EM' ? quarter.files.em : quarter.files.dm;
    if (!fileName) return null;

    const response = await fetch(`/data/${fileName}`);
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Convert local data to PortfolioSnapshot format
   */
  toPortfolioSnapshot: (data: Top50Data): PortfolioSnapshot => {
    return {
      id: `${data.marketType}_${data.quarterLabel.replace(/\s+/g, '_')}`,
      date: data.snapshotDate,
      marketType: data.marketType,
      quarterLabel: data.quarterLabel,
      statistics: {
        alphaScore: data.statistics.alphaScore,
        activeShare: data.statistics.activeShare,
        numberOfStocks: data.statistics.numberOfStocks,
        effectiveNumberOfStocks: data.statistics.effectiveNumberOfStocks,
        volatility: data.statistics.volatility,
        trackingError: data.statistics.trackingError,
        stockMax: 0.12,
        smallCSBmkWtThreshold: 0.005,
        smallCSMaxActiveWt: 0.02,
        largeCSMaxActiveWt: 0.05,
        largeStockSumWtLim: 0.3,
        maxTrackingError: 0.08,
      },
      holdings: data.holdings.map((h) => ({
        symbol: h.symbol,
        name: h.name || h.ticker,
        ticker: h.ticker,
        country: '',
        region: 'Asia' as const,
        sector: '',
        marketCap: 0,
        price: 0,
        currency: 'USD',
        benchmarkWeight: h.benchmarkWeight || 0,
        portfolioWeight: h.portfolioWeight || 0,
        activeWeight: h.activeWeight || 0,
        alphaScore: 0,
      })),
      sectorAllocations: data.sectorAllocations || [],
      countryAllocations: data.countryAllocations || [],
      regionAllocations: data.regionAllocations || [],
    };
  },

  /**
   * Convert performance data to HistoricalData format
   */
  toHistoricalData: (perfData: PerformanceRiskData): HistoricalData => {
    return {
      performance: perfData.performance.map(p => ({
        date: p.date,
        portfolioValue: p.portfolioValue,
        benchmarkValue: p.benchmarkValue,
        cumulativeReturn: ((p.portfolioValue - 100) / 100),
        benchmarkReturn: ((p.benchmarkValue - 100) / 100),
        alpha: p.alpha || 0,
      })),
      rollingAlpha1Y: perfData.rollingAlpha1Y,
      rollingAlpha3Y: perfData.rollingAlpha3Y,
      volatility: perfData.volatility.filter(v => v.value !== null) as Array<{ date: string; value: number }>,
      trackingError: perfData.trackingError.filter(v => v.value !== null) as Array<{ date: string; value: number }>,
      constituentsCount: [],
    };
  },
};

export default api;
