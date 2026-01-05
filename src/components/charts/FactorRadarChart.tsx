import { useEffect, useRef, useState } from 'react';
import Highcharts from 'highcharts';

interface FactorExposure {
  value?: number;
  growth?: number;
  quality?: number;
  debt?: number;
  volatility?: number;
  momentum?: number;
  size?: number;
  sentiment?: number;
  mfm_score?: number;
}

interface FactorRadarChartProps {
  portfolio: FactorExposure;
  benchmark?: FactorExposure;
  height?: number;
  showBenchmark?: boolean;
}

const FACTOR_LABELS: Record<string, string> = {
  value: 'Value',
  growth: 'Growth',
  quality: 'Quality',
  debt: 'Debt',
  volatility: 'Volatility',
  momentum: 'Momentum',
  size: 'Size',
  sentiment: 'Sentiment',
};

const FACTOR_ORDER = ['value', 'growth', 'quality', 'momentum', 'sentiment', 'size', 'volatility', 'debt'];

// Track if highcharts-more has been initialized
let highchartsMoreLoaded = false;

export function FactorRadarChart({
  portfolio,
  benchmark,
  height = 400,
  showBenchmark = true,
}: FactorRadarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(highchartsMoreLoaded);

  // Load highcharts-more module
  useEffect(() => {
    if (highchartsMoreLoaded) {
      setIsReady(true);
      return;
    }

    import('highcharts/highcharts-more').then((module) => {
      const init = module.default as unknown as ((h: typeof Highcharts) => void) | undefined;
      if (typeof init === 'function' && !highchartsMoreLoaded) {
        init(Highcharts);
        highchartsMoreLoaded = true;
      }
      setIsReady(true);
    }).catch((err) => {
      console.error('Failed to load highcharts-more:', err);
      setIsReady(true); // Still try to render
    });
  }, []);

  // Create chart once module is loaded
  useEffect(() => {
    if (!chartRef.current || !isReady) return;

    const categories = FACTOR_ORDER.map((f) => FACTOR_LABELS[f]);
    const portfolioData = FACTOR_ORDER.map((f) => portfolio[f as keyof FactorExposure] ?? 0);
    const benchmarkData = benchmark
      ? FACTOR_ORDER.map((f) => benchmark[f as keyof FactorExposure] ?? 0)
      : [];

    const series: Highcharts.SeriesOptionsType[] = [
      {
        type: 'area',
        name: 'Portfolio',
        data: portfolioData,
        pointPlacement: 'on',
        color: '#0066CC',
        fillOpacity: 0.3,
        lineWidth: 2,
        marker: {
          enabled: true,
          radius: 4,
        },
      } as Highcharts.SeriesAreaOptions,
    ];

    if (showBenchmark && benchmark && Object.keys(benchmark).length > 0) {
      series.push({
        type: 'area',
        name: 'Benchmark',
        data: benchmarkData,
        pointPlacement: 'on',
        color: '#999999',
        fillOpacity: 0.1,
        lineWidth: 2,
        dashStyle: 'Dash',
        marker: {
          enabled: true,
          radius: 3,
        },
      } as Highcharts.SeriesAreaOptions);
    }

    const chart = Highcharts.chart(chartRef.current, {
      chart: {
        polar: true,
        type: 'area',
        height,
        backgroundColor: 'transparent',
      },
      title: {
        text: undefined,
      },
      credits: {
        enabled: false,
      },
      pane: {
        size: '85%',
      },
      xAxis: {
        categories,
        tickmarkPlacement: 'on',
        lineWidth: 0,
        labels: {
          style: {
            fontSize: '12px',
            fontWeight: '500',
          },
        },
      },
      yAxis: {
        gridLineInterpolation: 'polygon',
        lineWidth: 0,
        min: -2,
        max: 2.5,
        tickInterval: 0.5,
        labels: {
          formatter: function () {
            const val = this.value as number;
            if (val === 0) return '0';
            return val > 0 ? `+${val}` : `${val}`;
          },
          style: {
            fontSize: '10px',
            color: '#666',
          },
        },
        plotBands: [
          {
            from: -0.5,
            to: 0.5,
            color: 'rgba(0, 200, 100, 0.05)',
          },
          {
            from: 0.5,
            to: 1.5,
            color: 'rgba(0, 100, 200, 0.05)',
          },
          {
            from: -1.5,
            to: -0.5,
            color: 'rgba(200, 100, 0, 0.05)',
          },
        ],
      },
      tooltip: {
        shared: true,
        useHTML: true,
        formatter: function () {
          const points = this.points || [];
          let html = `<div style="padding: 8px;">
            <div style="font-weight: 600; margin-bottom: 6px;">${this.x}</div>`;

          points.forEach((point) => {
            const value = point.y ?? 0;
            const color = value >= 0 ? '#00A67E' : '#DC3545';
            html += `<div style="margin: 4px 0;">
              <span style="color: ${point.color}">\u25CF</span>
              ${point.series.name}:
              <span style="font-weight: 600; color: ${color}">
                ${value >= 0 ? '+' : ''}${value.toFixed(2)}\u03C3
              </span>
            </div>`;
          });

          html += '</div>';
          return html;
        },
      },
      legend: {
        align: 'center',
        verticalAlign: 'bottom',
        layout: 'horizontal',
      },
      series,
    });

    return () => {
      chart.destroy();
    };
  }, [portfolio, benchmark, height, showBenchmark, isReady]);

  if (!isReady) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <div className="text-gray-400">Loading chart...</div>
      </div>
    );
  }

  return (
    <div>
      <div ref={chartRef} />
      <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-100 border border-blue-400" />
          <span>Neutral Zone (-0.5 to +0.5)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-400" />
          <span>Positive Tilt ({'>'}+0.5)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-100 border border-red-400" />
          <span>Negative Tilt ({'<'}-0.5)</span>
        </div>
      </div>
    </div>
  );
}
