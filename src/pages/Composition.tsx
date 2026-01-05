import { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { AllocationChart, ActiveWeightChart } from '../components/charts/AllocationChart';
import { CompositionTimeSeriesChart } from '../components/charts/CompositionTimeSeriesChart';
import { usePortfolioStore } from '../stores/portfolioStore';
import { localDataApi, type PortfolioCompositionData } from '../services/api';
import { formatPercent } from '../utils/formatters';

type ViewType = 'absolute' | 'active' | 'time-series';
type CategoryType = 'sector' | 'country' | 'region';

export function Composition() {
  const currentSnapshot = usePortfolioStore((state) => state.currentSnapshot);
  const [viewType, setViewType] = useState<ViewType>('time-series');
  const [categoryType, setCategoryType] = useState<CategoryType>('region');
  const [compositionData, setCompositionData] = useState<PortfolioCompositionData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load composition data on mount
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await localDataApi.getPortfolioComposition();
        setCompositionData(data);
      } catch (err) {
        console.error('Failed to load composition data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Memoize derived data to prevent infinite loops
  const statistics = useMemo(
    () => currentSnapshot?.statistics ?? null,
    [currentSnapshot?.statistics]
  );

  const sectorAllocations = useMemo(
    () => currentSnapshot?.sectorAllocations ?? [],
    [currentSnapshot?.sectorAllocations]
  );

  const countryAllocations = useMemo(
    () => currentSnapshot?.countryAllocations ?? [],
    [currentSnapshot?.countryAllocations]
  );

  const regionAllocations = useMemo(
    () => currentSnapshot?.regionAllocations ?? [],
    [currentSnapshot?.regionAllocations]
  );

  const categoryData = useMemo(() => {
    switch (categoryType) {
      case 'sector':
        return sectorAllocations;
      case 'country':
        return countryAllocations;
      case 'region':
        return regionAllocations;
      default:
        return sectorAllocations;
    }
  }, [categoryType, sectorAllocations, countryAllocations, regionAllocations]);

  const sortedCategoryData = useMemo(() => {
    return [...categoryData].sort((a, b) => b.portfolioWeight - a.portfolioWeight);
  }, [categoryData]);

  // Get time series data for the selected category
  const timeSeriesData = useMemo(() => {
    if (!compositionData) return [];
    switch (categoryType) {
      case 'sector':
        return compositionData.sector;
      case 'country':
        return compositionData.country;
      case 'region':
        return compositionData.region;
      default:
        return compositionData.region;
    }
  }, [categoryType, compositionData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terebinth-primary mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading composition data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Portfolio Composition</h1>
        <p className="text-gray-500 mt-1">
          Sector, country, and region exposure analysis over time
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {(['region', 'sector', 'country'] as CategoryType[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryType(cat)}
              className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
                categoryType === cat
                  ? 'bg-terebinth-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {([
            { value: 'time-series', label: 'Time Series' },
            { value: 'absolute', label: 'Current' },
            { value: 'active', label: 'Active Weights' },
          ] as const).map((view) => (
            <button
              key={view.value}
              onClick={() => setViewType(view.value)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                viewType === view.value
                  ? 'bg-terebinth-secondary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main chart */}
      <Card
        title={`${categoryType.charAt(0).toUpperCase() + categoryType.slice(1)} Exposure`}
        subtitle={
          viewType === 'time-series'
            ? 'Historical allocation over time'
            : viewType === 'absolute'
            ? 'Portfolio vs Benchmark weights'
            : 'Over/underweight positions'
        }
      >
        {viewType === 'time-series' ? (
          timeSeriesData.length > 0 ? (
            <CompositionTimeSeriesChart
              data={timeSeriesData}
              height={450}
              categoryType={categoryType}
            />
          ) : (
            <div className="h-[450px] flex items-center justify-center text-gray-400">
              No time series data available for {categoryType}
            </div>
          )
        ) : categoryData.length > 0 ? (
          viewType === 'absolute' ? (
            <AllocationChart
              data={categoryData}
              height={450}
              horizontal={categoryType !== 'region'}
            />
          ) : (
            <ActiveWeightChart data={categoryData} height={450} />
          )
        ) : (
          <div className="h-[450px] flex items-center justify-center text-gray-400">
            No {categoryType} allocation data available
          </div>
        )}
      </Card>

      {/* Detailed breakdown */}
      {viewType !== 'time-series' && (
        <Card title="Detailed Breakdown">
          {sortedCategoryData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{categoryType.charAt(0).toUpperCase() + categoryType.slice(1)}</th>
                    <th className="text-right">Portfolio</th>
                    <th className="text-right">Benchmark</th>
                    <th className="text-right">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCategoryData.map((item) => (
                    <tr key={item.name}>
                      <td className="font-medium text-gray-900">{item.name}</td>
                      <td className="text-right font-mono">
                        {(item.portfolioWeight * 100).toFixed(2)}%
                      </td>
                      <td className="text-right font-mono text-gray-500">
                        {(item.benchmarkWeight * 100).toFixed(2)}%
                      </td>
                      <td
                        className={`text-right font-mono font-medium ${
                          item.activeWeight >= 0
                            ? 'text-performance-positive'
                            : 'text-performance-negative'
                        }`}
                      >
                        {item.activeWeight >= 0 ? '+' : ''}
                        {(item.activeWeight * 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400">
              No breakdown data available
            </div>
          )}
        </Card>
      )}

      {/* Portfolio characteristics */}
      <Card title="Portfolio Characteristics">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Total Holdings</p>
            <p className="text-2xl font-bold text-terebinth-dark mt-1">
              {statistics?.numberOfStocks ?? '-'}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Sectors</p>
            <p className="text-2xl font-bold text-terebinth-dark mt-1">
              {sectorAllocations.length || '-'}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Countries</p>
            <p className="text-2xl font-bold text-terebinth-dark mt-1">
              {countryAllocations.length || '-'}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Active Share</p>
            <p className="text-2xl font-bold text-terebinth-dark mt-1">
              {statistics ? formatPercent(statistics.activeShare) : '-'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
