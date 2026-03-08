import { memo, useCallback, useMemo, useRef } from "react";
import { colIndexToLetter, getDisplayValue } from "../../utils/formula";
import { Cell } from "./Cell";
import type { CellFormat } from "./FormattingToolbar";

const ROWS = 100;
const COLS = 26;

export interface CellData {
  value: string;
  formula: string;
  editedBy: string;
  timestamp: bigint;
}

export type CellMap = Map<string, CellData>;
export type FormatMap = Map<string, CellFormat>;

interface GridProps {
  cellMap: CellMap;
  formatMap: FormatMap;
  selectedRow: number;
  selectedCol: number;
  editingCell: { row: number; col: number } | null;
  editValue: string;
  onSelectCell: (row: number, col: number) => void;
  onStartEdit: (row: number, col: number, initialChar?: string) => void;
  onEditChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onNavigate: (dRow: number, dCol: number) => void;
}

const DEFAULT_FORMAT: CellFormat = { bold: false, italic: false, color: "" };

export const Grid = memo(function Grid({
  cellMap,
  formatMap,
  selectedRow,
  selectedCol,
  editingCell,
  editValue,
  onSelectCell,
  onStartEdit,
  onEditChange,
  onCommit,
  onCancel,
  onNavigate,
}: GridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Build a getCellValue function for formula evaluation
  const getCellValue = useCallback(
    (key: string): string => {
      const cell = cellMap.get(key);
      if (!cell) return "";
      return cell.formula?.startsWith("=") ? cell.formula : cell.value;
    },
    [cellMap],
  );

  // Compute display values for all cells
  const displayValues = useMemo(() => {
    const result = new Map<string, string>();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const key = `${r},${c}`;
        const cell = cellMap.get(key);
        if (!cell) {
          result.set(key, "");
          continue;
        }
        const display = getDisplayValue(
          cell.formula,
          cell.value,
          getCellValue,
          new Set([key]),
          key,
        );
        result.set(key, display);
      }
    }
    return result;
  }, [cellMap, getCellValue]);

  const columnHeaders = useMemo(
    () => Array.from({ length: COLS }, (_, i) => colIndexToLetter(i)),
    [],
  );

  const rows = useMemo(() => Array.from({ length: ROWS }, (_, i) => i), []);

  return (
    <div
      ref={containerRef}
      className="grid-container overflow-auto flex-1"
      style={{
        background: "oklch(0.14 0.009 250)",
      }}
    >
      <table className="spreadsheet-grid" aria-label="Spreadsheet grid">
        <thead>
          <tr>
            {/* Corner header */}
            <th
              className="corner-header text-center"
              style={{
                width: "48px",
                minWidth: "48px",
                maxWidth: "48px",
                height: "24px",
              }}
            />
            {columnHeaders.map((col) => (
              <th
                key={col}
                style={{
                  width: "100px",
                  minWidth: "100px",
                  maxWidth: "100px",
                  height: "24px",
                  textAlign: "center",
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r}>
              {/* Row number */}
              <td
                className="row-number"
                style={{
                  width: "48px",
                  minWidth: "48px",
                  maxWidth: "48px",
                  height: "24px",
                }}
              >
                {r + 1}
              </td>
              {columnHeaders.map((_, c) => {
                const key = `${r},${c}`;
                const cell = cellMap.get(key);
                const isSelected = selectedRow === r && selectedCol === c;
                const isEditing =
                  editingCell !== null &&
                  editingCell.row === r &&
                  editingCell.col === c;
                const displayValue = displayValues.get(key) ?? "";
                const fmt = formatMap.get(key) ?? DEFAULT_FORMAT;
                return (
                  <Cell
                    key={key}
                    row={r}
                    col={c}
                    displayValue={displayValue}
                    isSelected={isSelected}
                    isEditing={isEditing}
                    editValue={
                      isEditing
                        ? editValue
                        : cell?.formula?.startsWith("=")
                          ? cell.formula
                          : (cell?.value ?? "")
                    }
                    format={fmt}
                    onSelect={onSelectCell}
                    onStartEdit={onStartEdit}
                    onEditChange={onEditChange}
                    onCommit={onCommit}
                    onCancel={onCancel}
                    onNavigate={onNavigate}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
