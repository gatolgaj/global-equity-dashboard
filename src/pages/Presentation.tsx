import { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Maximize2,
  TrendingUp,
  Target,
  BarChart3,
  Shield,
} from 'lucide-react';
import { usePortfolioStore } from '../stores/portfolioStore';
import { localDataApi, type PerformanceRiskData, type PortfolioCompositionData } from '../services/api';
import { PerformanceChart } from '../components/charts/PerformanceChart';
import { RollingMetricChart } from '../components/charts/RollingMetricChart';
import { CompositionTimeSeriesChart } from '../components/charts/CompositionTimeSeriesChart';
import { formatPercent } from '../utils/formatters';

interface SlideProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

function Slide({ children, title, subtitle }: SlideProps) {
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-white rounded-2xl shadow-xl overflow-hidden">
      {(title || subtitle) && (
        <div className="px-12 pt-10 pb-4">
          {title && (
            <h1 className="text-4xl font-bold text-terebinth-dark">{title}</h1>
          )}
          {subtitle && (
            <p className="text-xl text-gray-500 mt-2">{subtitle}</p>
          )}
        </div>
      )}
      <div className="flex-1 px-12 pb-10 overflow-auto">{children}</div>
    </div>
  );
}

function TitleSlide({ quarterLabel }: { quarterLabel: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-terebinth-dark to-terebinth-primary rounded-2xl shadow-xl text-white">
      <div className="text-center">
        <div className="mx-auto mb-8 p-4 bg-white rounded-2xl shadow-lg">
          <img
            src="/terebinth-logo.png"
            alt="Terebinth Capital"
            className="h-16 w-auto"
          />
        </div>
        <h1 className="text-5xl font-bold mb-4">Global Equity Strategy</h1>
        <h2 className="text-3xl font-light text-white/80 mb-8">
          Emerging Markets Portfolio
        </h2>
        <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 rounded-full">
          <span className="text-xl">{quarterLabel}</span>
        </div>
      </div>
    </div>
  );
}

function ExecutiveSummarySlide({
  statistics,
  performanceSummary,
}: {
  statistics: {
    alphaScore: number;
    activeShare: number;
    trackingError: number;
    numberOfStocks: number;
    volatility: number;
  } | null;
  performanceSummary: {
    annualisedReturn: number;
    annualisedBenchmark: number;
    annualisedExcess: number;
  } | null;
}) {
  const metrics = [
    {
      icon: <TrendingUp className="w-6 h-6" />,
      label: 'Alpha Score',
      value: statistics?.alphaScore?.toFixed(2) ?? '-',
      description: 'TC Proprietary Score',
      highlight: true,
    },
    {
      icon: <Target className="w-6 h-6" />,
      label: 'Active Share',
      value: statistics ? formatPercent(statistics.activeShare) : '-',
      description: 'Portfolio differentiation',
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      label: 'Annualized Alpha',
      value: performanceSummary
        ? `${performanceSummary.annualisedExcess >= 0 ? '+' : ''}${performanceSummary.annualisedExcess.toFixed(2)}%`
        : '-',
      description: 'Excess return p.a.',
      highlight: performanceSummary && performanceSummary.annualisedExcess > 0,
    },
    {
      icon: <Shield className="w-6 h-6" />,
      label: 'Tracking Error',
      value: statistics ? formatPercent(statistics.trackingError) : '-',
      description: 'Annualized',
    },
  ];

  return (
    <Slide title="Executive Summary" subtitle="Key portfolio metrics at a glance">
      <div className="grid grid-cols-2 gap-8 mt-8">
        {metrics.map((metric, idx) => (
          <div
            key={idx}
            className={`p-8 rounded-2xl ${
              metric.highlight
                ? 'bg-terebinth-primary/10 border-2 border-terebinth-primary'
                : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-4 mb-4">
              <div
                className={`p-3 rounded-xl ${
                  metric.highlight ? 'bg-terebinth-primary text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {metric.icon}
              </div>
              <div>
                <p className="text-sm text-gray-500">{metric.label}</p>
                <p className="text-3xl font-bold text-terebinth-dark">{metric.value}</p>
              </div>
            </div>
            <p className="text-gray-500">{metric.description}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Investment Thesis</h3>
        <p className="text-blue-800">
          The Global Equity EM strategy employs a systematic, factor-based approach to identify
          high-conviction opportunities in emerging markets. With {statistics?.numberOfStocks ?? '-'} holdings
          and {statistics ? formatPercent(statistics.activeShare) : '-'} active share, the portfolio
          maintains significant differentiation from the benchmark while targeting superior risk-adjusted returns.
        </p>
      </div>
    </Slide>
  );
}

function PerformanceSlide({
  performanceData,
}: {
  performanceData: PerformanceRiskData | null;
}) {
  const chartData = useMemo(() => {
    if (!performanceData?.performance) return [];
    return performanceData.performance.map((d) => ({
      date: d.date,
      portfolioValue: d.portfolioValue,
      benchmarkValue: d.benchmarkValue,
      cumulativeReturn: (d.portfolioValue - 100) / 100,
      benchmarkReturn: (d.benchmarkValue - 100) / 100,
      alpha: d.alpha || 0,
    }));
  }, [performanceData]);

  const summary = useMemo(() => {
    if (!performanceData?.performance || performanceData.performance.length < 2) return null;
    const data = performanceData.performance;
    const first = data[0];
    const last = data[data.length - 1];
    const totalPortReturn = ((last.portfolioValue - first.portfolioValue) / first.portfolioValue) * 100;
    const totalBmkReturn = ((last.benchmarkValue - first.benchmarkValue) / first.benchmarkValue) * 100;
    return {
      portfolioReturn: totalPortReturn,
      benchmarkReturn: totalBmkReturn,
      excessReturn: totalPortReturn - totalBmkReturn,
    };
  }, [performanceData]);

  return (
    <Slide title="Portfolio Performance" subtitle="$100 invested since inception">
      <div className="mt-4">
        {chartData.length > 0 ? (
          <PerformanceChart data={chartData} title="" height={320} />
        ) : (
          <div className="h-80 flex items-center justify-center text-gray-400">
            No performance data available
          </div>
        )}
      </div>
      {summary && (
        <div className="grid grid-cols-3 gap-6 mt-6">
          <div className="text-center p-4 bg-terebinth-primary/10 rounded-xl">
            <p className="text-sm text-gray-500 mb-1">Portfolio Return</p>
            <p className="text-2xl font-bold text-terebinth-primary">
              {summary.portfolioReturn.toFixed(1)}%
            </p>
          </div>
          <div className="text-center p-4 bg-gray-100 rounded-xl">
            <p className="text-sm text-gray-500 mb-1">Benchmark Return</p>
            <p className="text-2xl font-bold text-gray-600">
              {summary.benchmarkReturn.toFixed(1)}%
            </p>
          </div>
          <div className="text-center p-4 bg-green-100 rounded-xl">
            <p className="text-sm text-gray-500 mb-1">Excess Return</p>
            <p className={`text-2xl font-bold ${summary.excessReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.excessReturn >= 0 ? '+' : ''}{summary.excessReturn.toFixed(1)}%
            </p>
          </div>
        </div>
      )}
    </Slide>
  );
}

function RollingAlphaSlide({
  performanceData,
}: {
  performanceData: PerformanceRiskData | null;
}) {
  return (
    <Slide title="Alpha Generation" subtitle="Consistent outperformance over time">
      <div className="grid grid-cols-2 gap-8 mt-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">1-Year Rolling Alpha</h3>
          {performanceData?.rollingAlpha1Y && performanceData.rollingAlpha1Y.length > 0 ? (
            <RollingMetricChart
              data={performanceData.rollingAlpha1Y}
              height={240}
              color="#3182CE"
              label="1Y Alpha"
              valueFormatter={(v) => `${v.toFixed(2)}%`}
            />
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl">
              No data available
            </div>
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">3-Year Rolling Alpha</h3>
          {performanceData?.rollingAlpha3Y && performanceData.rollingAlpha3Y.length > 0 ? (
            <RollingMetricChart
              data={performanceData.rollingAlpha3Y}
              height={240}
              color="#38A169"
              label="3Y Alpha"
              valueFormatter={(v) => `${v.toFixed(2)}%`}
            />
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl">
              No data available
            </div>
          )}
        </div>
      </div>
      <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
        <p className="text-amber-800">
          <strong>Key Insight:</strong> The strategy has demonstrated persistent alpha generation
          across market cycles, with positive rolling returns in the majority of observation periods.
        </p>
      </div>
    </Slide>
  );
}

function RegionExposureSlide({
  compositionData,
}: {
  compositionData: PortfolioCompositionData | null;
}) {
  return (
    <Slide title="Regional Allocation" subtitle="Geographic diversification over time">
      <div className="mt-4">
        {compositionData?.region && compositionData.region.length > 0 ? (
          <CompositionTimeSeriesChart
            data={compositionData.region}
            height={380}
            categoryType="region"
          />
        ) : (
          <div className="h-96 flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl">
            No composition data available
          </div>
        )}
      </div>
    </Slide>
  );
}

function TopHoldingsSlide({
  holdings,
}: {
  holdings: Array<{
    ticker: string;
    portfolioWeight: number;
    benchmarkWeight: number;
    activeWeight: number;
  }>;
}) {
  const top10 = holdings.slice(0, 10);

  return (
    <Slide title="Top 10 Holdings" subtitle="Highest conviction positions">
      <div className="mt-4">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 text-gray-500 font-medium">#</th>
              <th className="text-left py-3 text-gray-500 font-medium">Ticker</th>
              <th className="text-right py-3 text-gray-500 font-medium">Portfolio</th>
              <th className="text-right py-3 text-gray-500 font-medium">Benchmark</th>
              <th className="text-right py-3 text-gray-500 font-medium">Active</th>
            </tr>
          </thead>
          <tbody>
            {top10.map((holding, idx) => (
              <tr key={holding.ticker} className="border-b border-gray-100">
                <td className="py-3 text-gray-400">{idx + 1}</td>
                <td className="py-3 font-semibold text-terebinth-dark">{holding.ticker}</td>
                <td className="py-3 text-right font-mono">
                  {((holding.portfolioWeight || 0) * 100).toFixed(2)}%
                </td>
                <td className="py-3 text-right font-mono text-gray-500">
                  {((holding.benchmarkWeight || 0) * 100).toFixed(2)}%
                </td>
                <td
                  className={`py-3 text-right font-mono font-semibold ${
                    (holding.activeWeight || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {(holding.activeWeight || 0) >= 0 ? '+' : ''}
                  {((holding.activeWeight || 0) * 100).toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 flex items-center gap-4">
        <div className="flex-1 p-4 bg-blue-50 rounded-xl text-center">
          <p className="text-sm text-gray-500">Top 10 Weight</p>
          <p className="text-xl font-bold text-terebinth-primary">
            {(top10.reduce((sum, h) => sum + (h.portfolioWeight || 0), 0) * 100).toFixed(1)}%
          </p>
        </div>
        <div className="flex-1 p-4 bg-gray-100 rounded-xl text-center">
          <p className="text-sm text-gray-500">Avg Active Weight</p>
          <p className="text-xl font-bold text-gray-600">
            {((top10.reduce((sum, h) => sum + (h.activeWeight || 0), 0) / top10.length) * 100).toFixed(2)}%
          </p>
        </div>
      </div>
    </Slide>
  );
}

function RiskMetricsSlide({
  performanceData,
  statistics,
}: {
  performanceData: PerformanceRiskData | null;
  statistics: {
    volatility: number;
    trackingError: number;
  } | null;
}) {
  return (
    <Slide title="Risk Management" subtitle="Volatility and tracking error analysis">
      <div className="grid grid-cols-2 gap-8 mt-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Rolling Volatility</h3>
          {performanceData?.volatility && performanceData.volatility.length > 0 ? (
            <RollingMetricChart
              data={performanceData.volatility.filter((v) => v.value !== null) as Array<{date: string; value: number}>}
              height={240}
              color="#DD6B20"
              label="Volatility"
              valueFormatter={(v) => `${v.toFixed(2)}%`}
            />
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl">
              No data available
            </div>
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Rolling Tracking Error</h3>
          {performanceData?.trackingError && performanceData.trackingError.length > 0 ? (
            <RollingMetricChart
              data={performanceData.trackingError.filter((v) => v.value !== null) as Array<{date: string; value: number}>}
              height={240}
              color="#9F7AEA"
              label="Tracking Error"
              valueFormatter={(v) => `${v.toFixed(2)}%`}
            />
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl">
              No data available
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6 mt-6">
        <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
          <p className="text-sm text-gray-500">Current Volatility</p>
          <p className="text-2xl font-bold text-orange-600">
            {statistics ? formatPercent(statistics.volatility) : '-'}
          </p>
        </div>
        <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
          <p className="text-sm text-gray-500">Current Tracking Error</p>
          <p className="text-2xl font-bold text-purple-600">
            {statistics ? formatPercent(statistics.trackingError) : '-'}
          </p>
        </div>
      </div>
    </Slide>
  );
}

function ConclusionSlide() {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-terebinth-dark to-terebinth-primary rounded-2xl shadow-xl text-white">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold mb-8">Key Takeaways</h1>
        <div className="space-y-6 text-left">
          {[
            'Systematic factor-based approach with proven alpha generation',
            'High active share ensures meaningful differentiation from benchmark',
            'Disciplined risk management with controlled tracking error',
            'Diversified exposure across emerging market regions',
            'Concentrated high-conviction portfolio with transparent positioning',
          ].map((point, idx) => (
            <div key={idx} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="font-bold">{idx + 1}</span>
              </div>
              <p className="text-lg text-white/90">{point}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-8 border-t border-white/20">
          <p className="text-white/60 mb-4">Thank you for your attention</p>
          <div className="inline-block p-3 bg-white rounded-xl">
            <img
              src="/terebinth-logo.png"
              alt="Terebinth Capital"
              className="h-10 w-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Presentation() {
  const currentSnapshot = usePortfolioStore((state) => state.currentSnapshot);
  const setCurrentSnapshot = usePortfolioStore((state) => state.setCurrentSnapshot);
  const filters = usePortfolioStore((state) => state.filters);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [performanceData, setPerformanceData] = useState<PerformanceRiskData | null>(null);
  const [compositionData, setCompositionData] = useState<PortfolioCompositionData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [perfData, compData, quarters] = await Promise.all([
          localDataApi.getPerformanceRisk(),
          localDataApi.getPortfolioComposition(),
          localDataApi.getQuarters(),
        ]);
        setPerformanceData(perfData);
        setCompositionData(compData);

        if (quarters.quarters.length > 0 && !currentSnapshot) {
          const latestQuarter = quarters.quarters.find((q) => q.id === quarters.latestQuarter) || quarters.quarters[0];
          const top50 = await localDataApi.getTop50(latestQuarter.id, filters.marketType);
          if (top50) {
            setCurrentSnapshot(localDataApi.toPortfolioSnapshot(top50));
          }
        }
      } catch (err) {
        console.error('Failed to load presentation data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentSnapshot, filters.marketType, setCurrentSnapshot]);

  // Auto-play timer
  useEffect(() => {
    if (!isAutoPlay) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [isAutoPlay]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        setIsAutoPlay(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const statistics = currentSnapshot?.statistics ?? null;
  const holdings = currentSnapshot?.holdings ?? [];

  const performanceSummary = useMemo(() => {
    if (!performanceData?.performance || performanceData.performance.length < 2) return null;
    const data = performanceData.performance;
    const first = data[0];
    const last = data[data.length - 1];
    const totalPortReturn = ((last.portfolioValue - first.portfolioValue) / first.portfolioValue) * 100;
    const totalBmkReturn = ((last.benchmarkValue - first.benchmarkValue) / first.benchmarkValue) * 100;
    const years = (new Date(last.date).getTime() - new Date(first.date).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const annPortReturn = (Math.pow(1 + totalPortReturn / 100, 1 / years) - 1) * 100;
    const annBmkReturn = (Math.pow(1 + totalBmkReturn / 100, 1 / years) - 1) * 100;
    return {
      annualisedReturn: annPortReturn,
      annualisedBenchmark: annBmkReturn,
      annualisedExcess: annPortReturn - annBmkReturn,
    };
  }, [performanceData]);

  const slides = [
    <TitleSlide key="title" quarterLabel={currentSnapshot?.quarterLabel || 'Q4 2025'} />,
    <ExecutiveSummarySlide key="summary" statistics={statistics} performanceSummary={performanceSummary} />,
    <PerformanceSlide key="performance" performanceData={performanceData} />,
    <RollingAlphaSlide key="alpha" performanceData={performanceData} />,
    <RegionExposureSlide key="region" compositionData={compositionData} />,
    <TopHoldingsSlide key="holdings" holdings={holdings} />,
    <RiskMetricsSlide key="risk" performanceData={performanceData} statistics={statistics} />,
    <ConclusionSlide key="conclusion" />,
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terebinth-primary mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading presentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">Presentation Mode</h1>
          <span className="text-sm text-gray-500">
            Slide {currentSlide + 1} of {slides.length}
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
              idx === currentSlide ? 'bg-terebinth-primary' : 'bg-gray-300 hover:bg-gray-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
