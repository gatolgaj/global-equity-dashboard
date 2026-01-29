// Core portfolio data types

export type MarketType = 'DM' | 'EM' | 'COMBINED';

export interface Stock {
  symbol: string;
  name: string;
  ticker: string;
  country: string;
  region: Region;
  sector: string;
  marketCap: number;
  price: number;
  currency: string;
  benchmarkWeight: number;
  portfolioWeight: number;
  activeWeight: number;
  alphaScore: number;
}

export interface PortfolioSnapshot {
  id: string;
  date: string;
  marketType: MarketType;
  quarterLabel: string; // e.g., "Q3 2025"

  // Summary statistics
  statistics: PortfolioStatistics;

  // Holdings
  holdings: Stock[];

  // Sector allocations
  sectorAllocations: Allocation[];

  // Country allocations
  countryAllocations: Allocation[];

  // Region allocations
  regionAllocations: Allocation[];
}

export interface PortfolioStatistics {
  alphaScore: number;
  activeShare: number;
  numberOfStocks: number;
  effectiveNumberOfStocks: number;
  volatility: number;
  trackingError: number;

  // Constraints
  stockMax: number;
  smallCSBmkWtThreshold: number;
  smallCSMaxActiveWt: number;
  largeCSMaxActiveWt: number;
  largeStockSumWtLim: number;
  maxTrackingError: number;
}

export interface Allocation {
  name: string;
  benchmarkWeight: number;
  portfolioWeight: number;
  activeWeight: number;
  benchmarkScore?: number;
  portfolioScore?: number;
}

export type Region =
  | 'Asia'
  | 'Africa'
  | 'East Europe'
  | 'West Europe'
  | 'North America'
  | 'South America'
  | 'Mid East';

// Time series data for charts
export interface PerformancePoint {
  date: string;
  portfolioValue: number;
  benchmarkValue: number;
  cumulativeReturn: number;
  benchmarkReturn: number;
  alpha: number;
}

export interface RollingMetric {
  date: string;
  value: number;
  benchmark?: number;
}

export interface HistoricalData {
  performance: PerformancePoint[];
  rollingAlpha1Y: RollingMetric[];
  rollingAlpha3Y: RollingMetric[];
  volatility: RollingMetric[];
  trackingError: RollingMetric[];
  constituentsCount: RollingMetric[];
}

// Upload state
export interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  lastUploadDate: string | null;
}

// Dashboard filters
export interface DashboardFilters {
  marketType: MarketType;
  dateRange: {
    start: string;
    end: string;
  };
  selectedQuarter: string | null;
}

// Performance summary table row
export interface PerformanceSummaryRow {
  period: string;
  portfolioReturn: number;
  benchmarkReturn: number;
  excessReturn: number;
  volatility?: number;
  sharpeRatio?: number;
  informationRatio?: number;
}

// Risk metrics
export interface RiskMetrics {
  volatility: number;
  trackingError: number;
  beta: number;
  sharpeRatio: number;
  informationRatio: number;
  maxDrawdown: number;
  varOneDay: number; // Value at Risk
}

// Factor Analysis types
export interface FactorScores {
  value: number;
  growth: number;
  quality: number;
  debt: number;
  volatility: number;
  momentum: number;
  size: number;
  sentiment: number;
  mfmScore: number;
}

export interface FactorHolding {
  ticker: string;
  company: string;
  sector: string;
  country: string;
  region: string;
  portfolioWeight: number;
  benchmarkWeight: number;
  activeWeight: number;
  factors: FactorScores;
}

export interface SectorFactorData {
  sector: string;
  count: number;
  totalWeight: number;
  value: number;
  growth: number;
  quality: number;
  debt: number;
  volatility: number;
  momentum: number;
  size: number;
  sentiment: number;
  mfmScore: number;
}

export interface FactorData {
  asOfDate: string;
  holdings: FactorHolding[];
  portfolioAverages: FactorScores;
  benchmarkAverages: FactorScores;
  sectorFactors: SectorFactorData[];
}
