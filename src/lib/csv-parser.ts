/**
 * Zero-dependency RFC 4180 compliant CSV parser and serializer.
 * Supports quoted values, embedded commas, multiline text, escaped quotes (""),
 * CRLF/LF line endings, and UTF-8 BOM stripping.
 */

export interface CsvParseOptions {
  trimHeaders?: boolean;
  trimValues?: boolean;
  skipEmptyLines?: boolean;
}

/**
 * Parses raw CSV text into a 2D array of strings.
 */
export function parseCsvRows(csvText: string, options: CsvParseOptions = {}): string[][] {
  const { trimValues = false, skipEmptyLines = true } = options;

  // Strip UTF-8 Byte Order Mark if present
  let text = csvText;
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        // Look ahead for escaped quote ("")
        if (i + 1 < len && text[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(trimValues ? currentField.trim() : currentField);
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (i + 1 < len && text[i + 1] === '\n') {
          i++;
        }
        currentRow.push(trimValues ? currentField.trim() : currentField);
        currentField = '';

        if (!skipEmptyLines || currentRow.some((f) => f.trim().length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(trimValues ? currentField.trim() : currentField);
        currentField = '';

        if (!skipEmptyLines || currentRow.some((f) => f.trim().length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Push final field/row if anything remains
  currentRow.push(trimValues ? currentField.trim() : currentField);
  if (!skipEmptyLines || currentRow.some((f) => f.trim().length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Parses raw CSV text into an array of objects keyed by header names.
 */
export function parseCsvObjects<T = Record<string, string>>(
  csvText: string,
  options: CsvParseOptions = {}
): { headers: string[]; rows: T[] } {
  const { trimHeaders = true } = options;
  const rawRows = parseCsvRows(csvText, { ...options, trimValues: true });

  if (rawRows.length === 0) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = rawRows[0];
  const headers = trimHeaders ? rawHeaders.map((h) => h.trim()) : rawHeaders;
  const rows: T[] = [];

  for (let r = 1; r < rawRows.length; r++) {
    const rowData = rawRows[r];
    const obj: Record<string, string> = {};

    for (let c = 0; c < headers.length; c++) {
      const headerName = headers[c];
      if (headerName) {
        obj[headerName] = rowData[c] ?? '';
      }
    }

    rows.push(obj as unknown as T);
  }

  return { headers, rows };
}

/**
 * Serializes an array of records into RFC 4180 CSV text.
 */
export function serializeCsv(
  rows: Array<Record<string, unknown>>,
  headers?: string[]
): string {
  if (rows.length === 0) return '';

  const cols = headers || Object.keys(rows[0]);

  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const lines = [cols.map(escapeCell).join(',')];

  for (const row of rows) {
    const line = cols.map((col) => escapeCell(row[col])).join(',');
    lines.push(line);
  }

  return lines.join('\r\n');
}
