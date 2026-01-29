import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import type { SectorConcentration } from '../../types/risk';

interface ConcentrationChartProps {
  data: SectorConcentration[];
  height?: number;
  showBenchmark?: boolean;
}

export function ConcentrationChart({
  data,
  height = 350,
  showBenchmark = true,
}: ConcentrationChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No concentration data available
      </div>
    );
  }

  const categories = data.map((d) => d.sector);
  const portfolioData = data.map((d) => d.portfolioWeight);
  const benchmarkData = data.map((d) => d.benchmarkWeight);
  // activeData is available for future use
  // const activeData = data.map((d) => d.activeWeight);

  const options: Highcharts.Options = {
    chart: {
      type: 'bar',
      height,
      backgroundColor: 'transparent',
      style: { fontFamily: 'Inter, sans-serif' },
    },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: {
      categories,
      labels: {
        style: { color: '#6b7280', fontSize: '11px' },
      },
      lineColor: '#e5e7eb',
    },
    yAxis: {
      title: { text: 'Weight (%)', style: { color: '#6b7280' } },
      labels: {
        format: '{value:.1f}%',
        style: { color: '#6b7280', fontSize: '11px' },
      },
      gridLineColor: '#f3f4f6',
    },
    legend: {
      enabled: true,
      align: 'right',
      verticalAlign: 'top',
      floating: true,
      itemStyle: { color: '#6b7280', fontSize: '11px' },
    },
    tooltip: {
      shared: true,
      backgroundColor: 'white',
      borderColor: '#e5e7eb',
      borderRadius: 8,
      shadow: true,
      formatter: function () {
        const points = this.points || [];
        const sector = String(this.x);
        const sectorData = data.find((d) => d.sector === sector);

        return `
          <div style="font-size: 12px; padding: 4px;">
            <div style="font-weight: 600; margin-bottom: 4px;">${sector}</div>
            ${points
              .map(
                (p) => `
              <div style="color: ${p.color};">
                ${p.series.name}: <b>${p.y?.toFixed(2)}%</b>
              </div>
            `
              )
              .join('')}
            ${
              sectorData
                ? `<div style="color: #6b7280; margin-top: 4px;">Stocks: ${sectorData.stockCount}</div>`
                : ''
            }
          </div>
        `;
      },
    },
    plotOptions: {
      bar: {
        borderRadius: 2,
        borderWidth: 0,
        groupPadding: 0.1,
        pointPadding: 0.05,
      },
    },
    series: [
      {
        type: 'bar',
        name: 'Portfolio',
        data: portfolioData,
        color: '#1B4D3E',
      },
      ...(showBenchmark
        ? [
            {
              type: 'bar' as const,
              name: 'Benchmark',
              data: benchmarkData,
              color: '#94a3b8',
            },
          ]
        : []),
    ],
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

// Additional component for active weight visualization
interface ActiveWeightChartProps {
  data: SectorConcentration[];
  height?: number;
}

export function ActiveWeightChart({ data, height = 300 }: ActiveWeightChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data available
      </div>
    );
  }

  // Sort by active weight for better visualization
  const sortedData = [...data].sort((a, b) => b.activeWeight - a.activeWeight);

  const options: Highcharts.Options = {
    chart: {
      type: 'bar',
      height,
      backgroundColor: 'transparent',
      style: { fontFamily: 'Inter, sans-serif' },
    },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: {
      categories: sortedData.map((d) => d.sector),
      labels: {
        style: { color: '#6b7280', fontSize: '11px' },
      },
      lineColor: '#e5e7eb',
    },
    yAxis: {
      title: { text: 'Active Weight (%)', style: { color: '#6b7280' } },
      labels: {
        format: '{value:.1f}%',
        style: { color: '#6b7280', fontSize: '11px' },
      },
      gridLineColor: '#f3f4f6',
      plotLines: [
        {
          value: 0,
          color: '#9ca3af',
          width: 1,
          zIndex: 3,
        },
      ],
    },
    legend: { enabled: false },
    tooltip: {
      backgroundColor: 'white',
      borderColor: '#e5e7eb',
      borderRadius: 8,
      shadow: true,
      formatter: function () {
        const xValue = String(this.x);
        const sector = sortedData.find((d) => d.sector === xValue);
        const isOverweight = (this.y || 0) > 0;
        return `
          <div style="font-size: 12px; padding: 4px;">
            <div style="font-weight: 600; margin-bottom: 4px;">${xValue}</div>
            <div style="color: ${isOverweight ? '#10b981' : '#ef4444'};">
              ${isOverweight ? 'Overweight' : 'Underweight'}: <b>${Math.abs(this.y || 0).toFixed(2)}%</b>
            </div>
            ${sector ? `<div style="color: #6b7280;">Portfolio: ${sector.portfolioWeight.toFixed(2)}%</div>` : ''}
            ${sector ? `<div style="color: #6b7280;">Benchmark: ${sector.benchmarkWeight.toFixed(2)}%</div>` : ''}
          </div>
        `;
      },
    },
    plotOptions: {
      bar: {
        borderRadius: 2,
        borderWidth: 0,
      },
    },
    series: [
      {
        type: 'bar',
        name: 'Active Weight',
        data: sortedData.map((d) => ({
          y: d.activeWeight,
          color: d.activeWeight >= 0 ? '#10b981' : '#ef4444',
        })),
      },
    ],
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}
