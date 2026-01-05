import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  noPadding?: boolean;
}

export function Card({
  children,
  className = '',
  title,
  subtitle,
  action,
  noPadding = false,
}: CardProps) {
  return (
    <div className={`dashboard-card ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? '-mx-6 -mb-6' : ''}>{children}</div>
    </div>
  );
}

interface KPICardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

export function KPICard({
  label,
  value,
  change,
  changeLabel,
  icon,
  trend,
}: KPICardProps) {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-performance-positive';
    if (trend === 'down') return 'text-performance-negative';
    return 'text-gray-500';
  };

  const getTrendBg = () => {
    if (trend === 'up') return 'bg-green-50';
    if (trend === 'down') return 'bg-red-50';
    return 'bg-gray-50';
  };

  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="metric-label">{label}</p>
          <p className="metric-value mt-1">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTrendBg()} ${getTrendColor()}`}
              >
                {change > 0 ? '+' : ''}
                {typeof change === 'number' ? change.toFixed(2) : change}%
              </span>
              {changeLabel && (
                <span className="text-xs text-gray-500">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className="p-2 bg-terebinth-light rounded-lg text-terebinth-primary">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  className?: string;
}

export function StatCard({ label, value, subValue, className = '' }: StatCardProps) {
  return (
    <div className={`p-4 bg-gray-50 rounded-lg ${className}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-xl font-bold text-terebinth-dark mt-1">{value}</p>
      {subValue && <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>}
    </div>
  );
}
