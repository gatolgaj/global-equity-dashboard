import { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

interface RollingMetricChartProps {
  data: Array<{ date: string; value: number }>;
  height?: number;
  color?: string;
  label?: string;
  valueFormatter?: (value: number) => string;
}

export function RollingMetricChart({
  data,
  height = 256,
  color = '#3182CE',
  label = 'Value',
  valueFormatter = (v) => v.toFixed(2),
}: RollingMetricChartProps) {
  const options: Highcharts.Options = useMemo(
    () => ({
      chart: {
        type: 'area',
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
        text: undefined,
      },
      xAxis: {
        type: 'datetime',
        labels: {
          style: {
            color: '#718096',
            fontSize: '10px',
          },
        },
        lineColor: '#E2E8F0',
        tickColor: '#E2E8F0',
      },
      yAxis: {
        title: {
          text: undefined,
        },
        labels: {
          style: {
            color: '#718096',
            fontSize: '10px',
          },
          formatter: function () {
            return valueFormatter(this.value as number);
          },
        },
        gridLineColor: '#E2E8F0',
        plotLines: [
          {
            value: 0,
            color: '#CBD5E0',
            width: 1,
            zIndex: 3,
          },
        ],
      },
      legend: {
        enabled: false,
      },
      tooltip: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E2E8F0',
        borderRadius: 8,
        shadow: true,
        style: {
          fontSize: '12px',
        },
        xDateFormat: '%b %Y',
        formatter: function () {
          return `<b>${Highcharts.dateFormat('%b %Y', this.x as number)}</b><br/>${label}: <b>${valueFormatter(this.y as number)}</b>`;
        },
      },
      plotOptions: {
        area: {
          fillOpacity: 0.2,
          marker: {
            enabled: false,
            states: {
              hover: {
                enabled: true,
                radius: 4,
              },
            },
          },
          threshold: 0,
          negativeFillColor: Highcharts.color('#E53E3E').setOpacity(0.2).get(),
        },
      },
      series: [
        {
          name: label,
          type: 'area',
          data: data.map((d) => [new Date(d.date).getTime(), d.value]),
          color: color,
          negativeColor: '#E53E3E',
          lineWidth: 2,
        },
      ],
      credits: {
        enabled: false,
      },
    }),
    [data, height, color, label, valueFormatter]
  );

  return (
    <div className="w-full">
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
}
