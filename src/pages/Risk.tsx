import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { UploadModal } from '../components/modules/UploadModal';
import { DrawdownChart } from '../components/charts/DrawdownChart';
import { VaRChart } from '../components/charts/VaRChart';
import { RiskDecompositionChart } from '../components/charts/RiskDecompositionChart';
import { ConcentrationChart, ActiveWeightChart } from '../components/charts/ConcentrationChart';
import { StressTestChart, StressTestTable } from '../components/charts/StressTestChart';
import {
  AlertTriangle,
  TrendingDown,
  PieChart,
  Activity,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { usePortfolioStore } from '../stores/portfolioStore';

type ViewTab = 'overview' | 'factor-risk' | 'concentration' | 'stress-test';

export function Risk() {
  const {
    performanceData,
    factorData,
    riskMetrics,
    factorRisk,
    concentrationRisk,
    stressTestResults,
    isCalculatingRisk,
    calculateRiskMetrics,
  } = usePortfolioStore();

  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Calculate risk metrics when data changes
  useEffect(() => {
    if ((performanceData || factorData) && !riskMetrics) {
      calculateRiskMetrics();
    }
  }, [performanceData, factorData, riskMetrics, calculateRiskMetrics]);

  const hasPerformanceData = performanceData && performanceData.performance.length > 0;
  const hasFactorData = factorData && factorData.holdings.length > 0;
  const hasAnyData = hasPerformanceData || hasFactorData;

  if (!hasAnyData) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
        <EmptyState
          title="No Risk Data"
          description="Risk analysis requires performance data (IC_Backtest_Returns&Risk) and/or factor data (IC_PortfolioComposition). Upload your data files to see comprehensive risk metrics."
          onUploadClick={() => setIsUploadModalOpen(true)}
        />
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
        />
      </div>
    );
  }

  const tabs: { id: ViewTab; label: string; icon: React.ComponentType<{ className?: string }>; disabled?: boolean }[] = [
    { id: 'overview', label: 'Risk Overview', icon: AlertTriangle },
    { id: 'factor-risk', label: 'Factor Risk', icon: Activity, disabled: !hasFactorData },
    { id: 'concentration', label: 'Concentration', icon: PieChart, disabled: !hasFactorData },
    { id: 'stress-test', label: 'Stress Testing', icon: TrendingDown, disabled: !hasPerformanceData },
  ];

  // Extract monthly returns for VaR chart (filter out nulls)
  const monthlyReturns = (performanceData?.performance
    .map((p) => p.portfolioReturn)
    .filter((r): r is number => r !== null)) || [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Risk Analysis</h1>
          <p className="text-gray-500 mt-1">
            Comprehensive portfolio risk metrics, factor decomposition, and stress testing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => calculateRiskMetrics()}
            disabled={isCalculatingRisk}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {isCalculatingRisk ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Recalculate
          </button>
          {hasPerformanceData && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              {performanceData.performance.length} Months
            </span>
          )}
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-terebinth-primary text-white'
                : tab.disabled
                ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isCalculatingRisk && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Calculating risk metrics...</span>
          </div>
        </div>
      )}

      {/* Tab content */}
      {!isCalculatingRisk && activeTab === 'overview' && riskMetrics && (
        <RiskOverviewTab riskMetrics={riskMetrics} monthlyReturns={monthlyReturns} />
      )}

      {!isCalculatingRisk && activeTab === 'factor-risk' && factorRisk && (
        <FactorRiskTab factorRisk={factorRisk} />
      )}

      {!isCalculatingRisk && activeTab === 'concentration' && concentrationRisk && (
        <ConcentrationTab concentrationRisk={concentrationRisk} />
      )}

      {!isCalculatingRisk && activeTab === 'stress-test' && stressTestResults && (
        <StressTestTab results={stressTestResults} />
      )}
    </div>
  );
}

// Risk Overview Tab
import type { RiskMetrics } from '../types/risk';

function RiskOverviewTab({
  riskMetrics,
  monthlyReturns,
}: {
  riskMetrics: RiskMetrics;
  monthlyReturns: number[];
}) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          label="VaR (95%)"
          value={`${riskMetrics.var95.toFixed(1)}%`}
          subtitle="Monthly"
          color="red"
        />
        <MetricCard
          label="VaR (99%)"
          value={`${riskMetrics.var99.toFixed(1)}%`}
          subtitle="Monthly"
          color="red"
        />
        <MetricCard
          label="Max Drawdown"
          value={`${riskMetrics.maxDrawdown.toFixed(1)}%`}
          subtitle={riskMetrics.maxDrawdownDate}
          color="red"
        />
        <MetricCard
          label="Sharpe Ratio"
          value={riskMetrics.sharpeRatio.toFixed(2)}
          subtitle="Annualized"
          color={riskMetrics.sharpeRatio >= 1 ? 'green' : riskMetrics.sharpeRatio >= 0.5 ? 'yellow' : 'red'}
        />
        <MetricCard
          label="Sortino Ratio"
          value={riskMetrics.sortinoRatio.toFixed(2)}
          subtitle="Annualized"
          color={riskMetrics.sortinoRatio >= 1.5 ? 'green' : riskMetrics.sortinoRatio >= 1 ? 'yellow' : 'red'}
        />
        <MetricCard
          label="Beta"
          value={riskMetrics.beta.toFixed(2)}
          subtitle="vs Benchmark"
          color={riskMetrics.beta <= 1.1 && riskMetrics.beta >= 0.9 ? 'green' : 'yellow'}
        />
      </div>

      {/* Drawdown Chart */}
      <Card title="Historical Drawdown" subtitle="Cumulative drawdown from peak portfolio value">
        <DrawdownChart
          data={riskMetrics.rollingDrawdown}
          height={350}
          maxDrawdownDate={riskMetrics.maxDrawdownDate}
        />
      </Card>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VaR Histogram */}
        <Card title="Return Distribution" subtitle="Monthly returns histogram with VaR levels">
          <VaRChart
            returns={monthlyReturns}
            var95={riskMetrics.var95}
            var99={riskMetrics.var99}
            height={350}
          />
        </Card>

        {/* Risk Metrics Table */}
        <Card title="Risk Metrics Summary" subtitle="Key risk and return statistics">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                <MetricRow label="Annualized Volatility" value={`${riskMetrics.annualizedVolatility.toFixed(1)}%`} />
                <MetricRow label="Downside Volatility" value={`${riskMetrics.downsideVolatility.toFixed(1)}%`} />
                <MetricRow label="Tracking Error" value={`${riskMetrics.trackingError.toFixed(1)}%`} />
                <MetricRow label="Information Ratio" value={riskMetrics.informationRatio.toFixed(2)} />
                <MetricRow label="Calmar Ratio" value={riskMetrics.calmarRatio.toFixed(2)} />
                <MetricRow label="CVaR (95%)" value={`${riskMetrics.cvar95.toFixed(1)}%`} />
                <MetricRow label="Current Drawdown" value={`${riskMetrics.currentDrawdown.toFixed(1)}%`} />
                <MetricRow label="Drawdown Duration" value={`${riskMetrics.drawdownDuration} months`} />
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Factor Risk Tab
import type { FactorRiskDecomposition } from '../types/risk';

function FactorRiskTab({ factorRisk }: { factorRisk: FactorRiskDecomposition }) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="p-4">
            <div className="text-sm text-gray-500 mb-1">Systematic Risk</div>
            <div className="text-3xl font-bold text-blue-600">
              {factorRisk.systematicRisk.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {factorRisk.systematicPercent.toFixed(0)}% of total risk
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="text-sm text-gray-500 mb-1">Idiosyncratic Risk</div>
            <div className="text-3xl font-bold text-purple-600">
              {factorRisk.idiosyncraticRisk.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {factorRisk.idiosyncraticPercent.toFixed(0)}% of total risk
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="text-sm text-gray-500 mb-1">Total Risk</div>
            <div className="text-3xl font-bold text-gray-700">
              {factorRisk.totalRisk.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Annualized volatility
            </div>
          </div>
        </Card>
      </div>

      {/* Factor Risk Decomposition Chart */}
      <Card title="Factor Risk Decomposition" subtitle="Risk contribution by factor">
        <RiskDecompositionChart
          factors={factorRisk.factors}
          systematicRisk={factorRisk.systematicRisk}
          idiosyncraticRisk={factorRisk.idiosyncraticRisk}
          height={400}
        />
      </Card>

      {/* Factor Risk Table */}
      <Card title="Factor Risk Attribution" subtitle="Detailed factor risk breakdown">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Factor</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Exposure</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Factor Vol</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Contribution</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">% of Risk</th>
              </tr>
            </thead>
            <tbody>
              {factorRisk.factors.map((factor, idx) => (
                <tr key={factor.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-3 px-4 font-medium">{factor.name}</td>
                  <td className={`py-3 px-4 text-right font-mono ${
                    factor.exposure >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {factor.exposure >= 0 ? '+' : ''}{factor.exposure.toFixed(2)}σ
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-gray-600">
                    {factor.volatility.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-gray-900">
                    {factor.contribution.toFixed(2)}%
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(factor.percentOfRisk, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-gray-600 w-12 text-right">
                        {factor.percentOfRisk.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// Concentration Tab
import type { ConcentrationMetrics } from '../types/risk';

function ConcentrationTab({ concentrationRisk }: { concentrationRisk: ConcentrationMetrics }) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard
          label="HHI Index"
          value={concentrationRisk.hhi.toFixed(0)}
          subtitle={concentrationRisk.hhi < 1500 ? 'Low' : concentrationRisk.hhi < 2500 ? 'Moderate' : 'High'}
          color={concentrationRisk.hhi < 1500 ? 'green' : concentrationRisk.hhi < 2500 ? 'yellow' : 'red'}
        />
        <MetricCard
          label="Effective Stocks"
          value={concentrationRisk.effectiveStocks.toFixed(0)}
          subtitle="1/HHI"
          color="blue"
        />
        <MetricCard
          label="Top 10 Weight"
          value={`${concentrationRisk.top10Weight.toFixed(1)}%`}
          subtitle="Concentration"
          color={concentrationRisk.top10Weight < 40 ? 'green' : concentrationRisk.top10Weight < 60 ? 'yellow' : 'red'}
        />
        <MetricCard
          label="Max Position"
          value={`${concentrationRisk.maxStockWeight.toFixed(1)}%`}
          subtitle={concentrationRisk.maxStockTicker}
          color={concentrationRisk.maxStockWeight < 5 ? 'green' : concentrationRisk.maxStockWeight < 10 ? 'yellow' : 'red'}
        />
        <MetricCard
          label="Active Share"
          value={`${concentrationRisk.activeShare.toFixed(1)}%`}
          subtitle="vs Benchmark"
          color={concentrationRisk.activeShare > 60 ? 'green' : 'yellow'}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Sector Concentration" subtitle="Portfolio vs benchmark sector weights">
          <ConcentrationChart
            data={concentrationRisk.sectorConcentration}
            height={400}
            showBenchmark={true}
          />
        </Card>

        <Card title="Active Sector Weights" subtitle="Over/underweight by sector">
          <ActiveWeightChart
            data={concentrationRisk.sectorConcentration}
            height={400}
          />
        </Card>
      </div>

      {/* Concentration Table */}
      <Card title="Sector Breakdown" subtitle="Detailed sector allocation">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Sector</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Portfolio</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Benchmark</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Active</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Stocks</th>
              </tr>
            </thead>
            <tbody>
              {concentrationRisk.sectorConcentration.map((sector, idx) => (
                <tr key={sector.sector} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-3 px-4 font-medium">{sector.sector}</td>
                  <td className="py-3 px-4 text-right font-mono">
                    {sector.portfolioWeight.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-gray-500">
                    {sector.benchmarkWeight.toFixed(1)}%
                  </td>
                  <td className={`py-3 px-4 text-right font-mono ${
                    sector.activeWeight >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {sector.activeWeight >= 0 ? '+' : ''}{sector.activeWeight.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-gray-500">
                    {sector.stockCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// Stress Test Tab
import type { StressTestResult } from '../types/risk';

function StressTestTab({ results }: { results: StressTestResult[] }) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {results.map((result) => (
          <Card key={result.scenario.id}>
            <div className="p-4">
              <div className="text-sm font-medium text-gray-700 mb-2">
                {result.scenario.name}
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${
                  result.portfolioReturn >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {result.portfolioReturn >= 0 ? '+' : ''}{result.portfolioReturn.toFixed(1)}%
                </span>
                <span className="text-sm text-gray-500">
                  vs {result.benchmarkReturn.toFixed(1)}% benchmark
                </span>
              </div>
              <div className={`text-xs mt-1 ${
                result.excessReturn >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                Excess: {result.excessReturn >= 0 ? '+' : ''}{result.excessReturn.toFixed(1)}%
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Stress Test Chart */}
      <Card title="Scenario Comparison" subtitle="Portfolio vs benchmark performance during stress periods">
        <StressTestChart results={results} height={400} />
      </Card>

      {/* Detailed Results Table */}
      <Card title="Stress Test Results" subtitle="Detailed scenario analysis">
        <StressTestTable results={results} />
      </Card>
    </div>
  );
}

// Helper Components
function MetricCard({
  label,
  value,
  subtitle,
  color,
}: {
  label: string;
  value: string;
  subtitle?: string;
  color: 'red' | 'green' | 'yellow' | 'blue';
}) {
  const colorClasses = {
    red: 'text-red-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    blue: 'text-blue-600',
  };

  return (
    <Card>
      <div className="p-4">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
        <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
        {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
      </div>
    </Card>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-2 px-4 text-gray-600">{label}</td>
      <td className="py-2 px-4 text-right font-mono font-medium text-gray-900">{value}</td>
    </tr>
  );
}
