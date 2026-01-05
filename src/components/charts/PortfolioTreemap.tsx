import { useEffect, useRef, useState } from 'react';
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
  [key: string]: number | undefined;
}

interface Holding {
  ticker: string;
  company: string;
  weight: number;
  activeWeight: number;
  sector: string;
  country: string;
  region: string;
  factors?: FactorScores;
}

interface PortfolioTreemapProps {
  holdings: Holding[];
  groupBy?: 'sector' | 'region' | 'country';
  height?: number;
  colorBy?: 'weight' | 'activeWeight' | 'mfm';
}

const SECTOR_COLORS: Record<string, string> = {
  'Technology Services': '#0066CC',
  'Electronic Technology': '#00A3E0',
  Finance: '#00A67E',
  Transportation: '#FFB81C',
  'Non-Energy Minerals': '#FF6B35',
  'Producer Manufacturing': '#8B5CF6',
  'Health Technology': '#EC4899',
  'Consumer Durables': '#14B8A6',
  'Retail Trade': '#F59E0B',
  Communications: '#6366F1',
  Utilities: '#64748B',
  'Energy Minerals': '#EF4444',
  'Industrial Services': '#84CC16',
  'Process Industries': '#D946EF',
};

const REGION_COLORS: Record<string, string> = {
  'North America': '#0066CC',
  'West Europe': '#00A67E',
  Asia: '#FFB81C',
  'Mid East': '#FF6B35',
  Pacific: '#8B5CF6',
  'South America': '#14B8A6',
  Africa: '#F59E0B',
  'East Europe': '#6366F1',
};

// Track if treemap module has been initialized
let treemapLoaded = false;

export function PortfolioTreemap({
  holdings,
  groupBy = 'sector',
  height = 500,
  colorBy = 'weight',
}: PortfolioTreemapProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(treemapLoaded);

  // Load treemap module
  useEffect(() => {
    if (treemapLoaded) {
      setIsReady(true);
      return;
    }

    import('highcharts/modules/treemap').then((module) => {
      const init = module.default as unknown as ((h: typeof Highcharts) => void) | undefined;
      if (typeof init === 'function' && !treemapLoaded) {
        init(Highcharts);
        treemapLoaded = true;
      }
      setIsReady(true);
    }).catch((err) => {
      console.error('Failed to load highcharts treemap:', err);
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    if (!chartRef.current || holdings.length === 0 || !isReady) return;

    const colors = groupBy === 'sector' ? SECTOR_COLORS : REGION_COLORS;

    // Group holdings
    const groups: Record<
      string,
      { totalWeight: number; holdings: Holding[]; avgMfm: number }
    > = {};

    holdings.forEach((h) => {
      const groupKey = h[groupBy] || 'Unknown';
      if (!groups[groupKey]) {
        groups[groupKey] = { totalWeight: 0, holdings: [], avgMfm: 0 };
      }
      groups[groupKey].totalWeight += h.weight || 0;
      groups[groupKey].holdings.push(h);
    });

    // Calculate average MFM for each group
    Object.entries(groups).forEach(([, group]) => {
      const mfmScores = group.holdings
        .map((h) => h.factors?.mfm_score)
        .filter((s): s is number => s !== undefined);
      group.avgMfm = mfmScores.length > 0 ? mfmScores.reduce((a, b) => a + b, 0) / mfmScores.length : 0;
    });

    // Prepare treemap data
    const treemapData: Highcharts.PointOptionsObject[] = [];
    let pointId = 0;

    Object.entries(groups).forEach(([groupName, groupData]) => {
      const parentId = `parent-${pointId++}`;

      // Add parent (group level)
      treemapData.push({
        id: parentId,
        name: groupName,
        color: colors[groupName] || '#64748B',
        value: groupData.totalWeight,
      });

      // Add children (individual holdings)
      groupData.holdings.forEach((h) => {
        let colorValue: number;
        switch (colorBy) {
          case 'activeWeight':
            colorValue = h.activeWeight || 0;
            break;
          case 'mfm':
            colorValue = h.factors?.mfm_score || 0;
            break;
          default:
            colorValue = h.weight || 0;
        }

        treemapData.push({
          id: `child-${pointId++}`,
          name: h.ticker,
          parent: parentId,
          value: h.weight,
          colorValue,
          custom: {
            company: h.company,
            weight: h.weight,
            activeWeight: h.activeWeight,
            sector: h.sector,
            country: h.country,
            mfm: h.factors?.mfm_score,
          },
        } as Highcharts.PointOptionsObject);
      });
    });

    const chart = Highcharts.chart(chartRef.current, {
      chart: {
        type: 'treemap',
        height,
        backgroundColor: 'transparent',
      },
      title: {
        text: undefined,
      },
      credits: {
        enabled: false,
      },
      colorAxis:
        colorBy === 'weight'
          ? undefined
          : {
              minColor: colorBy === 'activeWeight' ? '#DC3545' : '#FCA5A5',
              maxColor: colorBy === 'activeWeight' ? '#00A67E' : '#00A67E',
              min: colorBy === 'activeWeight' ? -0.05 : 0,
              max: colorBy === 'activeWeight' ? 0.05 : 8,
            },
      tooltip: {
        useHTML: true,
        formatter: function () {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ctx = this as any;
          const point = ctx.point;

          if (!point?.custom) {
            // Group level
            const weight = (point?.value ?? 0) * 100;
            return `
              <div style="padding: 8px;">
                <div style="font-weight: 600; font-size: 14px;">${point.name}</div>
                <div style="margin-top: 4px;">
                  Weight: <span style="font-weight: 600;">${weight.toFixed(2)}%</span>
                </div>
                <div style="color: #666; font-size: 11px; margin-top: 4px;">
                  Click to drill down
                </div>
              </div>
            `;
          }

          // Holding level
          const custom = point.custom;
          const weight = ((custom.weight as number) || 0) * 100;
          const activeWeight = ((custom.activeWeight as number) || 0) * 100;
          const mfm = custom.mfm as number | undefined;

          return `
            <div style="padding: 8px; min-width: 180px;">
              <div style="font-weight: 600; font-size: 14px;">${point.name}</div>
              <div style="color: #666; font-size: 11px;">${custom.company}</div>
              <div style="margin-top: 8px; display: grid; gap: 4px;">
                <div style="display: flex; justify-content: space-between;">
                  <span>Weight:</span>
                  <span style="font-weight: 600;">${weight.toFixed(2)}%</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span>Active:</span>
                  <span style="font-weight: 600; color: ${activeWeight >= 0 ? '#00A67E' : '#DC3545'}">
                    ${activeWeight >= 0 ? '+' : ''}${activeWeight.toFixed(2)}%
                  </span>
                </div>
                ${
                  mfm !== undefined
                    ? `
                  <div style="display: flex; justify-content: space-between;">
                    <span>MFM Score:</span>
                    <span style="font-weight: 600;">${mfm.toFixed(2)}</span>
                  </div>
                `
                    : ''
                }
              </div>
              <div style="color: #666; font-size: 10px; margin-top: 8px;">
                ${custom.sector} | ${custom.country}
              </div>
            </div>
          `;
        },
      },
      series: [
        {
          type: 'treemap',
          layoutAlgorithm: 'squarified',
          allowTraversingTree: true,
          animationLimit: 1000,
          dataLabels: {
            enabled: true,
            formatter: function () {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const ctx = this as any;
              const point = ctx.point;
              const weight = (point?.value ?? 0) * 100;
              if (weight < 1) return '';
              return `<span style="font-weight:600">${point?.name}</span><br/>${weight.toFixed(1)}%`;
            },
            style: {
              textOutline: 'none',
              fontSize: '11px',
            },
          },
          levelIsConstant: false,
          levels: [
            {
              level: 1,
              dataLabels: {
                enabled: true,
                align: 'left',
                verticalAlign: 'top',
                style: {
                  fontSize: '13px',
                  fontWeight: '600',
                },
              },
              borderWidth: 3,
            },
          ],
          data: treemapData,
        },
      ],
    });

    return () => {
      chart.destroy();
    };
  }, [holdings, groupBy, height, colorBy, isReady]);

  if (holdings.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        No holdings data available
      </div>
    );
  }

  if (!isReady) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <div className="text-gray-400">Loading chart...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-sm text-gray-500 mb-4">
        Click on a segment to drill down into individual holdings
      </div>
      <div ref={chartRef} />
    </div>
  );
}
