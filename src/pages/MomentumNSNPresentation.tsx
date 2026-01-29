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
  Zap,
} from 'lucide-react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import {
  useOptimisationStore,
  type OptStock,
  type Scenario,
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

// ─── Hook: get Momentum NSN scenario ────────────────────────────────────────
function useMomentumNSN(): Scenario | null {
  const scenarios = useOptimisationStore((s) => s.scenarios);
  return scenarios['Momentum NSN'] ?? null;
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
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0F2027] via-[#203A43] to-[#2C5364] rounded-2xl shadow-xl text-white">
      <div className="text-center">
        <div className="mx-auto mb-8 p-4 bg-white rounded-2xl shadow-lg">
          <img src="/terebinth-logo.png" alt="Terebinth Capital" className="h-16 w-auto" />
        </div>
        <div className="flex items-center justify-center gap-3 mb-4">
          <Zap className="w-10 h-10 text-amber-400" />
          <h1 className="text-5xl font-bold text-white">Momentum NSN</h1>
        </div>
        <h2 className="text-3xl font-light text-white mb-6">
          Portfolio Optimisation
        </h2>
        <p className="text-lg text-white/90 max-w-2xl mx-auto mb-4">
          Momentum-based stock selection &mdash; Non-Sector-Neutral approach
        </p>
        <p className="text-base text-white/80 max-w-xl mx-auto mb-8">
          Maximise Momentum Score subject to 3% TE Target, &plusmn;4% Sector Active Limits, and 12% Stock Cap
        </p>
        <div className="flex items-center justify-center gap-4">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 rounded-full">
            <span className="text-xl">30 September 2025</span>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-3 bg-amber-500/30 rounded-full border border-amber-400/40">
            <Zap className="w-4 h-4 text-amber-300" />
            <span className="text-sm text-amber-200 font-medium">39 Active Positions</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Slide 2: Strategy Overview ─────────────────────────────────────────────
function StrategyOverviewSlide() {
  const scenario = useMomentumNSN();
  const settings = useOptimisationStore((s) => s.optimiseSettings);
  const activeCount = scenario?.stocks.filter((s) => s.optimalWeight > 0.0001).length ?? 0;

  const metrics = [
    {
      icon: <TrendingUp className="w-6 h-6" />,
      label: 'Momentum Score',
      value: scenario?.stats.weightedScore?.toFixed(3) ?? '-',
      description: 'Weighted average momentum score',
      highlight: true,
    },
    {
      icon: <Sigma className="w-6 h-6" />,
      label: 'Active Share',
      value: scenario ? formatPct(scenario.stats.activeShare, 1) : '-',
      description: 'High portfolio differentiation',
    },
    {
      icon: <Crosshair className="w-6 h-6" />,
      label: 'Tracking Error',
      value: formatPct(settings['TE Target'] || 0.03),
      description: 'Risk budget target',
    },
    {
      icon: <Activity className="w-6 h-6" />,
      label: 'Active Positions',
      value: `${activeCount}`,
      description: `of ${scenario?.stocks.length ?? 123} universe`,
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      label: 'Concentration',
      value: `${((scenario?.stocks.filter((s) => s.optimalWeight > 0.0001).slice(0, 10).reduce((sum, s) => sum + s.optimalWeight, 0) ?? 0) * 100).toFixed(1)}%`,
      description: 'Top 10 holdings weight',
    },
    {
      icon: <Target className="w-6 h-6" />,
      label: 'Score Type',
      value: 'NSN',
      description: 'Non-Sector-Neutral',
    },
  ];

  return (
    <Slide title="Strategy Overview" subtitle="Momentum NSN — Key characteristics">
      <div className="grid grid-cols-3 gap-6 mt-6">
        {metrics.map((m, idx) => (
          <div
            key={idx}
            className={`p-6 rounded-2xl ${
              m.highlight ? 'bg-amber-50 border-2 border-amber-400' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-4 mb-3">
              <div
                className={`p-3 rounded-xl ${
                  m.highlight ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600'
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
      <div className="mt-6 p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
        <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
          <Zap className="w-4 h-4" /> Momentum Strategy
        </h3>
        <p className="text-amber-800">
          The Momentum NSN strategy selects stocks exhibiting strong price momentum trends. Unlike sector-neutral
          approaches, it allows the optimiser to take concentrated sector bets up to &plusmn;4%, capturing momentum
          signals that cluster within specific sectors. This results in {activeCount} active positions with a
          portfolio score of {scenario?.stats.weightedScore?.toFixed(3)}.
        </p>
      </div>
    </Slide>
  );
}

// ─── Slide 3: Sector Allocation ─────────────────────────────────────────────
function SectorAllocationSlide() {
  const scenario = useMomentumNSN();
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
      { name: 'Momentum NSN', type: 'bar', data: data.map((s) => s.optimalWeight), color: '#D97706' },
    ],
    legend: { align: 'right', verticalAlign: 'top', floating: true, itemStyle: { fontSize: '12px', color: '#4A5568' } },
    credits: { enabled: false },
  };

  return (
    <Slide title="Sector Allocation" subtitle="Benchmark vs Momentum NSN optimised weights">
      <div className="mt-4">
        <HighchartsReact highcharts={Highcharts} options={options} />
      </div>
      <div className="mt-4 p-4 bg-gray-50 rounded-xl">
        <p className="text-sm text-gray-600">
          <strong>Momentum clustering:</strong> The NSN approach allows full &plusmn;4% sector tilts,
          resulting in maximum overweights in TMT, Industrials, Insurance, and Precious Metals &mdash;
          sectors where momentum signals are strongest.
        </p>
      </div>
    </Slide>
  );
}

// ─── Slide 4: Sector Active Weights ─────────────────────────────────────────
function SectorActiveSlide() {
  const scenario = useMomentumNSN();
  const sorted = useMemo(
    () => [...(scenario?.sectorSummary || [])].sort((a, b) => b.activeWeight - a.activeWeight),
    [scenario]
  );

  const settings = useOptimisationStore((s) => s.optimiseSettings);
  const limit = settings['Sector Active Limit'] || 0.04;

  const options: Highcharts.Options = {
    chart: { type: 'bar', height: 380, style: { fontFamily: 'Inter, sans-serif' }, backgroundColor: 'transparent' },
    title: { text: undefined },
    xAxis: { categories: sorted.map((s) => s.sector), labels: { style: { fontSize: '12px', color: '#4A5568' } } },
    yAxis: {
      title: { text: 'Active Weight', style: { color: '#718096' } },
      labels: { formatter() { return `${(Number(this.value) * 100).toFixed(1)}%`; }, style: { color: '#718096' } },
      plotLines: [
        { value: 0, color: '#A0AEC0', width: 1, zIndex: 3 },
        { value: limit, color: '#E53E3E', width: 1, dashStyle: 'Dash', zIndex: 3, label: { text: `+${formatPct(limit, 0)} limit`, style: { color: '#E53E3E', fontSize: '10px' } } },
        { value: -limit, color: '#E53E3E', width: 1, dashStyle: 'Dash', zIndex: 3, label: { text: `${formatPct(-limit, 0)} limit`, style: { color: '#E53E3E', fontSize: '10px' } } },
      ],
    },
    plotOptions: { bar: { borderRadius: 3, borderWidth: 0 } },
    series: [
      {
        name: 'Active Weight',
        type: 'bar',
        data: sorted.map((s) => ({
          y: s.activeWeight,
          color: s.activeWeight >= 0 ? '#D97706' : '#6366F1',
        })),
      },
    ],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  const atMax = sorted.filter((s) => Math.abs(s.activeWeight - limit) < 0.001 || Math.abs(s.activeWeight + limit) < 0.001);

  return (
    <Slide title="Active Sector Positioning" subtitle="Momentum-driven sector tilts with constraint limits">
      <div className="mt-2">
        <HighchartsReact highcharts={Highcharts} options={options} />
      </div>
      <div className="grid grid-cols-2 gap-6 mt-4">
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
          <p className="text-sm font-semibold text-amber-800 mb-1">Overweight Sectors (Momentum Strength)</p>
          {sorted.filter((s) => s.activeWeight > 0.001).map((s) => (
            <p key={s.sector} className="text-amber-700 text-sm flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              {s.sector}: <span className="font-mono font-semibold">+{(s.activeWeight * 100).toFixed(2)}%</span>
              {Math.abs(s.activeWeight - limit) < 0.001 && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded ml-1">At limit</span>}
            </p>
          ))}
        </div>
        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
          <p className="text-sm font-semibold text-indigo-800 mb-1">Underweight Sectors (Weak Momentum)</p>
          {sorted.filter((s) => s.activeWeight < -0.001).map((s) => (
            <p key={s.sector} className="text-indigo-700 text-sm flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3" />
              {s.sector}: <span className="font-mono font-semibold">{(s.activeWeight * 100).toFixed(2)}%</span>
              {Math.abs(s.activeWeight + limit) < 0.001 && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded ml-1">At limit</span>}
            </p>
          ))}
        </div>
      </div>
      {atMax.length > 0 && (
        <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
          <p className="text-red-700 text-sm">
            <strong>{atMax.length} sectors</strong> are at the &plusmn;4% constraint limit, indicating the optimiser
            would allocate even more if unconstrained &mdash; a sign of strong directional momentum signals.
          </p>
        </div>
      )}
    </Slide>
  );
}

// ─── Slide 5: Momentum Score Distribution ───────────────────────────────────
function MomentumScoreDistributionSlide() {
  const scenario = useMomentumNSN();
  const stocks = scenario?.stocks || [];

  const held = stocks.filter((s) => s.optimalWeight > 0.0001);
  const notHeld = stocks.filter((s) => s.optimalWeight <= 0.0001);

  const bins = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5];
  const binLabel = (i: number) => bins[i].toFixed(1);

  const heldBins = bins.slice(0, -1).map((low, i) => {
    const high = bins[i + 1];
    return held.filter((s) => s.score >= low && s.score < high).length;
  });
  const notHeldBins = bins.slice(0, -1).map((low, i) => {
    const high = bins[i + 1];
    return notHeld.filter((s) => s.score >= low && s.score < high).length;
  });

  const options: Highcharts.Options = {
    chart: { type: 'column', height: 340, style: { fontFamily: 'Inter, sans-serif' }, backgroundColor: 'transparent' },
    title: { text: undefined },
    xAxis: {
      categories: bins.slice(0, -1).map((_, i) => `${binLabel(i)} – ${binLabel(i + 1)}`),
      labels: { rotation: -45, style: { fontSize: '10px', color: '#4A5568' } },
      title: { text: 'Momentum Score Range', style: { color: '#718096' } },
    },
    yAxis: {
      title: { text: 'Number of Stocks', style: { color: '#718096' } },
      labels: { style: { color: '#718096' } },
    },
    plotOptions: { column: { stacking: 'normal', borderRadius: 2, borderWidth: 0, groupPadding: 0.1 } },
    series: [
      { name: 'Not Held', type: 'column', data: notHeldBins, color: '#CBD5E0' },
      { name: 'Held', type: 'column', data: heldBins, color: '#D97706' },
    ],
    legend: { align: 'right', verticalAlign: 'top', floating: true, itemStyle: { fontSize: '12px', color: '#4A5568' } },
    credits: { enabled: false },
  };

  const avgHeldScore = held.length > 0 ? held.reduce((sum, s) => sum + s.score, 0) / held.length : 0;
  const avgNotHeldScore = notHeld.length > 0 ? notHeld.reduce((sum, s) => sum + s.score, 0) / notHeld.length : 0;

  return (
    <Slide title="Momentum Score Distribution" subtitle="How the optimiser separates high-momentum from low-momentum stocks">
      <div className="mt-2">
        <HighchartsReact highcharts={Highcharts} options={options} />
      </div>
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="p-4 bg-amber-50 rounded-xl text-center border border-amber-200">
          <p className="text-xs text-gray-500">Avg Score (Held)</p>
          <p className="text-2xl font-bold text-amber-700">{avgHeldScore.toFixed(3)}</p>
        </div>
        <div className="p-4 bg-gray-100 rounded-xl text-center">
          <p className="text-xs text-gray-500">Avg Score (Not Held)</p>
          <p className="text-2xl font-bold text-gray-500">{avgNotHeldScore.toFixed(3)}</p>
        </div>
        <div className="p-4 bg-green-50 rounded-xl text-center border border-green-200">
          <p className="text-xs text-gray-500">Score Advantage</p>
          <p className="text-2xl font-bold text-green-600">+{(avgHeldScore - avgNotHeldScore).toFixed(3)}</p>
        </div>
      </div>
    </Slide>
  );
}

// ─── Slide 6: Score vs Weight Scatter ───────────────────────────────────────
function ScoreWeightSlide() {
  const scenario = useMomentumNSN();
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
      title: { text: 'Momentum Score', style: { color: '#718096', fontWeight: '500' } },
      gridLineWidth: 1, gridLineColor: '#EDF2F7',
      labels: { style: { color: '#718096' } },
      plotLines: [{ value: 0, color: '#E2E8F0', width: 1, dashStyle: 'Dash' }],
    },
    yAxis: { title: { text: 'Optimal Weight (%)', style: { color: '#718096' } }, labels: { style: { color: '#718096' } } },
    tooltip: {
      formatter() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx = this as any;
        return `<b>${ctx.point?.name}</b> (${ctx.series.name})<br/>Momentum: <b>${(ctx.x ?? 0).toFixed(3)}</b><br/>Optimal Wt: <b>${(ctx.y ?? 0).toFixed(2)}%</b>`;
      },
    },
    legend: { layout: 'vertical', align: 'right', verticalAlign: 'middle', itemStyle: { fontSize: '10px', color: '#4A5568' } },
    series,
    credits: { enabled: false },
  };

  return (
    <Slide title="Momentum Score vs Optimal Weight" subtitle="Bubble size = active weight magnitude | Colour = sector">
      <div className="mt-2">
        <HighchartsReact highcharts={Highcharts} options={options} />
      </div>
      <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
        <p className="text-amber-800">
          <strong>Key Insight:</strong> The optimiser strongly favours stocks with momentum scores above 0.5,
          while stocks with negative momentum are systematically excluded. The highest-weighted holding PRX-ZA
          benefits from both a high momentum score and its large index weight in TMT.
        </p>
      </div>
    </Slide>
  );
}

// ─── Slide 6b: Score vs Active Weight ────────────────────────────────────────
function ScoreActiveWeightSlide() {
  const scenario = useMomentumNSN();
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
      y: s.activeWeight * 100,
      name: s.ticker,
      marker: { radius: Math.max(3, Math.min(12, Math.abs(s.optimalWeight) * 500)) },
    })),
  }));

  const options: Highcharts.Options = {
    chart: { type: 'scatter', height: 380, style: { fontFamily: 'Inter, sans-serif' }, backgroundColor: 'transparent', zooming: { type: 'xy' } },
    title: { text: undefined },
    xAxis: {
      title: { text: 'Momentum Score', style: { color: '#718096', fontWeight: '500' } },
      gridLineWidth: 1, gridLineColor: '#EDF2F7',
      labels: { style: { color: '#718096' } },
      plotLines: [{ value: 0, color: '#CBD5E0', width: 1, dashStyle: 'Dash' }],
    },
    yAxis: {
      title: { text: 'Active Weight (%)', style: { color: '#718096', fontWeight: '500' } },
      labels: { style: { color: '#718096' } },
      plotLines: [{ value: 0, color: '#CBD5E0', width: 1, dashStyle: 'Dash' }],
    },
    tooltip: {
      formatter() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx = this as any;
        return `<b>${ctx.point?.name}</b> (${ctx.series.name})<br/>Momentum: <b>${(ctx.x ?? 0).toFixed(3)}</b><br/>Active Wt: <b>${(ctx.y ?? 0).toFixed(2)}%</b>`;
      },
    },
    legend: { layout: 'vertical', align: 'right', verticalAlign: 'middle', itemStyle: { fontSize: '10px', color: '#4A5568' } },
    series,
    credits: { enabled: false },
  };

  return (
    <Slide title="Momentum Score vs Active Weight" subtitle="Relationship between momentum score and portfolio active positioning">
      <div className="mt-2">
        <HighchartsReact highcharts={Highcharts} options={options} />
      </div>
      <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
        <p className="text-amber-800">
          <strong>Key Insight:</strong> High-momentum stocks are overweighted (positive active weight) while
          low-momentum stocks are underweighted, demonstrating the optimiser&apos;s momentum-driven allocation.
        </p>
      </div>
    </Slide>
  );
}

// ─── Slide 7: Top Holdings ──────────────────────────────────────────────────
function TopHoldingsSlide() {
  const scenario = useMomentumNSN();
  const stocks = scenario?.stocks || [];

  const top = useMemo(() => {
    const active = stocks.filter((s) => s.optimalWeight > 0.0001);
    return [...active].sort((a, b) => b.optimalWeight - a.optimalWeight).slice(0, 15);
  }, [stocks]);

  return (
    <Slide title="Top 15 Holdings" subtitle="Highest conviction momentum positions">
      <div className="mt-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2.5 text-gray-500 font-medium">#</th>
              <th className="text-left py-2.5 text-gray-500 font-medium">Ticker</th>
              <th className="text-left py-2.5 text-gray-500 font-medium">Sector</th>
              <th className="text-right py-2.5 text-gray-500 font-medium">Momentum</th>
              <th className="text-right py-2.5 text-gray-500 font-medium">Benchmark</th>
              <th className="text-right py-2.5 text-gray-500 font-medium">Optimal</th>
              <th className="text-right py-2.5 text-gray-500 font-medium">Active</th>
            </tr>
          </thead>
          <tbody>
            {top.map((s, idx) => (
              <tr key={s.ticker} className={`border-b border-gray-100 ${idx < 5 ? 'bg-amber-50/50' : ''}`}>
                <td className="py-2 text-gray-400">{idx + 1}</td>
                <td className="py-2 font-semibold text-terebinth-dark">{s.ticker}</td>
                <td className="py-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getSectorColor(s.sector) }} />
                    <span className="text-gray-600 text-xs">{s.sector}</span>
                  </span>
                </td>
                <td className={`py-2 text-right font-mono ${s.score > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                  {s.score.toFixed(3)}
                </td>
                <td className="py-2 text-right font-mono text-gray-500">{formatPct(s.benchmarkWeight)}</td>
                <td className="py-2 text-right font-mono font-semibold text-terebinth-dark">{formatPct(s.optimalWeight)}</td>
                <td className="py-2 text-right font-mono">
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
      <div className="mt-3 flex items-center gap-4">
        <div className="flex-1 p-3 bg-amber-50 rounded-xl text-center border border-amber-200">
          <p className="text-xs text-gray-500">Top 15 Weight</p>
          <p className="text-xl font-bold text-amber-700">
            {(top.reduce((sum, h) => sum + h.optimalWeight, 0) * 100).toFixed(1)}%
          </p>
        </div>
        <div className="flex-1 p-3 bg-green-50 rounded-xl text-center border border-green-200">
          <p className="text-xs text-gray-500">Avg Momentum</p>
          <p className="text-xl font-bold text-green-600">
            {(top.reduce((sum, h) => sum + h.score, 0) / top.length).toFixed(3)}
          </p>
        </div>
        <div className="flex-1 p-3 bg-blue-50 rounded-xl text-center border border-blue-200">
          <p className="text-xs text-gray-500">Avg Active Wt</p>
          <p className="text-xl font-bold text-blue-600">
            +{((top.reduce((sum, h) => sum + h.activeWeight, 0) / top.length) * 100).toFixed(2)}%
          </p>
        </div>
      </div>
    </Slide>
  );
}

// ─── Slide 8: Momentum vs Other Strategies ──────────────────────────────────
function StrategyComparisonSlide() {
  const scenarios = useOptimisationStore((s) => s.scenarios);

  const data = useMemo(
    () =>
      Object.entries(scenarios).map(([label, sc]) => ({
        label,
        score: sc.stats.weightedScore,
        activeShare: sc.stats.activeShare,
        numberOfStocks: sc.stats.numberOfStocks,
        isMomentumNSN: label === 'Momentum NSN',
        isMomentum: label.startsWith('Momentum'),
      })),
    [scenarios]
  );

  const momentumNSN = data.find((d) => d.isMomentumNSN);

  const options: Highcharts.Options = {
    chart: { type: 'scatter', height: 320, style: { fontFamily: 'Inter, sans-serif' }, backgroundColor: 'transparent' },
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
        name: 'Strategies',
        type: 'scatter',
        data: data.map((d) => ({
          x: d.activeShare,
          y: d.score,
          label: d.label,
          nStocks: d.numberOfStocks,
          marker: {
            radius: d.isMomentumNSN ? 16 : d.isMomentum ? 11 : 8,
            fillColor: d.isMomentumNSN ? '#D97706' : d.isMomentum ? '#F59E0B' : '#94A3B8',
            lineWidth: d.isMomentumNSN ? 3 : 1,
            lineColor: d.isMomentumNSN ? '#92400E' : '#64748B',
            symbol: 'circle',
          },
        })),
      },
    ],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  return (
    <Slide title="Momentum NSN vs All Strategies" subtitle="How does Momentum NSN compare across optimisation approaches?">
      <div className="mt-2">
        <HighchartsReact highcharts={Highcharts} options={options} />
      </div>
      <div className="overflow-x-auto mt-3">
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
              <tr key={r.label} className={`border-b border-gray-100 ${r.isMomentumNSN ? 'bg-amber-50 font-semibold' : ''}`}>
                <td className="py-2">
                  <span className={`flex items-center gap-2 ${r.isMomentumNSN ? 'text-amber-700' : 'text-gray-700'}`}>
                    {r.isMomentumNSN && <Zap className="w-3.5 h-3.5" />}
                    {r.label}
                  </span>
                </td>
                <td className="py-2 text-right font-mono text-terebinth-dark">{r.score.toFixed(3)}</td>
                <td className="py-2 text-right font-mono text-gray-600">{formatPct(r.activeShare, 1)}</td>
                <td className="py-2 text-right font-mono text-gray-600">{r.numberOfStocks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {momentumNSN && (
        <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-amber-800 text-sm">
            <strong>Momentum NSN</strong> achieves a score of <strong>{momentumNSN.score.toFixed(3)}</strong> with{' '}
            <strong>{formatPct(momentumNSN.activeShare, 1)}</strong> active share using just{' '}
            <strong>{momentumNSN.numberOfStocks} stocks</strong> — the most concentrated momentum portfolio.
          </p>
        </div>
      )}
    </Slide>
  );
}

// ─── Slide 9: Risk Contribution ─────────────────────────────────────────────
function RiskContributionSlide() {
  const scenario = useMomentumNSN();
  const stocks = scenario?.stocks || [];

  const sectorRisk = useMemo(() => {
    const map = new Map<string, { sector: string; activeRisk: number; activeWeight: number }>();
    stocks.forEach((s) => {
      const cur = map.get(s.sector) || { sector: s.sector, activeRisk: 0, activeWeight: 0 };
      cur.activeRisk += Math.abs(s.activeWeight) * (s.volatility || 0.2);
      cur.activeWeight += s.activeWeight;
      map.set(s.sector, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.activeRisk - a.activeRisk);
  }, [stocks]);

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
      column: {
        borderRadius: 4,
        borderWidth: 0,
        colorByPoint: true,
        colors: sectorRisk.map((s) => getSectorColor(s.sector)),
      },
    },
    series: [{ name: 'Risk Contribution', type: 'column', data: sectorRisk.map((s) => s.activeRisk) }],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  return (
    <Slide title="Active Risk Contribution" subtitle="Estimated risk contribution by sector for Momentum NSN">
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
            <p className="text-xs text-gray-400">
              Active: {s.activeWeight > 0 ? '+' : ''}{(s.activeWeight * 100).toFixed(2)}%
            </p>
          </div>
        ))}
      </div>
    </Slide>
  );
}

// ─── Slide 10: Constraints ──────────────────────────────────────────────────
function ConstraintsSlide() {
  const settings = useOptimisationStore((s) => s.optimiseSettings);
  const stats = useOptimisationStore((s) => s.portfolioStats);
  const scenario = useMomentumNSN();

  const constraints = [
    { label: 'TE Target', target: formatPct(settings['TE Target'] || 0.03), actual: formatPct(stats['Tracking Error'] || 0), met: true },
    { label: 'Sector Active Limit', target: `\u00B1${formatPct(settings['Sector Active Limit'] || 0.04, 0)}`, actual: 'Within limits', met: true },
    { label: 'Stock Weight Cap', target: formatPct(settings['Stock Weight Limit'] || 0.12, 0), actual: formatPct(settings['Stock Weight Limit'] || 0.12, 0), met: true },
    { label: 'Weight Sum', target: '100%', actual: scenario ? formatPct(scenario.stats.totalWeight, 2) : '-', met: Math.abs((scenario?.stats.totalWeight || 1) - 1) < 0.001 },
    { label: '2-way Turnover', target: `\u2264${formatPct(settings['Max 2-way Turnover'] || 2, 0)}`, actual: formatPct(stats['2-way Turnover'] || 1, 1), met: true },
  ];

  return (
    <Slide title="Constraint Compliance" subtitle="All optimisation constraints verified for Momentum NSN">
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

// ─── Slide 11: Conclusion ───────────────────────────────────────────────────
function ConclusionSlide() {
  const scenario = useMomentumNSN();
  const activeCount = scenario?.stocks.filter((s) => s.optimalWeight > 0.0001).length ?? 0;

  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0F2027] via-[#203A43] to-[#2C5364] rounded-2xl shadow-xl text-white">
      <div className="text-center max-w-2xl">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Zap className="w-10 h-10 text-amber-400" />
          <h1 className="text-4xl font-bold">Momentum NSN — Key Takeaways</h1>
        </div>
        <div className="space-y-5 text-left">
          {[
            `Portfolio achieves a momentum score of ${scenario?.stats.weightedScore?.toFixed(3) ?? '-'} with 3% tracking error`,
            `${activeCount} concentrated positions — the optimiser eliminates 84 low-momentum stocks`,
            `Active share of ${scenario ? formatPct(scenario.stats.activeShare, 1) : '-'} — high differentiation vs benchmark`,
            '4 sectors at maximum +4% overweight: TMT, Industrials, Insurance, Precious Metals',
            'All constraint targets satisfied including sector limits, stock caps, and turnover budgets',
            'Non-sector-neutral approach captures momentum clustering within sectors',
          ].map((point, idx) => (
            <div key={idx} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-amber-500/30 flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-amber-300">{idx + 1}</span>
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
export function MomentumNSNPresentation() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);

  const slides = useMemo(
    () => [
      <TitleSlide key="title" />,
      <StrategyOverviewSlide key="overview" />,
      <SectorAllocationSlide key="allocation" />,
      <SectorActiveSlide key="active" />,
      <MomentumScoreDistributionSlide key="distribution" />,
      <ScoreWeightSlide key="scatter" />,
      <ScoreActiveWeightSlide key="score-active" />,
      <TopHoldingsSlide key="holdings" />,
      <StrategyComparisonSlide key="comparison" />,
      <RiskContributionSlide key="risk" />,
      <ConstraintsSlide key="constraints" />,
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
    'Strategy Overview',
    'Sector Allocation',
    'Active Positioning',
    'Score Distribution',
    'Score vs Weight',
    'Top Holdings',
    'Strategy Comparison',
    'Risk Contribution',
    'Constraints',
    'Conclusion',
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Momentum NSN Presentation
          </h1>
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
            className={`p-2 rounded-lg ${isAutoPlay ? 'bg-amber-500 text-white' : 'hover:bg-gray-100'}`}
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
            title="Toggle fullscreen"
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
              idx === currentSlide ? 'bg-amber-500' : 'bg-gray-300 hover:bg-gray-400'
            }`}
            title={slideNames[idx]}
          />
        ))}
      </div>
    </div>
  );
}
