import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import optimisationData from '../data/optimisationData.json';

export type ScoreType =
  | 'Quality Sector'
  | 'Quality Broad'
  | 'Momentum Sector'
  | 'Momentum Broad'
  | 'Quality NSN'
  | 'Momentum NSN';

export interface OptStock {
  ticker: string;
  sector: string;
  benchmarkWeight: number;
  score: number;
  optimalWeight: number;
  activeWeight: number;
  volatility?: number;
}

export interface SectorAllocation {
  sector: string;
  indexWeight: number;
  optimalWeight: number;
  activeWeight: number;
  currentWeight?: number;
}

export interface ScenarioStats {
  weightedScore: number;
  activeShare: number;
  numberOfStocks: number;
  totalWeight: number;
}

export interface Scenario {
  label: string;
  stocks: OptStock[];
  sectorSummary: SectorAllocation[];
  stats: ScenarioStats;
}

export interface PortfolioStats {
  Score: number;
  Volatility: number;
  'Relative Score': number;
  'Tracking Error': number;
  '2-way Turnover': number;
  'Weight Sum': number;
  'No. Stocks': number;
}

export interface OptimiserSettings {
  'TE Target': number;
  WtSum: number;
  'Sector Active Limit': number;
  'Stock Active Limit': number;
  'Stock Weight Limit': number;
  'Max 2-way Turnover': number;
  'Select Score Type': string;
}

interface OptimisationState {
  // Data
  scenarios: Record<string, Scenario>;
  selectedScoreType: ScoreType;
  optimiseSettings: OptimiserSettings;
  portfolioStats: PortfolioStats;
  description: string;
  sectorSummary: SectorAllocation[];
  stockData: OptStock[];

  // Derived
  currentScenario: Scenario | null;

  // Actions
  setScoreType: (scoreType: ScoreType) => void;
  getScenarioComparison: () => Array<{
    label: string;
    score: number;
    activeShare: number;
    numberOfStocks: number;
  }>;
}

interface RawStockData {
  no: number;
  ticker: string;
  sector: string;
  indexWeight: number;
  score: number;
  volatility: number;
  currentWeight: number;
  optimalWeight: number;
  activeWeight: number;
}

const typedData = optimisationData as unknown as {
  scenarios: Record<string, Scenario>;
  optimiseSettings: Record<string, string | number>;
  portfolioStats: Record<string, number>;
  description: string;
  sectorSummary: SectorAllocation[];
  stockData: RawStockData[];
};

export const useOptimisationStore = create<OptimisationState>()(
  devtools(
    (set, get) => ({
      scenarios: typedData.scenarios as Record<string, Scenario>,
      selectedScoreType: 'Quality NSN' as ScoreType,
      optimiseSettings: typedData.optimiseSettings as unknown as OptimiserSettings,
      portfolioStats: typedData.portfolioStats as unknown as PortfolioStats,
      description: typedData.description,
      sectorSummary: typedData.sectorSummary,
      stockData: typedData.stockData.map((s: RawStockData) => ({
        ticker: s.ticker,
        sector: s.sector,
        benchmarkWeight: s.indexWeight,
        score: s.score,
        optimalWeight: s.optimalWeight,
        activeWeight: s.activeWeight,
        volatility: s.volatility,
      })),

      currentScenario: typedData.scenarios['Quality NSN'] as Scenario || null,

      setScoreType: (scoreType: ScoreType) => {
        const { scenarios } = get();
        set(
          {
            selectedScoreType: scoreType,
            currentScenario: scenarios[scoreType] || null,
          },
          false,
          'setScoreType'
        );
      },

      getScenarioComparison: () => {
        const { scenarios } = get();
        return Object.entries(scenarios).map(([label, scenario]) => ({
          label,
          score: scenario.stats.weightedScore,
          activeShare: scenario.stats.activeShare,
          numberOfStocks: scenario.stats.numberOfStocks,
        }));
      },
    }),
    { name: 'OptimisationStore' }
  )
);
