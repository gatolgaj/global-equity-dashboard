import * as XLSX from 'xlsx';
import type { FactorData, FactorHolding, FactorScores, SectorFactorData } from '../types/portfolio';

// Convert Excel serial date to ISO string
function excelDateToISO(serial: number): string {
  const excelEpoch = new Date(1899, 11, 30);
  const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
}

// Column mappings from Excel to FactorScores properties
const FACTOR_COLUMN_MAP: Record<string, keyof FactorScores> = {
  'STD Value EW': 'value',
  'STD Growth EW': 'growth',
  'STD Quality EW': 'quality',
  'STD Debt EW': 'debt',
  'STD Vol_60D': 'volatility',
  'STD 12MM': 'momentum',
  'STD Size': 'size',
  'STD Sentiment EW': 'sentiment',
  'MFM EW 5 Factor (Only 1 Value)': 'mfmScore',
};

// Create empty factor scores
function createEmptyFactorScores(): FactorScores {
  return {
    value: 0,
    growth: 0,
    quality: 0,
    debt: 0,
    volatility: 0,
    momentum: 0,
    size: 0,
    sentiment: 0,
    mfmScore: 0,
  };
}

// Process the Constituents sheet to get factor data for a specific period
function processConstituentsSheet(
  sheet: XLSX.WorkSheet,
  targetPeriod?: number
): Map<string, { company: string; factors: FactorScores; sector: string; country: string; region: string }> {
  const data = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
    defval: '',
    header: 1,
  });

  const result = new Map<string, { company: string; factors: FactorScores; sector: string; country: string; region: string }>();

  if (data.length < 4) {
    console.log('Constituents: Not enough rows');
    return result;
  }

  // Row 3 (index 2) contains headers
  const headers = data[2] as string[];

  // Build column index map
  const colMap: Record<string, number> = {};
  headers.forEach((h, i) => {
    if (h) colMap[h] = i;
  });

  // Find which columns have factor data
  const factorColumns: { col: number; factorKey: keyof FactorScores }[] = [];
  for (const [excelCol, factorKey] of Object.entries(FACTOR_COLUMN_MAP)) {
    if (colMap[excelCol] !== undefined) {
      factorColumns.push({ col: colMap[excelCol], factorKey });
    }
  }

  console.log('Factor columns found:', factorColumns.length);

  // Find target period (latest if not specified)
  let latestPeriod = 0;
  const periodCol = colMap['Periods'];
  const tickerCol = colMap['Ticker'];
  const companyCol = colMap['Company Name'];
  const sectorCol = colMap['FactSet Econ Sector'];
  const countryCol = colMap['Country'];
  const regionCol = colMap['Region'];

  if (periodCol === undefined || tickerCol === undefined) {
    console.log('Missing required columns (Periods or Ticker)');
    return result;
  }

  // Find the latest period
  for (let row = 3; row < data.length; row++) {
    const period = data[row][periodCol];
    if (typeof period === 'number' && period > latestPeriod) {
      latestPeriod = period;
    }
  }

  const usePeriod = targetPeriod ?? latestPeriod;
  console.log('Using period:', usePeriod, 'Date:', excelDateToISO(usePeriod));

  // Extract factor data for the target period
  for (let row = 3; row < data.length; row++) {
    const rowData = data[row];
    const period = rowData[periodCol];

    if (period !== usePeriod) continue;

    const ticker = String(rowData[tickerCol] || '').trim();
    if (!ticker) continue;

    const company = String(rowData[companyCol] || ticker).trim();
    const sector = String(rowData[sectorCol] || 'Unknown').trim();
    const country = String(rowData[countryCol] || 'Unknown').trim();
    const region = String(rowData[regionCol] || 'Unknown').trim();

    const factors = createEmptyFactorScores();
    for (const { col, factorKey } of factorColumns) {
      const value = rowData[col];
      if (typeof value === 'number' && !isNaN(value)) {
        factors[factorKey] = value;
      }
    }

    result.set(ticker, { company, factors, sector, country, region });
  }

  console.log('Constituents: Extracted', result.size, 'stocks for period', usePeriod);
  return result;
}

// Process the Final Portfolio sheet to get current holdings with weights
function processFinalPortfolioSheet(sheet: XLSX.WorkSheet): FactorHolding[] {
  const data = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
    defval: '',
    header: 1,
  });

  const holdings: FactorHolding[] = [];

  if (data.length < 4) {
    console.log('Final Portfolio: Not enough rows');
    return holdings;
  }

  // Row 3 (index 2) contains headers
  const headers = data[2] as string[];

  // Build column index map
  const colMap: Record<string, number> = {};
  headers.forEach((h, i) => {
    if (h) colMap[h] = i;
  });

  const tickerCol = colMap['Ticker'];
  const portfolioWeightCol = colMap['Portfolio Weight'];
  const benchmarkWeightCol = colMap['Benchmark Weight'];
  const activeCol = colMap['Active'];
  const companyCol = colMap['Company Name'];
  const sectorCol = colMap['Sector'];
  const countryCol = colMap['Country'];
  const regionCol = colMap['Region'];

  if (tickerCol === undefined || portfolioWeightCol === undefined) {
    console.log('Final Portfolio: Missing required columns');
    return holdings;
  }

  // Process data rows (start from row 4, index 3)
  for (let row = 3; row < data.length; row++) {
    const rowData = data[row];
    const ticker = String(rowData[tickerCol] || '').trim();
    const portfolioWeight = Number(rowData[portfolioWeightCol]) || 0;

    if (!ticker || portfolioWeight <= 0) continue;

    const holding: FactorHolding = {
      ticker,
      company: String(rowData[companyCol] || ticker).trim(),
      sector: String(rowData[sectorCol] || 'Unknown').trim(),
      country: String(rowData[countryCol] || 'Unknown').trim(),
      region: String(rowData[regionCol] || 'Unknown').trim(),
      portfolioWeight,
      benchmarkWeight: Number(rowData[benchmarkWeightCol]) || 0,
      activeWeight: Number(rowData[activeCol]) || (portfolioWeight - (Number(rowData[benchmarkWeightCol]) || 0)),
      factors: createEmptyFactorScores(),
    };

    holdings.push(holding);
  }

  console.log('Final Portfolio: Extracted', holdings.length, 'holdings');
  return holdings;
}

// Calculate portfolio-weighted average factor scores
function calculateWeightedAverages(holdings: FactorHolding[]): FactorScores {
  const averages = createEmptyFactorScores();
  let totalWeight = 0;

  for (const holding of holdings) {
    const weight = holding.portfolioWeight;
    totalWeight += weight;

    for (const key of Object.keys(averages) as (keyof FactorScores)[]) {
      averages[key] += holding.factors[key] * weight;
    }
  }

  if (totalWeight > 0) {
    for (const key of Object.keys(averages) as (keyof FactorScores)[]) {
      averages[key] /= totalWeight;
    }
  }

  return averages;
}

// Calculate sector aggregations
function calculateSectorFactors(holdings: FactorHolding[]): SectorFactorData[] {
  const sectorMap = new Map<string, {
    count: number;
    totalWeight: number;
    factorSums: FactorScores;
  }>();

  for (const holding of holdings) {
    const sector = holding.sector;
    const existing = sectorMap.get(sector) || {
      count: 0,
      totalWeight: 0,
      factorSums: createEmptyFactorScores(),
    };

    existing.count++;
    existing.totalWeight += holding.portfolioWeight;

    for (const key of Object.keys(existing.factorSums) as (keyof FactorScores)[]) {
      existing.factorSums[key] += holding.factors[key] * holding.portfolioWeight;
    }

    sectorMap.set(sector, existing);
  }

  const sectorFactors: SectorFactorData[] = [];
  for (const [sector, data] of sectorMap.entries()) {
    const sectorData: SectorFactorData = {
      sector,
      count: data.count,
      totalWeight: data.totalWeight,
      value: data.totalWeight > 0 ? data.factorSums.value / data.totalWeight : 0,
      growth: data.totalWeight > 0 ? data.factorSums.growth / data.totalWeight : 0,
      quality: data.totalWeight > 0 ? data.factorSums.quality / data.totalWeight : 0,
      debt: data.totalWeight > 0 ? data.factorSums.debt / data.totalWeight : 0,
      volatility: data.totalWeight > 0 ? data.factorSums.volatility / data.totalWeight : 0,
      momentum: data.totalWeight > 0 ? data.factorSums.momentum / data.totalWeight : 0,
      size: data.totalWeight > 0 ? data.factorSums.size / data.totalWeight : 0,
      sentiment: data.totalWeight > 0 ? data.factorSums.sentiment / data.totalWeight : 0,
      mfmScore: data.totalWeight > 0 ? data.factorSums.mfmScore / data.totalWeight : 0,
    };
    sectorFactors.push(sectorData);
  }

  // Sort by total weight descending
  sectorFactors.sort((a, b) => b.totalWeight - a.totalWeight);

  return sectorFactors;
}

// Process the Factor Analysis Excel file
export async function processFactorFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<FactorData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 30));
      }
    };

    reader.onload = (event) => {
      try {
        onProgress?.(35);

        const data = event.target?.result;
        if (!data) {
          throw new Error('Failed to read file');
        }

        // Read the workbook
        const workbook = XLSX.read(data, { type: 'array' });
        onProgress?.(45);

        console.log('Available sheets:', workbook.SheetNames);

        // Get holdings from Final Portfolio sheet
        const finalPortfolioSheet = workbook.Sheets['Final Portfolio'];
        if (!finalPortfolioSheet) {
          throw new Error('Final Portfolio sheet not found. Expected IC_PortfolioComposition file.');
        }

        const holdings = processFinalPortfolioSheet(finalPortfolioSheet);
        onProgress?.(55);

        if (holdings.length === 0) {
          throw new Error('No holdings found in Final Portfolio sheet');
        }

        // Get factor scores from Constituents sheet
        const constituentsSheet = workbook.Sheets['Constituents'];
        if (constituentsSheet) {
          const factorData = processConstituentsSheet(constituentsSheet);
          onProgress?.(75);

          // Merge factor data into holdings
          for (const holding of holdings) {
            const factorInfo = factorData.get(holding.ticker);
            if (factorInfo) {
              holding.factors = factorInfo.factors;
              // Update sector/country/region if available from constituents
              if (factorInfo.sector && factorInfo.sector !== 'Unknown') {
                holding.sector = factorInfo.sector;
              }
              if (factorInfo.country && factorInfo.country !== 'Unknown') {
                holding.country = factorInfo.country;
              }
              if (factorInfo.region && factorInfo.region !== 'Unknown') {
                holding.region = factorInfo.region;
              }
            }
          }
        } else {
          console.log('Constituents sheet not found, factor scores will be empty');
        }

        onProgress?.(85);

        // Calculate portfolio-weighted averages
        const portfolioAverages = calculateWeightedAverages(holdings);

        // For benchmark averages, we would need benchmark weights
        // For now, we'll use zeros (or could calculate from benchmark weights if available)
        const benchmarkAverages = createEmptyFactorScores();

        // Calculate sector aggregations
        const sectorFactors = calculateSectorFactors(holdings);

        onProgress?.(95);

        // Get as-of date from the first row of Final Portfolio
        const finalData = XLSX.utils.sheet_to_json<(string | number)[]>(finalPortfolioSheet, {
          defval: '',
          header: 1,
        }) as (string | number)[][];

        let asOfDate = new Date().toISOString().split('T')[0];
        if (finalData[0] && typeof finalData[0][0] === 'number') {
          asOfDate = excelDateToISO(finalData[0][0]);
        }

        const result: FactorData = {
          asOfDate,
          holdings,
          portfolioAverages,
          benchmarkAverages,
          sectorFactors,
        };

        console.log('Processed factor data:', {
          asOfDate: result.asOfDate,
          holdingsCount: result.holdings.length,
          sectorsCount: result.sectorFactors.length,
          portfolioMFM: result.portfolioAverages.mfmScore.toFixed(2),
        });

        onProgress?.(100);
        resolve(result);
      } catch (error) {
        console.error('Factor processing error:', error);
        reject(error instanceof Error ? error : new Error('Failed to process Factor file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}
