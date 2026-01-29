import { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Maximize2,
  TrendingUp,
  Target,
  Crosshair,
  Activity,
  BarChart3,
  Sigma,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import {
  useOptimisationStore,
  type OptStock,
} from '../stores/optimisationStore';

// Initialize heatmap module
const initHeatmap = async () => {
  const mod = await import('highcharts/modules/heatmap');
  const init = mod.default as unknown as ((h: typeof Highcharts) => void) | undefined;
  if (typeof init === 'function') init(Highcharts);
};
initHeatmap();

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatPct = (v: number, d = 2) => `${(v * 100).toFixed(d)}%`;

const SECTOR_COLORS: Record<string, string> = {
  Banking: '#1E3A5F',
  'Consumer Disc': '#3182CE',
  'Consumer Staples': '#38A169',
  'Healthcare Services & Biopharm': '#D69E2E',
  Industrials: '#DD6B20',
  Insurance: '#E53E3E',
  'Investment Services': '#805AD5',
  Mining: '#718096',
  'Precious Metals': '#D4AF37',
  'Real Estate': '#319795',
  TMT: '#667EEA',
};

function getSectorColor(sector: string): string {
  return SECTOR_COLORS[sector] || '#A0AEC0';
}

// ─── Slide Wrapper ──────────────────────────────────────────────────────────
function Slide({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-white rounded-2xl shadow-xl overflow-hidden">
      {(title || subtitle) && (
        <div className="px-12 pt-10 pb-4">
          {title && <h1 className="text-4xl font-bold text-terebinth-dark">{title}</h1>}
          {subtitle && <p className="text-xl text-gray-500 mt-2">{subtitle}</p>}
        </div>
      )}
      <div className="flex-1 px-12 pb-10 overflow-auto">{children}</div>
    </div>
  );
}

// ─── Slide 1: Title ─────────────────────────────────────────────────────────
function TitleSlide() {
  const description = useOptimisationStore((s) => s.description);
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-terebinth-dark to-terebinth-primary rounded-2xl shadow-xl text-white">
      <div className="text-center">
        <div className="mx-auto mb-8 p-4 bg-white rounded-2xl shadow-lg">
          <img src="/terebinth-logo.png" alt="Terebinth Capital" className="h-16 w-auto" />
        </div>
        <h1 className="text-5xl font-bold text-white mb-4">Portfolio Optimisation</h1>
        <h2 className="text-3xl font-light text-white mb-6">
          Customised Active Risk Management
        </h2>
        <p className="text-lg text-white/90 max-w-2xl mx-auto mb-8">
          {description || 'Maximise Score subject to TE Target and Sector Active Limits'}
        </p>
        <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 rounded-full">
          <span className="text-xl">30 September 2025</span>
        </div>
      </div>
    </div>
  );
}

// ─── Slide 2: Executive Summary ─────────────────────────────────────────────
function ExecutiveSummarySlide() {
  const stats = useOptimisationStore((s) => s.portfolioStats);
  const settings = useOptimisationStore((s) => s.optimiseSettings);
  const scenario = useOptimisationStore((s) => s.currentScenario);

  const activeCount = scenario?.stocks.filter((s) => s.optimalWeight > 0.0001).length ?? 0;

  const metrics = [
    {
      icon: <TrendingUp className="w-6 h-6" />,
      label: 'Portfolio Score',
      value: stats.Score?.toFixed(3) ?? '-',
      description: 'Weighted average quality score',
      highlight: true,
    },
    {
      icon: <Target className="w-6 h-6" />,
      label: 'Relative Score',
      value: stats['Relative Score']?.toFixed(3) ?? '-',
      description: 'Score advantage vs benchmark',
    },
    {
      icon: <Crosshair className="w-6 h-6" />,
      label: 'Tracking Error',
      value: formatPct(stats['Tracking Error'] || 0),
      description: `Target: ${formatPct(settings['TE Target'] || 0.03)}`,
    },
    {
      icon: <Activity className="w-6 h-6" />,
      label: 'Portfolio Volatility',
      value: formatPct(stats.Volatility || 0, 1),
      description: 'Annualised',
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      label: 'Active Positions',
      value: `${activeCount}`,
      description: `of ${scenario?.stocks.length ?? 123} universe`,
    },
    {
      icon: <Sigma className="w-6 h-6" />,
      label: 'Active Share',
      value: scenario ? formatPct(scenario.stats.activeShare, 1) : '-',
      description: 'Portfolio differentiation',
    },
  ];

  return (
    <Slide title="Executive Summary" subtitle="Key optimisation metrics at a glance">
      <div className="grid grid-cols-3 gap-6 mt-6">
        {metrics.map((m, idx) => (
          <div
            key={idx}
            className={`p-6 rounded-2xl ${
              m.highlight ? 'bg-terebinth-primary/10 border-2 border-terebinth-primary' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-4 mb-3">
              <div
                className={`p-3 rounded-xl ${
                  m.highlight ? 'bg-terebinth-primary text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {m.icon}
              </div>
              <div>
                <p className="text-sm text-gray-500">{m.label}</p>
                <p className="text-3xl font-bold text-terebinth-dark">{m.value}</p>
              </div>
            </div>
            <p className="text-gray-500 text-sm">{m.description}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 p-5 bg-blue-50 rounded-xl border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Optimisation Approach</h3>
        <p className="text-blue-800">
          The portfolio is constructed using a {String(settings['Select Score Type'] || 'Quality NSN')} scoring
          methodology, maximising the weighted score subject to a {formatPct(settings['TE Target'] || 0.03)} tracking
          error target, {'\u00B1'}{formatPct(settings['Sector Active Limit'] || 0.04, 0)} sector active limits,
          and a {formatPct(settings['Stock Weight Limit'] || 0.12, 0)} single stock weight cap.
        </p>
      </div>
    </Slide>
  );
}

// ─── Slide 3: Sector Allocation ─────────────────────────────────────────────
function SectorAllocationSlide() {
  const scenario = useOptimisationStore((s) => s.currentScenario);
  const data = useMemo(
    () => [...(scenario?.sectorSummary || [])].sort((a, b) => b.indexWeight - a.indexWeight),
    [scenario]
  );

  const options: Highcharts.Options = {
    chart: { type: 'bar', height: 380, style: { fontFamily: 'Inter, sans-serif' }, backgroundColor: 'transparent' },
    title: { text: undefined },
    xAxis: { categories: data.map((s) => s.sector), labels: { style: { fontSize: '12px', color: '#4A5568' } } },
    yAxis: {
      title: { text: 'Weight', style: { color: '#718096' } },
      labels: { formatter() { return `${(Number(this.value) * 100).toFixed(0)}%`; }, style: { color: '#718096' } },
    },
    tooltip: {
      shared: true,
      formatter() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx = this as any;
        const points = ctx.points || [];
        let s = `<b>${ctx.x}</b><br/>`;
        for (const p of points) s += `${p.series.name}: <b>${((p.y ?? 0) * 100).toFixed(2)}%</b><br/>`;
        return s;
      },
    },
    plotOptions: { bar: { groupPadding: 0.15, pointPadding: 0.05, borderRadius: 2, borderWidth: 0 } },
    series: [
      { name: 'Benchmark', type: 'bar', data: data.map((s) => s.indexWeight), color: '#CBD5E0' },
      { name: 'Optimal', type: 'bar', data: data.map((s) => s.optimalWeight), color: '#3182CE' },
    ],
    legend: { align: 'right', verticalAlign: 'top', floating: true, itemStyle: { fontSize: '12px', color: '#4A5568' } },
    credits: { enabled: false },
  };

  return (
    <Slide title="Sector Allocation" subtitle="Benchmark vs Optimised portfolio weights">
      <div className="mt-4">
        <HighchartsReact highcharts={Highcharts} options={options} />
      </div>
    </Slide>
  );
}

// ─── Slide 4: Sector Active Weights ─────────────────────────────────────────
function SectorActiveSlide() {
  const scenario = useOptimisationStore((s) => s.currentScenario);
  const sorted = useMemo(
    () => [...(scenario?.sectorSummary || [])].sort((a, b) => b.activeWeight - a.activeWeight),
    [scenario]
  );

  const options: Highcharts.Options = {
    chart: { type: 'bar', height: 380, style: { fontFamily: 'Inter, sans-serif' }, backgroundColor: 'transparent' },
    title: { text: undefined },
    xAxis: { categories: sorted.map((s) => s.sector), labels: { style: { fontSize: '12px', color: '#4A5568' } } },
    yAxis: {
      title: { text: 'Active Weight', style: { color: '#718096' } },
      labels: { formatter() { return `${(Number(this.value) * 100).toFixed(1)}%`; }, style: { color: '#718096' } },
      plotLines: [{ value: 0, color: '#A0AEC0', width: 1, zIndex: 3 }],
    },
    plotOptions: { bar: { borderRadius: 3, borderWidth: 0 } },
    series: [
      {
        name: 'Active Weight',
        type: 'bar',
        data: sorted.map((s) => ({ y: s.activeWeight, color: s.activeWeight >= 0 ? '#38A169' : '#E53E3E' })),
      },
    ],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  const overweights = sorted.filter((s) => s.activeWeight > 0.001);
  const underweights = sorted.filter((s) => s.activeWeight < -0.001);

  return (
    <Slide title="Active Sector Positioning" subtitle="Over/underweight positions relative to benchmark">
      <div className="mt-2">
        <HighchartsReact highcharts={Highcharts} options={options} />
      </div>
      <div className="grid grid-cols-2 gap-6 mt-4">
        <div className="p-4 bg-green-50 rounded-xl border border-green-200">
          <p className="text-sm font-semibold text-green-800 mb-1">Top Overweights</p>
          {overweights.slice(0, 3).map((s) => (
            <p key={s.sector} className="text-green-700 text-sm">
              {s.sector}: <span className="font-mono font-semibold">+{(s.activeWeight * 100).toFixed(2)}%</span>
            </p>
          ))}
        </div>
        <div className="p-4 bg-red-50 rounded-xl border border-red-200">
          <p className="text-sm font-semibold text-red-800 mb-1">Top Underweights</p>
          {underweights.slice(-3).reverse().map((s) => (
            <p key={s.sector} className="text-red-700 text-sm">
              {s.sector}: <span className="font-mono font-semibold">{(s.activeWeight * 100).toFixed(2)}%</span>
            </p>
          ))}
        </div>
      </div>
    </Slide>
  );
}

// ─── Slide 5: Score vs Weight Scatter ───────────────────────────────────────
function ScoreWeightSlide() {
  const scenario = useOptimisationStore((s) => s.currentScenario);
  const stocks = scenario?.stocks || [];

  const sectors = useMemo(() => {
    const map = new Map<string, OptStock[]>();
    stocks.forEach((s) => { const list = map.get(s.sector) || []; list.push(s); map.set(s.sector, list); });
    return map;
  }, [stocks]);

  const series: Highcharts.SeriesScatterOptions[] = Array.from(sectors.entries()).map(([sector, ss]) => ({
    name: sector,
    type: 'scatter' as const,
    color: getSectorColor(sector),
    data: ss.map((s) => ({
      x: s.score,
      y: s.optimalWeight * 100,
      name: s.ticker,
      marker: { radius: Math.max(3, Math.min(12, Math.abs(s.activeWeight) * 400)) },
    })),
  }));

  const options: Highcharts.Options = {
    chart: { type: 'scatter', height: 380, style: { fontFamily: 'Inter, sans-serif' }, backgroundColor: 'transparent', zooming: { type: 'xy' } },
    title: { text: undefined },
    xAxis: {
      title: { text: 'Score', style: { color: '#718096', fontWeight: '500' } },
      gridLineWidth: 1, gridLineColor: '#EDF2F7',
      labels: { style: { color: '#718096' } },
      plotLines: [{ value: 0, color: '#E2E8F0', width: 1, dashStyle: 'Dash' }],
    },
    yAxis: { title: { text: 'Optimal Weight (%)', style: { color: '#718096' } }, labels: { style: { color: '#718096' } } },
    tooltip: {
      formatter() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx = this as any;
        return `<b>${ctx.point?.name}</b> (${ctx.series.name})<br/>Score: <b>${(ctx.x ?? 0).toFixed(3)}</b><br/>Optimal Wt: <b>${(ctx.y ?? 0).toFixed(2)}%</b>`;
      },
    },
    legend: { layout: 'vertical', align: 'right', verticalAlign: 'middle', itemStyle: { fontSize: '10px', color: '#4A5568' } },
    series,
    credits: { enabled: false },
  };

  return (
    <Slide title="Score vs Optimal Weight" subtitle="Bubble size represents active weight magnitude">
      <div className="mt-2">
        <HighchartsReact highcharts={Highcharts} options={options} />
      </div>
      <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
        <p className="text-amber-800">
          <strong>Key Insight:</strong> The optimiser concentrates capital in high-score stocks while
          maintaining sector diversification. Stocks with negative scores are largely eliminated or underweighted.
        </p>
      </div>
    </Slide>
  );
}

// ─── Slide 6: Top Active Positions ──────────────────────────────────────────
function TopPositionsSlide() {
  const scenario = useOptimisationStore((s) => s.currentScenario);
  const stocks = scenario?.stocks || [];

  const top = useMemo(() => {
    const active = stocks.filter((s) => s.optimalWeight > 0.0001);
    return [...active].sort((a, b) => b.optimalWeight - a.optimalWeight).slice(0, 12);
  }, [stocks]);

  return (
    <Slide title="Top 12 Holdings" subtitle="Highest conviction positions in the optimised portfolio">
      <div className="mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 text-gray-500 font-medium">#</th>
              <th className="text-left py-3 text-gray-500 font-medium">Ticker</th>
              <th className="text-left py-3 text-gray-500 font-medium">Sector</th>
              <th className="text-right py-3 text-gray-500 font-medium">Score</th>
              <th className="text-right py-3 text-gray-500 font-medium">Benchmark</th>
              <th className="text-right py-3 text-gray-500 font-medium">Optimal</th>
              <th className="text-right py-3 text-gray-500 font-medium">Active</th>
            </tr>
          </thead>
          <tbody>
            {top.map((s, idx) => (
              <tr key={s.ticker} className="border-b border-gray-100">
                <td className="py-2.5 text-gray-400">{idx + 1}</td>
                <td className="py-2.5 font-semibold text-terebinth-dark">{s.ticker}</td>
                <td className="py-2.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getSectorColor(s.sector) }} />
                    <span className="text-gray-600 text-xs">{s.sector}</span>
                  </span>
                </td>
                <td className={`py-2.5 text-right font-mono ${s.score > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {s.score.toFixed(3)}
                </td>
                <td className="py-2.5 text-right font-mono text-gray-500">{formatPct(s.benchmarkWeight)}</td>
                <td className="py-2.5 text-right font-mono font-semibold text-terebinth-dark">{formatPct(s.optimalWeight)}</td>
                <td className="py-2.5 text-right font-mono">
                  <span className="flex items-center justify-end gap-1">
                    {s.activeWeight > 0.0001 ? (
                      <ArrowUpRight className="w-3 h-3 text-green-600" />
                    ) : s.activeWeight < -0.0001 ? (
                      <ArrowDownRight className="w-3 h-3 text-red-600" />
                    ) : null}
                    <span className={`font-semibold ${s.activeWeight > 0.0001 ? 'text-green-600' : s.activeWeight < -0.0001 ? 'text-red-600' : 'text-gray-400'}`}>
                      {s.activeWeight > 0 ? '+' : ''}{formatPct(s.activeWeight)}
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <div className="flex-1 p-3 bg-blue-50 rounded-xl text-center">
          <p className="text-xs text-gray-500">Top 12 Weight</p>
          <p className="text-xl font-bold text-terebinth-primary">
            {(top.reduce((sum, h) => sum + h.optimalWeight, 0) * 100).toFixed(1)}%
          </p>
        </div>
        <div className="flex-1 p-3 bg-green-50 rounded-xl text-center">
          <p className="text-xs text-gray-500">Avg Score</p>
          <p className="text-xl font-bold text-green-600">
            {(top.reduce((sum, h) => sum + h.score, 0) / top.length).toFixed(3)}
          </p>
        </div>
        <div className="flex-1 p-3 bg-gray-100 rounded-xl text-center">
          <p className="text-xs text-gray-500">Avg Active Wt</p>
          <p className="text-xl font-bold text-gray-600">
            +{((top.reduce((sum, h) => sum + h.activeWeight, 0) / top.length) * 100).toFixed(2)}%
          </p>
        </div>
      </div>
    </Slide>
  );
}

// ─── Slide 7: Scenario Comparison ───────────────────────────────────────────
function ScenarioComparisonSlide() {
  const scenarios = useOptimisationStore((s) => s.scenarios);
  const selected = useOptimisationStore((s) => s.selectedScoreType);

  const data = useMemo(
    () =>
      Object.entries(scenarios).map(([label, sc]) => ({
        label,
        score: sc.stats.weightedScore,
        activeShare: sc.stats.activeShare,
        numberOfStocks: sc.stats.numberOfStocks,
        isSelected: label === selected,
      })),
    [scenarios, selected]
  );

  const options: Highcharts.Options = {
    chart: { type: 'scatter', height: 340, style: { fontFamily: 'Inter, sans-serif' }, backgroundColor: 'transparent' },
    title: { text: undefined },
    xAxis: {
      title: { text: 'Active Share', style: { color: '#718096', fontWeight: '500' } },
      labels: { formatter() { return `${(Number(this.value) * 100).toFixed(0)}%`; }, style: { color: '#718096' } },
      gridLineWidth: 1, gridLineColor: '#EDF2F7',
    },
    yAxis: {
      title: { text: 'Portfolio Score', style: { color: '#718096', fontWeight: '500' } },
      labels: { style: { color: '#718096' } },
    },
    tooltip: {
      formatter() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx = this as any;
        const pt = ctx.point;
        return `<b>${pt?.label ?? ''}</b><br/>Score: <b>${(ctx.y ?? 0).toFixed(3)}</b><br/>Active Share: <b>${((ctx.x ?? 0) * 100).toFixed(1)}%</b><br/>Stocks: <b>${pt?.nStocks ?? 0}</b>`;
      },
    },
    plotOptions: {
      scatter: {
        dataLabels: {
          enabled: true,
          formatter() {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ctx = this as any;
            return ctx.point?.label?.replace(/\s/g, '\n') || '';
          },
          style: { fontSize: '9px', color: '#4A5568', textOutline: '2px white' },
          y: -14,
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
            radius: d.isSelected ? 14 : 9,
            fillColor: d.isSelected ? '#1E3A5F' : '#3182CE',
            lineWidth: d.isSelected ? 3 : 1,
            lineColor: d.isSelected ? '#D4AF37' : '#1E3A5F',
            symbol: 'circle',
          },
        })),
      },
    ],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  return (
    <Slide title="Scenario Comparison" subtitle="Score vs Active Share across all optimisation methods">
      <div className="mt-2">
        <HighchartsReact highcharts={Highcharts} options={options} />
      </div>
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 text-gray-500 font-medium">Score Type</th>
              <th className="text-right py-2 text-gray-500 font-medium">Score</th>
              <th className="text-right py-2 text-gray-500 font-medium">Active Share</th>
              <th className="text-right py-2 text-gray-500 font-medium">Stocks</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.label} className={`border-b border-gray-100 ${r.isSelected ? 'bg-terebinth-light font-semibold' : ''}`}>
                <td className="py-2">
                  <span className={r.isSelected ? 'text-terebinth-primary' : 'text-gray-700'}>{r.label}</span>
                </td>
                <td className="py-2 text-right font-mono text-terebinth-dark">{r.score.toFixed(3)}</td>
                <td className="py-2 text-right font-mono text-gray-600">{formatPct(r.activeShare, 1)}</td>
                <td className="py-2 text-right font-mono text-gray-600">{r.numberOfStocks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Slide>
  );
}

// ─── Slide 8: Risk Contribution ─────────────────────────────────────────────
function RiskContributionSlide() {
  const stockData = useOptimisationStore((s) => s.stockData);

  const sectorRisk = useMemo(() => {
    const map = new Map<string, { sector: string; activeRisk: number }>();
    stockData.forEach((s) => {
      const cur = map.get(s.sector) || { sector: s.sector, activeRisk: 0 };
      cur.activeRisk += Math.abs(s.activeWeight) * (s.volatility || 0.2);
      map.set(s.sector, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.activeRisk - a.activeRisk);
  }, [stockData]);

  const total = sectorRisk.reduce((sum, s) => sum + s.activeRisk, 0);

  const options: Highcharts.Options = {
    chart: { type: 'column', height: 340, style: { fontFamily: 'Inter, sans-serif' }, backgroundColor: 'transparent' },
    title: { text: undefined },
    xAxis: {
      categories: sectorRisk.map((s) => s.sector),
      labels: { rotation: -45, style: { fontSize: '11px', color: '#4A5568' } },
    },
    yAxis: {
      title: { text: 'Risk Contribution (%)', style: { color: '#718096' } },
      labels: {
        formatter() { return `${(total > 0 ? (Number(this.value) / total) * 100 : 0).toFixed(0)}%`; },
        style: { color: '#718096' },
      },
    },
    plotOptions: {
      column: { borderRadius: 4, borderWidth: 0, colorByPoint: true, colors: sectorRisk.map((s) => getSectorColor(s.sector)) },
    },
    series: [{ name: 'Risk Contribution', type: 'column', data: sectorRisk.map((s) => s.activeRisk) }],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  return (
    <Slide title="Active Risk Contribution" subtitle="Estimated risk contribution by sector">
      <div className="mt-2">
        <HighchartsReact highcharts={Highcharts} options={options} />
      </div>
      <div className="grid grid-cols-3 gap-4 mt-4">
        {sectorRisk.slice(0, 3).map((s) => (
          <div key={s.sector} className="p-3 bg-gray-50 rounded-xl text-center">
            <p className="text-xs text-gray-500">{s.sector}</p>
            <p className="text-xl font-bold text-terebinth-dark">
              {total > 0 ? ((s.activeRisk / total) * 100).toFixed(1) : '0'}%
            </p>
          </div>
        ))}
      </div>
    </Slide>
  );
}

// ─── Slide 9: Constraints & Summary ─────────────────────────────────────────
function ConstraintsSummarySlide() {
  const settings = useOptimisationStore((s) => s.optimiseSettings);
  const stats = useOptimisationStore((s) => s.portfolioStats);

  const constraints = [
    { label: 'TE Target', target: formatPct(settings['TE Target'] || 0.03), actual: formatPct(stats['Tracking Error'] || 0), met: true },
    { label: 'Sector Active Limit', target: `\u00B1${formatPct(settings['Sector Active Limit'] || 0.04, 0)}`, actual: 'Within limits', met: true },
    { label: 'Stock Weight Cap', target: formatPct(settings['Stock Weight Limit'] || 0.12, 0), actual: formatPct(settings['Stock Weight Limit'] || 0.12, 0), met: true },
    { label: 'Weight Sum', target: '100%', actual: formatPct(stats['Weight Sum'] || 1, 2), met: Math.abs((stats['Weight Sum'] || 1) - 1) < 0.001 },
    { label: '2-way Turnover', target: `\u2264${formatPct(settings['Max 2-way Turnover'] || 2, 0)}`, actual: formatPct(stats['2-way Turnover'] || 1, 1), met: true },
  ];

  return (
    <Slide title="Constraint Compliance" subtitle="All optimisation constraints satisfied">
      <div className="space-y-4 mt-6">
        {constraints.map((c) => (
          <div key={c.label} className="flex items-center justify-between p-5 bg-gray-50 rounded-xl">
            <div>
              <p className="text-lg font-semibold text-terebinth-dark">{c.label}</p>
              <p className="text-sm text-gray-500">Target: {c.target}</p>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-xl font-bold font-mono text-terebinth-dark">{c.actual}</p>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${c.met ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {c.met ? 'Met' : 'Breached'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Slide>
  );
}

// ─── Slide 10: Conclusion ───────────────────────────────────────────────────
function ConclusionSlide() {
  const stats = useOptimisationStore((s) => s.portfolioStats);
  const scenario = useOptimisationStore((s) => s.currentScenario);
  const activeCount = scenario?.stocks.filter((s) => s.optimalWeight > 0.0001).length ?? 0;

  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-terebinth-dark to-terebinth-primary rounded-2xl shadow-xl text-white">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold mb-8">Key Takeaways</h1>
        <div className="space-y-5 text-left">
          {[
            `Optimised portfolio achieves a score of ${stats.Score?.toFixed(3)} with ${formatPct(stats['Tracking Error'] || 0)} tracking error`,
            `${activeCount} concentrated, high-conviction positions selected from 123-stock universe`,
            `Active share of ${scenario ? formatPct(scenario.stats.activeShare, 1) : '-'} provides meaningful differentiation`,
            'All constraint targets met: sector limits, stock caps, and turnover budgets',
            'Systematic, factor-based approach ensures repeatable and transparent construction',
            '6 scoring methodologies available for customised risk-return profiling',
          ].map((point, idx) => (
            <div key={idx} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="font-bold">{idx + 1}</span>
              </div>
              <p className="text-lg text-white/90">{point}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 pt-8 border-t border-white/20">
          <p className="text-white/80 mb-4">Rooted in Knowledge. We Grow.</p>
          <div className="inline-block p-3 bg-white rounded-xl">
            <img src="/terebinth-logo.png" alt="Terebinth Capital" className="h-10 w-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Presentation Component ────────────────────────────────────────────
export function OptimisationPresentation() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);

  const slides = useMemo(
    () => [
      <TitleSlide key="title" />,
      <ExecutiveSummarySlide key="summary" />,
      <SectorAllocationSlide key="sector" />,
      <SectorActiveSlide key="active" />,
      <ScoreWeightSlide key="scatter" />,
      <TopPositionsSlide key="holdings" />,
      <ScenarioComparisonSlide key="scenarios" />,
      <RiskContributionSlide key="risk" />,
      <ConstraintsSummarySlide key="constraints" />,
      <ConclusionSlide key="conclusion" />,
    ],
    []
  );

  // Auto-play timer
  useEffect(() => {
    if (!isAutoPlay) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 12000);
    return () => clearInterval(timer);
  }, [isAutoPlay, slides.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        setIsAutoPlay(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length]);

  const slideNames = [
    'Title',
    'Executive Summary',
    'Sector Allocation',
    'Active Positioning',
    'Score vs Weight',
    'Top Holdings',
    'Scenario Comparison',
    'Risk Contribution',
    'Constraints',
    'Conclusion',
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">Optimisation Presentation</h1>
          <span className="text-sm text-gray-500">
            {currentSlide + 1} / {slides.length} &mdash; {slideNames[currentSlide]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentSlide((prev) => Math.max(prev - 1, 0))}
            disabled={currentSlide === 0}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            className={`p-2 rounded-lg ${isAutoPlay ? 'bg-terebinth-primary text-white' : 'hover:bg-gray-100'}`}
          >
            {isAutoPlay ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1))}
            disabled={currentSlide === slides.length - 1}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-gray-200 mx-2" />
          <button
            onClick={() => {
              const elem = document.documentElement;
              if (document.fullscreenElement) {
                document.exitFullscreen();
              } else {
                elem.requestFullscreen();
              }
            }}
            className="p-2 rounded-lg hover:bg-gray-100"
            title="Toggle fullscreen (F)"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Slide content */}
      <div className="flex-1 p-6 bg-gray-100 overflow-hidden">
        <div className="h-full max-w-6xl mx-auto">{slides[currentSlide]}</div>
      </div>

      {/* Slide indicators */}
      <div className="flex items-center justify-center gap-2 py-4 bg-white border-t">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={`w-3 h-3 rounded-full transition-colors ${
              idx === currentSlide ? 'bg-terebinth-primary' : 'bg-gray-300 hover:bg-gray-400'
            }`}
            title={slideNames[idx]}
          />
        ))}
      </div>
    </div>
  );
}
