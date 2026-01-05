import { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import type { PerformancePoint } from '../../types/portfolio';

interface PerformanceChartProps {
  data: PerformancePoint[];
  title?: string;
  height?: number;
}

export function PerformanceChart({
  data,
  title = '$100 Invested Performance',
  height = 400,
}: PerformanceChartProps) {
  const options: Highcharts.Options = useMemo(
    () => ({
      chart: {
        type: 'line',
        height,
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        zooming: {
          type: 'x',
        },
      },
      title: {
        text: title,
        align: 'left',
        style: {
          fontSize: '16px',
          fontWeight: '600',
          color: '#1A202C',
        },
      },
      subtitle: {
        text: 'Click and drag to zoom',
        align: 'left',
        style: {
          fontSize: '12px',
          color: '#718096',
        },
      },
      xAxis: {
        type: 'datetime',
        labels: {
          style: {
            color: '#718096',
            fontSize: '11px',
          },
        },
        lineColor: '#E2E8F0',
        tickColor: '#E2E8F0',
      },
      yAxis: {
        title: {
          text: 'Value ($)',
          style: {
            color: '#718096',
          },
        },
        labels: {
          style: {
            color: '#718096',
            fontSize: '11px',
          },
          formatter: function () {
            return '$' + Highcharts.numberFormat(this.value as number, 0);
          },
        },
        gridLineColor: '#E2E8F0',
      },
      legend: {
        enabled: true,
        align: 'right',
        verticalAlign: 'top',
        layout: 'horizontal',
        itemStyle: {
          color: '#4A5568',
          fontSize: '12px',
          fontWeight: '500',
        },
        itemHoverStyle: {
          color: '#1E3A5F',
        },
      },
      tooltip: {
        shared: true,
        backgroundColor: '#FFFFFF',
        borderColor: '#E2E8F0',
        borderRadius: 8,
        shadow: true,
        style: {
          fontSize: '12px',
        },
        xDateFormat: '%b %d, %Y',
        valueDecimals: 2,
        valuePrefix: '$',
      },
      plotOptions: {
        series: {
          marker: {
            enabled: false,
            states: {
              hover: {
                enabled: true,
                radius: 4,
              },
            },
          },
        },
      },
      series: [
        {
          name: 'Portfolio',
          type: 'line',
          data: data.map((d) => [new Date(d.date).getTime(), d.portfolioValue]),
          color: '#3182CE',
          lineWidth: 2,
        },
        {
          name: 'Benchmark',
          type: 'line',
          data: data.map((d) => [new Date(d.date).getTime(), d.benchmarkValue]),
          color: '#718096',
          lineWidth: 2,
          dashStyle: 'ShortDash',
        },
      ],
      credits: {
        enabled: false,
      },
    }),
    [data, title, height]
  );

  return (
    <div className="w-full">
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
}
