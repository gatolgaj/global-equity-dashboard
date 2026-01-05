import { useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { HoldingsTable } from '../components/charts/HoldingsTable';
import { UploadModal } from '../components/modules/UploadModal';
import { usePortfolioStore } from '../stores/portfolioStore';
import type { Stock } from '../types/portfolio';

export function Holdings() {
  const currentSnapshot = usePortfolioStore((state) => state.currentSnapshot);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Memoize derived data to prevent infinite loops
  const topHoldings = useMemo(() => {
    if (!currentSnapshot?.holdings) return [];
    return [...currentSnapshot.holdings]
      .sort((a, b) => b.portfolioWeight - a.portfolioWeight)
      .slice(0, 50);
  }, [currentSnapshot?.holdings]);

  const quadrantData = useMemo(() => {
    return topHoldings.slice(0, 20).map((stock) => ({
      name: stock.ticker,
      alphaScore: stock.alphaScore ?? 0,
      activeWeight: stock.activeWeight * 100,
      portfolioWeight: stock.portfolioWeight * 100,
    }));
  }, [topHoldings]);

  // Show empty state if no data
  if (!currentSnapshot) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <EmptyState
          title="No Holdings Data"
          description="Upload your portfolio Excel file to view the top 50 holdings with TC 4-Quadrant analysis."
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Top 50 Holdings</h1>
        <p className="text-gray-500 mt-1">
          Point-in-time portfolio analysis
          {currentSnapshot.quarterLabel && ` - ${currentSnapshot.quarterLabel}`}
        </p>
      </div>

      {/* TC 4-Quadrant Analysis */}
      <Card title="TC 4-Quadrant Analysis" subtitle="Alpha Score vs Active Weight positioning">
        <div className="h-96 relative bg-gray-50 rounded-lg p-4">
          {/* Quadrant labels */}
          <div className="absolute inset-0 flex">
            <div className="w-1/2 h-1/2 border-r border-b border-gray-300 flex items-center justify-center">
              <span className="text-xs text-gray-400 font-medium">CONVICTION</span>
            </div>
            <div className="w-1/2 h-1/2 border-b border-gray-300 flex items-center justify-center">
              <span className="text-xs text-gray-400 font-medium">STARS</span>
            </div>
          </div>
          <div className="absolute inset-0 flex" style={{ top: '50%' }}>
            <div className="w-1/2 h-1/2 border-r border-gray-300 flex items-center justify-center">
              <span className="text-xs text-gray-400 font-medium">BENCHMARK</span>
            </div>
            <div className="w-1/2 h-1/2 flex items-center justify-center">
              <span className="text-xs text-gray-400 font-medium">POTENTIAL</span>
            </div>
          </div>

          {/* Axis labels */}
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
            Active Weight &rarr;
          </div>
          <div className="absolute left-2 top-1/2 transform -translate-y-1/2 -rotate-90 text-xs text-gray-500">
            Alpha Score &rarr;
          </div>

          {/* Plot points */}
          {quadrantData.map((point) => {
            // Normalize positions
            const x = ((point.activeWeight + 2) / 10) * 100; // -2% to 8%
            const y = 100 - ((point.alphaScore - 1) / 2.5) * 100; // 1 to 3.5

            return (
              <div
                key={point.name}
                className="absolute w-3 h-3 rounded-full bg-terebinth-primary hover:bg-terebinth-accent cursor-pointer transition-colors"
                style={{
                  left: `${Math.max(5, Math.min(95, x))}%`,
                  top: `${Math.max(5, Math.min(95, y))}%`,
                }}
                title={`${point.name}: Alpha ${point.alphaScore.toFixed(2)}, Active ${point.activeWeight.toFixed(2)}%`}
              />
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-terebinth-primary" />
            <span className="text-gray-600">Top 20 Holdings</span>
          </div>
          <div className="text-gray-400">
            Hover over points for details
          </div>
        </div>
      </Card>

      {/* Holdings table */}
      <Card title="All Holdings" subtitle={`${topHoldings.length} positions sorted by portfolio weight`}>
        <HoldingsTable
          data={topHoldings}
          maxRows={50}
          onStockClick={setSelectedStock}
        />
      </Card>

      {/* Stock detail modal */}
      {selectedStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedStock.name}
                </h2>
                <p className="text-gray-500">{selectedStock.ticker}</p>
              </div>
              <button
                onClick={() => setSelectedStock(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Country</p>
                <p className="font-medium">{selectedStock.country}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Sector</p>
                <p className="font-medium">{selectedStock.sector}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Alpha Score</p>
                <p className="font-medium">{selectedStock.alphaScore?.toFixed(2) ?? '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Portfolio Weight</p>
                <p className="font-medium">{(selectedStock.portfolioWeight * 100).toFixed(2)}%</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Benchmark Weight</p>
                <p className="font-medium">{(selectedStock.benchmarkWeight * 100).toFixed(2)}%</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Active Weight</p>
                <p className={`font-medium ${selectedStock.activeWeight >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedStock.activeWeight >= 0 ? '+' : ''}{(selectedStock.activeWeight * 100).toFixed(2)}%
                </p>
              </div>
            </div>
            <div className="mt-6">
              <h3 className="font-medium text-gray-900 mb-2">Analyst Commentary</h3>
              <div className="p-4 bg-terebinth-light rounded-lg">
                <p className="text-sm text-gray-600 italic">
                  Click "Edit" to add custom commentary for this position.
                  This can be customized by the PM/Analyst for client presentations.
                </p>
                <button className="btn-secondary mt-2 text-sm">Edit Commentary</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
