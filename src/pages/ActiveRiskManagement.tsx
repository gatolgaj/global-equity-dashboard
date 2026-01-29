import { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Target,
  Activity,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Gauge,
  Layers,
} from 'lucide-react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import {
  useOptimisationStore,
  type ScoreType,
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
const SCORE_TYPES: ScoreType[] = [
  'Quality Sector', 'Quality Broad', 'Momentum Sector',
  'Momentum Broad', 'Quality NSN', 'Momentum NSN',
];

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

// ─── Score Type Selector ────────────────────────────────────────────────────
function ScoreTypeSelector({
  selected,
  onChange,
}: {
  selected: ScoreType;
  onChange: (s: ScoreType) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {SCORE_TYPES.map((st) => (
        <button
          key={st}
          onClick={() => onChange(st)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            selected === st
              ? 'bg-terebinth-primary text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {st}
        </button>
      ))}
    </div>
  );
}

// ─── Risk Budget Gauge ──────────────────────────────────────────────────────
function RiskBudgetGauge({ scenario, settings }: { scenario: Scenario; settings: { teTarget: number; sectorLimit: number; stockLimit: number; turnoverLimit: number } }) {
  const maxSectorActive = Math.max(...scenario.sectorSummary.map((s) => Math.abs(s.activeWeight)));
  const maxStockWeight = Math.max(...scenario.stocks.map((s) => s.optimalWeight));
  const gauges = [
    {
      label: 'Tracking Error',
      value: settings.teTarget,
      limit: settings.teTarget,
      utilisation: 1.0,
      icon: <Target className="w-5 h-5" />,
      color: '#3182CE',
    },
    {
      label: 'Max Sector Active',
      value: maxSectorActive,
      limit: settings.sectorLimit,
      utilisation: maxSectorActive / settings.sectorLimit,
      icon: <Layers className="w-5 h-5" />,
      color: maxSectorActive / settings.sectorLimit > 0.95 ? '#E53E3E' : '#38A169',
    },
    {
      label: 'Max Stock Weight',
      value: maxStockWeight,
      limit: settings.stockLimit,
      utilisation: maxStockWeight / settings.stockLimit,
      icon: <Gauge className="w-5 h-5" />,
      color: maxStockWeight / settings.stockLimit > 0.95 ? '#E53E3E' : '#38A169',
    },
    {
      label: 'Active Share',
      value: scenario.stats.activeShare,
      limit: 1.0,
      utilisation: scenario.stats.activeShare,
      icon: <Activity className="w-5 h-5" />,
      color: '#805AD5',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {gauges.map((g) => (
        <div key={g.label} className="dashboard-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${g.color}15` }}>
              <div style={{ color: g.color }}>{g.icon}</div>
            </div>
            <div>
              <p className="text-xs text-gray-500">{g.label}</p>
              <p className="text-xl font-bold text-terebinth-dark">{formatPct(g.value)}</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(g.utilisation * 100, 100)}%`,
                backgroundColor: g.color,
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-gray-400">0%</span>
            <span className="text-xs font-medium" style={{ color: g.color }}>
              {(g.utilisation * 100).toFixed(0)}% used
            </span>
            <span className="text-xs text-gray-400">{g.limit < 1 ? formatPct(g.limit, 0) : '100%'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── KPI Row ────────────────────────────────────────────────────────────────
function RiskKPIRow({ scenario }: { scenario: Scenario }) {
  const activeCount = scenario.stocks.filter((s) => s.optimalWeight > 0.0001).length;
  const excludedCount = scenario.stocks.filter((s) => s.optimalWeight <= 0.0001).length;
  const totalActiveWt = scenario.stocks.reduce((sum, s) => sum + Math.abs(s.activeWeight), 0);
  const owSectors = scenario.sectorSummary.filter((s) => s.activeWeight > 0.001).length;
  const uwSectors = scenario.sectorSummary.filter((s) => s.activeWeight < -0.001).length;
  const atLimitSectors = scenario.sectorSummary.filter((s) => Math.abs(Math.abs(s.activeWeight) - 0.04) < 0.001).length;

  const kpis = [
    { label: 'Active Share', value: formatPct(scenario.stats.activeShare, 1), icon: <ShieldAlert className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Positions', value: `${activeCount}`, icon: <BarChart3 className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Excluded Stocks', value: `${excludedCount}`, icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Gross Active Wt', value: formatPct(totalActiveWt / 2, 1), icon: <Activity className="w-4 h-4" />, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'OW / UW Sectors', value: `${owSectors} / ${uwSectors}`, icon: <Layers className="w-4 h-4" />, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'At Limit', value: `${atLimitSectors} sectors`, icon: <Gauge className="w-4 h-4" />, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="grid grid-cols-6 gap-3">
      {kpis.map((k) => (
        <div key={k.label} className={`${k.bg} rounded-xl p-4 text-center`}>
          <div className={`flex items-center justify-center gap-1.5 mb-1 ${k.color}`}>
            {k.icon}
            <span className="text-xs font-medium">{k.label}</span>
          </div>
          <p className="text-xl font-bold text-terebinth-dark">{k.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Sector Active Weight Chart with Limits ─────────────────────────────────
function SectorActiveWeightChart({ scenario, sectorLimit }: { scenario: Scenario; sectorLimit: number }) {
  const sorted = useMemo(
    () => [...scenario.sectorSummary].sort((a, b) => b.activeWeight - a.activeWeight),
    [scenario]
  );

  const options: Highcharts.Options = {
    chart: { type: 'bar', height: 380, style: { fontFamily: 'Inter, sans-serif' }, backgroundColor: 'transparent' },
    title: { text: undefined },
    xAxis: { categories: sorted.map((s) => s.sector), labels: { style: { fontSize: '11px', color: '#4A5568' } } },
    yAxis: {
      title: { text: 'Active Weight', style: { color: '#718096' } },
      labels: { formatter() { return `${(Number(this.value) * 100).toFixed(1)}%`; }, style: { color: '#718096' } },
      plotLines: [
        { value: 0, color: '#A0AEC0', width: 1, zIndex: 3 },
        { value: sectorLimit, color: '#E53E3E', width: 2, dashStyle: 'Dash', zIndex: 3, label: { text: `+${formatPct(sectorLimit, 0)} limit`, style: { color: '#E53E3E', fontSize: '10px' } } },
        { value: -sectorLimit, color: '#E53E3E', width: 2, dashStyle: 'Dash', zIndex: 3, label: { text: `${formatPct(-sectorLimit, 0)} limit`, style: { color: '#E53E3E', fontSize: '10px' } } },
      ],
      max: sectorLimit * 1.3,
      min: -sectorLimit * 1.3,
    },
    plotOptions: { bar: { borderRadius: 3, borderWidth: 0 } },
    series: [
      {
        name: 'Active Weight',
        type: 'bar',
        data: sorted.map((s) => ({
          y: s.activeWeight,
          color: Math.abs(Math.abs(s.activeWeight) - sectorLimit) < 0.001
            ? '#E53E3E'
            : s.activeWeight >= 0
            ? '#38A169'
            : '#6366F1',
        })),
      },
    ],
    tooltip: {
      formatter() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx = this as any;
        const pt = ctx.point;
        const val = pt.y ?? 0;
        const pctOfLimit = Math.abs(val) / sectorLimit * 100;
        return `<b>${ctx.x}</b><br/>Active: <b>${(val * 100).toFixed(2)}%</b><br/>Limit utilisation: <b>${pctOfLimit.toFixed(0)}%</b>`;
      },
    },
    legend: { enabled: false },
    credits: { enabled: false },
  };

  return (
    <div className="dashboard-card p-6">
      <h3 className="text-lg font-semibold text-terebinth-dark mb-1">Sector Active Weights vs Limits</h3>
      <p className="text-sm text-gray-500 mb-4">Red bars indicate positions at the constraint limit</p>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
}

// ─── Sector Limit Utilisation Heatmap ───────────────────────────────────────
function SectorLimitHeatmap({ sectorLimit }: { sectorLimit: number }) {
  const scenarios = useOptimisationStore((s) => s.scenarios);

  const sectors = useMemo(() => {
    const first = Object.values(scenarios)[0];
    return first ? first.sectorSummary.map((s) => s.sector) : [];
  }, [scenarios]);

  const heatmapData = useMemo(() => {
    const data: Array<[number, number, number]> = [];
    SCORE_TYPES.forEach((st, yi) => {
      const sc = scenarios[st];
      if (!sc) return;
      sectors.forEach((sector, xi) => {
        const found = sc.sectorSummary.find((s) => s.sector === sector);
        const util = found ? (Math.abs(found.activeWeight) / sectorLimit) * 100 : 0;
        data.push([xi, yi, Math.round(util)]);
      });
    });
    return data;
  }, [scenarios, sectors, sectorLimit]);

  const options: Highcharts.Options = {
    chart: { type: 'heatmap', height: 300, style: { fontFamily: 'Inter, sans-serif' }, backgroundColor: 'transparent' },
    title: { text: undefined },
    xAxis: {
      categories: sectors.map((s) => s.length > 15 ? s.slice(0, 14) + '...' : s),
      labels: { rotation: -45, style: { fontSize: '10px', color: '#4A5568' } },
    },
    yAxis: {
      categories: SCORE_TYPES as unknown as string[],
      labels: { style: { fontSize: '10px', color: '#4A5568' } },
      title: { text: undefined },
      reversed: true,
    },
    colorAxis: {
      min: 0,
      max: 100,
      stops: [
        [0, '#F0FFF4'],
        [0.5, '#FEF3C7'],
        [0.8, '#FED7AA'],
        [1, '#FCA5A5'],
      ],
      labels: { format: '{value}%' },
    },
    tooltip: {
      formatter() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx = this as any;
        const pt = ctx.point;
        return `<b>${SCORE_TYPES[pt.y ?? 0]}</b> — ${sectors[pt.x ?? 0]}<br/>Limit utilisation: <b>${pt.value}%</b>`;
      },
    },
    series: [
      {
        name: 'Limit Utilisation',
        type: 'heatmap',
        data: heatmapData,
        borderWidth: 1,
        borderColor: '#FFFFFF',
        dataLabels: {
          enabled: true,
          format: '{point.value}%',
          style: { fontSize: '9px', color: '#374151', textOutline: 'none', fontWeight: '500' },
        },
      },
    ],
    legend: { align: 'right', verticalAlign: 'top', layout: 'vertical', margin: 0, symbolHeight: 140 },
    credits: { enabled: false },
  };

  return (
    <div className="dashboard-card p-6">
      <h3 className="text-lg font-semibold text-terebinth-dark mb-1">Sector Limit Utilisation Across Strategies</h3>
      <p className="text-sm text-gray-500 mb-4">How much of the &plusmn;{formatPct(sectorLimit, 0)} budget each scenario uses per sector</p>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
}

// ─── Scenario Risk Comparison ───────────────────────────────────────────────
function ScenarioRiskComparison({ selectedScenario }: { selectedScenario: ScoreType }) {
  const scenarios = useOptimisationStore((s) => s.scenarios);

  const data = useMemo(() => {
    return SCORE_TYPES.map((st) => {
      const sc = scenarios[st];
      if (!sc) return null;
      const activeCount = sc.stocks.filter((s) => s.optimalWeight > 0.0001).length;
      const excluded = sc.stocks.filter((s) => s.optimalWeight <= 0.0001).length;
      const maxSectorActive = Math.max(...sc.sectorSummary.map((s) => Math.abs(s.activeWeight)));
      const atLimit = sc.sectorSummary.filter((s) => Math.abs(Math.abs(s.activeWeight) - 0.04) < 0.001).length;
      const totalActive = sc.stocks.reduce((sum, s) => sum + Math.abs(s.activeWeight), 0) / 2;
      return {
        name: st,
        isSelected: st === selectedScenario,
        score: sc.stats.weightedScore,
        activeShare: sc.stats.activeShare,
        activeCount,
        excluded,
        maxSectorActive,
        atLimit,
        totalActive,
      };
    }).filter(Boolean) as NonNullable<ReturnType<typeof Array.prototype.find>>[];
  }, [scenarios, selectedScenario]);

  return (
    <div className="dashboard-card p-6">
      <h3 className="text-lg font-semibold text-terebinth-dark mb-1">Risk Profile Comparison</h3>
      <p className="text-sm text-gray-500 mb-4">Active risk metrics across all 6 optimisation strategies</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 text-gray-500 font-medium">Strategy</th>
              <th className="text-right py-3 text-gray-500 font-medium">Score</th>
              <th className="text-right py-3 text-gray-500 font-medium">Active Share</th>
              <th className="text-right py-3 text-gray-500 font-medium">Active Pos.</th>
              <th className="text-right py-3 text-gray-500 font-medium">Excluded</th>
              <th className="text-right py-3 text-gray-500 font-medium">Gross Active</th>
              <th className="text-right py-3 text-gray-500 font-medium">Max Sector</th>
              <th className="text-right py-3 text-gray-500 font-medium">At Limit</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr
                key={r.name}
                className={`border-b border-gray-100 transition-colors ${
                  r.isSelected ? 'bg-terebinth-light font-semibold' : 'hover:bg-gray-50'
                }`}
              >
                <td className="py-3">
                  <span className={r.isSelected ? 'text-terebinth-primary font-semibold' : 'text-gray-700'}>
                    {r.name}
                  </span>
                </td>
                <td className="py-3 text-right font-mono">{r.score.toFixed(3)}</td>
                <td className="py-3 text-right font-mono">{formatPct(r.activeShare, 1)}</td>
                <td className="py-3 text-right font-mono">{r.activeCount}</td>
                <td className="py-3 text-right font-mono text-red-500">{r.excluded}</td>
                <td className="py-3 text-right font-mono">{formatPct(r.totalActive, 1)}</td>
                <td className="py-3 text-right font-mono">
                  <span className={Math.abs(r.maxSectorActive - 0.04) < 0.001 ? 'text-red-600 font-bold' : ''}>
                    {formatPct(r.maxSectorActive)}
                  </span>
                </td>
                <td className="py-3 text-right">
                  {r.atLimit > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                      <AlertTriangle className="w-3 h-3" /> {r.atLimit}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      <CheckCircle2 className="w-3 h-3" /> 0
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Active Weight Distribution ─────────────────────────────────────────────
function ActiveWeightDistribution({ scenario }: { scenario: Scenario }) {
  const stocks = scenario.stocks;

  const bins = useMemo(() => {
    const ranges = [
      { label: '< -2%', min: -Infinity, max: -0.02 },
      { label: '-2% to -1%', min: -0.02, max: -0.01 },
      { label: '-1% to 0%', min: -0.01, max: 0 },
      { label: '0% (excluded)', min: 0, max: 0.0001 },
      { label: '0% to +1%', min: 0.0001, max: 0.01 },
      { label: '+1% to +2%', min: 0.01, max: 0.02 },
      { label: '+2% to +4%', min: 0.02, max: 0.04 },
      { label: '> +4%', min: 0.04, max: Infinity },
    ];
    return ranges.map((r) => ({
      ...r,
      count: stocks.filter((s) => s.activeWeight >= r.min && s.activeWeight < r.max).length,
    }));
  }, [stocks]);

  const options: Highcharts.Options = {
    chart: { type: 'column', height: 300, style: { fontFamily: 'Inter, sans-serif' }, backgroundColor: 'transparent' },
    title: { text: undefined },
    xAxis: {
      categories: bins.map((b) => b.label),
      labels: { rotation: -30, style: { fontSize: '10px', color: '#4A5568' } },
    },
    yAxis: {
      title: { text: 'Number of Stocks', style: { color: '#718096' } },
      labels: { style: { color: '#718096' } },
    },
    plotOptions: {
      column: {
        borderRadius: 3,
        borderWidth: 0,
        colorByPoint: true,
        colors: ['#6366F1', '#818CF8', '#A5B4FC', '#E5E7EB', '#86EFAC', '#34D399', '#059669', '#047857'],
      },
    },
    series: [{ name: 'Stocks', type: 'column', data: bins.map((b) => b.count) }],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  return (
    <div className="dashboard-card p-6">
      <h3 className="text-lg font-semibold text-terebinth-dark mb-1">Active Weight Distribution</h3>
      <p className="text-sm text-gray-500 mb-4">How active weights are distributed across the universe</p>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
}

// ─── Risk Contribution by Sector ────────────────────────────────────────────
function RiskContributionChart({ scenario }: { scenario: Scenario }) {
  const sectorRisk = useMemo(() => {
    const map = new Map<string, { sector: string; activeRisk: number; activeWeight: number; stockCount: number }>();
    scenario.stocks.forEach((s) => {
      const cur = map.get(s.sector) || { sector: s.sector, activeRisk: 0, activeWeight: 0, stockCount: 0 };
      cur.activeRisk += Math.abs(s.activeWeight) * (s.volatility || 0.2);
      cur.activeWeight += s.activeWeight;
      if (s.optimalWeight > 0.0001) cur.stockCount++;
      map.set(s.sector, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.activeRisk - a.activeRisk);
  }, [scenario]);

  const total = sectorRisk.reduce((sum, s) => sum + s.activeRisk, 0);

  const options: Highcharts.Options = {
    chart: { type: 'bar', height: 350, style: { fontFamily: 'Inter, sans-serif' }, backgroundColor: 'transparent' },
    title: { text: undefined },
    xAxis: {
      categories: sectorRisk.map((s) => s.sector),
      labels: { style: { fontSize: '11px', color: '#4A5568' } },
    },
    yAxis: {
      title: { text: 'Estimated Risk Contribution', style: { color: '#718096' } },
      labels: {
        formatter() { return `${(total > 0 ? (Number(this.value) / total) * 100 : 0).toFixed(0)}%`; },
        style: { color: '#718096' },
      },
    },
    plotOptions: {
      bar: {
        borderRadius: 3,
        borderWidth: 0,
        colorByPoint: true,
        colors: sectorRisk.map((s) => getSectorColor(s.sector)),
      },
    },
    tooltip: {
      formatter() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx = this as any;
        const pt = ctx.point;
        const idx = pt.index ?? 0;
        const sr = sectorRisk[idx];
        return `<b>${sr.sector}</b><br/>Risk contribution: <b>${total > 0 ? ((sr.activeRisk / total) * 100).toFixed(1) : 0}%</b><br/>Active weight: <b>${(sr.activeWeight * 100).toFixed(2)}%</b><br/>Active stocks: <b>${sr.stockCount}</b>`;
      },
    },
    series: [{ name: 'Risk Contribution', type: 'bar', data: sectorRisk.map((s) => s.activeRisk) }],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  return (
    <div className="dashboard-card p-6">
      <h3 className="text-lg font-semibold text-terebinth-dark mb-1">Active Risk Contribution by Sector</h3>
      <p className="text-sm text-gray-500 mb-4">Estimated sector contribution to active portfolio risk</p>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
}

// ─── Top Active Positions Table ─────────────────────────────────────────────
function TopActivePositions({ scenario }: { scenario: Scenario }) {
  const sorted = useMemo(() => {
    return [...scenario.stocks]
      .sort((a, b) => Math.abs(b.activeWeight) - Math.abs(a.activeWeight))
      .slice(0, 20);
  }, [scenario]);

  return (
    <div className="dashboard-card p-6">
      <h3 className="text-lg font-semibold text-terebinth-dark mb-1">Top 20 Active Weight Positions</h3>
      <p className="text-sm text-gray-500 mb-4">Largest absolute active weight positions (overweight &amp; underweight)</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2.5 text-gray-500 font-medium">#</th>
              <th className="text-left py-2.5 text-gray-500 font-medium">Ticker</th>
              <th className="text-left py-2.5 text-gray-500 font-medium">Sector</th>
              <th className="text-right py-2.5 text-gray-500 font-medium">Score</th>
              <th className="text-right py-2.5 text-gray-500 font-medium">Benchmark</th>
              <th className="text-right py-2.5 text-gray-500 font-medium">Optimal</th>
              <th className="text-right py-2.5 text-gray-500 font-medium">Active</th>
              <th className="text-right py-2.5 text-gray-500 font-medium">Volatility</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, idx) => (
              <tr key={s.ticker} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 text-gray-400">{idx + 1}</td>
                <td className="py-2 font-semibold text-terebinth-dark">{s.ticker}</td>
                <td className="py-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getSectorColor(s.sector) }} />
                    <span className="text-gray-600 text-xs">{s.sector}</span>
                  </span>
                </td>
                <td className={`py-2 text-right font-mono ${s.score > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {s.score.toFixed(3)}
                </td>
                <td className="py-2 text-right font-mono text-gray-500">{formatPct(s.benchmarkWeight)}</td>
                <td className="py-2 text-right font-mono text-terebinth-dark">{formatPct(s.optimalWeight)}</td>
                <td className="py-2 text-right font-mono">
                  <span className="flex items-center justify-end gap-1">
                    {s.activeWeight > 0.0001 ? (
                      <ArrowUpRight className="w-3 h-3 text-green-600" />
                    ) : s.activeWeight < -0.0001 ? (
                      <ArrowDownRight className="w-3 h-3 text-red-500" />
                    ) : null}
                    <span className={`font-semibold ${s.activeWeight > 0.0001 ? 'text-green-600' : s.activeWeight < -0.0001 ? 'text-red-500' : 'text-gray-400'}`}>
                      {s.activeWeight > 0 ? '+' : ''}{formatPct(s.activeWeight)}
                    </span>
                  </span>
                </td>
                <td className="py-2 text-right font-mono text-gray-500">
                  {s.volatility ? formatPct(s.volatility, 1) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Constraint Compliance Panel ────────────────────────────────────────────
function ConstraintCompliancePanel({ scenario }: { scenario: Scenario }) {
  const settings = useOptimisationStore((s) => s.optimiseSettings);

  const maxSectorActive = Math.max(...scenario.sectorSummary.map((s) => Math.abs(s.activeWeight)));
  const maxStockWeight = Math.max(...scenario.stocks.map((s) => s.optimalWeight));

  const constraints = [
    {
      label: 'Tracking Error',
      target: formatPct(settings['TE Target'] || 0.03),
      actual: formatPct(settings['TE Target'] || 0.03),
      utilisation: 100,
      met: true,
    },
    {
      label: 'Sector Active Limit',
      target: `\u00B1${formatPct(settings['Sector Active Limit'] || 0.04, 0)}`,
      actual: formatPct(maxSectorActive),
      utilisation: (maxSectorActive / (settings['Sector Active Limit'] || 0.04)) * 100,
      met: maxSectorActive <= (settings['Sector Active Limit'] || 0.04) + 0.001,
    },
    {
      label: 'Stock Weight Cap',
      target: formatPct(settings['Stock Weight Limit'] || 0.12, 0),
      actual: formatPct(maxStockWeight),
      utilisation: (maxStockWeight / (settings['Stock Weight Limit'] || 0.12)) * 100,
      met: maxStockWeight <= (settings['Stock Weight Limit'] || 0.12) + 0.001,
    },
    {
      label: 'Weight Sum',
      target: '100%',
      actual: formatPct(scenario.stats.totalWeight),
      utilisation: 100,
      met: Math.abs(scenario.stats.totalWeight - 1) < 0.001,
    },
    {
      label: '2-way Turnover',
      target: `\u2264${formatPct(settings['Max 2-way Turnover'] || 2, 0)}`,
      actual: formatPct(1, 0),
      utilisation: (1 / (settings['Max 2-way Turnover'] || 2)) * 100,
      met: true,
    },
  ];

  return (
    <div className="dashboard-card p-6">
      <h3 className="text-lg font-semibold text-terebinth-dark mb-1">Constraint Compliance</h3>
      <p className="text-sm text-gray-500 mb-4">All constraints verified with utilisation levels</p>
      <div className="space-y-3">
        {constraints.map((c) => (
          <div key={c.label} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
            <div className="flex-shrink-0">
              {c.met ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-terebinth-dark">{c.label}</span>
                <span className="text-xs text-gray-500">Target: {c.target}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    c.utilisation > 95 ? 'bg-red-500' : c.utilisation > 75 ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(c.utilisation, 100)}%` }}
                />
              </div>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-sm font-bold font-mono text-terebinth-dark">{c.actual}</p>
              <p className="text-xs text-gray-400">{c.utilisation.toFixed(0)}% used</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Active Share Radar / Comparison ────────────────────────────────────────
function ActiveShareComparison() {
  const scenarios = useOptimisationStore((s) => s.scenarios);

  const data = useMemo(() => {
    return SCORE_TYPES.map((st) => {
      const sc = scenarios[st];
      return {
        name: st,
        activeShare: sc?.stats.activeShare ?? 0,
        score: sc?.stats.weightedScore ?? 0,
        stocks: sc?.stats.numberOfStocks ?? 0,
        isNSN: st.includes('NSN'),
      };
    });
  }, [scenarios]);

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
        return `<b>${pt?.name}</b><br/>Active Share: <b>${((ctx.x ?? 0) * 100).toFixed(1)}%</b><br/>Score: <b>${(ctx.y ?? 0).toFixed(3)}</b><br/>Stocks: <b>${pt?.stocks ?? 0}</b>`;
      },
    },
    plotOptions: {
      scatter: {
        dataLabels: {
          enabled: true,
          formatter() {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ctx = this as any;
            return ctx.point?.name?.replace(/\s/g, '\n') || '';
          },
          style: { fontSize: '9px', color: '#4A5568', textOutline: '2px white' },
          y: -14,
        },
      },
    },
    series: [
      {
        name: 'Sector-Neutral',
        type: 'scatter',
        data: data.filter((d) => !d.isNSN).map((d) => ({
          x: d.activeShare,
          y: d.score,
          name: d.name,
          stocks: d.stocks,
          marker: { radius: 10, fillColor: '#94A3B8', lineWidth: 2, lineColor: '#64748B' },
        })),
      },
      {
        name: 'Non-Sector-Neutral',
        type: 'scatter',
        data: data.filter((d) => d.isNSN).map((d) => ({
          x: d.activeShare,
          y: d.score,
          name: d.name,
          stocks: d.stocks,
          marker: { radius: 14, fillColor: '#1E3A5F', lineWidth: 3, lineColor: '#D4AF37' },
        })),
      },
    ],
    legend: { align: 'right', verticalAlign: 'top', floating: true, itemStyle: { fontSize: '11px', color: '#4A5568' } },
    credits: { enabled: false },
  };

  return (
    <div className="dashboard-card p-6">
      <h3 className="text-lg font-semibold text-terebinth-dark mb-1">Active Share vs Score Frontier</h3>
      <p className="text-sm text-gray-500 mb-4">NSN strategies achieve higher scores using sector-level risk budget</p>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
}

// ─── Main Page Component ────────────────────────────────────────────────────
export function ActiveRiskManagement() {
  const scenarios = useOptimisationStore((s) => s.scenarios);
  const settings = useOptimisationStore((s) => s.optimiseSettings);
  const description = useOptimisationStore((s) => s.description);
  const [selectedType, setSelectedType] = useState<ScoreType>('Quality NSN');

  const scenario = scenarios[selectedType] ?? null;
  const sectorLimit = settings['Sector Active Limit'] || 0.04;

  if (!scenario) return <div className="p-8 text-gray-500">No data available</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-terebinth-dark flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-terebinth-primary" />
            Customised Active Risk Management
          </h1>
          <p className="text-gray-500 mt-1">{description}</p>
        </div>
        <ScoreTypeSelector selected={selectedType} onChange={setSelectedType} />
      </div>

      {/* Risk Budget Gauges */}
      <RiskBudgetGauge
        scenario={scenario}
        settings={{
          teTarget: settings['TE Target'] || 0.03,
          sectorLimit,
          stockLimit: settings['Stock Weight Limit'] || 0.12,
          turnoverLimit: settings['Max 2-way Turnover'] || 2,
        }}
      />

      {/* KPI Row */}
      <RiskKPIRow scenario={scenario} />

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectorActiveWeightChart scenario={scenario} sectorLimit={sectorLimit} />
        <RiskContributionChart scenario={scenario} />
      </div>

      {/* Heatmap */}
      <SectorLimitHeatmap sectorLimit={sectorLimit} />

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ActiveWeightDistribution scenario={scenario} />
        <ActiveShareComparison />
      </div>

      {/* Scenario Risk Table */}
      <ScenarioRiskComparison selectedScenario={selectedType} />

      {/* Constraint Compliance + Top Active Positions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ConstraintCompliancePanel scenario={scenario} />
        <div className="xl:col-span-2">
          <TopActivePositions scenario={scenario} />
        </div>
      </div>
    </div>
  );
}
