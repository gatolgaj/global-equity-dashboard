import { useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { AllocationChart, ActiveWeightChart } from '../components/charts/AllocationChart';
import { CompositionTimeSeriesChart } from '../components/charts/CompositionTimeSeriesChart';
import { UploadModal } from '../components/modules/UploadModal';
import { usePortfolioStore } from '../stores/portfolioStore';
import { formatPercent } from '../utils/formatters';

type ViewType = 'absolute' | 'active' | 'time-series';
type CategoryType = 'sector' | 'country' | 'region';

export function Composition() {
  const currentSnapshot = usePortfolioStore((state) => state.currentSnapshot);
  const compositionData = usePortfolioStore((state) => state.compositionData);
  const factorData = usePortfolioStore((state) => state.factorData);

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

  const [viewType, setViewType] = useState<ViewType>('time-series');
  const [categoryType, setCategoryType] = useState<CategoryType>('region');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

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

  // Show empty state if no uploaded data
  if (!compositionData && !currentSnapshot) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
        <EmptyState
          title="No Composition Data"
          description="Upload your IC_PortfolioComposition Excel file to view sector, country, and region allocations over time."
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
          <h1 className="text-2xl font-bold text-gray-900">Portfolio Composition</h1>
          <p className="text-gray-500 mt-1">
            Sector, country, and region exposure analysis over time
          </p>
        </div>
        {compositionData && (
          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            Uploaded Data
          </span>
        )}
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
            <p className="text-sm text-gray-500">{holdingsInfo?.isTopN ? 'Top Holdings' : 'Total Holdings'}</p>
            <p className="text-2xl font-bold text-terebinth-dark mt-1">
              {holdingsInfo?.count ?? '-'}
            </p>
            {holdingsInfo?.isTopN && (
              <p className="text-xs text-gray-400 mt-1">{holdingsInfo.coverage}% of portfolio</p>
            )}
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
