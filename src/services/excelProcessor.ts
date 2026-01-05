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

function getRegion(country: string): Region {
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

// Process column name variations
function normalizeColumnName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '_');
}

// Find column by possible names
function findColumn(headers: string[], possibleNames: string[]): number {
  for (const name of possibleNames) {
    const idx = headers.findIndex(h =>
      normalizeColumnName(h) === normalizeColumnName(name) ||
      normalizeColumnName(h).includes(normalizeColumnName(name))
    );
    if (idx !== -1) return idx;
  }
  return -1;
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

        // Try to find the main data sheet
        let sheet: XLSX.WorkSheet | null = null;
        let sheetName = '';

        // Look for sheets with common names
        const preferredSheets = ['Data', 'Holdings', 'Portfolio', 'Sheet1', 'Top50', 'Positioning'];
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

        onProgress?.(80);

        // Convert sheet to JSON
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

        if (jsonData.length === 0) {
          throw new Error('No data found in the sheet');
        }

        // Get headers from first row
        const headers = Object.keys(jsonData[0]);

        // Find relevant columns
        const tickerCol = findColumn(headers, ['ticker', 'symbol', 'code', 'security_id', 'sedol', 'isin']);
        const nameCol = findColumn(headers, ['name', 'company', 'security_name', 'company_name', 'stock_name']);
        const countryCol = findColumn(headers, ['country', 'domicile', 'country_name']);
        const sectorCol = findColumn(headers, ['sector', 'gics_sector', 'industry_sector']);
        const portfolioWtCol = findColumn(headers, ['portfolio_weight', 'portfolio_wt', 'port_weight', 'weight', 'port_wgt', 'active_weight']);
        const benchmarkWtCol = findColumn(headers, ['benchmark_weight', 'bmk_weight', 'bench_weight', 'bmk_wt', 'index_weight']);
        const marketCapCol = findColumn(headers, ['market_cap', 'marketcap', 'mkt_cap', 'market_value']);
        const priceCol = findColumn(headers, ['price', 'last_price', 'close_price']);
        const alphaCol = findColumn(headers, ['alpha', 'alpha_score', 'score', 'mfm_score']);

        // Build holdings array
        const holdings: Stock[] = [];

        for (const row of jsonData) {
          const values = Object.values(row);

          // Get ticker - required
          const ticker = tickerCol >= 0 ? String(values[tickerCol] || '') : '';
          if (!ticker || ticker === '') continue;

          // Get other fields with defaults
          const name = nameCol >= 0 ? String(values[nameCol] || ticker) : ticker;
          const country = countryCol >= 0 ? String(values[countryCol] || 'Unknown') : 'Unknown';
          const sector = sectorCol >= 0 ? String(values[sectorCol] || 'Other') : 'Other';

          let portfolioWeight = 0;
          if (portfolioWtCol >= 0) {
            const pwt = values[portfolioWtCol];
            portfolioWeight = typeof pwt === 'number' ? pwt : parseFloat(String(pwt)) || 0;
          }

          let benchmarkWeight = 0;
          if (benchmarkWtCol >= 0) {
            const bwt = values[benchmarkWtCol];
            benchmarkWeight = typeof bwt === 'number' ? bwt : parseFloat(String(bwt)) || 0;
          }

          let marketCap = 0;
          if (marketCapCol >= 0) {
            const mc = values[marketCapCol];
            marketCap = typeof mc === 'number' ? mc : parseFloat(String(mc)) || 0;
          }

          let price = 0;
          if (priceCol >= 0) {
            const pr = values[priceCol];
            price = typeof pr === 'number' ? pr : parseFloat(String(pr)) || 0;
          }

          let alphaScore = 0;
          if (alphaCol >= 0) {
            const as = values[alphaCol];
            alphaScore = typeof as === 'number' ? as : parseFloat(String(as)) || 0;
          }

          // Normalize weights (if they're in percentage form)
          if (portfolioWeight > 1) portfolioWeight = portfolioWeight / 100;
          if (benchmarkWeight > 1) benchmarkWeight = benchmarkWeight / 100;

          holdings.push({
            symbol: ticker,
            name,
            ticker,
            country,
            region: getRegion(country),
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

        if (holdings.length === 0) {
          throw new Error('No valid holdings found in the file');
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
        reject(error instanceof Error ? error : new Error('Failed to process Excel file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}
