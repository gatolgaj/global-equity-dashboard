// Risk Calculator Engine - Core risk metric calculations

import type {
  RiskMetrics,
  RollingMetricPoint,
  DrawdownPoint,
  FactorRiskDecomposition,
  FactorRiskContribution,
  ConcentrationMetrics,
  SectorConcentration,
  CountryConcentration,
  StressTestResult,
  StressScenario,
  VaRHistogramBin,
} from '../types/risk';
import { STRESS_SCENARIOS } from '../types/risk';
import type { PerformanceRiskData } from './api';
import type { FactorData, FactorHolding } from '../types/portfolio';

// ============================================
// Statistical Helper Functions
// ============================================

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / (values.length - 1);
}

function standardDeviation(values: number[]): number {
  return Math.sqrt(variance(values));
}

function covariance(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;
  const meanX = mean(x);
  const meanY = mean(y);
  let sum = 0;
  for (let i = 0; i < x.length; i++) {
    sum += (x[i] - meanX) * (y[i] - meanY);
  }
  return sum / (x.length - 1);
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

// ============================================
// Value at Risk (VaR) Calculations
// ============================================

export function calculateVaR(returns: number[], confidence: number): number {
  // VaR is the loss at a given confidence level
  // For 95% confidence, we look at the 5th percentile of returns
  const percentileValue = 100 - confidence * 100;
  return -percentile(returns, percentileValue);
}

export function calculateCVaR(returns: number[], confidence: number): number {
  // Conditional VaR (Expected Shortfall) - average of returns below VaR
  const var_ = calculateVaR(returns, confidence);
  const belowVar = returns.filter((r) => r < -var_);
  if (belowVar.length === 0) return var_;
  return -mean(belowVar);
}

export function calculateVaRHistogram(returns: number[], bins: number = 20): VaRHistogramBin[] {
  if (returns.length === 0) return [];

  const var95 = calculateVaR(returns, 0.95);
  const var99 = calculateVaR(returns, 0.99);

  const min = Math.min(...returns);
  const max = Math.max(...returns);
  const binWidth = (max - min) / bins;

  const histogram: VaRHistogramBin[] = [];
  for (let i = 0; i < bins; i++) {
    const binStart = min + i * binWidth;
    const binEnd = min + (i + 1) * binWidth;
    const count = returns.filter((r) => r >= binStart && r < binEnd).length;
    histogram.push({
      binStart: binStart * 100, // Convert to percentage
      binEnd: binEnd * 100,
      count,
      isVaR95: -var95 >= binStart && -var95 < binEnd,
      isVaR99: -var99 >= binStart && -var99 < binEnd,
    });
  }

  return histogram;
}

// ============================================
// Drawdown Calculations
// ============================================

export function calculateDrawdownSeries(
  cumulativeValues: number[],
  dates: string[]
): DrawdownPoint[] {
  const drawdowns: DrawdownPoint[] = [];
  let peak = cumulativeValues[0];

  for (let i = 0; i < cumulativeValues.length; i++) {
    const value = cumulativeValues[i];
    if (value > peak) {
      peak = value;
    }
    const drawdown = peak > 0 ? (peak - value) / peak : 0;
    drawdowns.push({
      date: dates[i],
      drawdown: drawdown,
      peak: peak,
      value: value,
    });
  }

  return drawdowns;
}

export function calculateMaxDrawdown(cumulativeValues: number[], dates: string[]): {
  value: number;
  peakDate: string;
  troughDate: string;
  peakValue: number;
  troughValue: number;
} {
  let maxDrawdown = 0;
  let peak = cumulativeValues[0];
  let peakIdx = 0;
  let troughIdx = 0;
  let maxPeakIdx = 0;

  for (let i = 1; i < cumulativeValues.length; i++) {
    if (cumulativeValues[i] > peak) {
      peak = cumulativeValues[i];
      peakIdx = i;
    }
    const drawdown = peak > 0 ? (peak - cumulativeValues[i]) / peak : 0;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      troughIdx = i;
      maxPeakIdx = peakIdx;
    }
  }

  return {
    value: maxDrawdown,
    peakDate: dates[maxPeakIdx] || '',
    troughDate: dates[troughIdx] || '',
    peakValue: cumulativeValues[maxPeakIdx] || 0,
    troughValue: cumulativeValues[troughIdx] || 0,
  };
}

export function calculateDrawdownDuration(
  cumulativeValues: number[],
  _dates: string[]
): number {
  // Calculate the longest drawdown duration in months
  let longestDuration = 0;
  let currentDuration = 0;
  let peak = cumulativeValues[0];

  for (let i = 1; i < cumulativeValues.length; i++) {
    if (cumulativeValues[i] >= peak) {
      peak = cumulativeValues[i];
      longestDuration = Math.max(longestDuration, currentDuration);
      currentDuration = 0;
    } else {
      currentDuration++;
    }
  }

  return Math.max(longestDuration, currentDuration);
}

// ============================================
// Risk-Adjusted Return Metrics
// ============================================

export function calculateBeta(
  portfolioReturns: number[],
  benchmarkReturns: number[]
): number {
  if (portfolioReturns.length !== benchmarkReturns.length) return 1;
  const cov = covariance(portfolioReturns, benchmarkReturns);
  const benchVar = variance(benchmarkReturns);
  return benchVar > 0 ? cov / benchVar : 1;
}

export function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number = 0
): number {
  // Annualized Sharpe Ratio
  const excessReturns = returns.map((r) => r - riskFreeRate / 12); // Monthly risk-free rate
  const meanExcess = mean(excessReturns);
  const vol = standardDeviation(returns);
  if (vol === 0) return 0;
  return (meanExcess * 12) / (vol * Math.sqrt(12)); // Annualize
}

export function calculateSortinoRatio(
  returns: number[],
  riskFreeRate: number = 0
): number {
  // Sortino uses downside deviation instead of total volatility
  const excessReturns = returns.map((r) => r - riskFreeRate / 12);
  const meanExcess = mean(excessReturns);
  const negativeReturns = returns.filter((r) => r < 0);

  if (negativeReturns.length === 0) return meanExcess > 0 ? Infinity : 0;

  const downsideDeviation = standardDeviation(negativeReturns);
  if (downsideDeviation === 0) return 0;

  return (meanExcess * 12) / (downsideDeviation * Math.sqrt(12));
}

export function calculateInformationRatio(
  portfolioReturns: number[],
  benchmarkReturns: number[]
): number {
  if (portfolioReturns.length !== benchmarkReturns.length) return 0;

  const excessReturns = portfolioReturns.map((p, i) => p - benchmarkReturns[i]);
  const meanExcess = mean(excessReturns);
  const trackingError = standardDeviation(excessReturns);

  if (trackingError === 0) return 0;
  return (meanExcess * 12) / (trackingError * Math.sqrt(12));
}

export function calculateCalmarRatio(
  returns: number[],
  maxDrawdown: number
): number {
  if (maxDrawdown === 0) return 0;
  const annualizedReturn = mean(returns) * 12;
  return annualizedReturn / maxDrawdown;
}

// ============================================
// Rolling Metrics Calculations
// ============================================

export function calculateRollingMetric(
  values: number[],
  dates: string[],
  windowSize: number,
  calculator: (window: number[]) => number
): RollingMetricPoint[] {
  const result: RollingMetricPoint[] = [];

  for (let i = windowSize - 1; i < values.length; i++) {
    const window = values.slice(i - windowSize + 1, i + 1);
    result.push({
      date: dates[i],
      value: calculator(window),
    });
  }

  return result;
}

export function calculateRollingBeta(
  portfolioReturns: number[],
  benchmarkReturns: number[],
  dates: string[],
  windowSize: number = 12
): RollingMetricPoint[] {
  const result: RollingMetricPoint[] = [];

  for (let i = windowSize - 1; i < portfolioReturns.length; i++) {
    const pWindow = portfolioReturns.slice(i - windowSize + 1, i + 1);
    const bWindow = benchmarkReturns.slice(i - windowSize + 1, i + 1);
    result.push({
      date: dates[i],
      value: calculateBeta(pWindow, bWindow),
    });
  }

  return result;
}

export function calculateRollingSharpe(
  returns: number[],
  dates: string[],
  windowSize: number = 12,
  riskFreeRate: number = 0
): RollingMetricPoint[] {
  return calculateRollingMetric(returns, dates, windowSize, (window) =>
    calculateSharpeRatio(window, riskFreeRate)
  );
}

// ============================================
// Core Risk Metrics Calculator
// ============================================

export function calculateCoreRiskMetrics(
  performanceData: PerformanceRiskData
): RiskMetrics {
  const { performance } = performanceData;

  // Filter out entries with null returns
  const validPerformance = performance.filter(
    (p): p is typeof p & { portfolioReturn: number; benchmarkReturn: number } =>
      p.portfolioReturn !== null && p.benchmarkReturn !== null
  );

  // Extract returns and dates
  const dates = validPerformance.map((p) => p.date);
  const portfolioReturns = validPerformance.map((p) => p.portfolioReturn / 100); // Convert from percentage
  const benchmarkReturns = validPerformance.map((p) => p.benchmarkReturn / 100);
  const portfolioCumulative = validPerformance.map((p) => p.portfolioValue);

  // Calculate VaR metrics
  const var95 = calculateVaR(portfolioReturns, 0.95);
  const var99 = calculateVaR(portfolioReturns, 0.99);
  const cvar95 = calculateCVaR(portfolioReturns, 0.95);

  // Calculate drawdown metrics
  const drawdownSeries = calculateDrawdownSeries(portfolioCumulative, dates);
  const maxDD = calculateMaxDrawdown(portfolioCumulative, dates);
  const drawdownDuration = calculateDrawdownDuration(portfolioCumulative, dates);
  const currentDrawdown = drawdownSeries.length > 0
    ? drawdownSeries[drawdownSeries.length - 1].drawdown
    : 0;

  // Calculate risk-adjusted metrics
  const beta = calculateBeta(portfolioReturns, benchmarkReturns);
  const sharpeRatio = calculateSharpeRatio(portfolioReturns);
  const sortinoRatio = calculateSortinoRatio(portfolioReturns);
  const informationRatio = calculateInformationRatio(portfolioReturns, benchmarkReturns);
  const calmarRatio = calculateCalmarRatio(portfolioReturns, maxDD.value);

  // Calculate volatility metrics
  const annualizedVolatility = standardDeviation(portfolioReturns) * Math.sqrt(12);
  const downsideVolatility = standardDeviation(portfolioReturns.filter((r) => r < 0)) * Math.sqrt(12);
  const excessReturns = portfolioReturns.map((p, i) => p - benchmarkReturns[i]);
  const trackingError = standardDeviation(excessReturns) * Math.sqrt(12);

  // Calculate rolling metrics
  const rollingVar = calculateRollingMetric(
    portfolioReturns,
    dates,
    12,
    (window) => calculateVaR(window, 0.95)
  );
  const rollingBeta = calculateRollingBeta(portfolioReturns, benchmarkReturns, dates, 12);
  const rollingSharpe = calculateRollingMetric(
    portfolioReturns,
    dates,
    12,
    (window) => calculateSharpeRatio(window)
  );

  return {
    var95: var95 * 100, // Convert to percentage
    var99: var99 * 100,
    cvar95: cvar95 * 100,
    maxDrawdown: maxDD.value * 100,
    maxDrawdownDate: maxDD.troughDate,
    maxDrawdownPeakDate: maxDD.peakDate,
    maxDrawdownTroughDate: maxDD.troughDate,
    drawdownDuration,
    currentDrawdown: currentDrawdown * 100,
    beta,
    sharpeRatio,
    sortinoRatio,
    informationRatio,
    calmarRatio,
    annualizedVolatility: annualizedVolatility * 100,
    downsideVolatility: downsideVolatility * 100,
    trackingError: trackingError * 100,
    rollingVar: rollingVar.map((r) => ({ ...r, value: r.value * 100 })),
    rollingBeta,
    rollingDrawdown: drawdownSeries.map((d) => ({ ...d, drawdown: d.drawdown * 100 })),
    rollingSharpe,
  };
}

// ============================================
// Factor Risk Decomposition
// ============================================

// Factor volatilities (annualized, estimated from historical data)
const FACTOR_VOLATILITIES: Record<string, number> = {
  value: 0.15,
  growth: 0.18,
  quality: 0.12,
  momentum: 0.20,
  size: 0.14,
  volatility: 0.22,
  debt: 0.10,
  sentiment: 0.16,
};

export function calculateFactorRisk(
  factorData: FactorData,
  portfolioVolatility: number = 0.15
): FactorRiskDecomposition {
  const { portfolioAverages, benchmarkAverages } = factorData;

  const factors: FactorRiskContribution[] = [];
  let totalFactorVariance = 0;

  const factorNames: Array<{ key: keyof typeof portfolioAverages; name: string }> = [
    { key: 'value', name: 'Value' },
    { key: 'growth', name: 'Growth' },
    { key: 'quality', name: 'Quality' },
    { key: 'momentum', name: 'Momentum' },
    { key: 'size', name: 'Size' },
    { key: 'volatility', name: 'Volatility' },
    { key: 'debt', name: 'Debt' },
    { key: 'sentiment', name: 'Sentiment' },
  ];

  for (const { key, name } of factorNames) {
    const exposure = portfolioAverages[key] || 0;
    const benchmarkExposure = benchmarkAverages[key] || 0;
    const activeExposure = exposure - benchmarkExposure;
    const factorVol = FACTOR_VOLATILITIES[key] || 0.15;

    // Factor contribution to variance = (active exposure)^2 * factor_variance
    const contribution = Math.pow(activeExposure * factorVol, 2);
    totalFactorVariance += contribution;

    factors.push({
      name,
      exposure,
      volatility: factorVol * 100,
      contribution: Math.sqrt(contribution) * 100, // Convert to risk (std dev)
      percentOfRisk: 0, // Will calculate after we have total
    });
  }

  const systematicRisk = Math.sqrt(totalFactorVariance);
  const totalRisk = portfolioVolatility;
  const idiosyncraticVariance = Math.max(0, Math.pow(totalRisk, 2) - totalFactorVariance);
  const idiosyncraticRisk = Math.sqrt(idiosyncraticVariance);

  // Calculate percent of risk for each factor
  const totalVariance = totalFactorVariance + idiosyncraticVariance;
  for (const factor of factors) {
    const factorVariance = Math.pow(factor.contribution / 100, 2);
    factor.percentOfRisk = totalVariance > 0 ? (factorVariance / totalVariance) * 100 : 0;
  }

  // Calculate percentages based on variance (not std dev) so they sum to 100%
  const systematicPercent = totalVariance > 0 ? (totalFactorVariance / totalVariance) * 100 : 0;
  const idiosyncraticPercent = totalVariance > 0 ? (idiosyncraticVariance / totalVariance) * 100 : 0;

  return {
    factors: factors.sort((a, b) => b.contribution - a.contribution),
    systematicRisk: systematicRisk * 100,
    idiosyncraticRisk: idiosyncraticRisk * 100,
    totalRisk: Math.sqrt(totalVariance) * 100, // Use actual total from components
    systematicPercent,
    idiosyncraticPercent,
  };
}

// ============================================
// Concentration Risk Calculator
// ============================================

export function calculateConcentrationRisk(
  holdings: FactorHolding[]
): ConcentrationMetrics {
  // Filter out holdings with 0% portfolio weight
  const activeHoldings = holdings.filter((h) => h.portfolioWeight > 0);

  if (activeHoldings.length === 0) {
    return {
      hhi: 0,
      effectiveStocks: 0,
      top5Weight: 0,
      top10Weight: 0,
      maxStockWeight: 0,
      maxStockTicker: '',
      maxSectorWeight: 0,
      maxSectorName: '',
      maxCountryWeight: 0,
      maxCountryName: '',
      maxRegionWeight: 0,
      maxRegionName: '',
      activeShare: 0,
      sectorConcentration: [],
      countryConcentration: [],
    };
  }

  // Sort holdings by weight
  const sortedHoldings = [...activeHoldings].sort((a, b) => b.portfolioWeight - a.portfolioWeight);

  // Calculate HHI - weights are already in decimal form (e.g., 0.0797 for 7.97%)
  const weights = activeHoldings.map((h) => h.portfolioWeight);
  const hhi = weights.reduce((sum, w) => sum + w * w, 0);
  const effectiveStocks = hhi > 0 ? 1 / hhi : 0;

  // Top N weights (convert to percentage for display)
  const top5Weight = sortedHoldings.slice(0, 5).reduce((sum, h) => sum + h.portfolioWeight, 0) * 100;
  const top10Weight = sortedHoldings.slice(0, 10).reduce((sum, h) => sum + h.portfolioWeight, 0) * 100;

  // Max stock
  const maxStock = sortedHoldings[0];

  // Sector aggregation
  const sectorMap = new Map<string, { portfolio: number; benchmark: number; count: number }>();
  for (const h of activeHoldings) {
    const existing = sectorMap.get(h.sector) || { portfolio: 0, benchmark: 0, count: 0 };
    existing.portfolio += h.portfolioWeight;
    existing.benchmark += h.benchmarkWeight;
    existing.count++;
    sectorMap.set(h.sector, existing);
  }

  // Convert sector weights to percentages for display
  const sectorConcentration: SectorConcentration[] = Array.from(sectorMap.entries())
    .map(([sector, data]) => ({
      sector,
      portfolioWeight: data.portfolio * 100,
      benchmarkWeight: data.benchmark * 100,
      activeWeight: (data.portfolio - data.benchmark) * 100,
      stockCount: data.count,
    }))
    .sort((a, b) => b.portfolioWeight - a.portfolioWeight);

  const maxSector = sectorConcentration[0] || { sector: '', portfolioWeight: 0 };

  // Country aggregation
  const countryMap = new Map<string, { portfolio: number; benchmark: number; count: number }>();
  for (const h of activeHoldings) {
    const existing = countryMap.get(h.country) || { portfolio: 0, benchmark: 0, count: 0 };
    existing.portfolio += h.portfolioWeight;
    existing.benchmark += h.benchmarkWeight;
    existing.count++;
    countryMap.set(h.country, existing);
  }

  // Convert country weights to percentages for display
  const countryConcentration: CountryConcentration[] = Array.from(countryMap.entries())
    .map(([country, data]) => ({
      country,
      portfolioWeight: data.portfolio * 100,
      benchmarkWeight: data.benchmark * 100,
      activeWeight: (data.portfolio - data.benchmark) * 100,
      stockCount: data.count,
    }))
    .sort((a, b) => b.portfolioWeight - a.portfolioWeight);

  const maxCountry = countryConcentration[0] || { country: '', portfolioWeight: 0 };

  // Region aggregation
  const regionMap = new Map<string, number>();
  for (const h of activeHoldings) {
    regionMap.set(h.region, (regionMap.get(h.region) || 0) + h.portfolioWeight);
  }
  const maxRegion = Array.from(regionMap.entries()).sort((a, b) => b[1] - a[1])[0] || ['', 0];

  // Active share calculation - weights are in decimal, result should be percentage
  // Active share = sum of |portfolio weight - benchmark weight| / 2
  const activeShare = activeHoldings.reduce((sum, h) => sum + Math.abs(h.activeWeight), 0) / 2 * 100;

  return {
    hhi: hhi * 10000, // Convert to standard HHI scale (0-10000)
    effectiveStocks,
    top5Weight,
    top10Weight,
    maxStockWeight: (maxStock?.portfolioWeight || 0) * 100,
    maxStockTicker: maxStock?.ticker || '',
    maxSectorWeight: maxSector.portfolioWeight,
    maxSectorName: maxSector.sector,
    maxCountryWeight: maxCountry.portfolioWeight,
    maxCountryName: maxCountry.country,
    maxRegionWeight: maxRegion[1] * 100,
    maxRegionName: maxRegion[0],
    activeShare,
    sectorConcentration,
    countryConcentration,
  };
}

// ============================================
// Stress Testing
// ============================================

// Find the closest data point to a target date
function findClosestDataPoint(
  data: Array<{ date: string; portfolioValue: number; benchmarkValue: number }>,
  targetDate: string,
  direction: 'before' | 'after' | 'closest' = 'closest'
): { date: string; portfolioValue: number; benchmarkValue: number } | null {
  if (data.length === 0) return null;

  let closest: { date: string; portfolioValue: number; benchmarkValue: number } | null = null;
  let closestDiff = Infinity;
  const targetTime = new Date(targetDate).getTime();

  for (const point of data) {
    const pointTime = new Date(point.date).getTime();
    const diff = Math.abs(pointTime - targetTime);

    // Apply direction filter
    if (direction === 'before' && pointTime > targetTime) continue;
    if (direction === 'after' && pointTime < targetTime) continue;

    // Update closest if this is a better match
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = point;
    }
  }

  return closest;
}

export function runStressTests(
  performanceData: PerformanceRiskData,
  scenarios: StressScenario[] = STRESS_SCENARIOS
): StressTestResult[] {
  const { performance } = performanceData;

  // Filter out entries with null returns
  const validPerformance = performance.filter(
    (p): p is typeof p & { portfolioReturn: number; benchmarkReturn: number } =>
      p.portfolioReturn !== null && p.benchmarkReturn !== null
  );

  const results: StressTestResult[] = [];

  // Calculate overall beta for estimation fallback
  const allPortfolioReturns = validPerformance.map((p) => p.portfolioReturn / 100);
  const allBenchmarkReturns = validPerformance.map((p) => p.benchmarkReturn / 100);
  const overallBeta = calculateBeta(allPortfolioReturns, allBenchmarkReturns);

  for (const scenario of scenarios) {
    // Find the best start point: prefer on/before the date, then closest
    let startPoint = findClosestDataPoint(validPerformance, scenario.startDate, 'before');
    if (!startPoint) {
      startPoint = findClosestDataPoint(validPerformance, scenario.startDate, 'closest');
    }

    // Find the best end point: prefer on/after the date, then closest
    let endPoint = findClosestDataPoint(validPerformance, scenario.endDate, 'after');
    if (!endPoint) {
      endPoint = findClosestDataPoint(validPerformance, scenario.endDate, 'closest');
    }

    // Ensure start is before end
    if (startPoint && endPoint && startPoint.date > endPoint.date) {
      // Swap if needed
      [startPoint, endPoint] = [endPoint, startPoint];
    }

    // Check if we have valid data for this period
    const hasActualData = startPoint && endPoint && startPoint.date !== endPoint.date;

    if (!hasActualData || !startPoint || !endPoint) {
      // No data for this scenario - estimate based on beta
      const estimatedReturn = overallBeta * scenario.benchmarkReturn;

      results.push({
        scenario,
        portfolioReturn: estimatedReturn * 100,
        benchmarkReturn: scenario.benchmarkReturn * 100,
        excessReturn: (estimatedReturn - scenario.benchmarkReturn) * 100,
        maxDrawdown: Math.abs(estimatedReturn) * 100,
        beta: overallBeta,
        recoveryMonths: null,
      });
    } else {
      // Calculate ACTUAL returns from the data
      const portfolioReturn = (endPoint.portfolioValue - startPoint.portfolioValue) / startPoint.portfolioValue;
      const benchReturn = (endPoint.benchmarkValue - startPoint.benchmarkValue) / startPoint.benchmarkValue;

      // Calculate max drawdown during scenario using all data in range
      const allScenarioData = validPerformance.filter((p) =>
        p.date >= startPoint!.date && p.date <= endPoint!.date
      );
      const cumulativeValues = allScenarioData.map((p) => p.portfolioValue);
      const dates = allScenarioData.map((p) => p.date);
      const maxDD = cumulativeValues.length >= 2
        ? calculateMaxDrawdown(cumulativeValues, dates)
        : { value: Math.abs(portfolioReturn), peakDate: startPoint.date, troughDate: endPoint.date };

      // Calculate beta during scenario
      const scenarioPortfolioReturns = allScenarioData.map((p) => p.portfolioReturn / 100);
      const scenarioBenchmarkReturns = allScenarioData.map((p) => p.benchmarkReturn / 100);
      const scenarioBeta = scenarioPortfolioReturns.length >= 2
        ? calculateBeta(scenarioPortfolioReturns, scenarioBenchmarkReturns)
        : overallBeta;

      // Find recovery time (months until portfolio returns to pre-crisis level)
      let recoveryMonths: number | null = null;
      const startIdx = validPerformance.findIndex((p) => p.date === startPoint!.date);
      if (startIdx >= 0) {
        const preCrisisValue = startPoint.portfolioValue;
        const endIdx = validPerformance.findIndex((p) => p.date === endPoint!.date);
        for (let i = endIdx + 1; i < validPerformance.length; i++) {
          if (validPerformance[i].portfolioValue >= preCrisisValue) {
            recoveryMonths = i - endIdx;
            break;
          }
        }
      }

      results.push({
        scenario,
        portfolioReturn: portfolioReturn * 100,
        benchmarkReturn: benchReturn * 100,
        excessReturn: (portfolioReturn - benchReturn) * 100,
        maxDrawdown: maxDD.value * 100,
        beta: scenarioBeta,
        recoveryMonths,
      });
    }
  }

  return results;
}

// Re-export STRESS_SCENARIOS for use in components
export { STRESS_SCENARIOS } from '../types/risk';
