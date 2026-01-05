import * as XLSX from 'xlsx';
import type {
  MarketType,
  PortfolioSnapshot,
  Stock,
  Allocation,
  PortfolioStatistics,
  Region,
} from '../types/portfolio';

// Map country to region
const countryToRegion: Record<string, Region> = {
  // Asia
  'China': 'Asia',
  'Hong Kong': 'Asia',
  'India': 'Asia',
  'Indonesia': 'Asia',
  'Korea': 'Asia',
  'Malaysia': 'Asia',
  'Philippines': 'Asia',
  'Singapore': 'Asia',
  'Taiwan': 'Asia',
  'Thailand': 'Asia',
  'Vietnam': 'Asia',
  'Japan': 'Asia',
  'Australia': 'Asia',
  // East Europe
  'Poland': 'East Europe',
  'Hungary': 'East Europe',
  'Czech Republic': 'East Europe',
  'Russia': 'East Europe',
  'Greece': 'East Europe',
  // West Europe
  'United Kingdom': 'West Europe',
  'Germany': 'West Europe',
  'France': 'West Europe',
  'Switzerland': 'West Europe',
  'Netherlands': 'West Europe',
  'Spain': 'West Europe',
  'Italy': 'West Europe',
  'Sweden': 'West Europe',
  'Denmark': 'West Europe',
  'Finland': 'West Europe',
  'Norway': 'West Europe',
  'Belgium': 'West Europe',
  'Ireland': 'West Europe',
  'Austria': 'West Europe',
  'Portugal': 'West Europe',
  // North America
  'United States': 'North America',
  'Canada': 'North America',
  // South America
  'Brazil': 'South America',
  'Mexico': 'South America',
  'Chile': 'South America',
  'Colombia': 'South America',
  'Peru': 'South America',
  'Argentina': 'South America',
  // Mid East
  'Saudi Arabia': 'Mid East',
  'UAE': 'Mid East',
  'United Arab Emirates': 'Mid East',
  'Qatar': 'Mid East',
  'Kuwait': 'Mid East',
  'Turkey': 'Mid East',
  'Israel': 'Mid East',
  // Africa
  'South Africa': 'Africa',
  'Egypt': 'Africa',
  'Morocco': 'Africa',
  'Nigeria': 'Africa',
  'Kenya': 'Africa',
};

// Map region string to Region type
const regionNameMap: Record<string, Region> = {
  'asia': 'Asia',
  'africa': 'Africa',
  'east europe': 'East Europe',
  'west europe': 'West Europe',
  'north america': 'North America',
  'south america': 'South America',
  'mid east': 'Mid East',
  'middle east': 'Mid East',
};

function getRegion(country: string, regionFromData?: string): Region {
  // First try to use the region from the data
  if (regionFromData) {
    const normalized = regionFromData.toLowerCase().trim();
    if (regionNameMap[normalized]) {
      return regionNameMap[normalized];
    }
    // Try partial match
    for (const [key, value] of Object.entries(regionNameMap)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }
  }
  // Fall back to country mapping
  return countryToRegion[country] || 'Asia';
}

// Generate a unique ID
function generateId(): string {
  return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get quarter label from date
function getQuarterLabel(date: Date): string {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `Q${quarter} ${date.getFullYear()}`;
}

// Find column by checking if header contains any of the possible names
function findColumnByHeader(headers: string[], possibleNames: string[]): string | null {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim().replace(/\s+/g, ' '));

  for (const name of possibleNames) {
    const normalizedName = name.toLowerCase().trim();

    // Exact match first
    const exactIdx = normalizedHeaders.findIndex(h => h === normalizedName);
    if (exactIdx !== -1) return headers[exactIdx];

    // Then try contains
    const containsIdx = normalizedHeaders.findIndex(h =>
      h.includes(normalizedName) || normalizedName.includes(h)
    );
    if (containsIdx !== -1) return headers[containsIdx];
  }
  return null;
}

// Get value from row by column name
function getValue(row: Record<string, unknown>, columnName: string | null): unknown {
  if (!columnName) return undefined;
  return row[columnName];
}

// Process the Excel file
export async function processExcelFile(
  file: File,
  marketType: MarketType,
  onProgress?: (progress: number) => void
): Promise<PortfolioSnapshot> {
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

        // Try to find the main data sheet - prioritize _Data sheets for Terebinth files
        let sheet: XLSX.WorkSheet | null = null;
        let sheetName = '';

        // Look for sheets with preferred names (order matters)
        const preferredSheets = [
          'EM_Data', 'DM_Data',           // Terebinth data sheets
          'EM_Solver', 'DM_Solver',       // Terebinth solver sheets
          'Data', 'Holdings', 'Portfolio',
          'Sheet1', 'Top50', 'Positioning'
        ];

        for (const name of preferredSheets) {
          if (workbook.SheetNames.includes(name)) {
            sheet = workbook.Sheets[name];
            sheetName = name;
            break;
          }
        }

        // If no preferred sheet found, use the first sheet
        if (!sheet && workbook.SheetNames.length > 0) {
          sheetName = workbook.SheetNames[0];
          sheet = workbook.Sheets[sheetName];
        }

        if (!sheet) {
          throw new Error('No valid sheet found in the workbook');
        }

        console.log('Processing sheet:', sheetName);
        onProgress?.(80);

        // Convert sheet to JSON
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

        if (jsonData.length === 0) {
          throw new Error('No data found in the sheet');
        }

        // Get headers from first row
        const headers = Object.keys(jsonData[0]);
        console.log('Found headers:', headers.slice(0, 15));

        // Find relevant columns using flexible matching
        const tickerCol = findColumnByHeader(headers, [
          'Symbol', 'Stock', 'Ticker', 'Ticker Symbol',
          'ticker', 'symbol', 'code', 'security_id', 'sedol', 'isin'
        ]);

        const nameCol = findColumnByHeader(headers, [
          'Name', 'Company', 'Security Name', 'Company Name',
          'name', 'company', 'security_name', 'company_name', 'stock_name'
        ]);

        const regionCol = findColumnByHeader(headers, [
          'Region', 'region'
        ]);

        const countryCol = findColumnByHeader(headers, [
          'Country', 'ISO Code Local', 'Domicile',
          'country', 'domicile', 'country_name'
        ]);

        const sectorCol = findColumnByHeader(headers, [
          'FactSet Econ Sector', 'Sector', 'GICS Sector',
          'sector', 'gics_sector', 'industry_sector'
        ]);

        const portfolioWtCol = findColumnByHeader(headers, [
          'Final Port', 'Final Raw Weights', 'Port', 'Raw Port',
          'Portfolio Weight', 'portfolio_weight', 'portfolio_wt',
          'port_weight', 'weight', 'port_wgt'
        ]);

        const benchmarkWtCol = findColumnByHeader(headers, [
          'Benchmark', 'BM2', 'BM1', 'Bmk',
          'benchmark_weight', 'bmk_weight', 'bench_weight',
          'bmk_wt', 'index_weight'
        ]);

        const marketCapCol = findColumnByHeader(headers, [
          'MktVal Co', 'Market Cap', 'MarketCap',
          'market_cap', 'marketcap', 'mkt_cap', 'market_value'
        ]);

        const priceCol = findColumnByHeader(headers, [
          'Closing Price (0)', 'Price', 'Last Price', 'Close Price',
          'price', 'last_price', 'close_price'
        ]);

        const alphaCol = findColumnByHeader(headers, [
          'Alpha Score', 'Alpha', 'Score', 'MFM Score',
          'alpha', 'alpha_score', 'score', 'mfm_score'
        ]);

        console.log('Column mapping:', {
          ticker: tickerCol,
          name: nameCol,
          region: regionCol,
          country: countryCol,
          sector: sectorCol,
          portfolioWt: portfolioWtCol,
          benchmarkWt: benchmarkWtCol,
          alpha: alphaCol
        });

        // Build holdings array
        const holdings: Stock[] = [];

        for (const row of jsonData) {
          // Get ticker - required
          const tickerValue = getValue(row, tickerCol);
          const ticker = tickerValue ? String(tickerValue).trim() : '';
          if (!ticker || ticker === '' || ticker === 'undefined') continue;

          // Get other fields with defaults
          const nameValue = getValue(row, nameCol);
          const name = nameValue ? String(nameValue).trim() : ticker;

          const regionValue = getValue(row, regionCol);
          const regionStr = regionValue ? String(regionValue).trim() : '';

          const countryValue = getValue(row, countryCol);
          const country = countryValue ? String(countryValue).trim() : 'Unknown';

          const sectorValue = getValue(row, sectorCol);
          const sector = sectorValue ? String(sectorValue).trim() : 'Other';

          // Parse numeric values
          let portfolioWeight = 0;
          const pwtValue = getValue(row, portfolioWtCol);
          if (pwtValue !== undefined && pwtValue !== '') {
            portfolioWeight = typeof pwtValue === 'number' ? pwtValue : parseFloat(String(pwtValue)) || 0;
          }

          let benchmarkWeight = 0;
          const bwtValue = getValue(row, benchmarkWtCol);
          if (bwtValue !== undefined && bwtValue !== '') {
            benchmarkWeight = typeof bwtValue === 'number' ? bwtValue : parseFloat(String(bwtValue)) || 0;
          }

          let marketCap = 0;
          const mcValue = getValue(row, marketCapCol);
          if (mcValue !== undefined && mcValue !== '') {
            marketCap = typeof mcValue === 'number' ? mcValue : parseFloat(String(mcValue)) || 0;
          }

          let price = 0;
          const prValue = getValue(row, priceCol);
          if (prValue !== undefined && prValue !== '') {
            price = typeof prValue === 'number' ? prValue : parseFloat(String(prValue)) || 0;
          }

          let alphaScore = 0;
          const asValue = getValue(row, alphaCol);
          if (asValue !== undefined && asValue !== '') {
            alphaScore = typeof asValue === 'number' ? asValue : parseFloat(String(asValue)) || 0;
          }

          // Normalize weights (if they're in percentage form > 1)
          if (portfolioWeight > 1) portfolioWeight = portfolioWeight / 100;
          if (benchmarkWeight > 1) benchmarkWeight = benchmarkWeight / 100;

          holdings.push({
            symbol: ticker,
            name,
            ticker,
            country,
            region: getRegion(country, regionStr),
            sector,
            marketCap,
            price,
            currency: 'USD',
            benchmarkWeight,
            portfolioWeight,
            activeWeight: portfolioWeight - benchmarkWeight,
            alphaScore,
          });
        }

        console.log('Parsed holdings count:', holdings.length);

        if (holdings.length === 0) {
          throw new Error('No valid holdings found in the file. Please ensure the file has columns for Stock/Symbol and weights.');
        }

        onProgress?.(90);

        // Calculate sector allocations
        const sectorMap = new Map<string, { portfolio: number; benchmark: number }>();
        for (const h of holdings) {
          const current = sectorMap.get(h.sector) || { portfolio: 0, benchmark: 0 };
          current.portfolio += h.portfolioWeight;
          current.benchmark += h.benchmarkWeight;
          sectorMap.set(h.sector, current);
        }
        const sectorAllocations: Allocation[] = Array.from(sectorMap.entries()).map(([name, weights]) => ({
          name,
          portfolioWeight: weights.portfolio,
          benchmarkWeight: weights.benchmark,
          activeWeight: weights.portfolio - weights.benchmark,
        }));

        // Calculate country allocations
        const countryMap = new Map<string, { portfolio: number; benchmark: number }>();
        for (const h of holdings) {
          const current = countryMap.get(h.country) || { portfolio: 0, benchmark: 0 };
          current.portfolio += h.portfolioWeight;
          current.benchmark += h.benchmarkWeight;
          countryMap.set(h.country, current);
        }
        const countryAllocations: Allocation[] = Array.from(countryMap.entries()).map(([name, weights]) => ({
          name,
          portfolioWeight: weights.portfolio,
          benchmarkWeight: weights.benchmark,
          activeWeight: weights.portfolio - weights.benchmark,
        }));

        // Calculate region allocations
        const regionMap = new Map<string, { portfolio: number; benchmark: number }>();
        for (const h of holdings) {
          const current = regionMap.get(h.region) || { portfolio: 0, benchmark: 0 };
          current.portfolio += h.portfolioWeight;
          current.benchmark += h.benchmarkWeight;
          regionMap.set(h.region, current);
        }
        const regionAllocations: Allocation[] = Array.from(regionMap.entries()).map(([name, weights]) => ({
          name,
          portfolioWeight: weights.portfolio,
          benchmarkWeight: weights.benchmark,
          activeWeight: weights.portfolio - weights.benchmark,
        }));

        // Calculate statistics
        const totalPortfolioWeight = holdings.reduce((sum, h) => sum + h.portfolioWeight, 0);
        const effectiveNumber = holdings.reduce((sum, h) => sum + h.portfolioWeight * h.portfolioWeight, 0);

        const statistics: PortfolioStatistics = {
          alphaScore: holdings.reduce((sum, h) => sum + h.alphaScore * h.portfolioWeight, 0) / (totalPortfolioWeight || 1),
          activeShare: holdings.reduce((sum, h) => sum + Math.abs(h.activeWeight), 0) / 2,
          numberOfStocks: holdings.length,
          effectiveNumberOfStocks: effectiveNumber > 0 ? 1 / effectiveNumber : holdings.length,
          volatility: 0.15, // Placeholder - would need historical data
          trackingError: 0.03, // Placeholder
          stockMax: 0.05,
          smallCSBmkWtThreshold: 0.001,
          smallCSMaxActiveWt: 0.005,
          largeCSMaxActiveWt: 0.03,
          largeStockSumWtLim: 0.5,
          maxTrackingError: 0.06,
        };

        const now = new Date();

        const snapshot: PortfolioSnapshot = {
          id: generateId(),
          date: now.toISOString().split('T')[0],
          marketType,
          quarterLabel: getQuarterLabel(now),
          statistics,
          holdings: holdings.sort((a, b) => b.portfolioWeight - a.portfolioWeight),
          sectorAllocations: sectorAllocations.sort((a, b) => b.portfolioWeight - a.portfolioWeight),
          countryAllocations: countryAllocations.sort((a, b) => b.portfolioWeight - a.portfolioWeight),
          regionAllocations: regionAllocations.sort((a, b) => b.portfolioWeight - a.portfolioWeight),
        };

        onProgress?.(100);
        resolve(snapshot);
      } catch (error) {
        console.error('Excel processing error:', error);
        reject(error instanceof Error ? error : new Error('Failed to process Excel file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}
