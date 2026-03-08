export type CellMap = Map<string, { value: string; formula: string }>;

const ROWS = 100;
const COLS = 26;

function escapeCSVValue(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function generateCSV(
  _cellMap: CellMap,
  getDisplayValue: (key: string) => string,
): string {
  const rows: string[] = [];
  let lastNonEmptyRow = 0;

  // Find last non-empty row
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const key = `${r},${c}`;
      const val = getDisplayValue(key);
      if (val) lastNonEmptyRow = r;
    }
  }

  for (let r = 0; r <= lastNonEmptyRow; r++) {
    const cells: string[] = [];
    for (let c = 0; c < COLS; c++) {
      const key = `${r},${c}`;
      cells.push(escapeCSVValue(getDisplayValue(key)));
    }
    rows.push(cells.join(","));
  }

  return rows.join("\n");
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
