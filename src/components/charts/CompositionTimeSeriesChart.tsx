import { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

interface DataPoint {
  date: string;
  name: string;
  weight: number;
}

interface CompositionTimeSeriesChartProps {
  data: DataPoint[];
  height?: number;
  categoryType: 'sector' | 'country' | 'region';
}

// Color palette for consistent category colors
const CATEGORY_COLORS: Record<string, string> = {
  // Regions
  'Asia': '#3182CE',
  'North America': '#38A169',
  'West Europe': '#DD6B20',
  'Pacific': '#9F7AEA',
  'Mid East': '#E53E3E',
  'East Europe': '#D69E2E',
  'South America': '#319795',
  'Africa': '#805AD5',

  // Sectors (top ones)
  'Electronic Technology': '#3182CE',
  'Finance': '#38A169',
  'Technology Services': '#DD6B20',
  'Health Technology': '#9F7AEA',
  'Consumer Services': '#E53E3E',
  'Producer Manufacturing': '#D69E2E',
  'Retail Trade': '#319795',
  'Process Industries': '#805AD5',
  'Consumer Durables': '#00B5D8',
  'Energy Minerals': '#C05621',
};

export function CompositionTimeSeriesChart({
  data,
  height = 450,
  categoryType,
}: CompositionTimeSeriesChartProps) {
  const options: Highcharts.Options = useMemo(() => {
    // Group data by category name
    const categories = [...new Set(data.map(d => d.name))];

    // Group data by date
    const dateMap = new Map<string, Map<string, number>>();
    data.forEach(d => {
      if (!dateMap.has(d.date)) {
        dateMap.set(d.date, new Map());
      }
      dateMap.get(d.date)!.set(d.name, d.weight);
    });

    // Sort dates
    const sortedDates = [...dateMap.keys()].sort();

    // Calculate total weight per category across all dates for sorting
    const categoryTotals = new Map<string, number>();
    categories.forEach(cat => {
      let total = 0;
      sortedDates.forEach(date => {
        total += dateMap.get(date)?.get(cat) || 0;
      });
      categoryTotals.set(cat, total);
    });

    // Sort categories by total weight (descending) and limit to top N
    const sortedCategories = [...categories]
      .sort((a, b) => (categoryTotals.get(b) || 0) - (categoryTotals.get(a) || 0))
      .slice(0, categoryType === 'region' ? 7 : 10);

    // Build series data
    const series: Highcharts.SeriesOptionsType[] = sortedCategories.map((category, index) => ({
      name: category,
      type: 'area' as const,
      data: sortedDates.map(date => {
        const timestamp = new Date(date).getTime();
        const value = (dateMap.get(date)?.get(category) || 0) * 100;
        return [timestamp, value];
      }),
      color: CATEGORY_COLORS[category] || Highcharts.getOptions().colors![index % 10],
      fillOpacity: 0.5,
    }));

    return {
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
            fontSize: '11px',
          },
        },
        lineColor: '#E2E8F0',
        tickColor: '#E2E8F0',
      },
      yAxis: {
        title: {
          text: 'Weight (%)',
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
            return (this.value as number).toFixed(0) + '%';
          },
        },
        gridLineColor: '#E2E8F0',
        max: categoryType === 'region' ? 100 : undefined,
      },
      legend: {
        enabled: true,
        align: 'right',
        verticalAlign: 'top',
        layout: 'vertical',
        itemStyle: {
          color: '#4A5568',
          fontSize: '11px',
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
        xDateFormat: '%b %Y',
        pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y:.2f}%</b><br/>',
      },
      plotOptions: {
        area: {
          stacking: categoryType === 'region' ? 'percent' : 'normal',
          marker: {
            enabled: false,
            states: {
              hover: {
                enabled: true,
                radius: 3,
              },
            },
          },
          lineWidth: 1,
        },
      },
      series,
      credits: {
        enabled: false,
      },
    };
  }, [data, height, categoryType]);

  return (
    <div className="w-full">
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
}
