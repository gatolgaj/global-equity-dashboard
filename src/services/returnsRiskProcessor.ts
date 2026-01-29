import * as XLSX from 'xlsx';
import type { PerformanceRiskData } from './api';

// Convert Excel serial date to ISO string
function excelDateToISO(serial: number): string {
  // Excel dates are days since 1900-01-01 (with a bug for 1900 leap year)
  const excelEpoch = new Date(1899, 11, 30);
  const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
}

// Process the Returns & Risk Excel file
// Expected format: IC_Backtest_Returns&Risk_Top50.xlsx
// - Returns_Calc sheet with dates in col 0, returns in cols 1-7, $100 invested in cols 10-17
// - Risk_Calc sheet with rolling metrics
export async function processReturnsRiskFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<PerformanceRiskData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 50));
      }
    };

    reader.onload = (event) => {
      try {
        onProgress?.(60);

        const data = event.target?.result;
        if (!data) {
          throw new Error('Failed to read file');
        }

        // Read the workbook
        const workbook = XLSX.read(data, { type: 'array' });
        onProgress?.(70);

        console.log('Available sheets:', workbook.SheetNames);

        // Find Returns_Calc sheet
        const returnsSheet = workbook.Sheets['Returns_Calc'];
        if (!returnsSheet) {
          throw new Error('Returns_Calc sheet not found. Expected IC_Backtest_Returns&Risk file.');
        }

        // Parse as raw arrays (header: 1)
        const returnsData = XLSX.utils.sheet_to_json<(string | number)[]>(returnsSheet, {
          defval: '',
          header: 1
        });

        if (returnsData.length < 2) {
          throw new Error('Returns_Calc sheet is empty');
        }

        // Row 0 is headers, data starts from row 1
        const headers = returnsData[0] as string[];
        console.log('Returns headers:', headers.slice(0, 12));

        // Find column indices
        // Column 0: Date
        // Column 1: MSCI World Index (benchmark returns)
        // Column 2: Global Equity - No Constraints (portfolio returns)
        // Columns 10-17: $100 invested values

        const dateCol = 0;
        const benchmarkReturnCol = 1;  // MSCI World Index
        const portfolioReturnCol = 2;  // Global Equity - No Constraints

        // Find $100 invested columns (they come after empty columns)
        let investedDateCol = -1;
        let investedBenchmarkCol = -1;
        let investedPortfolioCol = -1;

        for (let i = 0; i < headers.length; i++) {
          if (headers[i] === '$100 invested') {
            investedDateCol = i;
            investedBenchmarkCol = i + 1;
            investedPortfolioCol = i + 2;
            break;
          }
        }

        console.log('Column mapping:', {
          dateCol,
          benchmarkReturnCol,
          portfolioReturnCol,
          investedDateCol,
          investedBenchmarkCol,
          investedPortfolioCol
        });

        onProgress?.(80);

        // Build performance data
        const performance: PerformanceRiskData['performance'] = [];
        let startDate = '';
        let endDate = '';

        // Track $100 invested values
        let portfolioValue = 100;
        let benchmarkValue = 100;

        for (let i = 1; i < returnsData.length; i++) {
          const row = returnsData[i];
          if (!row || row.length === 0) continue;

          const dateSerial = row[dateCol];
          if (typeof dateSerial !== 'number') continue;

          const date = excelDateToISO(dateSerial);
          if (!startDate) startDate = date;
          endDate = date;

          // Get returns
          const benchmarkReturn = typeof row[benchmarkReturnCol] === 'number'
            ? row[benchmarkReturnCol] as number
            : 0;
          const portfolioReturn = typeof row[portfolioReturnCol] === 'number'
            ? row[portfolioReturnCol] as number
            : 0;

          // Calculate cumulative values (or use $100 invested columns if available)
          if (investedBenchmarkCol >= 0 && typeof row[investedBenchmarkCol] === 'number') {
            benchmarkValue = row[investedBenchmarkCol] as number;
          } else {
            benchmarkValue = benchmarkValue * (1 + benchmarkReturn);
          }

          if (investedPortfolioCol >= 0 && typeof row[investedPortfolioCol] === 'number') {
            portfolioValue = row[investedPortfolioCol] as number;
          } else {
            portfolioValue = portfolioValue * (1 + portfolioReturn);
          }

          const alpha = portfolioReturn - benchmarkReturn;

          performance.push({
            date,
            portfolioValue,
            benchmarkValue,
            portfolioReturn: portfolioReturn * 100, // Convert to percentage
            benchmarkReturn: benchmarkReturn * 100,
            alpha: alpha * 100,
          });
        }

        if (performance.length === 0) {
          throw new Error('No valid performance data found');
        }

        onProgress?.(85);

        // Calculate rolling metrics
        const rollingAlpha1Y: Array<{ date: string; value: number }> = [];
        const rollingAlpha3Y: Array<{ date: string; value: number }> = [];
        const volatility: Array<{ date: string; value: number | null }> = [];
        const trackingError: Array<{ date: string; value: number | null }> = [];

        // Calculate 12-month rolling alpha
        for (let i = 11; i < performance.length; i++) {
          let sumAlpha = 0;
          for (let j = i - 11; j <= i; j++) {
            sumAlpha += (performance[j].alpha || 0);
          }
          rollingAlpha1Y.push({
            date: performance[i].date,
            value: sumAlpha // Cumulative 12-month alpha
          });
        }

        // Calculate 36-month rolling alpha (annualized)
        for (let i = 35; i < performance.length; i++) {
          let sumAlpha = 0;
          for (let j = i - 35; j <= i; j++) {
            sumAlpha += (performance[j].alpha || 0);
          }
          const annualized = sumAlpha / 3; // 3 years
          rollingAlpha3Y.push({
            date: performance[i].date,
            value: annualized
          });
        }

        // Calculate 12-month rolling volatility
        for (let i = 11; i < performance.length; i++) {
          const returns: number[] = [];
          for (let j = i - 11; j <= i; j++) {
            returns.push(performance[j].portfolioReturn || 0);
          }
          const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
          const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
          const monthlyVol = Math.sqrt(variance);
          const annualVol = monthlyVol * Math.sqrt(12);

          volatility.push({
            date: performance[i].date,
            value: annualVol
          });
        }

        // Calculate 12-month rolling tracking error
        for (let i = 11; i < performance.length; i++) {
          const activeReturns: number[] = [];
          for (let j = i - 11; j <= i; j++) {
            activeReturns.push((performance[j].portfolioReturn || 0) - (performance[j].benchmarkReturn || 0));
          }
          const mean = activeReturns.reduce((a, b) => a + b, 0) / activeReturns.length;
          const variance = activeReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / activeReturns.length;
          const monthlyTE = Math.sqrt(variance);
          const annualTE = monthlyTE * Math.sqrt(12);

          trackingError.push({
            date: performance[i].date,
            value: annualTE
          });
        }

        onProgress?.(90);

        // Calculate summary stats
        const lastPerf = performance[performance.length - 1];
        const firstPerf = performance[0];
        const totalReturn = ((lastPerf.portfolioValue - firstPerf.portfolioValue) / firstPerf.portfolioValue) * 100;
        const totalBmkReturn = ((lastPerf.benchmarkValue - firstPerf.benchmarkValue) / firstPerf.benchmarkValue) * 100;

        const result: PerformanceRiskData = {
          performance,
          summaryStats: {
            totalReturn,
            totalBenchmarkReturn: totalBmkReturn,
            excessReturn: totalReturn - totalBmkReturn,
          },
          rollingAlpha1Y,
          rollingAlpha3Y,
          volatility,
          trackingError,
          dateRange: {
            start: startDate,
            end: endDate,
          },
        };

        console.log('Processed performance data:', {
          dataPoints: performance.length,
          dateRange: result.dateRange,
          rollingAlpha1Y: rollingAlpha1Y.length,
          rollingAlpha3Y: rollingAlpha3Y.length,
        });

        onProgress?.(100);
        resolve(result);
      } catch (error) {
        console.error('Returns/Risk processing error:', error);
        reject(error instanceof Error ? error : new Error('Failed to process Returns & Risk file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}
