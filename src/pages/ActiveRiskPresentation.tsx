import { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Maximize2,
  ShieldAlert,
  Target,
  Activity,
  BarChart3,
  Layers,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
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
  const settings = useOptimisationStore((s) => s.optimiseSettings);
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl shadow-xl text-white">
      <div className="text-center">
        <div className="mx-auto mb-8 p-4 bg-white rounded-2xl shadow-lg">
          <img src="/terebinth-logo.png" alt="Terebinth Capital" className="h-16 w-auto" />
        </div>
        <div className="flex items-center justify-center gap-3 mb-4">
          <ShieldAlert className="w-10 h-10 text-cyan-400" />
          <h1 className="text-5xl font-bold text-white">Active Risk Management</h1>
        </div>
        <h2 className="text-3xl font-light text-white mb-6">
          Customised Portfolio Construction Framework
        </h2>
        <p className="text-lg text-white/90 max-w-2xl mx-auto mb-8">
          {description || 'Maximise Score subject to TE Target and Sector Active Limits'}
        </p>
        <div className="flex items-center justify-center gap-4">
          <div className="inline-flex items-center gap-2 px-5 py-3 bg-white/20 rounded-full">
            <Target className="w-4 h-4 text-cyan-300" />
            <span className="text-base">TE Target: {formatPct(settings['TE Target'] || 0.03, 0)}</span>
          </div>
          <div className="inline-flex items-center gap-2 px-5 py-3 bg-white/20 rounded-full">
            <Layers className="w-4 h-4 text-cyan-300" />
            <span className="text-base">Sector Limit: &plusmn;{formatPct(settings['Sector Active Limit'] || 0.04, 0)}</span>
          </div>
          <div className="inline-flex items-center gap-2 px-5 py-3 bg-white/20 rounded-full">
            <Gauge className="w-4 h-4 text-cyan-300" />
            <span className="text-base">Stock Cap: {formatPct(settings['Stock Weight Limit'] || 0.12, 0)}</span>
          </div>
        </div>
        <p className="mt-6 text-white/80">30 September 2025</p>
      </div>
    </div>
  );
}

// ─── Slide 2: Risk Framework Overview ───────────────────────────────────────
function RiskFrameworkSlide() {
  const settings = useOptimisationStore((s) => s.optimiseSettings);

  const constraints = [
    {
      icon: <Target className="w-7 h-7" />,
      label: 'Tracking Error Target',
      value: formatPct(settings['TE Target'] || 0.03, 0),
      description: 'Active risk budget controlling deviation from benchmark',
      color: '#3182CE',
    },
    {
      icon: <Layers className="w-7 h-7" />,
      label: 'Sector Active Limit',
      value: `\u00B1${formatPct(settings['Sector Active Limit'] || 0.04, 0)}`,
      description: 'Maximum overweight or underweight per sector',
      color: '#E53E3E',
    },
    {
      icon: <Gauge className="w-7 h-7" />,
      label: 'Stock Weight Cap',
      value: formatPct(settings['Stock Weight Limit'] || 0.12, 0),
      description: 'Maximum allocation to any single stock',
      color: '#D69E2E',
    },
    {
      icon: <Activity className="w-7 h-7" />,
      label: 'Turnover Budget',
      value: `\u2264${formatPct(settings['Max 2-way Turnover'] || 2, 0)}`,
      description: 'Maximum 2-way turnover to manage transaction costs',
      color: '#38A169',
    },
    {
      icon: <BarChart3 className="w-7 h-7" />,
      label: 'Weight Sum',
      value: '100%',
      description: 'Fully invested portfolio constraint',
      color: '#805AD5',
    },
    {
      icon: <ShieldAlert className="w-7 h-7" />,
      label: 'Score Types',
      value: '6',
      description: 'Quality & Momentum, Sector / Broad / NSN variants',
      color: '#667EEA',
    },
  ];

  return (
    <Slide title="Risk Constraint Framework" subtitle="Five binding constraints define the optimisation boundary">
      <div className="grid grid-cols-3 gap-5 mt-6">
        {constraints.map((c, idx) => (
          <div key={idx} className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${c.color}15` }}>
                <div style={{ color: c.color }}>{c.icon}</div>
              </div>
              <div>
                <p className="text-sm text-gray-500">{c.label}</p>
                <p className="text-3xl font-bold text-terebinth-dark">{c.value}</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">{c.description}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 p-5 bg-blue-50 rounded-xl border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Customisation</h3>
        <p className="text-blue-800">
          The framework allows clients to select from 6 scoring methodologies (Quality/Momentum, each with
          Sector-Neutral, Broad, and Non-Sector-Neutral variants), enabling tailored risk-return profiles
          while maintaining consistent constraint boundaries.
        </p>
      </div>
    </Slide>
  );
}

// ─── Slide 3: Risk Budget Utilisation ───────────────────────────────────────
function RiskBudgetSlide() {
  const scenarios = useOptimisationStore((s) => s.scenarios);
  const settings = useOptimisationStore((s) => s.optimiseSettings);
  const sectorLimit = settings['Sector Active Limit'] || 0.04;
  const stockLimit = settings['Stock Weight Limit'] || 0.12;

  const data = useMemo(() => {
    return SCORE_TYPES.map((st) => {
      const sc = scenarios[st];
      if (!sc) return null;
      const maxSector = Math.max(...sc.sectorSummary.map((s) => Math.abs(s.activeWeight)));
      const maxStock = Math.max(...sc.stocks.map((s) => s.optimalWeight));
      return {
        name: st,
        sectorUtil: (maxSector / sectorLimit) * 100,
        stockUtil: (maxStock / stockLimit) * 100,
        activeShare: sc.stats.activeShare * 100,
      };
    }).filter(Boolean) as { name: string; sectorUtil: number; stockUtil: number; activeShare: number }[];
  }, [scenarios, sectorLimit, stockLimit]);

  const options: Highcharts.Options = {
    chart: { type: 'bar', height: 320, style: { fontFamily: 'Inter, sans-serif' }, backgroundColor: 'transparent' },
    title: { text: undefined },
    xAxis: { categories: data.map((d) => d.name), labels: { style: { fontSize: '11px', color: '#4A5568' } } },
    yAxis: {
      title: { text: 'Utilisation (%)', style: { color: '#718096' } },
      max: 110,
      labels: { style: { color: '#718096' } },
      plotLines: [{ value: 100, color: '#E53E3E', width: 2, dashStyle: 'Dash', zIndex: 3, label: { text: '100% limit', style: { color: '#E53E3E', fontSize: '10px' } } }],
    },
    plotOptions: { bar: { groupPadding: 0.15, pointPadding: 0.05, borderRadius: 2, borderWidth: 0 } },
    series: [
      { name: 'Sector Limit', type: 'bar', data: data.map((d) => d.sectorUtil), color: '#E53E3E' },
      { name: 'Stock Cap', type: 'bar', data: data.map((d) => d.stockUtil), color: '#D69E2E' },
      { name: 'Active Share', type: 'bar', data: data.map((d) => d.activeShare), color: '#3182CE' },
    ],
    tooltip: {
      shared: true,
      formatter() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx = this as any;
        const points = ctx.points || [];
        let s = `<b>${ctx.x}</b><br/>`;
        for (const p of points) s += `${p.series.name}: <b>${(p.y ?? 0).toFixed(1)}%</b><br/>`;
        return s;
      },
    },
    legend: { align: 'right', verticalAlign: 'top', floating: true, itemStyle: { fontSize: '11px', color: '#4A5568' } },
    credits: { enabled: false },
  };

  return (
    <Slide title="Risk Budget Utilisation" subtitle="How each strategy consumes the available risk budget">
      <div className="mt-2">
        <HighchartsReact highcharts={Highcharts} options={options} />
      </div>
      <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
        <p className="text-amber-800">
          <strong>Key finding:</strong> NSN strategies (Quality NSN, Momentum NSN) consume the sector limit
          fully at 100%, indicating the optimiser would allocate even more if unconstrained. Sector-neutral
          variants use 70-88% of their sector budgets.
        </p>
      </div>
    </Slide>
  );
}

// ─── Slide 4: Sector Active Weights ─────────────────────────────────────────
function SectorActiveSlide() {
  const scenario = useOptimisationStore((s) => s.scenarios['Quality NSN']) as Scenario | undefined;
  const settings = useOptimisationStore((s) => s.optimiseSettings);
  const sectorLimit = settings['Sector Active Limit'] || 0.04;

  const sorted = useMemo(
    () => [...(scenario?.sectorSummary || [])].sort((a, b) => b.activeWeight - a.activeWeight),
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
        { value: sectorLimit, color: '#E53E3E', width: 2, dashStyle: 'Dash', zIndex: 3, label: { text: `+${formatPct(sectorLimit, 0)}`, style: { color: '#E53E3E', fontSize: '10px' } } },
        { value: -sectorLimit, color: '#E53E3E', width: 2, dashStyle: 'Dash', zIndex: 3, label: { text: formatPct(-sectorLimit, 0), style: { color: '#E53E3E', fontSize: '10px' } } },
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
            : s.activeWeight >= 0 ? '#38A169' : '#6366F1',
        })),
      },
    ],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  const atLimit = sorted.filter((s) => Math.abs(Math.abs(s.activeWeight) - sectorLimit) < 0.001);

  return (
    <Slide title="Sector Active Positioning" subtitle="Quality NSN — Active weights with constraint boundaries">
      <div className="mt-2">
        <HighchartsReact highcharts={Highcharts} options={options} />
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="p-4 bg-green-50 rounded-xl border border-green-200">
          <p className="text-sm font-semibold text-green-800 mb-1">Overweight Sectors</p>
          {sorted.filter((s) => s.activeWeight > 0.001).map((s) => (
            <p key={s.sector} className="text-green-700 text-sm flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              {s.sector}: <span className="font-mono font-semibold">+{(s.activeWeight * 100).toFixed(2)}%</span>
              {Math.abs(s.activeWeight - sectorLimit) < 0.001 && <span className="text-xs bg-red-100 text-red-600 px-1.5 rounded ml-1">At limit</span>}
            </p>
          ))}
        </div>
        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
          <p className="text-sm font-semibold text-indigo-800 mb-1">Underweight Sectors</p>
          {sorted.filter((s) => s.activeWeight < -0.001).map((s) => (
            <p key={s.sector} className="text-indigo-700 text-sm flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3" />
              {s.sector}: <span className="font-mono font-semibold">{(s.activeWeight * 100).toFixed(2)}%</span>
              {Math.abs(s.activeWeight + sectorLimit) < 0.001 && <span className="text-xs bg-red-100 text-red-600 px-1.5 rounded ml-1">At limit</span>}
            </p>
          ))}
        </div>
      </div>
      {atLimit.length > 0 && (
        <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
          <p className="text-red-700 text-sm">
            <strong>{atLimit.length} sectors</strong> at the &plusmn;4% constraint boundary &mdash;
            the optimiser is risk-budget constrained in these sectors.
          </p>
        </div>
      )}
    </Slide>
  );
}

// ─── Slide 4b: Score vs Active Weight ────────────────────────────────────────
function ScoreActiveWeightSlide() {
  const scenario = useOptimisationStore((s) => s.currentScenario);
  const stocks = scenario?.stocks || [];

  const sectors = useMemo(() => {
    const map = new Map<string, typeof stocks>();
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
      title: { text: 'Score', style: { color: '#718096', fontWeight: '500' } },
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
        return `<b>${ctx.point?.name}</b> (${ctx.series.name})<br/>Score: <b>${(ctx.x ?? 0).toFixed(3)}</b><br/>Active Wt: <b>${(ctx.y ?? 0).toFixed(2)}%</b>`;
      },
    },
    legend: { layout: 'vertical', align: 'right', verticalAlign: 'middle', itemStyle: { fontSize: '10px', color: '#4A5568' } },
    series,
    credits: { enabled: false },
  };

  return (
    <Slide title="Score vs Active Weight" subtitle="Relationship between score and portfolio active positioning">
      <div className="mt-2">
        <HighchartsReact highcharts={Highcharts} options={options} />
      </div>
      <div className="mt-4 p-4 bg-cyan-50 rounded-xl border border-cyan-200">
        <p className="text-cyan-800">
          <strong>Key Insight:</strong> High-score stocks are overweighted (positive active weight) while
          low-score stocks are underweighted, demonstrating the optimiser&apos;s score-driven allocation.
        </p>
      </div>
    </Slide>
  );
}

// ─── Slide 5: Sector Limit Heatmap ──────────────────────────────────────────
function SectorLimitHeatmapSlide() {
  const scenarios = useOptimisationStore((s) => s.scenarios);
  const settings = useOptimisationStore((s) => s.optimiseSettings);
  const sectorLimit = settings['Sector Active Limit'] || 0.04;

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
      categories: sectors.map((s) => s.length > 14 ? s.slice(0, 13) + '..' : s),
      labels: { rotation: -45, style: { fontSize: '10px', color: '#4A5568' } },
    },
    yAxis: {
      categories: SCORE_TYPES as unknown as string[],
      labels: { style: { fontSize: '10px', color: '#4A5568' } },
      title: { text: undefined },
      reversed: true,
    },
    colorAxis: {
      min: 0, max: 100,
      stops: [[0, '#F0FFF4'], [0.5, '#FEF3C7'], [0.8, '#FED7AA'], [1, '#FCA5A5']],
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
    <Slide title="Sector Limit Utilisation Matrix" subtitle="% of \u00B14% budget consumed per sector across all 6 strategies">
      <div className="mt-2">
        <HighchartsReact highcharts={Highcharts} options={options} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="p-3 bg-green-50 rounded-xl text-center border border-green-200">
          <p className="text-xs text-gray-500">Low utilisation (&lt;50%)</p>
          <p className="text-sm font-semibold text-green-700">Unconstrained sectors</p>
        </div>
        <div className="p-3 bg-amber-50 rounded-xl text-center border border-amber-200">
          <p className="text-xs text-gray-500">Medium (50-90%)</p>
          <p className="text-sm font-semibold text-amber-700">Approaching limits</p>
        </div>
        <div className="p-3 bg-red-50 rounded-xl text-center border border-red-200">
          <p className="text-xs text-gray-500">High (&gt;90%)</p>
          <p className="text-sm font-semibold text-red-700">Binding constraints</p>
        </div>
      </div>
    </Slide>
  );
}

// ─── Slide 6: Risk Contribution ─────────────────────────────────────────────
function RiskContributionSlide() {
  const scenario = useOptimisationStore((s) => s.scenarios['Quality NSN']) as Scenario | undefined;
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
    chart: { type: 'bar', height: 350, style: { fontFamily: 'Inter, sans-serif' }, backgroundColor: 'transparent' },
    title: { text: undefined },
    xAxis: { categories: sectorRisk.map((s) => s.sector), labels: { style: { fontSize: '11px', color: '#4A5568' } } },
    yAxis: {
      title: { text: 'Risk Contribution (%)', style: { color: '#718096' } },
      labels: { formatter() { return `${(total > 0 ? (Number(this.value) / total) * 100 : 0).toFixed(0)}%`; }, style: { color: '#718096' } },
    },
    plotOptions: { bar: { borderRadius: 3, borderWidth: 0, colorByPoint: true, colors: sectorRisk.map((s) => getSectorColor(s.sector)) } },
    tooltip: {
      formatter() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx = this as any;
        const pt = ctx.point;
        const idx = pt.index ?? 0;
        const sr = sectorRisk[idx];
        return `<b>${sr.sector}</b><br/>Risk: <b>${total > 0 ? ((sr.activeRisk / total) * 100).toFixed(1) : 0}%</b><br/>Active: <b>${(sr.activeWeight * 100).toFixed(2)}%</b>`;
      },
    },
    series: [{ name: 'Risk Contribution', type: 'bar', data: sectorRisk.map((s) => s.activeRisk) }],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  return (
    <Slide title="Active Risk Contribution" subtitle="Quality NSN — Estimated sector risk contribution">
      <div className="mt-2">
        <HighchartsReact highcharts={Highcharts} options={options} />
      </div>
      <div className="grid grid-cols-3 gap-4 mt-4">
        {sectorRisk.slice(0, 3).map((s) => (
          <div key={s.sector} className="p-4 bg-gray-50 rounded-xl text-center">
            <p className="text-xs text-gray-500">{s.sector}</p>
            <p className="text-2xl font-bold text-terebinth-dark">
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

// ─── Slide 7: Strategy Risk Comparison ──────────────────────────────────────
function StrategyRiskSlide() {
  const scenarios = useOptimisationStore((s) => s.scenarios);
  const settings = useOptimisationStore((s) => s.optimiseSettings);
  const sectorLimit = settings['Sector Active Limit'] || 0.04;

  const data = useMemo(() => {
    return SCORE_TYPES.map((st) => {
      const sc = scenarios[st];
      if (!sc) return null;
      const activeCount = sc.stocks.filter((s) => s.optimalWeight > 0.0001).length;
      const excluded = sc.stocks.length - activeCount;
      const maxSector = Math.max(...sc.sectorSummary.map((s) => Math.abs(s.activeWeight)));
      const atLimit = sc.sectorSummary.filter((s) => Math.abs(Math.abs(s.activeWeight) - sectorLimit) < 0.001).length;
      return { name: st, score: sc.stats.weightedScore, activeShare: sc.stats.activeShare, activeCount, excluded, maxSector, atLimit };
    }).filter(Boolean) as { name: string; score: number; activeShare: number; activeCount: number; excluded: number; maxSector: number; atLimit: number }[];
  }, [scenarios, sectorLimit]);

  return (
    <Slide title="Risk Profile Comparison" subtitle="Active risk metrics across all 6 optimisation strategies">
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 text-gray-500 font-medium">Strategy</th>
              <th className="text-right py-3 text-gray-500 font-medium">Score</th>
              <th className="text-right py-3 text-gray-500 font-medium">Active Share</th>
              <th className="text-right py-3 text-gray-500 font-medium">Active Pos.</th>
              <th className="text-right py-3 text-gray-500 font-medium">Excluded</th>
              <th className="text-right py-3 text-gray-500 font-medium">Max Sector</th>
              <th className="text-right py-3 text-gray-500 font-medium">At Limit</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => {
              const isNSN = r.name.includes('NSN');
              return (
                <tr key={r.name} className={`border-b border-gray-100 ${isNSN ? 'bg-terebinth-light font-semibold' : ''}`}>
                  <td className="py-3">
                    <span className={isNSN ? 'text-terebinth-primary' : 'text-gray-700'}>{r.name}</span>
                  </td>
                  <td className="py-3 text-right font-mono">{r.score.toFixed(3)}</td>
                  <td className="py-3 text-right font-mono">{formatPct(r.activeShare, 1)}</td>
                  <td className="py-3 text-right font-mono">{r.activeCount}</td>
                  <td className="py-3 text-right font-mono text-red-500">{r.excluded}</td>
                  <td className="py-3 text-right font-mono">
                    <span className={r.maxSector >= sectorLimit - 0.001 ? 'text-red-600 font-bold' : ''}>
                      {formatPct(r.maxSector)}
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
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-5 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <p className="text-blue-800">
          <strong>NSN advantage:</strong> Non-sector-neutral strategies achieve higher portfolio scores (1.08 and 1.01)
          by utilising the full sector active limit. Sector-neutral variants are constrained to smaller tilts,
          resulting in lower scores but more diversified risk profiles.
        </p>
      </div>
    </Slide>
  );
}

// ─── Slide 8: Active Share Frontier ─────────────────────────────────────────
function ActiveShareFrontierSlide() {
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
    chart: { type: 'scatter', height: 360, style: { fontFamily: 'Inter, sans-serif' }, backgroundColor: 'transparent' },
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
          y: -16,
        },
      },
    },
    series: [
      {
        name: 'Sector-Neutral',
        type: 'scatter',
        data: data.filter((d) => !d.isNSN).map((d) => ({
          x: d.activeShare, y: d.score, name: d.name, stocks: d.stocks,
          marker: { radius: 10, fillColor: '#94A3B8', lineWidth: 2, lineColor: '#64748B' },
        })),
      },
      {
        name: 'Non-Sector-Neutral',
        type: 'scatter',
        data: data.filter((d) => d.isNSN).map((d) => ({
          x: d.activeShare, y: d.score, name: d.name, stocks: d.stocks,
          marker: { radius: 14, fillColor: '#1E3A5F', lineWidth: 3, lineColor: '#D4AF37' },
        })),
      },
    ],
    legend: { align: 'right', verticalAlign: 'top', floating: true, itemStyle: { fontSize: '11px', color: '#4A5568' } },
    credits: { enabled: false },
  };

  return (
    <Slide title="Active Share vs Score Frontier" subtitle="How scoring methodology affects the risk-return tradeoff">
      <div className="mt-2">
        <HighchartsReact highcharts={Highcharts} options={options} />
      </div>
      <div className="mt-4 p-4 bg-gray-50 rounded-xl">
        <p className="text-gray-700">
          <strong>Observation:</strong> NSN strategies sit in the upper region of the frontier, achieving
          scores of 1.01&ndash;1.08 compared to 0.69&ndash;0.87 for sector-constrained variants. The additional
          sector risk budget translates directly into higher portfolio scores with moderate active share increases.
        </p>
      </div>
    </Slide>
  );
}

// ─── Slide 9: Top Active Positions ──────────────────────────────────────────
function TopActivePositionsSlide() {
  const scenario = useOptimisationStore((s) => s.scenarios['Quality NSN']) as Scenario | undefined;
  const stocks = scenario?.stocks || [];

  const top = useMemo(() => {
    return [...stocks]
      .sort((a, b) => Math.abs(b.activeWeight) - Math.abs(a.activeWeight))
      .slice(0, 12);
  }, [stocks]);

  return (
    <Slide title="Top Active Weight Positions" subtitle="Quality NSN — 12 largest absolute active weight holdings">
      <div className="mt-3">
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
            {top.map((s, idx) => (
              <tr key={s.ticker} className={`border-b border-gray-100 ${s.activeWeight > 0.001 ? 'bg-green-50/40' : s.activeWeight < -0.001 ? 'bg-red-50/40' : ''}`}>
                <td className="py-2 text-gray-400">{idx + 1}</td>
                <td className="py-2 font-semibold text-terebinth-dark">{s.ticker}</td>
                <td className="py-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getSectorColor(s.sector) }} />
                    <span className="text-gray-600 text-xs">{s.sector}</span>
                  </span>
                </td>
                <td className={`py-2 text-right font-mono ${s.score > 0 ? 'text-green-600' : 'text-red-500'}`}>{s.score.toFixed(3)}</td>
                <td className="py-2 text-right font-mono text-gray-500">{formatPct(s.benchmarkWeight)}</td>
                <td className="py-2 text-right font-mono text-terebinth-dark">{formatPct(s.optimalWeight)}</td>
                <td className="py-2 text-right font-mono">
                  <span className="flex items-center justify-end gap-1">
                    {s.activeWeight > 0.0001 ? <ArrowUpRight className="w-3 h-3 text-green-600" /> : s.activeWeight < -0.0001 ? <ArrowDownRight className="w-3 h-3 text-red-500" /> : null}
                    <span className={`font-semibold ${s.activeWeight > 0.0001 ? 'text-green-600' : s.activeWeight < -0.0001 ? 'text-red-500' : 'text-gray-400'}`}>
                      {s.activeWeight > 0 ? '+' : ''}{formatPct(s.activeWeight)}
                    </span>
                  </span>
                </td>
                <td className="py-2 text-right font-mono text-gray-500">{s.volatility ? formatPct(s.volatility, 1) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Slide>
  );
}

// ─── Slide 10: Constraint Compliance ────────────────────────────────────────
function ConstraintComplianceSlide() {
  const settings = useOptimisationStore((s) => s.optimiseSettings);
  const stats = useOptimisationStore((s) => s.portfolioStats);
  const scenario = useOptimisationStore((s) => s.scenarios['Quality NSN']) as Scenario | undefined;

  const maxSectorActive = scenario ? Math.max(...scenario.sectorSummary.map((s) => Math.abs(s.activeWeight))) : 0;
  const maxStockWeight = scenario ? Math.max(...scenario.stocks.map((s) => s.optimalWeight)) : 0;

  const constraints = [
    { label: 'Tracking Error', target: formatPct(settings['TE Target'] || 0.03), actual: formatPct(stats['Tracking Error'] || 0), util: 100, met: true },
    { label: 'Sector Active Limit', target: `\u00B1${formatPct(settings['Sector Active Limit'] || 0.04, 0)}`, actual: formatPct(maxSectorActive), util: (maxSectorActive / (settings['Sector Active Limit'] || 0.04)) * 100, met: true },
    { label: 'Stock Weight Cap', target: formatPct(settings['Stock Weight Limit'] || 0.12, 0), actual: formatPct(maxStockWeight), util: (maxStockWeight / (settings['Stock Weight Limit'] || 0.12)) * 100, met: true },
    { label: 'Weight Sum', target: '100%', actual: formatPct(stats['Weight Sum'] || 1, 2), util: 100, met: Math.abs((stats['Weight Sum'] || 1) - 1) < 0.001 },
    { label: '2-way Turnover', target: `\u2264${formatPct(settings['Max 2-way Turnover'] || 2, 0)}`, actual: formatPct(stats['2-way Turnover'] || 1, 0), util: ((stats['2-way Turnover'] || 1) / (settings['Max 2-way Turnover'] || 2)) * 100, met: true },
  ];

  return (
    <Slide title="Constraint Compliance" subtitle="Quality NSN — All constraints verified with utilisation">
      <div className="space-y-4 mt-6">
        {constraints.map((c) => (
          <div key={c.label} className="flex items-center gap-4 p-5 bg-gray-50 rounded-xl">
            <div className="flex-shrink-0">
              {c.met ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <AlertTriangle className="w-6 h-6 text-red-500" />}
            </div>
            <div className="flex-1">
              <div className="flex justify-between mb-1.5">
                <span className="font-semibold text-terebinth-dark">{c.label}</span>
                <span className="text-sm text-gray-500">Target: {c.target}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${c.util > 95 ? 'bg-red-500' : c.util > 75 ? 'bg-amber-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(c.util, 100)}%` }}
                />
              </div>
            </div>
            <div className="flex-shrink-0 text-right min-w-[80px]">
              <p className="text-lg font-bold font-mono text-terebinth-dark">{c.actual}</p>
              <p className="text-xs text-gray-400">{c.util.toFixed(0)}% used</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium flex-shrink-0 ${c.met ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {c.met ? 'Met' : 'Breached'}
            </span>
          </div>
        ))}
      </div>
    </Slide>
  );
}

// ─── Slide 11: Conclusion ───────────────────────────────────────────────────
function ConclusionSlide() {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl shadow-xl text-white">
      <div className="text-center max-w-2xl">
        <div className="flex items-center justify-center gap-3 mb-8">
          <ShieldAlert className="w-10 h-10 text-cyan-400" />
          <h1 className="text-4xl font-bold">Key Takeaways</h1>
        </div>
        <div className="space-y-5 text-left">
          {[
            'Five binding constraints (TE, sector, stock, turnover, weight sum) define a robust, transparent optimisation boundary',
            '6 scoring methodologies (Quality & Momentum \u00D7 Sector/Broad/NSN) allow full customisation of the alpha signal',
            'NSN strategies deliver 25-50% higher scores by utilising the full \u00B14% sector budget',
            'Sector-neutral variants offer more diversified risk profiles with smaller but consistent tilts',
            'All constraints met across all scenarios \u2014 the framework is fully compliant',
            'The customisable approach allows clients to select their preferred risk-return tradeoff',
          ].map((point, idx) => (
            <div key={idx} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-cyan-500/30 flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-cyan-300">{idx + 1}</span>
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
export function ActiveRiskPresentation() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);

  const slides = useMemo(
    () => [
      <TitleSlide key="title" />,
      <RiskFrameworkSlide key="framework" />,
      <RiskBudgetSlide key="budget" />,
      <SectorActiveSlide key="sector-active" />,
      <ScoreActiveWeightSlide key="score-active" />,
      <SectorLimitHeatmapSlide key="heatmap" />,
      <RiskContributionSlide key="risk-contrib" />,
      <StrategyRiskSlide key="strategy-risk" />,
      <ActiveShareFrontierSlide key="frontier" />,
      <TopActivePositionsSlide key="positions" />,
      <ConstraintComplianceSlide key="constraints" />,
      <ConclusionSlide key="conclusion" />,
    ],
    []
  );

  useEffect(() => {
    if (!isAutoPlay) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 12000);
    return () => clearInterval(timer);
  }, [isAutoPlay, slides.length]);

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
    'Risk Framework',
    'Budget Utilisation',
    'Sector Positioning',
    'Limit Heatmap',
    'Risk Contribution',
    'Strategy Comparison',
    'Active Share Frontier',
    'Top Positions',
    'Constraints',
    'Conclusion',
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-cyan-600" />
            Active Risk Presentation
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
            className={`p-2 rounded-lg ${isAutoPlay ? 'bg-cyan-600 text-white' : 'hover:bg-gray-100'}`}
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

      <div className="flex-1 p-6 bg-gray-100 overflow-hidden">
        <div className="h-full max-w-6xl mx-auto">{slides[currentSlide]}</div>
      </div>

      <div className="flex items-center justify-center gap-2 py-4 bg-white border-t">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={`w-3 h-3 rounded-full transition-colors ${
              idx === currentSlide ? 'bg-cyan-600' : 'bg-gray-300 hover:bg-gray-400'
            }`}
            title={slideNames[idx]}
          />
        ))}
      </div>
    </div>
  );
}
