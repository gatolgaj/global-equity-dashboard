import { useEffect, useRef } from 'react';
import Highcharts from 'highcharts';

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
}

interface FactorBarChartProps {
  factors: FactorScores;
  title?: string;
  height?: number;
  showMFM?: boolean;
}

const FACTOR_CONFIG: { id: keyof FactorScores; label: string; description: string }[] = [
  { id: 'value', label: 'Value', description: 'Price relative to fundamentals' },
  { id: 'growth', label: 'Growth', description: 'Earnings growth potential' },
  { id: 'quality', label: 'Quality', description: 'Financial strength' },
  { id: 'momentum', label: 'Momentum', description: '12-month price momentum' },
  { id: 'sentiment', label: 'Sentiment', description: 'Analyst sentiment' },
  { id: 'size', label: 'Size', description: 'Market capitalization' },
  { id: 'volatility', label: 'Volatility', description: '60-day volatility' },
  { id: 'debt', label: 'Debt', description: 'Leverage level' },
];

export function FactorBarChart({
  factors,
  title,
  height = 300,
  showMFM = false,
}: FactorBarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const categories = FACTOR_CONFIG.map((f) => f.label);
    const data = FACTOR_CONFIG.map((f) => {
      const value = factors[f.id] ?? 0;
      return {
        y: value,
        color: value >= 0 ? '#00A67E' : '#DC3545',
        description: f.description,
      };
    });

    const chart = Highcharts.chart(chartRef.current, {
      chart: {
        type: 'bar',
        height,
        backgroundColor: 'transparent',
      },
      title: {
        text: title,
        style: {
          fontSize: '14px',
          fontWeight: '600',
        },
      },
      credits: {
        enabled: false,
      },
      xAxis: {
        categories,
        labels: {
          style: {
            fontSize: '12px',
          },
        },
      },
      yAxis: {
        title: {
          text: 'Standard Deviations (σ)',
        },
        min: -2.5,
        max: 2.5,
        plotLines: [
          {
            value: 0,
            width: 2,
            color: '#333',
            zIndex: 5,
          },
          {
            value: -0.5,
            width: 1,
            color: '#ddd',
            dashStyle: 'Dash',
          },
          {
            value: 0.5,
            width: 1,
            color: '#ddd',
            dashStyle: 'Dash',
          },
        ],
      },
      tooltip: {
        useHTML: true,
        formatter: function () {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ctx = this as any;
          const point = ctx.point;
          const value = point?.y ?? 0;
          const interpretation =
            Math.abs(value) < 0.5
              ? 'Neutral'
              : value > 1.5
              ? 'Strong positive tilt'
              : value > 0.5
              ? 'Moderate positive tilt'
              : value < -1.5
              ? 'Strong negative tilt'
              : 'Moderate negative tilt';

          return `
            <div style="padding: 8px;">
              <div style="font-weight: 600; margin-bottom: 4px;">${ctx.x}</div>
              <div style="color: #666; font-size: 11px; margin-bottom: 6px;">${point?.description || ''}</div>
              <div style="font-weight: 600; color: ${value >= 0 ? '#00A67E' : '#DC3545'}">
                ${value >= 0 ? '+' : ''}${value.toFixed(2)}σ
              </div>
              <div style="color: #666; font-size: 11px; margin-top: 4px;">${interpretation}</div>
            </div>
          `;
        },
      },
      legend: {
        enabled: false,
      },
      plotOptions: {
        bar: {
          borderRadius: 3,
          dataLabels: {
            enabled: true,
            formatter: function () {
              const value = this.y ?? 0;
              return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
            },
            style: {
              fontSize: '10px',
              fontWeight: '500',
            },
          },
        },
      },
      series: [
        {
          type: 'bar',
          name: 'Factor Exposure',
          data,
        },
      ],
    });

    return () => {
      chart.destroy();
    };
  }, [factors, title, height, showMFM]);

  return (
    <div>
      <div ref={chartRef} />
      {showMFM && factors.mfm_score !== undefined && (
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Multi-Factor Model (MFM) Score</div>
              <div className="text-xs text-gray-500 mt-1">
                Composite score combining all factor exposures
              </div>
            </div>
            <div
              className={`text-3xl font-bold ${
                factors.mfm_score >= 5
                  ? 'text-green-600'
                  : factors.mfm_score >= 3
                  ? 'text-blue-600'
                  : factors.mfm_score >= 0
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`}
            >
              {factors.mfm_score.toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
