import { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  Target,
  PieChart,
  Activity,
  ArrowUpRight,
  ShieldAlert,
  TrendingDown,
  BarChart3,
  Zap,
} from 'lucide-react';
import { Card, KPICard, StatCard } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { AllocationChart, ActiveWeightChart } from '../components/charts/AllocationChart';
import { HoldingsTable } from '../components/charts/HoldingsTable';
import { PerformanceChart } from '../components/charts/PerformanceChart';
import { UploadModal } from '../components/modules/UploadModal';
import { usePortfolioStore } from '../stores/portfolioStore';
import { formatPercent } from '../utils/formatters';

export function Overview() {
  const filters = usePortfolioStore((state) => state.filters);
  const currentSnapshot = usePortfolioStore((state) => state.currentSnapshot);
  const performanceData = usePortfolioStore((state) => state.performanceData);
  const factorData = usePortfolioStore((state) => state.factorData);
  const riskMetrics = usePortfolioStore((state) => state.riskMetrics);
  const calculateRiskMetrics = usePortfolioStore((state) => state.calculateRiskMetrics);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Get holdings info - count only holdings with meaningful portfolio weight (> 0.1%)
  const holdingsInfo = useMemo(() => {
    if (currentSnapshot?.holdings?.length) {
      // Filter to holdings with meaningful weight (> 0.1% = 0.001 in decimal)
      const activeHoldings = currentSnapshot.holdings.filter(h => h.portfolioWeight > 0.001);
      const totalWeight = activeHoldings.reduce((sum, h) => sum + h.portfolioWeight, 0);
      const coveragePercent = (totalWeight * 100).toFixed(1);
      const isPartial = totalWeight < 0.99; // Less than 99% coverage means it's top N, not all
      return {
        count: activeHoldings.length,
        isTopN: isPartial,
        coverage: coveragePercent,
      };
    }
    if (factorData?.holdings?.length) {
      return {
        count: factorData.holdings.length,
        isTopN: true,
        coverage: null,
      };
    }
    return null;
  }, [currentSnapshot?.holdings, factorData?.holdings]);

  // Calculate risk metrics when data changes
  useEffect(() => {
    if ((performanceData || factorData) && !riskMetrics) {
      calculateRiskMetrics();
    }
  }, [performanceData, factorData, riskMetrics, calculateRiskMetrics]);

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

  // Check if we have any uploaded data
  const hasData = currentSnapshot || performanceData;

  // Show empty state if no uploaded data
  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
        <EmptyState
          title="No Portfolio Data"
          description="Upload your Excel files to view the dashboard. Start by uploading your TOP 50 Holdings file, Performance & Risk file, or Portfolio Composition file."
          onUploadClick={() => setIsUploadModalOpen(true)}
        />
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
        />
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
        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
          Uploaded Data
        </span>
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
          label={holdingsInfo?.isTopN ? "Top Holdings" : "Holdings"}
          value={holdingsInfo?.count ?? '-'}
          changeLabel={holdingsInfo?.isTopN ? `${holdingsInfo.coverage}% of portfolio` : `Eff: ${statistics?.effectiveNumberOfStocks?.toFixed(1) ?? '-'}`}
          trend="neutral"
          icon={<PieChart className="w-5 h-5" />}
        />
      </div>

      {/* Risk KPI Cards */}
      {riskMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="VaR (95%)"
            value={`${riskMetrics.var95.toFixed(1)}%`}
            changeLabel="Monthly Value at Risk"
            trend={riskMetrics.var95 < 5 ? 'up' : 'down'}
            icon={<ShieldAlert className="w-5 h-5" />}
          />
          <KPICard
            label="Max Drawdown"
            value={`${riskMetrics.maxDrawdown.toFixed(1)}%`}
            changeLabel={riskMetrics.maxDrawdownDate}
            trend="down"
            icon={<TrendingDown className="w-5 h-5" />}
          />
          <KPICard
            label="Sharpe Ratio"
            value={riskMetrics.sharpeRatio.toFixed(2)}
            changeLabel="Risk-adjusted return"
            trend={riskMetrics.sharpeRatio >= 1 ? 'up' : riskMetrics.sharpeRatio >= 0.5 ? 'neutral' : 'down'}
            icon={<BarChart3 className="w-5 h-5" />}
          />
          <KPICard
            label="Beta"
            value={riskMetrics.beta.toFixed(2)}
            changeLabel="vs Benchmark"
            trend={riskMetrics.beta <= 1.1 && riskMetrics.beta >= 0.9 ? 'up' : 'neutral'}
            icon={<Zap className="w-5 h-5" />}
          />
        </div>
      )}

      {/* Performance Chart */}
      <Card title="Portfolio Performance" subtitle="Growth over last 2 years">
        {chartData.length > 0 ? (
          <PerformanceChart data={chartData} title="" height={350} />
        ) : (
          <div className="h-[350px] flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg">
            <p className="text-sm">Upload Performance & Risk data to see the chart</p>
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
              Upload TOP 50 Holdings to see sector allocation
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
              Upload TOP 50 Holdings to see country allocation
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
            Upload TOP 50 Holdings to see holdings data
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
