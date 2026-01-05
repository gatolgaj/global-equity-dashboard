import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { FactorRadarChart } from '../components/charts/FactorRadarChart';
import { FactorBarChart } from '../components/charts/FactorBarChart';
import { SectorFactorHeatmap } from '../components/charts/SectorFactorHeatmap';
import { PortfolioTreemap } from '../components/charts/PortfolioTreemap';
import { StockFactorExplorer } from '../components/charts/StockFactorExplorer';
import { localDataApi, type FactorData, type FactorHolding } from '../services/api';
import { TrendingUp, Grid3X3, PieChart, Search } from 'lucide-react';

type ViewTab = 'overview' | 'heatmap' | 'treemap' | 'explorer';

export function FactorAnalysis() {
  const [factorData, setFactorData] = useState<FactorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [treemapGroupBy, setTreemapGroupBy] = useState<'sector' | 'region' | 'country'>('sector');
  const [treemapColorBy, setTreemapColorBy] = useState<'weight' | 'activeWeight' | 'mfm'>('weight');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await localDataApi.getFactorData();
        setFactorData(data);
      } catch (err) {
        console.error('Failed to load factor data:', err);
        setError('Failed to load factor data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terebinth-primary mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading factor analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !factorData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-500">
          <p>{error || 'Failed to load data'}</p>
        </div>
      </div>
    );
  }

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
        <div className="text-sm text-gray-500">
          Last updated: {factorData.lastUpdated}
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

      {/* Content based on active tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Factor Radar Chart */}
          <Card
            title="Portfolio Factor Profile"
            subtitle="Factor tilts relative to neutral (0)"
          >
            <FactorRadarChart
              portfolio={factorData.factorExposures.portfolio}
              benchmark={factorData.factorExposures.benchmark}
              height={400}
              showBenchmark={Object.keys(factorData.factorExposures.benchmark || {}).length > 0}
            />
          </Card>

          {/* Factor Bar Chart */}
          <Card
            title="Current Factor Exposures"
            subtitle="Portfolio-weighted average factor scores"
          >
            <FactorBarChart
              factors={factorData.factorExposures.portfolio}
              height={400}
              showMFM
            />
          </Card>

          {/* Factor Summary Stats */}
          <Card title="Factor Exposure Summary" className="lg:col-span-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-9 gap-4">
              {factorData.factors
                .filter((f) => f.id !== 'mfm_score')
                .map((factor) => {
                  const value = factorData.factorExposures.portfolio[factor.id as keyof typeof factorData.factorExposures.portfolio];
                  const isPositive = (value ?? 0) >= 0;
                  const intensity = Math.abs(value ?? 0);
                  const interpretation =
                    intensity < 0.5
                      ? 'Neutral'
                      : intensity < 1.5
                      ? isPositive
                        ? 'Overweight'
                        : 'Underweight'
                      : isPositive
                      ? 'Strong OW'
                      : 'Strong UW';

                  return (
                    <div
                      key={factor.id}
                      className={`p-4 rounded-lg border ${
                        intensity < 0.5
                          ? 'bg-gray-50 border-gray-200'
                          : isPositive
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="text-xs text-gray-500 mb-1">{factor.name}</div>
                      <div
                        className={`text-xl font-bold ${
                          intensity < 0.5
                            ? 'text-gray-700'
                            : isPositive
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {(value ?? 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{interpretation}</div>
                    </div>
                  );
                })}
            </div>
          </Card>

          {/* Top Holdings by MFM Score */}
          <Card
            title="Top Holdings by MFM Score"
            subtitle="Highest multi-factor model scores"
            className="lg:col-span-2"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Rank</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Stock</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600">Weight</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600">Active</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600">Value</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600">Growth</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600">Quality</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600">Momentum</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600">MFM</th>
                  </tr>
                </thead>
                <tbody>
                  {[...factorData.holdings]
                    .sort((a, b) => (b.factors?.mfm_score ?? 0) - (a.factors?.mfm_score ?? 0))
                    .slice(0, 10)
                    .map((h, idx) => (
                      <tr key={h.ticker} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-500">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <div className="font-medium text-gray-900">{h.ticker}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[150px]">
                            {h.company}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {((h.weight || 0) * 100).toFixed(2)}%
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono ${
                            (h.activeWeight || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {(h.activeWeight || 0) >= 0 ? '+' : ''}
                          {((h.activeWeight || 0) * 100).toFixed(2)}%
                        </td>
                        <td className="py-2 px-3 text-right">
                          <FactorBadge value={h.factors?.value} />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <FactorBadge value={h.factors?.growth} />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <FactorBadge value={h.factors?.quality} />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <FactorBadge value={h.factors?.momentum} />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span
                            className={`font-bold ${
                              (h.factors?.mfm_score ?? 0) >= 5
                                ? 'text-green-600'
                                : (h.factors?.mfm_score ?? 0) >= 3
                                ? 'text-blue-600'
                                : 'text-yellow-600'
                            }`}
                          >
                            {h.factors?.mfm_score?.toFixed(1) ?? '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'heatmap' && (
        <Card
          title="Sector Factor Heatmap"
          subtitle="Average factor exposures by sector (weighted by position)"
        >
          <SectorFactorHeatmap data={factorData.sectorFactorHeatmap} height={500} />
        </Card>
      )}

      {activeTab === 'treemap' && (
        <Card
          title="Portfolio Composition Treemap"
          subtitle="Interactive visualization of portfolio weights"
        >
          <div className="flex flex-wrap gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Group By</label>
              <div className="flex gap-1">
                {(['sector', 'region', 'country'] as const).map((group) => (
                  <button
                    key={group}
                    onClick={() => setTreemapGroupBy(group)}
                    className={`px-3 py-1 text-sm rounded capitalize ${
                      treemapGroupBy === group
                        ? 'bg-terebinth-primary text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {group}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Color By</label>
              <div className="flex gap-1">
                {([
                  { id: 'weight', label: 'Weight' },
                  { id: 'activeWeight', label: 'Active Weight' },
                  { id: 'mfm', label: 'MFM Score' },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setTreemapColorBy(opt.id)}
                    className={`px-3 py-1 text-sm rounded ${
                      treemapColorBy === opt.id
                        ? 'bg-terebinth-secondary text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <PortfolioTreemap
            holdings={factorData.holdings as FactorHolding[]}
            groupBy={treemapGroupBy}
            colorBy={treemapColorBy}
            height={550}
          />
        </Card>
      )}

      {activeTab === 'explorer' && (
        <Card
          title="Stock Factor Explorer"
          subtitle="Click on any stock to view detailed factor breakdown"
        >
          <StockFactorExplorer holdings={factorData.holdings} />
        </Card>
      )}
    </div>
  );
}

// Helper component for factor badges
function FactorBadge({ value }: { value?: number }) {
  if (value === undefined) return <span className="text-gray-400">-</span>;

  const isPositive = value >= 0;
  const intensity = Math.abs(value);

  let bgColor = 'bg-gray-100';
  let textColor = 'text-gray-600';

  if (intensity >= 1.5) {
    bgColor = isPositive ? 'bg-green-100' : 'bg-red-100';
    textColor = isPositive ? 'text-green-700' : 'text-red-700';
  } else if (intensity >= 0.5) {
    bgColor = isPositive ? 'bg-green-50' : 'bg-red-50';
    textColor = isPositive ? 'text-green-600' : 'text-red-600';
  }

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${bgColor} ${textColor}`}>
      {isPositive ? '+' : ''}
      {value.toFixed(1)}
    </span>
  );
}
