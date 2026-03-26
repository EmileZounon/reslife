export interface CsvParseResult<T> {
  rows: T[];
  errors: Array<{ row: number; message: string }>;
}

const EXPECTED_HEADERS = ["studentemail", "buildingname", "roomnumber"];

/**
 * Split a CSV line respecting quoted fields (handles commas inside quotes).
 */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'; // escaped quote
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Parse CSV text into structured rows.
 * Handles quoted fields (including commas inside quotes) and normalizes headers.
 */
export function parseCsv(text: string): CsvParseResult<Record<string, string>> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { rows: [], errors: [{ row: 0, message: "CSV must have a header row and at least one data row" }] };
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[\s_-]+/g, ""));

  // Validate headers
  const missing = EXPECTED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [{ row: 0, message: `Missing columns: ${missing.join(", ")}. Expected: student_email, building_name, room_number` }],
    };
  }

  const rows: Record<string, string>[] = [];
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);

    if (values.length !== headers.length) {
      errors.push({ row: i + 1, message: `Expected ${headers.length} columns, got ${values.length}` });
      continue;
    }

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      const fieldMap: Record<string, string> = {
        studentemail: "studentEmail",
        buildingname: "buildingName",
        roomnumber: "roomNumber",
      };
      const field = fieldMap[h] || h;
      row[field] = values[idx];
    });

    rows.push(row);
  }

  return { rows, errors };
}
