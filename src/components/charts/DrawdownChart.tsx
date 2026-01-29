import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import type { DrawdownPoint } from '../../types/risk';

interface DrawdownChartProps {
  data: DrawdownPoint[];
  height?: number;
  maxDrawdownDate?: string; // Currently unused but kept for future annotation
}

export function DrawdownChart({ data, height = 350, maxDrawdownDate: _maxDrawdownDate }: DrawdownChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No drawdown data available
      </div>
    );
  }

  // Find max drawdown point for annotation
  const maxDD = data.reduce((max, d) => (d.drawdown > max.drawdown ? d : max), data[0]);

  const options: Highcharts.Options = {
    chart: {
      type: 'area',
      height,
      backgroundColor: 'transparent',
      style: { fontFamily: 'Inter, sans-serif' },
    },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: {
      type: 'datetime',
      labels: {
        format: '{value:%b %Y}',
        style: { color: '#6b7280', fontSize: '11px' },
      },
      lineColor: '#e5e7eb',
      tickColor: '#e5e7eb',
    },
    yAxis: {
      title: { text: 'Drawdown (%)', style: { color: '#6b7280' } },
      labels: {
        format: '{value:.1f}%',
        style: { color: '#6b7280', fontSize: '11px' },
      },
      gridLineColor: '#f3f4f6',
      max: 0,
      min: -Math.max(...data.map((d) => d.drawdown)) * 1.1,
      reversed: false,
      plotLines: [
        {
          value: -maxDD.drawdown,
          color: '#ef4444',
          width: 1,
          dashStyle: 'Dash',
          label: {
            text: `Max DD: ${maxDD.drawdown.toFixed(1)}%`,
            align: 'right',
            style: { color: '#ef4444', fontSize: '10px' },
          },
        },
      ],
    },
    legend: { enabled: false },
    tooltip: {
      shared: true,
      backgroundColor: 'white',
      borderColor: '#e5e7eb',
      borderRadius: 8,
      shadow: true,
      useHTML: true,
      formatter: function () {
        const point = this.points?.[0];
        if (!point) return '';
        const date = Highcharts.dateFormat('%b %d, %Y', point.x as number);
        return `
          <div style="font-size: 12px; padding: 4px;">
            <div style="color: #6b7280; margin-bottom: 4px;">${date}</div>
            <div style="color: #ef4444; font-weight: 600;">
              Drawdown: ${(-point.y!).toFixed(2)}%
            </div>
          </div>
        `;
      },
    },
    plotOptions: {
      area: {
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, 'rgba(239, 68, 68, 0.4)'],
            [1, 'rgba(239, 68, 68, 0.05)'],
          ],
        },
        lineColor: '#ef4444',
        lineWidth: 2,
        marker: { enabled: false },
        threshold: 0,
      },
    },
    series: [
      {
        type: 'area',
        name: 'Drawdown',
        data: data.map((d) => [
          new Date(d.date).getTime(),
          -d.drawdown, // Negate so it shows below 0
        ]),
      },
    ],
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}
