import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

interface VaRChartProps {
  returns: number[]; // Monthly returns in percentage
  var95: number;
  var99: number;
  height?: number;
}

export function VaRChart({ returns, var95, var99, height = 350 }: VaRChartProps) {
  if (!returns || returns.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No return data available
      </div>
    );
  }

  // Create histogram bins
  const min = Math.min(...returns);
  const max = Math.max(...returns);
  const binCount = 25;
  const binWidth = (max - min) / binCount;

  const bins: { x: number; y: number; isNegative: boolean }[] = [];
  for (let i = 0; i < binCount; i++) {
    const binStart = min + i * binWidth;
    const binEnd = min + (i + 1) * binWidth;
    const binMid = (binStart + binEnd) / 2;
    const count = returns.filter((r) => r >= binStart && r < binEnd).length;
    bins.push({
      x: binMid,
      y: count,
      isNegative: binMid < 0,
    });
  }

  const options: Highcharts.Options = {
    chart: {
      type: 'column',
      height,
      backgroundColor: 'transparent',
      style: { fontFamily: 'Inter, sans-serif' },
    },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: {
      title: { text: 'Monthly Return (%)', style: { color: '#6b7280' } },
      labels: {
        format: '{value:.1f}%',
        style: { color: '#6b7280', fontSize: '11px' },
      },
      lineColor: '#e5e7eb',
      tickColor: '#e5e7eb',
      plotLines: [
        {
          value: -var95,
          color: '#f59e0b',
          width: 2,
          dashStyle: 'Dash',
          label: {
            text: `VaR 95%: ${var95.toFixed(1)}%`,
            rotation: 0,
            y: -10,
            style: { color: '#f59e0b', fontSize: '10px', fontWeight: '600' },
          },
          zIndex: 5,
        },
        {
          value: -var99,
          color: '#ef4444',
          width: 2,
          dashStyle: 'Dash',
          label: {
            text: `VaR 99%: ${var99.toFixed(1)}%`,
            rotation: 0,
            y: -25,
            style: { color: '#ef4444', fontSize: '10px', fontWeight: '600' },
          },
          zIndex: 5,
        },
        {
          value: 0,
          color: '#9ca3af',
          width: 1,
          zIndex: 3,
        },
      ],
    },
    yAxis: {
      title: { text: 'Frequency', style: { color: '#6b7280' } },
      labels: { style: { color: '#6b7280', fontSize: '11px' } },
      gridLineColor: '#f3f4f6',
    },
    legend: { enabled: false },
    tooltip: {
      backgroundColor: 'white',
      borderColor: '#e5e7eb',
      borderRadius: 8,
      shadow: true,
      formatter: function () {
        return `
          <div style="font-size: 12px; padding: 4px;">
            <div style="color: #6b7280;">Return Range</div>
            <div style="font-weight: 600;">${(this.x as number).toFixed(2)}%</div>
            <div style="color: #6b7280; margin-top: 4px;">Count: <b>${this.y}</b> months</div>
          </div>
        `;
      },
    },
    plotOptions: {
      column: {
        pointPadding: 0,
        groupPadding: 0,
        borderWidth: 1,
        borderColor: '#e5e7eb',
      },
    },
    series: [
      {
        type: 'column',
        name: 'Returns',
        data: bins.map((bin) => ({
          x: bin.x,
          y: bin.y,
          color: bin.isNegative ? '#fca5a5' : '#86efac',
        })),
      },
    ],
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}
