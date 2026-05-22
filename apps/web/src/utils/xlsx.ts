import * as XLSX from 'xlsx';

export function buildWorkbookFromRows<T extends Record<string, unknown>>(rows: T[], sheetName = 'Sheet1') {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return workbook;
}

export function downloadWorkbookFromRows<T extends Record<string, unknown>>(
  rows: T[],
  filename: string,
  sheetName = 'Sheet1',
) {
  XLSX.writeFile(buildWorkbookFromRows(rows, sheetName), filename);
}
