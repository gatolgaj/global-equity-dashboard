import { supabase, isSupabaseConfigured } from './supabaseClient';
import type {
  PortfolioSnapshot,
  MarketType,
  Stock,
  Allocation,
  PortfolioStatistics,
  FactorData,
  FactorHolding,
  FactorScores,
  SectorFactorData
} from '../types/portfolio';
import type { PerformanceRiskData, PortfolioCompositionData } from './api';

// =============================================================================
// Types for database rows
// =============================================================================

interface UploadRow {
  upload_id: number;
  data_type: string;
  file_name: string;
  file_size_bytes: number | null;
  market_type: string | null;
  uploaded_at: string;
  status: string;
  error_message: string | null;
  snapshot_id: number | null;
  performance_data_id: number | null;
  composition_data_id: number | null;
}

interface SnapshotRow {
  snapshot_id: number;
  market_type: string;
  quarter_label: string;
  snapshot_date: string;
  alpha_score: number | null;
  active_share: number | null;
  number_of_stocks: number | null;
  effective_number_of_stocks: number | null;
  volatility: number | null;
  tracking_error: number | null;
  statistics: Record<string, unknown>;
  holdings: unknown[];
  sector_allocations: unknown[];
  country_allocations: unknown[];
  region_allocations: unknown[];
  created_at: string;
  updated_at: string;
}

interface PerformanceRow {
  performance_data_id: number;
  version_label: string;
  date_range_start: string;
  date_range_end: string;
  performance: unknown[];
  summary_stats: Record<string, unknown>;
  rolling_alpha_1y: unknown[];
  rolling_alpha_3y: unknown[];
  volatility: unknown[];
  tracking_error: unknown[];
  created_at: string;
  updated_at: string;
}

interface CompositionRow {
  composition_data_id: number;
  version_label: string;
  region: unknown[];
  sector: unknown[];
  country: unknown[];
  constituents: unknown[];
  created_at: string;
  updated_at: string;
}

interface FactorRow {
  factor_data_id: number;
  version_label: string;
  as_of_date: string;
  holdings: unknown[];
  portfolio_averages: Record<string, unknown>;
  benchmark_averages: Record<string, unknown>;
  sector_factors: unknown[];
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Portfolio Snapshots API
// =============================================================================

export const snapshotApi = {
  async save(
    snapshot: PortfolioSnapshot,
    fileName: string,
    fileSize?: number
  ): Promise<{ snapshotId: number; uploadId: number }> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured');
    }

    // Create upload record first
    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .insert({
        data_type: 'holdings',
        file_name: fileName,
        file_size_bytes: fileSize || null,
        market_type: snapshot.marketType,
        status: 'processing',
      })
      .select('upload_id')
      .single();

    if (uploadError) throw new Error(`Failed to create upload record: ${uploadError.message}`);
    const uploadRow = upload as UploadRow;

    try {
      // Upsert snapshot
      const { data: savedSnapshot, error: snapshotError } = await supabase
        .from('portfolio_snapshots')
        .upsert({
          market_type: snapshot.marketType,
          quarter_label: snapshot.quarterLabel,
          snapshot_date: snapshot.date,
          alpha_score: snapshot.statistics.alphaScore,
          active_share: snapshot.statistics.activeShare,
          number_of_stocks: snapshot.statistics.numberOfStocks,
          effective_number_of_stocks: snapshot.statistics.effectiveNumberOfStocks,
          volatility: snapshot.statistics.volatility,
          tracking_error: snapshot.statistics.trackingError,
          statistics: snapshot.statistics as unknown as Record<string, unknown>,
          holdings: snapshot.holdings as unknown[],
          sector_allocations: snapshot.sectorAllocations as unknown[],
          country_allocations: snapshot.countryAllocations as unknown[],
          region_allocations: snapshot.regionAllocations as unknown[],
        }, {
          onConflict: 'market_type,quarter_label',
        })
        .select('snapshot_id')
        .single();

      if (snapshotError) throw new Error(`Failed to save snapshot: ${snapshotError.message}`);
      const snapshotRow = savedSnapshot as SnapshotRow;

      // Update upload record with success
      await supabase
        .from('uploads')
        .update({
          status: 'completed',
          snapshot_id: snapshotRow.snapshot_id,
        })
        .eq('upload_id', uploadRow.upload_id);

      return {
        snapshotId: snapshotRow.snapshot_id,
        uploadId: uploadRow.upload_id,
      };
    } catch (error) {
      // Update upload record with failure
      await supabase
        .from('uploads')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('upload_id', uploadRow.upload_id);
      throw error;
    }
  },

  async getLatest(marketType: MarketType): Promise<PortfolioSnapshot | null> {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('market_type', marketType)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw new Error(`Failed to fetch snapshot: ${error.message}`);
    }

    return mapDbSnapshotToPortfolioSnapshot(data as SnapshotRow);
  },

  async listAll(): Promise<Array<{
    snapshotId: number;
    marketType: MarketType;
    quarterLabel: string;
    snapshotDate: string;
    numberOfStocks: number | null;
    createdAt: string;
  }>> {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from('portfolio_snapshots')
      .select('snapshot_id, market_type, quarter_label, snapshot_date, number_of_stocks, created_at')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to list snapshots: ${error.message}`);

    return (data as SnapshotRow[]).map(row => ({
      snapshotId: row.snapshot_id,
      marketType: row.market_type as MarketType,
      quarterLabel: row.quarter_label,
      snapshotDate: row.snapshot_date,
      numberOfStocks: row.number_of_stocks,
      createdAt: row.created_at,
    }));
  },

  async getById(snapshotId: number): Promise<PortfolioSnapshot | null> {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('snapshot_id', snapshotId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch snapshot: ${error.message}`);
    }

    return mapDbSnapshotToPortfolioSnapshot(data as SnapshotRow);
  },
};

// =============================================================================
// Performance Data API
// =============================================================================

export const performanceApi = {
  async save(
    data: PerformanceRiskData,
    fileName: string,
    fileSize?: number
  ): Promise<{ performanceDataId: number; uploadId: number }> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured');
    }

    // Create upload record
    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .insert({
        data_type: 'performance',
        file_name: fileName,
        file_size_bytes: fileSize || null,
        market_type: null,
        status: 'processing',
      })
      .select('upload_id')
      .single();

    if (uploadError) throw new Error(`Failed to create upload record: ${uploadError.message}`);
    const uploadRow = upload as UploadRow;

    try {
      // Upsert performance data
      const { data: saved, error } = await supabase
        .from('performance_data')
        .upsert({
          version_label: 'current',
          date_range_start: data.dateRange.start,
          date_range_end: data.dateRange.end,
          performance: data.performance as unknown[],
          summary_stats: data.summaryStats as Record<string, unknown>,
          rolling_alpha_1y: data.rollingAlpha1Y as unknown[],
          rolling_alpha_3y: data.rollingAlpha3Y as unknown[],
          volatility: data.volatility as unknown[],
          tracking_error: data.trackingError as unknown[],
        }, {
          onConflict: 'version_label',
        })
        .select('performance_data_id')
        .single();

      if (error) throw new Error(`Failed to save performance data: ${error.message}`);
      const perfRow = saved as PerformanceRow;

      // Update upload record
      await supabase
        .from('uploads')
        .update({
          status: 'completed',
          performance_data_id: perfRow.performance_data_id,
        })
        .eq('upload_id', uploadRow.upload_id);

      return {
        performanceDataId: perfRow.performance_data_id,
        uploadId: uploadRow.upload_id,
      };
    } catch (error) {
      await supabase
        .from('uploads')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('upload_id', uploadRow.upload_id);
      throw error;
    }
  },

  async getCurrent(): Promise<PerformanceRiskData | null> {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from('performance_data')
      .select('*')
      .eq('version_label', 'current')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch performance data: ${error.message}`);
    }

    const row = data as PerformanceRow;
    return {
      performance: row.performance as PerformanceRiskData['performance'],
      summaryStats: row.summary_stats as Record<string, number | null>,
      rollingAlpha1Y: row.rolling_alpha_1y as PerformanceRiskData['rollingAlpha1Y'],
      rollingAlpha3Y: row.rolling_alpha_3y as PerformanceRiskData['rollingAlpha3Y'],
      volatility: row.volatility as PerformanceRiskData['volatility'],
      trackingError: row.tracking_error as PerformanceRiskData['trackingError'],
      dateRange: {
        start: row.date_range_start,
        end: row.date_range_end,
      },
    };
  },
};

// =============================================================================
// Composition Data API
// =============================================================================

export const compositionApi = {
  async save(
    data: PortfolioCompositionData,
    fileName: string,
    fileSize?: number
  ): Promise<{ compositionDataId: number; uploadId: number }> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured');
    }

    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .insert({
        data_type: 'composition',
        file_name: fileName,
        file_size_bytes: fileSize || null,
        market_type: null,
        status: 'processing',
      })
      .select('upload_id')
      .single();

    if (uploadError) throw new Error(`Failed to create upload record: ${uploadError.message}`);
    const uploadRow = upload as UploadRow;

    try {
      const { data: saved, error } = await supabase
        .from('composition_data')
        .upsert({
          version_label: 'current',
          region: data.region as unknown[],
          sector: data.sector as unknown[],
          country: data.country as unknown[],
          constituents: data.constituents as unknown[],
        }, {
          onConflict: 'version_label',
        })
        .select('composition_data_id')
        .single();

      if (error) throw new Error(`Failed to save composition data: ${error.message}`);
      const compRow = saved as CompositionRow;

      await supabase
        .from('uploads')
        .update({
          status: 'completed',
          composition_data_id: compRow.composition_data_id,
        })
        .eq('upload_id', uploadRow.upload_id);

      return {
        compositionDataId: compRow.composition_data_id,
        uploadId: uploadRow.upload_id,
      };
    } catch (error) {
      await supabase
        .from('uploads')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('upload_id', uploadRow.upload_id);
      throw error;
    }
  },

  async getCurrent(): Promise<PortfolioCompositionData | null> {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from('composition_data')
      .select('*')
      .eq('version_label', 'current')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch composition data: ${error.message}`);
    }

    const row = data as CompositionRow;
    return {
      region: row.region as PortfolioCompositionData['region'],
      sector: row.sector as PortfolioCompositionData['sector'],
      country: row.country as PortfolioCompositionData['country'],
      constituents: row.constituents as PortfolioCompositionData['constituents'],
    };
  },
};

// =============================================================================
// Factor Data API
// =============================================================================

export const factorApi = {
  async save(
    data: FactorData,
    fileName: string,
    fileSize?: number
  ): Promise<{ factorDataId: number; uploadId: number }> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured');
    }

    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .insert({
        data_type: 'factors',
        file_name: fileName,
        file_size_bytes: fileSize || null,
        market_type: null,
        status: 'processing',
      })
      .select('upload_id')
      .single();

    if (uploadError) throw new Error(`Failed to create upload record: ${uploadError.message}`);
    const uploadRow = upload as UploadRow;

    try {
      const { data: saved, error } = await supabase
        .from('factor_data')
        .upsert({
          version_label: 'current',
          as_of_date: data.asOfDate,
          holdings: data.holdings as unknown[],
          portfolio_averages: data.portfolioAverages as unknown as Record<string, unknown>,
          benchmark_averages: data.benchmarkAverages as unknown as Record<string, unknown>,
          sector_factors: data.sectorFactors as unknown[],
        }, {
          onConflict: 'version_label',
        })
        .select('factor_data_id')
        .single();

      if (error) throw new Error(`Failed to save factor data: ${error.message}`);
      const factorRow = saved as FactorRow;

      await supabase
        .from('uploads')
        .update({
          status: 'completed',
        })
        .eq('upload_id', uploadRow.upload_id);

      return {
        factorDataId: factorRow.factor_data_id,
        uploadId: uploadRow.upload_id,
      };
    } catch (error) {
      await supabase
        .from('uploads')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('upload_id', uploadRow.upload_id);
      throw error;
    }
  },

  async getCurrent(): Promise<FactorData | null> {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from('factor_data')
      .select('*')
      .eq('version_label', 'current')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch factor data: ${error.message}`);
    }

    const row = data as FactorRow;
    return {
      asOfDate: row.as_of_date,
      holdings: row.holdings as FactorHolding[],
      portfolioAverages: row.portfolio_averages as unknown as FactorScores,
      benchmarkAverages: row.benchmark_averages as unknown as FactorScores,
      sectorFactors: row.sector_factors as SectorFactorData[],
    };
  },
};

// =============================================================================
// Data Loader API (for app initialization)
// =============================================================================

export const dataLoaderApi = {
  async loadAllData(marketType: MarketType = 'EM'): Promise<{
    snapshot: PortfolioSnapshot | null;
    performanceData: PerformanceRiskData | null;
    compositionData: PortfolioCompositionData | null;
    factorData: FactorData | null;
  }> {
    if (!isSupabaseConfigured) {
      return { snapshot: null, performanceData: null, compositionData: null, factorData: null };
    }

    // Load all data in parallel
    const [snapshot, performanceData, compositionData, factorData] = await Promise.all([
      snapshotApi.getLatest(marketType),
      performanceApi.getCurrent(),
      compositionApi.getCurrent(),
      factorApi.getCurrent(),
    ]);

    return {
      snapshot,
      performanceData,
      compositionData,
      factorData,
    };
  },

  async hasAnyData(): Promise<boolean> {
    if (!isSupabaseConfigured) return false;

    const { count, error } = await supabase
      .from('uploads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    if (error) return false;
    return (count ?? 0) > 0;
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

function mapDbSnapshotToPortfolioSnapshot(data: SnapshotRow): PortfolioSnapshot {
  return {
    id: `snapshot_${data.snapshot_id}`,
    date: data.snapshot_date,
    marketType: data.market_type as MarketType,
    quarterLabel: data.quarter_label,
    statistics: data.statistics as unknown as PortfolioStatistics,
    holdings: data.holdings as Stock[],
    sectorAllocations: data.sector_allocations as Allocation[],
    countryAllocations: data.country_allocations as Allocation[],
    regionAllocations: data.region_allocations as Allocation[],
  };
}
