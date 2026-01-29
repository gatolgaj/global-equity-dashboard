import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { UploadModal } from '../components/modules/UploadModal';
import { FactorRadarChart } from '../components/charts/FactorRadarChart';
import { FactorBarChart } from '../components/charts/FactorBarChart';
import { SectorFactorHeatmap } from '../components/charts/SectorFactorHeatmap';
import { PortfolioTreemap } from '../components/charts/PortfolioTreemap';
import { StockFactorExplorer } from '../components/charts/StockFactorExplorer';
import { TrendingUp, Grid3X3, PieChart, Search } from 'lucide-react';
import { usePortfolioStore } from '../stores/portfolioStore';

type ViewTab = 'overview' | 'heatmap' | 'treemap' | 'explorer';

export function FactorAnalysis() {
  const factorData = usePortfolioStore((state) => state.factorData);
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const hasFactorData = factorData && factorData.holdings.length > 0;

  if (!hasFactorData) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
        <EmptyState
          title="No Factor Data"
          description="Factor analysis requires factor data from the IC_PortfolioComposition file. Upload your factor analysis file to see stock-level factor exposures."
          onUploadClick={() => setIsUploadModalOpen(true)}
        />
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
        />
      </div>
    );
  }

  // Convert FactorScores to the format expected by charts
  const portfolioExposure = {
    value: factorData.portfolioAverages.value,
    growth: factorData.portfolioAverages.growth,
    quality: factorData.portfolioAverages.quality,
    debt: factorData.portfolioAverages.debt,
    volatility: factorData.portfolioAverages.volatility,
    momentum: factorData.portfolioAverages.momentum,
    size: factorData.portfolioAverages.size,
    sentiment: factorData.portfolioAverages.sentiment,
    mfm_score: factorData.portfolioAverages.mfmScore,
  };

  const benchmarkExposure = {
    value: factorData.benchmarkAverages.value,
    growth: factorData.benchmarkAverages.growth,
    quality: factorData.benchmarkAverages.quality,
    debt: factorData.benchmarkAverages.debt,
    volatility: factorData.benchmarkAverages.volatility,
    momentum: factorData.benchmarkAverages.momentum,
    size: factorData.benchmarkAverages.size,
    sentiment: factorData.benchmarkAverages.sentiment,
    mfm_score: factorData.benchmarkAverages.mfmScore,
  };

  // Convert sector factors to the format expected by heatmap
  const sectorHeatmapData = factorData.sectorFactors.map((s) => ({
    sector: s.sector,
    count: s.count,
    totalWeight: s.totalWeight,
    value: s.value,
    growth: s.growth,
    quality: s.quality,
    debt: s.debt,
    volatility: s.volatility,
    momentum: s.momentum,
    size: s.size,
    sentiment: s.sentiment,
    mfm_score: s.mfmScore,
  }));

  // Convert holdings to the format expected by treemap
  const treemapData = factorData.holdings.map((h) => ({
    ticker: h.ticker,
    company: h.company,
    sector: h.sector,
    country: h.country,
    region: h.region,
    weight: h.portfolioWeight,
    activeWeight: h.activeWeight,
    factors: {
      value: h.factors.value,
      growth: h.factors.growth,
      quality: h.factors.quality,
      debt: h.factors.debt,
      volatility: h.factors.volatility,
      momentum: h.factors.momentum,
      size: h.factors.size,
      sentiment: h.factors.sentiment,
      mfm_score: h.factors.mfmScore,
    },
  }));

  // Convert holdings to the format expected by explorer
  const explorerData = factorData.holdings.map((h, idx) => ({
    rank: idx + 1,
    ticker: h.ticker,
    company: h.company,
    sector: h.sector,
    country: h.country,
    region: h.region,
    weight: h.portfolioWeight,
    activeWeight: h.activeWeight,
    factors: {
      value: h.factors.value,
      growth: h.factors.growth,
      quality: h.factors.quality,
      debt: h.factors.debt,
      volatility: h.factors.volatility,
      momentum: h.factors.momentum,
      size: h.factors.size,
      sentiment: h.factors.sentiment,
      mfm_score: h.factors.mfmScore,
    },
  }));

  // Find top factor tilts
  const factorEntries = [
    { name: 'Value', value: factorData.portfolioAverages.value },
    { name: 'Growth', value: factorData.portfolioAverages.growth },
    { name: 'Quality', value: factorData.portfolioAverages.quality },
    { name: 'Momentum', value: factorData.portfolioAverages.momentum },
    { name: 'Sentiment', value: factorData.portfolioAverages.sentiment },
    { name: 'Size', value: factorData.portfolioAverages.size },
    { name: 'Volatility', value: factorData.portfolioAverages.volatility },
    { name: 'Debt', value: factorData.portfolioAverages.debt },
  ];

  const sortedFactors = [...factorEntries].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const topPositive = factorEntries.filter(f => f.value > 0.3).sort((a, b) => b.value - a.value)[0];
  const topNegative = factorEntries.filter(f => f.value < -0.3).sort((a, b) => a.value - b.value)[0];

  const tabs: { id: ViewTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Factor Overview', icon: TrendingUp },
    { id: 'heatmap', label: 'Sector Heatmap', icon: Grid3X3 },
    { id: 'treemap', label: 'Portfolio Treemap', icon: PieChart },
    { id: 'explorer', label: 'Stock Explorer', icon: Search },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Factor Analysis</h1>
          <p className="text-gray-500 mt-1">
            Deep dive into portfolio factor exposures and characteristics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            {factorData.holdings.length} Holdings
          </span>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            As of {factorData.asOfDate}
          </span>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-terebinth-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div className="p-4">
                <div className="text-sm text-gray-500 mb-1">Portfolio MFM Score</div>
                <div className={`text-3xl font-bold ${
                  factorData.portfolioAverages.mfmScore >= 5
                    ? 'text-green-600'
                    : factorData.portfolioAverages.mfmScore >= 3
                    ? 'text-blue-600'
                    : 'text-yellow-600'
                }`}>
                  {factorData.portfolioAverages.mfmScore.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Multi-Factor Model composite score
                </div>
              </div>
            </Card>

            {topPositive && (
              <Card>
                <div className="p-4">
                  <div className="text-sm text-gray-500 mb-1">Strongest Positive Tilt</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-green-600">
                      +{topPositive.value.toFixed(2)}σ
                    </span>
                    <span className="text-gray-600">{topPositive.name}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Above-average exposure
                  </div>
                </div>
              </Card>
            )}

            {topNegative && (
              <Card>
                <div className="p-4">
                  <div className="text-sm text-gray-500 mb-1">Strongest Negative Tilt</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-red-600">
                      {topNegative.value.toFixed(2)}σ
                    </span>
                    <span className="text-gray-600">{topNegative.name}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Below-average exposure
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Factor Radar" subtitle="Portfolio factor exposures (σ from benchmark)">
              <FactorRadarChart
                portfolio={portfolioExposure}
                benchmark={benchmarkExposure}
                height={380}
                showBenchmark={false}
              />
            </Card>

            <Card title="Factor Tilts" subtitle="Active factor positions in standard deviations">
              <FactorBarChart
                factors={portfolioExposure}
                height={380}
                showMFM
              />
            </Card>
          </div>

          {/* Factor summary table */}
          <Card title="Factor Exposure Summary" subtitle="Ranked by absolute exposure magnitude">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Factor</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Portfolio Exposure</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Interpretation</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFactors.map((factor, idx) => {
                    const interpretation =
                      Math.abs(factor.value) < 0.5
                        ? 'Neutral'
                        : factor.value > 1.5
                        ? 'Strong positive tilt'
                        : factor.value > 0.5
                        ? 'Moderate positive tilt'
                        : factor.value < -1.5
                        ? 'Strong negative tilt'
                        : 'Moderate negative tilt';

                    return (
                      <tr key={factor.name} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="py-3 px-4 font-medium">{factor.name}</td>
                        <td className={`py-3 px-4 text-right font-mono font-medium ${
                          factor.value >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {factor.value >= 0 ? '+' : ''}{factor.value.toFixed(2)}σ
                        </td>
                        <td className="py-3 px-4 text-gray-500">{interpretation}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'heatmap' && (
        <Card title="Sector Factor Heatmap" subtitle="Factor exposures by sector (weight-adjusted averages)">
          <SectorFactorHeatmap data={sectorHeatmapData} height={Math.max(400, sectorHeatmapData.length * 45)} />
        </Card>
      )}

      {activeTab === 'treemap' && (
        <Card title="Portfolio Treemap" subtitle="Holdings visualization by sector and weight">
          <PortfolioTreemap
            holdings={treemapData}
            height={600}
            groupBy="sector"
            colorBy="mfm"
          />
        </Card>
      )}

      {activeTab === 'explorer' && (
        <Card title="Stock Factor Explorer" subtitle="Search and analyze individual stock factor profiles">
          <StockFactorExplorer holdings={explorerData} />
        </Card>
      )}
    </div>
  );
}
