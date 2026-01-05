import { useEffect, useRef, useState } from 'react';
import Highcharts from 'highcharts';

interface SectorFactorData {
  sector: string;
  count: number;
  totalWeight: number;
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

interface SectorFactorHeatmapProps {
  data: SectorFactorData[];
  height?: number;
}

const FACTORS = ['value', 'growth', 'quality', 'momentum', 'sentiment', 'volatility', 'debt'] as const;
const FACTOR_LABELS: Record<string, string> = {
  value: 'Value',
  growth: 'Growth',
  quality: 'Quality',
  momentum: 'Momentum',
  sentiment: 'Sentiment',
  volatility: 'Volatility',
  debt: 'Debt',
};

// Track if heatmap module has been initialized
let heatmapLoaded = false;

export function SectorFactorHeatmap({ data, height = 450 }: SectorFactorHeatmapProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(heatmapLoaded);

  // Load heatmap module
  useEffect(() => {
    if (heatmapLoaded) {
      setIsReady(true);
      return;
    }

    import('highcharts/modules/heatmap').then((module) => {
      const init = module.default as unknown as ((h: typeof Highcharts) => void) | undefined;
      if (typeof init === 'function' && !heatmapLoaded) {
        init(Highcharts);
        heatmapLoaded = true;
      }
      setIsReady(true);
    }).catch((err) => {
      console.error('Failed to load highcharts heatmap:', err);
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    if (!chartRef.current || data.length === 0 || !isReady) return;

    // Prepare data for heatmap
    const sectors = data.map((d) => `${d.sector} (${(d.totalWeight * 100).toFixed(1)}%)`);
    const heatmapData: number[][] = [];

    data.forEach((sector, sectorIdx) => {
      FACTORS.forEach((factor, factorIdx) => {
        const value = sector[factor] ?? 0;
        heatmapData.push([factorIdx, sectorIdx, value]);
      });
    });

    const chart = Highcharts.chart(chartRef.current, {
      chart: {
        type: 'heatmap',
        height,
        backgroundColor: 'transparent',
        marginTop: 40,
        marginBottom: 80,
      },
      title: {
        text: undefined,
      },
      credits: {
        enabled: false,
      },
      xAxis: {
        categories: FACTORS.map((f) => FACTOR_LABELS[f]),
        opposite: true,
        labels: {
          style: {
            fontSize: '11px',
            fontWeight: '500',
          },
        },
      },
      yAxis: {
        categories: sectors,
        title: undefined,
        labels: {
          style: {
            fontSize: '11px',
          },
        },
        reversed: true,
      },
      colorAxis: {
        min: -2,
        max: 2,
        stops: [
          [0, '#DC3545'],      // Red for negative
          [0.25, '#FCA5A5'],   // Light red
          [0.5, '#F3F4F6'],    // Gray for neutral
          [0.75, '#86EFAC'],   // Light green
          [1, '#00A67E'],      // Green for positive
        ],
        labels: {
          formatter: function () {
            const val = this.value as number;
            return val > 0 ? `+${val}` : `${val}`;
          },
        },
      },
      legend: {
        align: 'center',
        verticalAlign: 'bottom',
        layout: 'horizontal',
        margin: 0,
        y: 25,
        symbolHeight: 12,
      },
      tooltip: {
        useHTML: true,
        formatter: function () {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ctx = this as any;
          const point = ctx.point;
          const sector = sectors[point?.y ?? 0];
          const factor = FACTOR_LABELS[FACTORS[point?.x ?? 0]];
          const value = point?.value ?? 0;

          const interpretation =
            Math.abs(value) < 0.5
              ? 'Neutral exposure'
              : value > 1.5
              ? 'Strong overweight'
              : value > 0.5
              ? 'Moderate overweight'
              : value < -1.5
              ? 'Strong underweight'
              : 'Moderate underweight';

          return `
            <div style="padding: 8px; min-width: 160px;">
              <div style="font-weight: 600; margin-bottom: 4px;">${sector}</div>
              <div style="color: #666; font-size: 11px;">${factor} Factor</div>
              <div style="margin-top: 8px;">
                <span style="font-weight: 600; font-size: 16px; color: ${
                  value >= 0 ? '#00A67E' : '#DC3545'
                }">
                  ${value >= 0 ? '+' : ''}${value.toFixed(2)}σ
                </span>
              </div>
              <div style="color: #666; font-size: 11px; margin-top: 4px;">${interpretation}</div>
            </div>
          `;
        },
      },
      series: [
        {
          type: 'heatmap',
          name: 'Factor Exposure',
          borderWidth: 1,
          borderColor: '#ffffff',
          data: heatmapData,
          dataLabels: {
            enabled: true,
            formatter: function () {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const ctx = this as any;
              const value = ctx.point?.value ?? 0;
              if (Math.abs(value) < 0.3) return '';
              return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
            },
            style: {
              fontSize: '10px',
              fontWeight: '500',
              textOutline: 'none',
            },
          },
        },
      ],
    });

    return () => {
      chart.destroy();
    };
  }, [data, height, isReady]);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        No sector factor data available
      </div>
    );
  }

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
      <div className="flex justify-center gap-6 mt-2 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#DC3545' }} />
          <span>Underweight</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#F3F4F6' }} />
          <span>Neutral</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#00A67E' }} />
          <span>Overweight</span>
        </div>
      </div>
    </div>
  );
}
