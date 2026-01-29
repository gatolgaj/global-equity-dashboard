import * as XLSX from 'xlsx';
import type { PortfolioCompositionData } from './api';

// Convert Excel serial date to ISO string
function excelDateToISO(serial: number): string {
  // Excel dates are days since 1900-01-01 (with a bug for 1900 leap year)
  const excelEpoch = new Date(1899, 11, 30);
  const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
}

// Process a pivot table sheet where:
// - Row 3 contains dates as column headers (Excel serial numbers)
// - Row 4+ contains region/sector/country names in column 0 and weights in subsequent columns
function processPivotSheet(
  sheet: XLSX.WorkSheet,
  sheetName: string
): Array<{ date: string; name: string; weight: number }> {
  const data = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
    defval: '',
    header: 1
  });

  const results: Array<{ date: string; name: string; weight: number }> = [];

  if (data.length < 5) {
    console.log(`${sheetName}: Not enough rows`);
    return results;
  }

  // Row 3 (index 3) contains dates as column headers
  const dateRow = data[3] as (string | number)[];
  if (!dateRow) {
    console.log(`${sheetName}: No date row found`);
    return results;
  }

  // Build date column mapping (skip first column which is "Row Labels")
  const dateColumns: { col: number; date: string }[] = [];
  for (let col = 1; col < dateRow.length; col++) {
    const value = dateRow[col];
    if (typeof value === 'number' && value > 30000 && value < 50000) {
      // Looks like an Excel date serial
      dateColumns.push({
        col,
        date: excelDateToISO(value)
      });
    }
  }

  console.log(`${sheetName}: Found ${dateColumns.length} date columns`);

  // Process data rows (start from row 4, index 4)
  for (let row = 4; row < data.length; row++) {
    const rowData = data[row] as (string | number)[];
    if (!rowData || rowData.length === 0) continue;

    const name = String(rowData[0] || '').trim();

    // Skip header rows, summary rows, and calculation rows
    if (
      !name ||
      name === 'Row Labels' ||
      name === 'Grand Total' ||
      name === '(blank)' ||
      name.toLowerCase().includes('mfm') ||
      name.toLowerCase().includes('difference') ||
      name.toLowerCase().includes('total') ||
      name.toLowerCase().includes('benchmark') ||
      name.toLowerCase().includes('portfolio')
    ) {
      continue;
    }

    // Extract weights for each date
    for (const { col, date } of dateColumns) {
      const value = rowData[col];
      if (typeof value === 'number' && value > 0) {
        // Weight might be in decimal form (0.05) or needs normalization
        let weight = value;
        if (weight > 1) {
          weight = weight / 100; // Convert percentage to decimal
        }

        results.push({
          date,
          name,
          weight
        });
      }
    }
  }

  console.log(`${sheetName}: Extracted ${results.length} data points`);
  return results;
}

// Process the Portfolio Composition Excel file
// Expected format: IC_PortfolioComposition_Total_Universe_Top50-No_Constraint&LatestPositioning.xlsx
// Contains sheets: MFM_T50 (Region), MFM_T50 (Sector), MFM_T50 (Country)
export async function processCompositionFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<PortfolioCompositionData> {
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

        // Initialize result
        const result: PortfolioCompositionData = {
          region: [],
          sector: [],
          country: [],
          constituents: [],
        };

        // Process Region sheet
        const regionSheetName = 'MFM_T50 (Region)';
        if (workbook.SheetNames.includes(regionSheetName)) {
          const sheet = workbook.Sheets[regionSheetName];
          result.region = processPivotSheet(sheet, regionSheetName);
        } else {
          console.log('Region sheet not found');
        }

        onProgress?.(80);

        // Process Sector sheet
        const sectorSheetName = 'MFM_T50 (Sector)';
        if (workbook.SheetNames.includes(sectorSheetName)) {
          const sheet = workbook.Sheets[sectorSheetName];
          result.sector = processPivotSheet(sheet, sectorSheetName);
        } else {
          console.log('Sector sheet not found');
        }

        onProgress?.(85);

        // Process Country sheet
        const countrySheetName = 'MFM_T50 (Country)';
        if (workbook.SheetNames.includes(countrySheetName)) {
          const sheet = workbook.Sheets[countrySheetName];
          result.country = processPivotSheet(sheet, countrySheetName);
        } else {
          console.log('Country sheet not found');
        }

        onProgress?.(90);

        // Try to get constituent count from the data
        // Count unique dates and calculate number of holdings per date
        const dateSet = new Set<string>();
        result.region.forEach(r => dateSet.add(r.date));

        // For constituents, we can estimate from region data or use a fixed value
        // Since this is TOP 50, we know there are ~50 constituents
        dateSet.forEach(date => {
          result.constituents.push({
            date,
            count: 50 // TOP 50 portfolio
          });
        });

        // Sort constituents by date
        result.constituents.sort((a, b) => a.date.localeCompare(b.date));

        // Validate we have some data
        if (result.region.length === 0 && result.sector.length === 0 && result.country.length === 0) {
          throw new Error('No valid composition data found. Expected MFM_T50 sheets with pivot table format.');
        }

        console.log('Processed composition data:', {
          regions: result.region.length,
          sectors: result.sector.length,
          countries: result.country.length,
          constituents: result.constituents.length,
          uniqueDates: dateSet.size
        });

        onProgress?.(100);
        resolve(result);
      } catch (error) {
        console.error('Composition processing error:', error);
        reject(error instanceof Error ? error : new Error('Failed to process Composition file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}
