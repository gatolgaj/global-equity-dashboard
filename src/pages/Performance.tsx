import { useState, useMemo } from 'react';
import { Card, StatCard } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PerformanceChart } from '../components/charts/PerformanceChart';
import { RollingMetricChart } from '../components/charts/RollingMetricChart';
import { UploadModal } from '../components/modules/UploadModal';
import { usePortfolioStore } from '../stores/portfolioStore';
import { formatPercent } from '../utils/formatters';

export function Performance() {
  const currentSnapshot = usePortfolioStore((state) => state.currentSnapshot);
  const performanceData = usePortfolioStore((state) => state.performanceData);

  const [selectedPeriod, setSelectedPeriod] = useState<'1Y' | '3Y' | '5Y' | 'MAX'>('MAX');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Memoize derived data to prevent infinite loops
  const statistics = useMemo(
    () => currentSnapshot?.statistics ?? null,
    [currentSnapshot?.statistics]
  );

  const periods = [
    { value: '1Y', label: '1 Year' },
    { value: '3Y', label: '3 Years' },
    { value: '5Y', label: '5 Years' },
    { value: 'MAX', label: 'Max' },
  ];

  // Filter data based on selected period
  const filteredPerformance = useMemo(() => {
    if (!performanceData?.performance) return [];

    const data = performanceData.performance;
    if (selectedPeriod === 'MAX') return data;

    const now = new Date();
    const yearsBack = selectedPeriod === '1Y' ? 1 : selectedPeriod === '3Y' ? 3 : 5;
    const cutoffDate = new Date(now.getFullYear() - yearsBack, now.getMonth(), now.getDate());

    return data.filter(d => new Date(d.date) >= cutoffDate);
  }, [performanceData, selectedPeriod]);

  // Transform performance data for chart
  const chartData = useMemo(() => {
    return filteredPerformance.map(d => ({
      date: d.date,
      portfolioValue: d.portfolioValue,
      benchmarkValue: d.benchmarkValue,
      cumulativeReturn: (d.portfolioValue - 100) / 100,
      benchmarkReturn: (d.benchmarkValue - 100) / 100,
      alpha: d.alpha || 0,
    }));
  }, [filteredPerformance]);

  // Calculate performance summary
  const performanceSummary = useMemo(() => {
    if (!performanceData?.performance || performanceData.performance.length < 2) return null;

    const data = performanceData.performance;
    const first = data[0];
    const last = data[data.length - 1];

    const totalPortReturn = ((last.portfolioValue - first.portfolioValue) / first.portfolioValue) * 100;
    const totalBmkReturn = ((last.benchmarkValue - first.benchmarkValue) / first.benchmarkValue) * 100;
    const years = (new Date(last.date).getTime() - new Date(first.date).getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    const annPortReturn = (Math.pow(1 + totalPortReturn / 100, 1 / years) - 1) * 100;
    const annBmkReturn = (Math.pow(1 + totalBmkReturn / 100, 1 / years) - 1) * 100;

    return {
      totalReturn: totalPortReturn,
      totalBenchmarkReturn: totalBmkReturn,
      excessReturn: totalPortReturn - totalBmkReturn,
      annualisedReturn: annPortReturn,
      annualisedBenchmark: annBmkReturn,
      annualisedExcess: annPortReturn - annBmkReturn,
      years: years.toFixed(1),
    };
  }, [performanceData]);

  // Show empty state if no uploaded data
  if (!performanceData) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
        <EmptyState
          title="No Performance Data"
          description="Upload your IC_Backtest_Returns&Risk Excel file to view historical performance, risk metrics, and rolling analytics."
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
          <h1 className="text-2xl font-bold text-gray-900">Performance & Risk</h1>
          <p className="text-gray-500 mt-1">
            Historical performance analysis and risk metrics
            {performanceData?.dateRange && ` (${performanceData.dateRange.start} to ${performanceData.dateRange.end})`}
          </p>
        </div>
        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
          Uploaded Data
        </span>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-2">
        {periods.map((period) => (
          <button
            key={period.value}
            onClick={() => setSelectedPeriod(period.value as typeof selectedPeriod)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              selectedPeriod === period.value
                ? 'bg-terebinth-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Performance chart */}
      <Card>
        {chartData.length > 0 ? (
          <PerformanceChart data={chartData} height={400} />
        ) : (
          <div className="h-[400px] flex items-center justify-center text-gray-400">
            No performance data available
          </div>
        )}
      </Card>

      {/* Performance Summary */}
      {performanceSummary && (
        <Card title="Performance Summary" subtitle={`${performanceSummary.years} years of data`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metric</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Portfolio</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Benchmark</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Excess</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-900">Total Return</td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-terebinth-primary">
                    {performanceSummary.totalReturn.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-gray-600">
                    {performanceSummary.totalBenchmarkReturn.toFixed(2)}%
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-mono ${performanceSummary.excessReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {performanceSummary.excessReturn >= 0 ? '+' : ''}{performanceSummary.excessReturn.toFixed(2)}%
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-900">Annualised Return</td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-terebinth-primary">
                    {performanceSummary.annualisedReturn.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-gray-600">
                    {performanceSummary.annualisedBenchmark.toFixed(2)}%
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-mono ${performanceSummary.annualisedExcess >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {performanceSummary.annualisedExcess >= 0 ? '+' : ''}{performanceSummary.annualisedExcess.toFixed(2)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Rolling Alpha Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="1-Year Rolling Alpha" subtitle="Trailing 12-month excess return">
          {performanceData?.rollingAlpha1Y && performanceData.rollingAlpha1Y.length > 0 ? (
            <RollingMetricChart
              data={performanceData.rollingAlpha1Y}
              height={256}
              color="#3182CE"
              label="1Y Alpha"
              valueFormatter={(v) => `${v.toFixed(2)}%`}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Requires 12+ months of data
            </div>
          )}
        </Card>
        <Card title="3-Year Rolling Alpha" subtitle="Trailing 36-month annualized excess return">
          {performanceData?.rollingAlpha3Y && performanceData.rollingAlpha3Y.length > 0 ? (
            <RollingMetricChart
              data={performanceData.rollingAlpha3Y}
              height={256}
              color="#38A169"
              label="3Y Alpha"
              valueFormatter={(v) => `${v.toFixed(2)}%`}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Requires 36+ months of data
            </div>
          )}
        </Card>
      </div>

      {/* Risk Metrics */}
      <Card title="Risk Metrics" subtitle="Current portfolio statistics">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            label="Volatility"
            value={statistics ? formatPercent(statistics.volatility) : '-'}
          />
          <StatCard
            label="Tracking Error"
            value={statistics ? formatPercent(statistics.trackingError) : '-'}
          />
          <StatCard
            label="Alpha Score"
            value={statistics?.alphaScore?.toFixed(2) ?? '-'}
          />
          <StatCard
            label="Active Share"
            value={statistics ? formatPercent(statistics.activeShare) : '-'}
          />
          <StatCard
            label="Eff. Stocks"
            value={statistics?.effectiveNumberOfStocks?.toFixed(1) ?? '-'}
          />
          <StatCard
            label="Stock Max"
            value={statistics ? formatPercent(statistics.stockMax) : '-'}
          />
        </div>
      </Card>

      {/* Volatility & Tracking Error Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Rolling Volatility" subtitle="12-month annualized">
          {performanceData?.volatility && performanceData.volatility.length > 0 ? (
            <RollingMetricChart
              data={performanceData.volatility.filter(v => v.value !== null) as Array<{date: string; value: number}>}
              height={256}
              color="#DD6B20"
              label="Volatility"
              valueFormatter={(v) => `${v.toFixed(2)}%`}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No volatility data available
            </div>
          )}
        </Card>
        <Card title="Rolling Tracking Error" subtitle="12-month annualized">
          {performanceData?.trackingError && performanceData.trackingError.length > 0 ? (
            <RollingMetricChart
              data={performanceData.trackingError.filter(v => v.value !== null) as Array<{date: string; value: number}>}
              height={256}
              color="#9F7AEA"
              label="Tracking Error"
              valueFormatter={(v) => `${v.toFixed(2)}%`}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No tracking error data available
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
