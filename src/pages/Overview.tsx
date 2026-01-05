import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Target,
  PieChart,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import { Card, KPICard, StatCard } from '../components/ui/Card';
import { AllocationChart, ActiveWeightChart } from '../components/charts/AllocationChart';
import { HoldingsTable } from '../components/charts/HoldingsTable';
import { PerformanceChart } from '../components/charts/PerformanceChart';
import { UploadModal } from '../components/modules/UploadModal';
import { usePortfolioStore } from '../stores/portfolioStore';
import { localDataApi, type PerformanceRiskData } from '../services/api';
import { formatPercent } from '../utils/formatters';

export function Overview() {
  const filters = usePortfolioStore((state) => state.filters);
  const currentSnapshot = usePortfolioStore((state) => state.currentSnapshot);
  const setCurrentSnapshot = usePortfolioStore((state) => state.setCurrentSnapshot);
  const setHistoricalData = usePortfolioStore((state) => state.setHistoricalData);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [performanceData, setPerformanceData] = useState<PerformanceRiskData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Load quarters index and top 50 data
        const quarters = await localDataApi.getQuarters();
        if (quarters.quarters.length > 0) {
          const latestQuarter = quarters.quarters.find(q => q.id === quarters.latestQuarter) || quarters.quarters[0];
          const top50 = await localDataApi.getTop50(latestQuarter.id, filters.marketType);
          if (top50) {
            const snapshot = localDataApi.toPortfolioSnapshot(top50);
            setCurrentSnapshot(snapshot);
          }
        }

        // Load performance data
        const perfData = await localDataApi.getPerformanceRisk();
        setPerformanceData(perfData);
        setHistoricalData(localDataApi.toHistoricalData(perfData));
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [filters.marketType, setCurrentSnapshot, setHistoricalData]);

  // Memoize derived data to prevent infinite loops
  const statistics = useMemo(
    () => currentSnapshot?.statistics ?? null,
    [currentSnapshot?.statistics]
  );

  const sectorAllocations = useMemo(
    () => currentSnapshot?.sectorAllocations?.slice(0, 8) ?? [],
    [currentSnapshot?.sectorAllocations]
  );

  const countryAllocations = useMemo(
    () => currentSnapshot?.countryAllocations?.slice(0, 8) ?? [],
    [currentSnapshot?.countryAllocations]
  );

  const topHoldings = useMemo(() => {
    if (!currentSnapshot?.holdings) return [];
    return [...currentSnapshot.holdings]
      .sort((a, b) => b.portfolioWeight - a.portfolioWeight)
      .slice(0, 10);
  }, [currentSnapshot?.holdings]);

  // Transform performance data for chart (last 2 years)
  const chartData = useMemo(() => {
    if (!performanceData?.performance) return [];
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    return performanceData.performance
      .filter(d => new Date(d.date) >= twoYearsAgo)
      .map(d => ({
        date: d.date,
        portfolioValue: d.portfolioValue,
        benchmarkValue: d.benchmarkValue,
        cumulativeReturn: (d.portfolioValue - 100) / 100,
        benchmarkReturn: (d.benchmarkValue - 100) / 100,
        alpha: d.alpha || 0,
      }));
  }, [performanceData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terebinth-primary mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Global Equity Dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            {filters.marketType === 'EM' ? 'Emerging Markets' : 'Developed Markets'} Strategy Overview
            {currentSnapshot?.quarterLabel && ` - ${currentSnapshot.quarterLabel}`}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-green-700 font-medium">Live Data</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Alpha Score"
          value={statistics?.alphaScore?.toFixed(2) ?? '-'}
          changeLabel="TC Proprietary Score"
          trend="neutral"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <KPICard
          label="Active Share"
          value={statistics ? formatPercent(statistics.activeShare) : '-'}
          changeLabel="Portfolio differentiation"
          trend="neutral"
          icon={<Target className="w-5 h-5" />}
        />
        <KPICard
          label="Tracking Error"
          value={statistics ? formatPercent(statistics.trackingError) : '-'}
          changeLabel="Annualized"
          trend="neutral"
          icon={<Activity className="w-5 h-5" />}
        />
        <KPICard
          label="Holdings"
          value={statistics?.numberOfStocks ?? '-'}
          changeLabel={`Eff: ${statistics?.effectiveNumberOfStocks?.toFixed(1) ?? '-'}`}
          trend="neutral"
          icon={<PieChart className="w-5 h-5" />}
        />
      </div>

      {/* Performance Chart */}
      <Card title="Portfolio Performance" subtitle="$100 invested (last 2 years)">
        {chartData.length > 0 ? (
          <PerformanceChart data={chartData} title="" height={350} />
        ) : (
          <div className="h-[350px] flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg">
            <p className="text-sm">No performance data available</p>
          </div>
        )}
      </Card>

      {/* Allocation Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Sector Allocation" subtitle="Portfolio vs Benchmark">
          {sectorAllocations.length > 0 ? (
            <AllocationChart
              data={sectorAllocations}
              height={300}
              horizontal={false}
            />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No sector allocation data
            </div>
          )}
        </Card>
        <Card title="Active Country Weights" subtitle="Over/Underweight positions">
          {countryAllocations.length > 0 ? (
            <ActiveWeightChart
              data={countryAllocations}
              height={300}
            />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No country allocation data
            </div>
          )}
        </Card>
      </div>

      {/* Statistics Grid */}
      <Card title="Portfolio Statistics">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Volatility"
            value={statistics ? formatPercent(statistics.volatility) : '-'}
          />
          <StatCard
            label="Eff. No. Stocks"
            value={statistics?.effectiveNumberOfStocks?.toFixed(1) ?? '-'}
          />
          <StatCard
            label="Stock Max"
            value={statistics ? formatPercent(statistics.stockMax) : '-'}
          />
          <StatCard
            label="Max Track Error"
            value={statistics ? formatPercent(statistics.maxTrackingError) : '-'}
          />
        </div>
      </Card>

      {/* Top Holdings */}
      <Card
        title="Top Holdings"
        subtitle="Ranked by portfolio weight"
        action={
          <a href="/holdings" className="btn-ghost text-sm flex items-center gap-1">
            View All
            <ArrowUpRight className="w-4 h-4" />
          </a>
        }
      >
        {topHoldings.length > 0 ? (
          <HoldingsTable data={topHoldings} maxRows={10} />
        ) : (
          <div className="py-8 text-center text-gray-400">
            No holdings data available
          </div>
        )}
      </Card>

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
}
