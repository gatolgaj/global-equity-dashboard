import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import type { FactorRiskContribution } from '../../types/risk';

interface RiskDecompositionChartProps {
  factors: FactorRiskContribution[];
  systematicRisk: number;
  idiosyncraticRisk: number;
  height?: number;
}

export function RiskDecompositionChart({
  factors,
  systematicRisk: _systematicRisk, // Available for future use
  idiosyncraticRisk,
  height = 350,
}: RiskDecompositionChartProps) {
  if (!factors || factors.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No factor risk data available
      </div>
    );
  }

  // Prepare data for waterfall-style chart
  const categories = [...factors.map((f) => f.name), 'Idiosyncratic', 'Total'];

  // Add total as sum
  const totalRisk = Math.sqrt(
    factors.reduce((sum, f) => sum + Math.pow(f.contribution, 2), 0) +
      Math.pow(idiosyncraticRisk, 2)
  );

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
      categories,
      labels: {
        style: { color: '#6b7280', fontSize: '11px' },
        rotation: -45,
      },
      lineColor: '#e5e7eb',
    },
    yAxis: {
      title: { text: 'Risk Contribution (%)', style: { color: '#6b7280' } },
      labels: {
        format: '{value:.1f}%',
        style: { color: '#6b7280', fontSize: '11px' },
      },
      gridLineColor: '#f3f4f6',
    },
    legend: { enabled: false },
    tooltip: {
      backgroundColor: 'white',
      borderColor: '#e5e7eb',
      borderRadius: 8,
      shadow: true,
      formatter: function () {
        const xValue = String(this.x);
        const factor = factors.find((f) => f.name === xValue);
        if (factor) {
          return `
            <div style="font-size: 12px; padding: 4px;">
              <div style="font-weight: 600; margin-bottom: 4px;">${factor.name}</div>
              <div style="color: #6b7280;">Exposure: <b>${factor.exposure.toFixed(2)}σ</b></div>
              <div style="color: #6b7280;">Contribution: <b>${factor.contribution.toFixed(2)}%</b></div>
              <div style="color: #6b7280;">% of Risk: <b>${factor.percentOfRisk.toFixed(1)}%</b></div>
            </div>
          `;
        }
        if (xValue === 'Idiosyncratic') {
          return `
            <div style="font-size: 12px; padding: 4px;">
              <div style="font-weight: 600; margin-bottom: 4px;">Idiosyncratic Risk</div>
              <div style="color: #6b7280;">Stock-specific risk not explained by factors</div>
              <div style="color: #8b5cf6; font-weight: 600;">${idiosyncraticRisk.toFixed(2)}%</div>
            </div>
          `;
        }
        return `
          <div style="font-size: 12px; padding: 4px;">
            <div style="font-weight: 600;">Total Risk</div>
            <div style="color: #10b981; font-weight: 600;">${totalRisk.toFixed(2)}%</div>
          </div>
        `;
      },
    },
    plotOptions: {
      column: {
        borderRadius: 4,
        borderWidth: 0,
      },
    },
    series: [
      {
        type: 'column',
        name: 'Risk Contribution',
        data: [
          ...factors.map((f, i) => ({
            y: f.contribution,
            color: getFactorColor(i),
          })),
          {
            y: idiosyncraticRisk,
            color: '#8b5cf6',
          },
        ],
      },
    ],
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

function getFactorColor(index: number): string {
  const colors = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#84cc16', // Lime
  ];
  return colors[index % colors.length];
}
