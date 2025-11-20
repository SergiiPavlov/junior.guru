import { promises as fs } from 'node:fs';
import path from 'node:path';

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let insideQuotes = false;

  const pushField = () => {
    row.push(field.trim());
    field = '';
  };

  const pushRow = () => {
    if (row.length > 0) {
      rows.push(row);
    }
    row = [];
  };

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        field += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === ',' && !insideQuotes) {
      pushField();
      continue;
    }

    if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      pushField();
      if (row.some((value) => value.length > 0)) {
        pushRow();
      } else {
        row = [];
      }
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    pushField();
    if (row.length > 0) {
      pushRow();
    }
  }

  return rows;
}

export async function readCsvFile<T extends Record<string, string | undefined>>(filePath: string): Promise<T[]> {
  const absolutePath = path.resolve(filePath);
  const content = await fs.readFile(absolutePath, 'utf-8');
  const [headerRow, ...dataRows] = parseCsv(content.trim());

  if (!headerRow || headerRow.length === 0) {
    return [];
  }

  const headers = headerRow.map((header) => header.trim());

  return dataRows
    .filter((row) => row.some((value) => value.length > 0))
    .map((row) => {
      const record: Record<string, string> = {};
      headers.forEach((header, columnIndex) => {
        record[header] = row[columnIndex]?.trim() ?? '';
      });
      return record as T;
    });
}
