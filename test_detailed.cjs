const XLSX = require('xlsx');

// Test Returns_Calc more closely
const wb = XLSX.readFile('/Users/ssvk/Dev/Portman/IC_Backtest_Returns&Risk_Top50.xlsx');

console.log('=== Returns_Calc Analysis ===');
const sheet = wb.Sheets['Returns_Calc'];
const data = XLSX.utils.sheet_to_json(sheet, { defval: '', header: 1 });

console.log('First 5 rows (raw):');
for (let i = 0; i < 5; i++) {
  console.log(`Row ${i}:`, data[i]?.slice(0, 12));
}

console.log('\n=== Risk_Calc Analysis ===');
const riskSheet = wb.Sheets['Risk_Calc'];
const riskData = XLSX.utils.sheet_to_json(riskSheet, { defval: '', header: 1 });

console.log('First 5 rows (raw):');
for (let i = 0; i < 5; i++) {
  console.log(`Row ${i}:`, riskData[i]?.slice(0, 12));
}

console.log('\n=== MFM_T50 (Region) Analysis ===');
const wb2 = XLSX.readFile('/Users/ssvk/Dev/Portman/IC_PortfolioComposition_Total_Universe_Top50-No_Constraint&LatestPositioning.xlsx');
const regionSheet = wb2.Sheets['MFM_T50 (Region)'];
const regionData = XLSX.utils.sheet_to_json(regionSheet, { defval: '', header: 1 });

console.log('First 10 rows (raw):');
for (let i = 0; i < 10; i++) {
  console.log(`Row ${i}:`, regionData[i]?.slice(0, 8));
}

// Check column headers (dates)
console.log('\nColumn headers (potential dates):', regionData[2]?.slice(0, 15));
