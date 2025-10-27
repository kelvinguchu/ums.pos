import * as XLSX from 'xlsx';

const meterTypes = ["Split", "Integrated", "Gas", "Water", "3 Phase", "Smart"];

export const processCSV = (csvText: string): Array<{serialNumber: string; type: string}> => {
  const rows = csvText.split('\n');
  const meters: Array<{serialNumber: string; type: string}> = [];
  
  // Skip header row and process each line
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i].trim();
    if (!row) continue;
    
    const [serialNumber, type] = row.split(',').map(item => item.trim());
    
    // Validate meter type
    const normalizedType = type.toLowerCase();
    const validType = meterTypes.find(t => t.toLowerCase() === normalizedType);
    
    if (serialNumber && validType) {
      meters.push({
        serialNumber: serialNumber.toUpperCase(),
        type: validType
      });
    }
  }
  
  return meters;
};

export const processExcel = (buffer: ArrayBuffer): Array<{serialNumber: string; type: string}> => {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];
  
  const meters: Array<{serialNumber: string; type: string}> = [];
  
  // Skip header row and process each line
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 2) continue;
    
    const [serialNumber, type] = row;
    if (!serialNumber || !type) continue;

    // Validate meter type
    const normalizedType = type.toString().trim().toLowerCase();
    const validType = meterTypes.find(t => t.toLowerCase() === normalizedType);
    
    if (serialNumber && validType) {
      meters.push({
        serialNumber: serialNumber.toString().trim().toUpperCase(),
        type: validType
      });
    }
  }
  
  return meters;
}; 