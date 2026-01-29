import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import type { StressTestResult } from '../../types/risk';

interface StressTestChartProps {
  results: StressTestResult[];
  height?: number;
}

export function StressTestChart({ results, height = 350 }: StressTestChartProps) {
  if (!results || results.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No stress test results available
      </div>
    );
  }

  const categories = results.map((r) => r.scenario.name);
  const portfolioData = results.map((r) => r.portfolioReturn);
  const benchmarkData = results.map((r) => r.benchmarkReturn);

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
      },
      lineColor: '#e5e7eb',
    },
    yAxis: {
      title: { text: 'Return (%)', style: { color: '#6b7280' } },
      labels: {
        format: '{value:.0f}%',
        style: { color: '#6b7280', fontSize: '11px' },
      },
      gridLineColor: '#f3f4f6',
      max: 0,
      plotLines: [
        {
          value: 0,
          color: '#9ca3af',
          width: 1,
          zIndex: 3,
        },
      ],
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
        const scenarioName = String(this.x);
        const result = results.find((r) => r.scenario.name === scenarioName);

        return `
          <div style="font-size: 12px; padding: 4px;">
            <div style="font-weight: 600; margin-bottom: 4px;">${scenarioName}</div>
            ${result ? `<div style="color: #6b7280; font-size: 10px; margin-bottom: 4px;">${result.scenario.startDate} to ${result.scenario.endDate}</div>` : ''}
            ${points
              .map(
                (p) => `
              <div style="color: ${p.series.name === 'Portfolio' ? '#1B4D3E' : '#94a3b8'};">
                ${p.series.name}: <b>${p.y?.toFixed(1)}%</b>
              </div>
            `
              )
              .join('')}
            ${
              result
                ? `
              <div style="border-top: 1px solid #e5e7eb; margin-top: 4px; padding-top: 4px;">
                <div style="color: ${result.excessReturn >= 0 ? '#10b981' : '#ef4444'};">
                  Excess Return: <b>${result.excessReturn >= 0 ? '+' : ''}${result.excessReturn.toFixed(1)}%</b>
                </div>
                <div style="color: #6b7280;">Beta: ${result.beta.toFixed(2)}</div>
                ${result.recoveryMonths !== null ? `<div style="color: #6b7280;">Recovery: ${result.recoveryMonths} months</div>` : ''}
              </div>
            `
                : ''
            }
          </div>
        `;
      },
    },
    plotOptions: {
      column: {
        borderRadius: 4,
        borderWidth: 0,
        groupPadding: 0.15,
        pointPadding: 0.05,
      },
    },
    series: [
      {
        type: 'column',
        name: 'Portfolio',
        data: portfolioData,
        color: '#1B4D3E',
      },
      {
        type: 'column',
        name: 'Benchmark',
        data: benchmarkData,
        color: '#94a3b8',
      },
    ],
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

// Additional component for stress test table
interface StressTestTableProps {
  results: StressTestResult[];
}

export function StressTestTable({ results }: StressTestTableProps) {
  if (!results || results.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No stress test results available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left py-3 px-4 font-medium text-gray-600">Scenario</th>
            <th className="text-left py-3 px-4 font-medium text-gray-600">Period</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">Portfolio</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">Benchmark</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">Excess</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">Max DD</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">Beta</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">Recovery</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, idx) => (
            <tr
              key={result.scenario.id}
              className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
            >
              <td className="py-3 px-4">
                <div className="font-medium text-gray-900">{result.scenario.name}</div>
                <div className="text-xs text-gray-500">{result.scenario.description}</div>
              </td>
              <td className="py-3 px-4 text-gray-600 text-xs">
                {result.scenario.startDate} to {result.scenario.endDate}
              </td>
              <td className="py-3 px-4 text-right font-mono">
                <span className={result.portfolioReturn >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {result.portfolioReturn >= 0 ? '+' : ''}{result.portfolioReturn.toFixed(1)}%
                </span>
              </td>
              <td className="py-3 px-4 text-right font-mono text-gray-600">
                {result.benchmarkReturn.toFixed(1)}%
              </td>
              <td className="py-3 px-4 text-right font-mono">
                <span className={result.excessReturn >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {result.excessReturn >= 0 ? '+' : ''}{result.excessReturn.toFixed(1)}%
                </span>
              </td>
              <td className="py-3 px-4 text-right font-mono text-red-600">
                -{result.maxDrawdown.toFixed(1)}%
              </td>
              <td className="py-3 px-4 text-right font-mono text-gray-600">
                {result.beta.toFixed(2)}
              </td>
              <td className="py-3 px-4 text-right font-mono text-gray-600">
                {result.recoveryMonths !== null ? `${result.recoveryMonths}m` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
