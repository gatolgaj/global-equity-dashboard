import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { SortingState } from '@tanstack/react-table';
import { ArrowUpDown, Search, Download, ExternalLink } from 'lucide-react';
import type { Stock } from '../../types/portfolio';
import {
  formatPercent,
  formatPercentWithSign,
  formatAlphaScore,
  getValueColorClass,
} from '../../utils/formatters';

interface HoldingsTableProps {
  data: Stock[];
  maxRows?: number;
  onStockClick?: (stock: Stock) => void;
}

const columnHelper = createColumnHelper<Stock>();

export function HoldingsTable({
  data,
  maxRows,
  onStockClick,
}: HoldingsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'portfolioWeight', desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'rank',
        header: '#',
        cell: (info) => (
          <span className="text-gray-500 font-medium">
            {info.row.index + 1}
          </span>
        ),
        size: 50,
      }),
      columnHelper.accessor('ticker', {
        header: 'Ticker',
        cell: (info) => (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-terebinth-light flex items-center justify-center text-xs font-bold text-terebinth-primary">
              {info.getValue().substring(0, 2).toUpperCase()}
            </div>
            <span className="font-medium text-terebinth-dark">
              {info.getValue()}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor('name', {
        header: 'Name',
        cell: (info) => (
          <span className="text-gray-700 truncate max-w-[200px] block">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('country', {
        header: 'Country',
        cell: (info) => (
          <span className="text-gray-600">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('sector', {
        header: 'Sector',
        cell: (info) => (
          <span className="text-gray-600 text-sm">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('alphaScore', {
        header: 'Alpha Score',
        cell: (info) => (
          <span className="font-mono font-medium text-terebinth-dark">
            {formatAlphaScore(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor('portfolioWeight', {
        header: 'Port %',
        cell: (info) => (
          <span className="font-mono font-medium text-terebinth-dark">
            {formatPercent(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor('benchmarkWeight', {
        header: 'Bmk %',
        cell: (info) => (
          <span className="font-mono text-gray-500">
            {formatPercent(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor('activeWeight', {
        header: 'Active',
        cell: (info) => {
          const value = info.getValue();
          return (
            <span className={`font-mono font-medium ${getValueColorClass(value)}`}>
              {formatPercentWithSign(value)}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <button
            onClick={() => onStockClick?.(info.row.original)}
            className="p-1 text-gray-400 hover:text-terebinth-primary transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        ),
        size: 40,
      }),
    ],
    [onStockClick]
  );

  const tableData = useMemo(() => {
    // Filter out holdings with 0% portfolio weight
    let filteredData = data.filter((stock) => stock.portfolioWeight > 0);
    let sortedData = filteredData.sort(
      (a, b) => b.portfolioWeight - a.portfolioWeight
    );
    if (maxRows) {
      sortedData = sortedData.slice(0, maxRows);
    }
    return sortedData;
  }, [data, maxRows]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleExport = () => {
    const headers = ['Rank', 'Ticker', 'Name', 'Country', 'Sector', 'Alpha Score', 'Port %', 'Bmk %', 'Active'];
    const rows = tableData.map((stock, i) => [
      i + 1,
      stock.ticker,
      stock.name,
      stock.country,
      stock.sector,
      stock.alphaScore.toFixed(4),
      (stock.portfolioWeight * 100).toFixed(2),
      (stock.benchmarkWeight * 100).toFixed(2),
      (stock.activeWeight * 100).toFixed(2),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `holdings_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search holdings..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-terebinth-accent focus:border-transparent"
          />
        </div>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={
                      header.column.getCanSort()
                        ? 'cursor-pointer select-none hover:bg-gray-100'
                        : ''
                    }
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getCanSort() && (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-terebinth-light/30 cursor-pointer transition-colors"
                onClick={() => onStockClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          Showing {table.getRowModel().rows.length} of {data.length} holdings
        </span>
        <span>
          Total Portfolio Weight:{' '}
          <span className="font-medium text-terebinth-dark">
            {formatPercent(
              tableData.reduce((sum, s) => sum + s.portfolioWeight, 0)
            )}
          </span>
        </span>
      </div>
    </div>
  );
}
