import { format, parseISO } from 'date-fns';

/**
 * Format a number as a percentage
 */
export function formatPercent(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a number as a percentage with sign
 */
export function formatPercentWithSign(value: number, decimals = 2): string {
  const formatted = (value * 100).toFixed(decimals);
  return value >= 0 ? `+${formatted}%` : `${formatted}%`;
}

/**
 * Format a number with thousand separators
 */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format currency value
 */
export function formatCurrency(
  value: number,
  currency = 'USD',
  compact = false
): string {
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 2,
  };
  return new Intl.NumberFormat('en-US', options).format(value);
}

/**
 * Format market cap in billions/millions
 */
export function formatMarketCap(value: number): string {
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(1)}B`;
  }
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(1)}M`;
  }
  return `$${formatNumber(value)}`;
}

/**
 * Format date for display
 */
export function formatDate(
  date: string | Date,
  formatStr = 'MMM d, yyyy'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
}

/**
 * Format date as quarter label
 */
export function formatQuarter(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const quarter = Math.ceil((dateObj.getMonth() + 1) / 3);
  return `Q${quarter} ${dateObj.getFullYear()}`;
}

/**
 * Get CSS class for positive/negative values
 */
export function getValueColorClass(value: number): string {
  if (value > 0) return 'text-performance-positive';
  if (value < 0) return 'text-performance-negative';
  return 'text-gray-600';
}

/**
 * Combine class names conditionally
 */
export function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Format alpha score
 */
export function formatAlphaScore(score: number): string {
  return score.toFixed(2);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}
