import { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, Filter } from 'lucide-react';
import { FactorBarChart } from './FactorBarChart';

interface FactorScores {
  value?: number;
  growth?: number;
  quality?: number;
  debt?: number;
  volatility?: number;
  momentum?: number;
  size?: number;
  sentiment?: number;
  mfm_score?: number;
  [key: string]: number | undefined;
}

interface Holding {
  rank: number;
  ticker: string;
  company: string;
  weight: number;
  activeWeight: number;
  sector: string;
  country: string;
  region: string;
  factors?: FactorScores;
}

interface StockFactorExplorerProps {
  holdings: Holding[];
}

type SortField = 'rank' | 'ticker' | 'weight' | 'activeWeight' | 'mfm_score';
type SortDirection = 'asc' | 'desc';

export function StockFactorExplorer({ holdings }: StockFactorExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState<Holding | null>(null);
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [sectorFilter, setSectorFilter] = useState<string>('all');

  const sectors = useMemo(() => {
    const sectorSet = new Set(holdings.map((h) => h.sector));
    return ['all', ...Array.from(sectorSet).sort()];
  }, [holdings]);

  const filteredHoldings = useMemo(() => {
    return holdings
      .filter((h) => {
        // Filter out holdings with 0% weight
        if ((h.weight || 0) <= 0) return false;

        const matchesSearch =
          searchQuery === '' ||
          h.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
          h.company.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesSector = sectorFilter === 'all' || h.sector === sectorFilter;

        return matchesSearch && matchesSector;
      })
      .sort((a, b) => {
        let aVal: number | string;
        let bVal: number | string;

        switch (sortField) {
          case 'rank':
            aVal = a.rank;
            bVal = b.rank;
            break;
          case 'ticker':
            aVal = a.ticker;
            bVal = b.ticker;
            break;
          case 'weight':
            aVal = a.weight || 0;
            bVal = b.weight || 0;
            break;
          case 'activeWeight':
            aVal = a.activeWeight || 0;
            bVal = b.activeWeight || 0;
            break;
          case 'mfm_score':
            aVal = a.factors?.mfm_score || 0;
            bVal = b.factors?.mfm_score || 0;
            break;
          default:
            return 0;
        }

        if (typeof aVal === 'string') {
          return sortDirection === 'asc'
            ? aVal.localeCompare(bVal as string)
            : (bVal as string).localeCompare(aVal);
        }

        return sortDirection === 'asc' ? aVal - (bVal as number) : (bVal as number) - aVal;
      });
  }, [holdings, searchQuery, sectorFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'ticker' ? 'asc' : 'desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Holdings List */}
      <div>
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ticker or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            >
              {sectors.map((sector) => (
                <option key={sector} value={sector}>
                  {sector === 'all' ? 'All Sectors' : sector}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Holdings Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th
                    className="px-3 py-2 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('rank')}
                  >
                    <div className="flex items-center gap-1">
                      #<SortIcon field="rank" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('ticker')}
                  >
                    <div className="flex items-center gap-1">
                      Stock
                      <SortIcon field="ticker" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-right font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('weight')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Weight
                      <SortIcon field="weight" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-right font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('mfm_score')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      MFM
                      <SortIcon field="mfm_score" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredHoldings.map((h) => (
                  <tr
                    key={h.ticker}
                    onClick={() => setSelectedStock(h)}
                    className={`border-t border-gray-100 cursor-pointer transition-colors ${
                      selectedStock?.ticker === h.ticker
                        ? 'bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-3 py-2 text-gray-500">{h.rank}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{h.ticker}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[150px]">
                        {h.company}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {((h.weight || 0) * 100).toFixed(2)}%
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={`font-mono font-medium ${
                          (h.factors?.mfm_score || 0) >= 5
                            ? 'text-green-600'
                            : (h.factors?.mfm_score || 0) >= 3
                            ? 'text-blue-600'
                            : (h.factors?.mfm_score || 0) >= 0
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {h.factors?.mfm_score?.toFixed(1) || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-500">
          Showing {filteredHoldings.length} of {holdings.length} holdings
        </div>
      </div>

      {/* Factor Details */}
      <div>
        {selectedStock ? (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedStock.ticker}</h3>
                <p className="text-sm text-gray-500">{selectedStock.company}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-terebinth-primary">
                  {((selectedStock.weight || 0) * 100).toFixed(2)}%
                </div>
                <div
                  className={`text-sm font-medium ${
                    (selectedStock.activeWeight || 0) >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  Active: {(selectedStock.activeWeight || 0) >= 0 ? '+' : ''}
                  {((selectedStock.activeWeight || 0) * 100).toFixed(2)}%
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4 text-xs">
              <span className="px-2 py-1 bg-gray-100 rounded-full">
                {selectedStock.sector}
              </span>
              <span className="px-2 py-1 bg-gray-100 rounded-full">
                {selectedStock.country}
              </span>
              <span className="px-2 py-1 bg-gray-100 rounded-full">
                {selectedStock.region}
              </span>
            </div>

            {selectedStock.factors && Object.keys(selectedStock.factors).length > 0 ? (
              <FactorBarChart
                factors={selectedStock.factors}
                height={350}
                showMFM
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                No factor data available for this stock
              </div>
            )}
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg p-8 h-full flex flex-col items-center justify-center text-gray-400">
            <div className="text-lg mb-2">Select a stock to view factors</div>
            <div className="text-sm">
              Click on any row in the table to see detailed factor exposures
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
