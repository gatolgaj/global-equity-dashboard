import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { Allocation } from '../../types/portfolio';

interface AllocationChartProps {
  data: Allocation[];
  title?: string;
  height?: number;
  horizontal?: boolean;
}

const COLORS = {
  portfolio: '#3182CE',
  benchmark: '#A0AEC0',
  activePositive: '#38A169',
  activeNegative: '#E53E3E',
};

export function AllocationChart({
  data,
  title,
  height = 300,
  horizontal = true,
}: AllocationChartProps) {
  const chartData = useMemo(() => {
    return data
      .sort((a, b) => b.portfolioWeight - a.portfolioWeight)
      .slice(0, 15)
      .map((item) => ({
        name: item.name,
        portfolio: item.portfolioWeight * 100,
        benchmark: item.benchmarkWeight * 100,
        active: item.activeWeight * 100,
      }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(2)}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (horizontal) {
    return (
      <div className="w-full">
        {title && (
          <h4 className="text-sm font-semibold text-gray-700 mb-4">{title}</h4>
        )}
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis
              type="number"
              tickFormatter={(value) => `${value}%`}
              tick={{ fontSize: 11, fill: '#718096' }}
            />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fontSize: 11, fill: '#4A5568' }}
              width={75}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              iconType="circle"
              iconSize={8}
            />
            <Bar
              dataKey="portfolio"
              name="Portfolio"
              fill={COLORS.portfolio}
              radius={[0, 4, 4, 0]}
            />
            <Bar
              dataKey="benchmark"
              name="Benchmark"
              fill={COLORS.benchmark}
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && (
        <h4 className="text-sm font-semibold text-gray-700 mb-4">{title}</h4>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: '#4A5568' }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tickFormatter={(value) => `${value}%`}
            tick={{ fontSize: 11, fill: '#718096' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            iconType="circle"
            iconSize={8}
          />
          <Bar
            dataKey="portfolio"
            name="Portfolio"
            fill={COLORS.portfolio}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="benchmark"
            name="Benchmark"
            fill={COLORS.benchmark}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ActiveWeightChartProps {
  data: Allocation[];
  title?: string;
  height?: number;
}

export function ActiveWeightChart({
  data,
  title = 'Active Weights',
  height = 300,
}: ActiveWeightChartProps) {
  const chartData = useMemo(() => {
    return data
      .sort((a, b) => Math.abs(b.activeWeight) - Math.abs(a.activeWeight))
      .slice(0, 15)
      .map((item) => ({
        name: item.name,
        active: item.activeWeight * 100,
        isPositive: item.activeWeight >= 0,
      }));
  }, [data]);

  return (
    <div className="w-full">
      {title && (
        <h4 className="text-sm font-semibold text-gray-700 mb-4">{title}</h4>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            type="number"
            tickFormatter={(value) => `${value}%`}
            tick={{ fontSize: 11, fill: '#718096' }}
            domain={['dataMin', 'dataMax']}
          />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fontSize: 11, fill: '#4A5568' }}
            width={75}
          />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Active Weight']}
            labelStyle={{ fontWeight: 600 }}
          />
          <Bar dataKey="active" name="Active Weight" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isPositive ? COLORS.activePositive : COLORS.activeNegative}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
