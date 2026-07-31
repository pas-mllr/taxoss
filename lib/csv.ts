const FORMULA_PREFIX = /^[\t\r\n ]*[=+\-@]/;

export function excelSafeCsvCell(value: unknown): string {
  const raw = value == null ? "" : String(value);
  const safe = FORMULA_PREFIX.test(raw) || /^[\t\r\n]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function createCsv(rows: unknown[][]): string {
  return `\uFEFF${rows
    .map((row) => row.map(excelSafeCsvCell).join(","))
    .join("\r\n")}\r\n`;
}
