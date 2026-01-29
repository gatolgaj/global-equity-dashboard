// Risk-related type definitions for Portfolio Risk Model

// Core Risk Metrics
export interface RiskMetrics {
  // Value at Risk
  var95: number;
  var99: number;
  cvar95: number; // Conditional VaR / Expected Shortfall

  // Drawdown metrics
  maxDrawdown: number;
  maxDrawdownDate: string;
  maxDrawdownPeakDate: string;
  maxDrawdownTroughDate: string;
  drawdownDuration: number; // in months
  currentDrawdown: number;

  // Risk-adjusted returns
  beta: number;
  sharpeRatio: number;
  sortinoRatio: number;
  informationRatio: number;
  calmarRatio: number;

  // Volatility
  annualizedVolatility: number;
  downsideVolatility: number;
  trackingError: number;

  // Rolling metrics for charts
  rollingVar: RollingMetricPoint[];
  rollingBeta: RollingMetricPoint[];
  rollingDrawdown: DrawdownPoint[];
  rollingSharpe: RollingMetricPoint[];
}

export interface RollingMetricPoint {
  date: string;
  value: number;
}

export interface DrawdownPoint {
  date: string;
  drawdown: number;
  peak: number;
  value: number;
}

// Factor Risk Decomposition
export interface FactorRiskContribution {
  name: string;
  exposure: number;
  volatility: number;
  contribution: number;
  percentOfRisk: number;
}

export interface FactorRiskDecomposition {
  factors: FactorRiskContribution[];
  systematicRisk: number;
  idiosyncraticRisk: number;
  totalRisk: number;
  systematicPercent: number;
  idiosyncraticPercent: number;
}

// Concentration Risk
export interface ConcentrationMetrics {
  // Herfindahl-Hirschman Index
  hhi: number;
  effectiveStocks: number;

  // Weight concentrations
  top5Weight: number;
  top10Weight: number;
  maxStockWeight: number;
  maxStockTicker: string;

  // Sector/Country concentration
  maxSectorWeight: number;
  maxSectorName: string;
  maxCountryWeight: number;
  maxCountryName: string;
  maxRegionWeight: number;
  maxRegionName: string;

  // Active risk
  activeShare: number;

  // Sector breakdown for chart
  sectorConcentration: SectorConcentration[];
  countryConcentration: CountryConcentration[];
}

export interface SectorConcentration {
  sector: string;
  portfolioWeight: number;
  benchmarkWeight: number;
  activeWeight: number;
  stockCount: number;
}

export interface CountryConcentration {
  country: string;
  portfolioWeight: number;
  benchmarkWeight: number;
  activeWeight: number;
  stockCount: number;
}

// Historical Stress Testing
export interface StressScenario {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  benchmarkReturn: number; // Historical benchmark return during this period
}

export interface StressTestResult {
  scenario: StressScenario;
  portfolioReturn: number;
  benchmarkReturn: number;
  excessReturn: number;
  maxDrawdown: number;
  beta: number;
  recoveryMonths: number | null; // null if not recovered
}

// Predefined historical stress scenarios
// Using month-end dates to match monthly performance data
export const STRESS_SCENARIOS: StressScenario[] = [
  {
    id: 'gfc-2008',
    name: '2008 Financial Crisis',
    description: 'Global Financial Crisis - Lehman Brothers collapse and credit freeze',
    startDate: '2008-08-31', // Month before crisis peak
    endDate: '2009-02-28',   // Month of trough
    benchmarkReturn: -0.502, // -50.2% (historical estimate, will use actual if available)
  },
  {
    id: 'covid-2020',
    name: 'COVID-19 Crash',
    description: 'Rapid market decline due to COVID-19 pandemic',
    startDate: '2020-01-31', // Month before crash
    endDate: '2020-03-31',   // Month of trough
    benchmarkReturn: -0.339, // -33.9% (historical estimate, will use actual if available)
  },
  {
    id: 'rate-shock-2022',
    name: '2022 Rate Shock',
    description: 'Fed rate hikes and inflation concerns',
    startDate: '2021-12-31', // Month before drawdown
    endDate: '2022-09-30',   // Approximate trough
    benchmarkReturn: -0.254, // -25.4% (historical estimate, will use actual if available)
  },
];

// VaR histogram data
export interface VaRHistogramBin {
  binStart: number;
  binEnd: number;
  count: number;
  isVaR95: boolean;
  isVaR99: boolean;
}

// Combined risk state for store
export interface RiskState {
  riskMetrics: RiskMetrics | null;
  factorRisk: FactorRiskDecomposition | null;
  concentrationRisk: ConcentrationMetrics | null;
  stressTestResults: StressTestResult[] | null;
  isCalculating: boolean;
  lastCalculatedAt: string | null;
}

// Helper type for returns data
export interface ReturnDataPoint {
  date: string;
  portfolioReturn: number;
  benchmarkReturn: number;
  cumulativePortfolio: number;
  cumulativeBenchmark: number;
}
