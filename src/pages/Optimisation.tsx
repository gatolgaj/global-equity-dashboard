import { useState, useMemo, useCallback } from 'react';
import {
  Target,
  Activity,
  BarChart3,
  Crosshair,
  TrendingUp,
  Layers,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Sigma,
} from 'lucide-react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

// Initialize heatmap module
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const initHeatmap = async () => {
  const mod = await import('highcharts/modules/heatmap');
  const init = mod.default as unknown as ((h: typeof Highcharts) => void) | undefined;
  if (typeof init === 'function') init(Highcharts);
};
initHeatmap();
import { Card, KPICard } from '../components/ui/Card';
import {
  useOptimisationStore,
  type ScoreType,
  type OptStock,
  type SectorAllocation,
} from '../stores/optimisationStore';

// ─── Constants ──────────────────────────────────────────────────────────────
const SCORE_TYPES: ScoreType[] = [
  'Quality Sector',
  'Quality Broad',
  'Momentum Sector',
  'Momentum Broad',
  'Quality NSN',
  'Momentum NSN',
];

const SECTOR_COLORS: Record<string, string> = {
  'Banking': '#1E3A5F',
  'Consumer Disc': '#3182CE',
  'Consumer Staples': '#38A169',
  'Healthcare Services & Biopharm': '#D69E2E',
  'Industrials': '#DD6B20',
  'Insurance': '#E53E3E',
  'Investment Services': '#805AD5',
  'Mining': '#718096',
  'Precious Metals': '#D4AF37',
  'Real Estate': '#319795',
  'TMT': '#667EEA',
  'Gold': '#D4AF37',
  'Platinum and Precious Metals': '#A0AEC0',
  'Real Estate (RH)': '#319795',
  'Real Estate (SA)': '#2C7A7B',
  'Tech': '#4C51BF',
  'Telecommunications': '#6B46C1',
};

function getSectorColor(sector: string): string {
  return SECTOR_COLORS[sector] || '#A0AEC0';
}

const formatPct = (v: number, decimals = 2) =>
  `${(v * 100).toFixed(decimals)}%`;

const formatScore = (v: number) => v.toFixed(3);

// ─── Score Type Selector ────────────────────────────────────────────────────
function ScoreTypeSelector({
  value,
  onChange,
}: {
  value: ScoreType;
  onChange: (v: ScoreType) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-terebinth-accent transition-colors"
      >
        <Layers className="w-4 h-4 text-terebinth-primary" />
        <span className="text-sm font-medium text-gray-700">{value}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
            {SCORE_TYPES.map((st) => (
              <button
                key={st}
                onClick={() => {
                  onChange(st);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  st === value
                    ? 'bg-terebinth-light text-terebinth-primary font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sector Active Weights Chart ────────────────────────────────────────────
function SectorActiveWeightsChart({
  data,
}: {
  data: SectorAllocation[];
}) {
  const sorted = useMemo(
    () => [...data].sort((a, b) => b.activeWeight - a.activeWeight),
    [data]
  );

  const options: Highcharts.Options = {
    chart: {
      type: 'bar',
      height: 380,
      style: { fontFamily: 'Inter, sans-serif' },
      backgroundColor: 'transparent',
    },
    title: { text: undefined },
    xAxis: {
      categories: sorted.map((s) => s.sector),
      labels: {
        style: { fontSize: '11px', color: '#4A5568' },
      },
    },
    yAxis: {
      title: { text: 'Active Weight', style: { color: '#718096' } },
      labels: {
        formatter: function () {
          return `${(Number(this.value) * 100).toFixed(1)}%`;
        },
        style: { color: '#718096' },
      },
      plotLines: [
        {
          value: 0,
          color: '#A0AEC0',
          width: 1,
          zIndex: 3,
        },
      ],
    },
    tooltip: {
      formatter: function () {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ctx = this as any;
          const pt = ctx.point;
          return `<b>${ctx.x}</b><br/>
            Active: <b>${((ctx.y ?? 0) * 100).toFixed(2)}%</b><br/>
            Index: ${((pt?.indexWt ?? 0) * 100).toFixed(2)}%<br/>
            Optimal: ${((pt?.optWt ?? 0) * 100).toFixed(2)}%`;
        },
    },
    plotOptions: {
      bar: {
        borderRadius: 3,
        borderWidth: 0,
      },
    },
    series: [
      {
        name: 'Active Weight',
        type: 'bar',
        data: sorted.map((s) => ({
          y: s.activeWeight,
          color: s.activeWeight >= 0 ? '#38A169' : '#E53E3E',
          indexWt: s.indexWeight,
          optWt: s.optimalWeight,
        })),
      },
    ],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

// ─── Sector Allocation Grouped Bar ──────────────────────────────────────────
function SectorAllocationGrouped({
  data,
}: {
  data: SectorAllocation[];
}) {
  const sorted = useMemo(
    () => [...data].sort((a, b) => b.indexWeight - a.indexWeight),
    [data]
  );

  const options: Highcharts.Options = {
    chart: {
      type: 'bar',
      height: 400,
      style: { fontFamily: 'Inter, sans-serif' },
      backgroundColor: 'transparent',
    },
    title: { text: undefined },
    xAxis: {
      categories: sorted.map((s) => s.sector),
      labels: { style: { fontSize: '11px', color: '#4A5568' } },
    },
    yAxis: {
      title: { text: 'Weight', style: { color: '#718096' } },
      labels: {
        formatter: function () {
          return `${(Number(this.value) * 100).toFixed(0)}%`;
        },
        style: { color: '#718096' },
      },
    },
    tooltip: {
      shared: true,
      formatter: function () {
        const points = this.points || [];
        let s = `<b>${this.x}</b><br/>`;
        points.forEach((p) => {
          s += `${p.series.name}: <b>${((p.y ?? 0) * 100).toFixed(2)}%</b><br/>`;
        });
        return s;
      },
    },
    plotOptions: {
      bar: {
        groupPadding: 0.15,
        pointPadding: 0.05,
        borderRadius: 2,
        borderWidth: 0,
      },
    },
    series: [
      {
        name: 'Benchmark',
        type: 'bar',
        data: sorted.map((s) => s.indexWeight),
        color: '#CBD5E0',
      },
      {
        name: 'Optimal',
        type: 'bar',
        data: sorted.map((s) => s.optimalWeight),
        color: '#3182CE',
      },
    ],
    legend: {
      align: 'right',
      verticalAlign: 'top',
      floating: true,
      itemStyle: { fontSize: '11px', color: '#4A5568' },
    },
    credits: { enabled: false },
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

// ─── Score vs Weight Scatter ────────────────────────────────────────────────
function ScoreWeightScatter({
  stocks,
}: {
  stocks: OptStock[];
}) {
  const sectors = useMemo(() => {
    const sectorMap = new Map<string, OptStock[]>();
    stocks.forEach((s) => {
      const list = sectorMap.get(s.sector) || [];
      list.push(s);
      sectorMap.set(s.sector, list);
    });
    return sectorMap;
  }, [stocks]);

  const series: Highcharts.SeriesScatterOptions[] = Array.from(sectors.entries()).map(
    ([sector, sectorStocks]) => ({
      name: sector,
      type: 'scatter' as const,
      color: getSectorColor(sector),
      data: sectorStocks.map((s) => ({
        x: s.score,
        y: s.optimalWeight * 100,
        name: s.ticker,
        marker: {
          radius: Math.max(3, Math.min(12, Math.abs(s.activeWeight) * 400)),
        },
      })),
    })
  );

  const options: Highcharts.Options = {
    chart: {
      type: 'scatter',
      height: 420,
      style: { fontFamily: 'Inter, sans-serif' },
      backgroundColor: 'transparent',
      zooming: { type: 'xy' },
    },
    title: { text: undefined },
    xAxis: {
      title: { text: 'Score', style: { color: '#718096' } },
      gridLineWidth: 1,
      gridLineColor: '#EDF2F7',
      labels: { style: { color: '#718096' } },
      plotLines: [
        {
          value: 0,
          color: '#E2E8F0',
          width: 1,
          dashStyle: 'Dash',
        },
      ],
    },
    yAxis: {
      title: { text: 'Optimal Weight (%)', style: { color: '#718096' } },
      labels: { style: { color: '#718096' } },
    },
    tooltip: {
      formatter: function () {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ctx = this as any;
          const name = ctx.point?.name ?? '';
          return `<b>${name}</b> (${ctx.series.name})<br/>
            Score: <b>${(ctx.x ?? 0).toFixed(3)}</b><br/>
            Optimal Wt: <b>${(ctx.y ?? 0).toFixed(2)}%</b>`;
        },
    },
    plotOptions: {
      scatter: {
        marker: {
          symbol: 'circle',
          states: {
            hover: {
              enabled: true,
              lineColor: '#1E3A5F',
              lineWidth: 2,
            },
          },
        },
      },
    },
    legend: {
      layout: 'vertical',
      align: 'right',
      verticalAlign: 'middle',
      itemStyle: { fontSize: '10px', color: '#4A5568' },
      itemMarginBottom: 4,
    },
    series: series,
    credits: { enabled: false },
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

// ─── Top Active Positions Tornado ───────────────────────────────────────────
function TopActivePositions({
  stocks,
  topN = 15,
}: {
  stocks: OptStock[];
  topN?: number;
}) {
  const topStocks = useMemo(() => {
    return [...stocks]
      .sort((a, b) => Math.abs(b.activeWeight) - Math.abs(a.activeWeight))
      .slice(0, topN);
  }, [stocks, topN]);

  const sorted = useMemo(
    () => [...topStocks].sort((a, b) => b.activeWeight - a.activeWeight),
    [topStocks]
  );

  const options: Highcharts.Options = {
    chart: {
      type: 'bar',
      height: 450,
      style: { fontFamily: 'Inter, sans-serif' },
      backgroundColor: 'transparent',
    },
    title: { text: undefined },
    xAxis: {
      categories: sorted.map((s) => s.ticker),
      labels: {
        style: { fontSize: '11px', color: '#4A5568', fontWeight: '500' },
      },
    },
    yAxis: {
      title: { text: 'Active Weight', style: { color: '#718096' } },
      labels: {
        formatter: function () {
          return `${(Number(this.value) * 100).toFixed(1)}%`;
        },
        style: { color: '#718096' },
      },
      plotLines: [
        { value: 0, color: '#A0AEC0', width: 1, zIndex: 3 },
      ],
    },
    tooltip: {
      formatter: function () {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ctx = this as any;
          const pt = ctx.point;
          return `<b>${ctx.x}</b> (${pt?.sector ?? ''})<br/>
            Active: <b>${((ctx.y ?? 0) * 100).toFixed(2)}%</b><br/>
            Score: ${(pt?.score ?? 0).toFixed(3)}<br/>
            Benchmark: ${((pt?.bmkWt ?? 0) * 100).toFixed(2)}%<br/>
            Optimal: ${((pt?.optWt ?? 0) * 100).toFixed(2)}%`;
        },
    },
    plotOptions: {
      bar: {
        borderRadius: 3,
        borderWidth: 0,
        pointWidth: 18,
      },
    },
    series: [
      {
        name: 'Active Weight',
        type: 'bar',
        data: sorted.map((s) => ({
          y: s.activeWeight,
          color: s.activeWeight >= 0 ? '#38A169' : '#E53E3E',
          sector: s.sector,
          bmkWt: s.benchmarkWeight,
          optWt: s.optimalWeight,
          score: s.score,
        })),
      },
    ],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

// ─── Risk Contribution Chart (Sector-level) ─────────────────────────────────
function RiskContributionChart({
  stocks,
}: {
  stocks: OptStock[];
}) {
  // Approximate marginal risk contribution using weight * volatility
  const sectorRisk = useMemo(() => {
    const map = new Map<
      string,
      { sector: string; activeRisk: number; totalWeight: number }
    >();

    stocks.forEach((s) => {
      const cur = map.get(s.sector) || {
        sector: s.sector,
        activeRisk: 0,
        totalWeight: 0,
      };
      // Active risk contribution approximation: |active_weight| * volatility
      cur.activeRisk += Math.abs(s.activeWeight) * (s.volatility || 0.2);
      cur.totalWeight += Math.abs(s.activeWeight);
      map.set(s.sector, cur);
    });

    return Array.from(map.values()).sort(
      (a, b) => b.activeRisk - a.activeRisk
    );
  }, [stocks]);

  const total = sectorRisk.reduce((sum, s) => sum + s.activeRisk, 0);

  const options: Highcharts.Options = {
    chart: {
      type: 'column',
      height: 380,
      style: { fontFamily: 'Inter, sans-serif' },
      backgroundColor: 'transparent',
    },
    title: { text: undefined },
    xAxis: {
      categories: sectorRisk.map((s) => s.sector),
      labels: {
        rotation: -45,
        style: { fontSize: '10px', color: '#4A5568' },
      },
    },
    yAxis: {
      title: {
        text: 'Risk Contribution (%)',
        style: { color: '#718096' },
      },
      labels: {
        formatter: function () {
          return `${(total > 0
            ? (Number(this.value) / total) * 100
            : 0
          ).toFixed(0)}%`;
        },
        style: { color: '#718096' },
      },
    },
    tooltip: {
      formatter: function () {
        const pct = total > 0 ? ((this.y ?? 0) / total) * 100 : 0;
        return `<b>${this.x}</b><br/>
          Risk Contribution: <b>${pct.toFixed(1)}%</b>`;
      },
    },
    plotOptions: {
      column: {
        borderRadius: 4,
        borderWidth: 0,
        colorByPoint: true,
        colors: sectorRisk.map((s) => getSectorColor(s.sector)),
      },
    },
    series: [
      {
        name: 'Risk Contribution',
        type: 'column',
        data: sectorRisk.map((s) => s.activeRisk),
      },
    ],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

// ─── Efficient Frontier / Scenario Comparison ───────────────────────────────
function ScenarioComparisonChart() {
  const scenarios = useOptimisationStore((s) => s.scenarios);
  const selectedScoreType = useOptimisationStore((s) => s.selectedScoreType);

  const data = useMemo(() => {
    return Object.entries(scenarios).map(([label, scenario]) => ({
      label,
      score: scenario.stats.weightedScore,
      activeShare: scenario.stats.activeShare,
      numberOfStocks: scenario.stats.numberOfStocks,
      isSelected: label === selectedScoreType,
    }));
  }, [scenarios, selectedScoreType]);

  const options: Highcharts.Options = {
    chart: {
      type: 'scatter',
      height: 380,
      style: { fontFamily: 'Inter, sans-serif' },
      backgroundColor: 'transparent',
    },
    title: { text: undefined },
    xAxis: {
      title: {
        text: 'Active Share',
        style: { color: '#718096', fontWeight: '500' },
      },
      labels: {
        formatter: function () {
          return `${(Number(this.value) * 100).toFixed(0)}%`;
        },
        style: { color: '#718096' },
      },
      gridLineWidth: 1,
      gridLineColor: '#EDF2F7',
    },
    yAxis: {
      title: {
        text: 'Portfolio Score',
        style: { color: '#718096', fontWeight: '500' },
      },
      labels: { style: { color: '#718096' } },
    },
    tooltip: {
      formatter: function () {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ctx = this as any;
          const pt = ctx.point;
          return `<b>${pt?.label ?? ''}</b><br/>
            Score: <b>${(ctx.y ?? 0).toFixed(3)}</b><br/>
            Active Share: <b>${((ctx.x ?? 0) * 100).toFixed(1)}%</b><br/>
            Stocks: <b>${pt?.nStocks ?? 0}</b>`;
        },
    },
    plotOptions: {
      scatter: {
        marker: {
          symbol: 'circle',
          lineWidth: 2,
          lineColor: '#1E3A5F',
        },
        dataLabels: {
          enabled: true,
          formatter: function () {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ctx = this as any;
            return ctx.point?.label?.replace(/\s/g, '\n') || '';
          },
          style: {
            fontSize: '9px',
            color: '#4A5568',
            textOutline: '2px white',
          },
          y: -12,
        },
      },
    },
    series: [
      {
        name: 'Scenarios',
        type: 'scatter',
        data: data.map((d) => ({
          x: d.activeShare,
          y: d.score,
          label: d.label,
          nStocks: d.numberOfStocks,
          marker: {
            radius: d.isSelected ? 12 : 8,
            fillColor: d.isSelected ? '#1E3A5F' : '#3182CE',
            lineWidth: d.isSelected ? 3 : 1,
            lineColor: d.isSelected ? '#D4AF37' : '#1E3A5F',
          },
        })),
      },
    ],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

// ─── Risk Decomposition Heatmap ─────────────────────────────────────────────
function SectorFactorHeatmapChart({
  stocks,
}: {
  stocks: OptStock[];
}) {
  // Build sector-level metrics heatmap
  const heatmapData = useMemo(() => {
    const sectorMap = new Map<
      string,
      {
        avgScore: number;
        totalActive: number;
        count: number;
        avgVol: number;
        maxActive: number;
      }
    >();

    stocks.forEach((s) => {
      const cur = sectorMap.get(s.sector) || {
        avgScore: 0,
        totalActive: 0,
        count: 0,
        avgVol: 0,
        maxActive: 0,
      };
      cur.avgScore += s.score;
      cur.totalActive += s.activeWeight;
      cur.avgVol += s.volatility || 0.2;
      cur.count += 1;
      cur.maxActive = Math.max(cur.maxActive, Math.abs(s.activeWeight));
      sectorMap.set(s.sector, cur);
    });

    const sectors = Array.from(sectorMap.entries())
      .map(([sector, data]) => ({
        sector,
        avgScore: data.avgScore / data.count,
        totalActive: data.totalActive,
        avgVol: data.avgVol / data.count,
        count: data.count,
        maxActive: data.maxActive,
      }))
      .sort((a, b) => Math.abs(b.totalActive) - Math.abs(a.totalActive));

    return sectors;
  }, [stocks]);

  const metrics = ['Avg Score', 'Active Wt', 'Avg Vol', 'Count', 'Max Active'];

  const getValues = (
    d: (typeof heatmapData)[0],
    metric: string
  ): number => {
    switch (metric) {
      case 'Avg Score':
        return d.avgScore;
      case 'Active Wt':
        return d.totalActive;
      case 'Avg Vol':
        return d.avgVol;
      case 'Count':
        return d.count;
      case 'Max Active':
        return d.maxActive;
      default:
        return 0;
    }
  };

  // Build heatmap data points
  const points: Array<[number, number, number]> = [];
  heatmapData.forEach((d, yi) => {
    metrics.forEach((m, xi) => {
      points.push([xi, yi, getValues(d, m)]);
    });
  });

  const options: Highcharts.Options = {
    chart: {
      type: 'heatmap',
      height: 400,
      style: { fontFamily: 'Inter, sans-serif' },
      backgroundColor: 'transparent',
    },
    title: { text: undefined },
    xAxis: {
      categories: metrics,
      labels: { style: { fontSize: '11px', color: '#4A5568' } },
    },
    yAxis: {
      categories: heatmapData.map((d) => d.sector),
      title: { text: undefined },
      labels: { style: { fontSize: '11px', color: '#4A5568' } },
      reversed: true,
    },
    colorAxis: {
      min: -2,
      max: 2,
      stops: [
        [0, '#E53E3E'],
        [0.25, '#FC8181'],
        [0.5, '#FFFFFF'],
        [0.75, '#68D391'],
        [1, '#38A169'],
      ],
    },
    tooltip: {
      formatter: function () {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx = this as any;
        const pt = ctx.point;
        const xIdx = pt?.x ?? 0;
        const yIdx = pt?.y ?? 0;
        const val = pt?.value ?? 0;
        const xCats = ctx.series?.xAxis?.categories || [];
        const yCats = ctx.series?.yAxis?.categories || [];
        const xCat = xCats[xIdx] || '';
        const yCat = yCats[yIdx] || '';
        let formatted = val.toFixed(3);
        if (xCat === 'Active Wt' || xCat === 'Max Active')
          formatted = formatPct(val);
        if (xCat === 'Avg Vol') formatted = formatPct(val);
        if (xCat === 'Count') formatted = val.toFixed(0);
        return `<b>${yCat}</b><br/>${xCat}: <b>${formatted}</b>`;
      },
    },
    series: [
      {
        name: 'Sector Metrics',
        type: 'heatmap',
        data: points,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        dataLabels: {
          enabled: true,
          style: { fontSize: '10px', fontWeight: '400', textOutline: 'none' },
          formatter: function () {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ctx = this as any;
            const pt = ctx.point;
            const xIdx = pt?.x ?? 0;
            const val = pt?.value ?? 0;
            const xCats = ctx.series?.xAxis?.categories || [];
            const xCat = xCats[xIdx] || '';
            if (xCat === 'Count') return val.toFixed(0);
            if (xCat === 'Active Wt' || xCat === 'Max Active')
              return `${(val * 100).toFixed(1)}%`;
            if (xCat === 'Avg Vol') return `${(val * 100).toFixed(0)}%`;
            return val.toFixed(2);
          },
        },
      },
    ],
    legend: {
      align: 'right',
      layout: 'vertical',
      verticalAlign: 'middle',
    },
    credits: { enabled: false },
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

// ─── Holdings Table ─────────────────────────────────────────────────────────
function OptimisationHoldingsTable({
  stocks,
  showAll = false,
}: {
  stocks: OptStock[];
  showAll?: boolean;
}) {
  const [sortKey, setSortKey] = useState<keyof OptStock>('activeWeight');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showOnlyActive, setShowOnlyActive] = useState(true);

  const handleSort = useCallback(
    (key: keyof OptStock) => {
      if (key === sortKey) {
        setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
      } else {
        setSortKey(key);
        setSortDir('desc');
      }
    },
    [sortKey, sortDir]
  );

  const filtered = useMemo(() => {
    let list = [...stocks];
    if (showOnlyActive) {
      list = list.filter((s) => s.optimalWeight > 0.0001);
    }
    list.sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      const numA = typeof av === 'number' ? av : 0;
      const numB = typeof bv === 'number' ? bv : 0;
      return sortDir === 'asc' ? numA - numB : numB - numA;
    });
    return showAll ? list : list.slice(0, 25);
  }, [stocks, sortKey, sortDir, showOnlyActive, showAll]);

  const SortHeader = ({
    label,
    field,
  }: {
    label: string;
    field: keyof OptStock;
  }) => (
    <th
      className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === field && (
          <span className="text-terebinth-primary">
            {sortDir === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showOnlyActive}
            onChange={(e) => setShowOnlyActive(e.target.checked)}
            className="rounded border-gray-300 text-terebinth-primary focus:ring-terebinth-accent"
          />
          Active positions only
        </label>
        <span className="text-xs text-gray-400">
          {filtered.length} of {stocks.length} stocks
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <SortHeader label="Ticker" field="ticker" />
              <SortHeader label="Sector" field="sector" />
              <SortHeader label="Score" field="score" />
              <SortHeader label="Benchmark Wt" field="benchmarkWeight" />
              <SortHeader label="Optimal Wt" field="optimalWeight" />
              <SortHeader label="Active Wt" field="activeWeight" />
              {stocks[0]?.volatility !== undefined && (
                <SortHeader label="Volatility" field="volatility" />
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr
                key={s.ticker}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="px-3 py-2.5 font-medium text-terebinth-dark">
                  {s.ticker}
                </td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{
                        backgroundColor: getSectorColor(s.sector),
                      }}
                    />
                    <span className="text-gray-600 text-xs">{s.sector}</span>
                  </span>
                </td>
                <td className="px-3 py-2.5 tabular-nums font-medium">
                  <span
                    className={
                      s.score > 0
                        ? 'text-performance-positive'
                        : s.score < 0
                        ? 'text-performance-negative'
                        : 'text-gray-500'
                    }
                  >
                    {formatScore(s.score)}
                  </span>
                </td>
                <td className="px-3 py-2.5 tabular-nums text-gray-600">
                  {formatPct(s.benchmarkWeight)}
                </td>
                <td className="px-3 py-2.5 tabular-nums font-medium text-terebinth-dark">
                  {formatPct(s.optimalWeight)}
                </td>
                <td className="px-3 py-2.5 tabular-nums">
                  <span className="flex items-center gap-1">
                    {s.activeWeight > 0.0001 ? (
                      <ArrowUpRight className="w-3 h-3 text-performance-positive" />
                    ) : s.activeWeight < -0.0001 ? (
                      <ArrowDownRight className="w-3 h-3 text-performance-negative" />
                    ) : null}
                    <span
                      className={`font-medium ${
                        s.activeWeight > 0.0001
                          ? 'text-performance-positive'
                          : s.activeWeight < -0.0001
                          ? 'text-performance-negative'
                          : 'text-gray-400'
                      }`}
                    >
                      {s.activeWeight > 0 ? '+' : ''}
                      {formatPct(s.activeWeight)}
                    </span>
                  </span>
                </td>
                {s.volatility !== undefined && (
                  <td className="px-3 py-2.5 tabular-nums text-gray-600">
                    {formatPct(s.volatility, 1)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Constraint Summary Panel ───────────────────────────────────────────────
function ConstraintPanel() {
  const settings = useOptimisationStore((s) => s.optimiseSettings);

  const constraints = [
    { label: 'TE Target', value: formatPct(settings['TE Target'] || 0.03) },
    {
      label: 'Sector Active Limit',
      value: `±${formatPct(settings['Sector Active Limit'] || 0.04, 0)}`,
    },
    {
      label: 'Stock Weight Cap',
      value: formatPct(settings['Stock Weight Limit'] || 0.12, 0),
    },
    {
      label: 'Max 2-way Turnover',
      value: `${((settings['Max 2-way Turnover'] || 2) * 100).toFixed(0)}%`,
    },
    {
      label: 'Score Type',
      value: String(settings['Select Score Type'] || 'Quality NSN'),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {constraints.map((c) => (
        <div
          key={c.label}
          className="px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100"
        >
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            {c.label}
          </p>
          <p className="text-sm font-semibold text-terebinth-dark mt-0.5">
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Main Optimisation Page ─────────────────────────────────────────────────
export function Optimisation() {
  const selectedScoreType = useOptimisationStore((s) => s.selectedScoreType);
  const setScoreType = useOptimisationStore((s) => s.setScoreType);
  const currentScenario = useOptimisationStore((s) => s.currentScenario);
  const portfolioStats = useOptimisationStore((s) => s.portfolioStats);
  const stockData = useOptimisationStore((s) => s.stockData);
  const description = useOptimisationStore((s) => s.description);
  const [showAllHoldings, setShowAllHoldings] = useState(false);

  const stocks = currentScenario?.stocks || [];
  const sectorData = currentScenario?.sectorSummary || [];
  const scenarioStats = currentScenario?.stats;

  // Active positions count
  const activeCount = useMemo(
    () => stocks.filter((s) => s.optimalWeight > 0.0001).length,
    [stocks]
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-terebinth-dark">
            Portfolio Optimisation
          </h1>
          <p className="text-gray-500 mt-1 text-sm max-w-2xl">
            {description || 'Active risk management and portfolio optimisation dashboard'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-terebinth-light text-terebinth-primary text-xs font-medium rounded-full">
            30 Sep 2025
          </span>
          <ScoreTypeSelector
            value={selectedScoreType}
            onChange={setScoreType}
          />
        </div>
      </div>

      {/* Optimiser Constraints */}
      <Card title="Optimisation Constraints" subtitle="Active risk budget parameters">
        <ConstraintPanel />
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <KPICard
          label="Portfolio Score"
          value={portfolioStats.Score?.toFixed(3) || '-'}
          changeLabel="Weighted average"
          trend="up"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <KPICard
          label="Relative Score"
          value={portfolioStats['Relative Score']?.toFixed(3) || '-'}
          changeLabel="vs Benchmark"
          trend="up"
          icon={<Target className="w-5 h-5" />}
        />
        <KPICard
          label="Tracking Error"
          value={formatPct(portfolioStats['Tracking Error'] || 0)}
          changeLabel="Annualised"
          trend="neutral"
          icon={<Crosshair className="w-5 h-5" />}
        />
        <KPICard
          label="Portfolio Volatility"
          value={formatPct(portfolioStats.Volatility || 0, 1)}
          changeLabel="Annualised"
          trend="neutral"
          icon={<Activity className="w-5 h-5" />}
        />
        <KPICard
          label="Active Positions"
          value={activeCount}
          changeLabel={`of ${stocks.length} universe`}
          trend="neutral"
          icon={<BarChart3 className="w-5 h-5" />}
        />
        <KPICard
          label="Active Share"
          value={
            scenarioStats
              ? formatPct(scenarioStats.activeShare, 1)
              : '-'
          }
          changeLabel="Portfolio differentiation"
          trend="neutral"
          icon={<Sigma className="w-5 h-5" />}
        />
      </div>

      {/* Row 1: Scenario Comparison + Sector Active Weights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Scenario Comparison"
          subtitle="Score vs Active Share across all optimisation methods"
        >
          <ScenarioComparisonChart />
        </Card>
        <Card
          title="Sector Active Weights"
          subtitle="Over/underweight positions by sector"
        >
          <SectorActiveWeightsChart data={sectorData} />
        </Card>
      </div>

      {/* Row 2: Score vs Weight Scatter */}
      <Card
        title="Score vs Optimal Weight"
        subtitle="Bubble size represents active weight magnitude. Coloured by sector."
      >
        <ScoreWeightScatter stocks={stocks} />
      </Card>

      {/* Row 3: Sector Allocation + Top Active Positions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Sector Allocation"
          subtitle="Benchmark vs Optimal weights"
        >
          <SectorAllocationGrouped data={sectorData} />
        </Card>
        <Card
          title="Top Active Positions"
          subtitle="Largest overweight and underweight positions"
        >
          <TopActivePositions stocks={stocks} topN={15} />
        </Card>
      </div>

      {/* Row 4: Risk Contribution + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Sector Risk Contribution"
          subtitle="Estimated active risk contribution by sector"
        >
          <RiskContributionChart stocks={stockData} />
        </Card>
        <Card
          title="Sector Risk Decomposition"
          subtitle="Multi-factor analysis across sectors"
        >
          <SectorFactorHeatmapChart stocks={stocks} />
        </Card>
      </div>

      {/* Row 5: Scenario Metrics Comparison */}
      <Card title="Scenario Metrics Summary">
        <ScenarioMetricsTable />
      </Card>

      {/* Row 6: Holdings Table */}
      <Card
        title="Optimised Holdings"
        subtitle={`${selectedScoreType} — ${activeCount} active positions`}
        action={
          <button
            onClick={() => setShowAllHoldings(!showAllHoldings)}
            className="btn-ghost text-sm flex items-center gap-1"
          >
            {showAllHoldings ? 'Show Top 25' : 'View All'}
            <ArrowUpRight className="w-4 h-4" />
          </button>
        }
      >
        <OptimisationHoldingsTable
          stocks={stocks}
          showAll={showAllHoldings}
        />
      </Card>
    </div>
  );
}

// ─── Scenario Metrics Table ─────────────────────────────────────────────────
function ScenarioMetricsTable() {
  const scenarios = useOptimisationStore((s) => s.scenarios);
  const selectedScoreType = useOptimisationStore((s) => s.selectedScoreType);

  const rows = useMemo(() => {
    return Object.entries(scenarios).map(([label, scenario]) => ({
      label,
      ...scenario.stats,
      isSelected: label === selectedScoreType,
    }));
  }, [scenarios, selectedScoreType]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
              Score Type
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
              Weighted Score
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
              Active Share
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
              No. Stocks
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.label}
              className={`border-b border-gray-100 transition-colors ${
                r.isSelected
                  ? 'bg-terebinth-light font-medium'
                  : 'hover:bg-gray-50'
              }`}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {r.isSelected && (
                    <span className="w-2 h-2 rounded-full bg-terebinth-primary" />
                  )}
                  <span
                    className={
                      r.isSelected
                        ? 'text-terebinth-primary font-semibold'
                        : 'text-gray-700'
                    }
                  >
                    {r.label}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-medium text-terebinth-dark">
                {r.weightedScore.toFixed(3)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                {formatPct(r.activeShare, 1)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                {r.numberOfStocks}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
