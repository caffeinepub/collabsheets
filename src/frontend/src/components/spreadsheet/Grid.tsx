import { memo, useCallback, useMemo, useRef } from "react";
import { colIndexToLetter, getDisplayValue } from "../../utils/formula";
import { Cell } from "./Cell";
import type { CellFormat } from "./FormattingToolbar";

const ROWS = 100;
const COLS = 26;
const DEFAULT_COL_WIDTH = 100;
const MIN_COL_WIDTH = 40;
const ROW_HEADER_WIDTH = 48;

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
  colWidths: Record<number, number>;
  onColResize: (col: number, width: number) => void;
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
  colWidths,
  onColResize,
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

  // Column resize drag handler
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, colIndex: number) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startWidth = colWidths[colIndex] ?? DEFAULT_COL_WIDTH;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.max(MIN_COL_WIDTH, startWidth + delta);
        onColResize(colIndex, newWidth);
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [colWidths, onColResize],
  );

  return (
    <div
      ref={containerRef}
      className="grid-container overflow-auto flex-1"
      style={{
        background: "oklch(0.14 0.009 250)",
      }}
    >
      <table className="spreadsheet-grid" aria-label="Spreadsheet grid">
        <colgroup>
          <col
            style={{
              width: `${ROW_HEADER_WIDTH}px`,
              minWidth: `${ROW_HEADER_WIDTH}px`,
            }}
          />
          {columnHeaders.map((letter, i) => {
            const w = colWidths[i] ?? DEFAULT_COL_WIDTH;
            return (
              <col
                key={letter}
                style={{ width: `${w}px`, minWidth: `${w}px` }}
              />
            );
          })}
        </colgroup>
        <thead>
          <tr>
            {/* Corner header */}
            <th
              className="corner-header text-center"
              style={{
                width: `${ROW_HEADER_WIDTH}px`,
                minWidth: `${ROW_HEADER_WIDTH}px`,
                maxWidth: `${ROW_HEADER_WIDTH}px`,
                height: "24px",
              }}
            />
            {columnHeaders.map((col, colIndex) => {
              const w = colWidths[colIndex] ?? DEFAULT_COL_WIDTH;
              return (
                <th
                  key={col}
                  style={{
                    width: `${w}px`,
                    minWidth: `${w}px`,
                    height: "24px",
                    textAlign: "center",
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                    overflow: "visible",
                  }}
                >
                  <div
                    className="col-header-inner"
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                    }}
                  >
                    {col}
                    {/* Resize handle */}
                    <div
                      className="col-resize-handle"
                      onMouseDown={(e) => handleResizeMouseDown(e, colIndex)}
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        width: "6px",
                        height: "100%",
                        cursor: "col-resize",
                        zIndex: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        style={{
                          width: "2px",
                          height: "60%",
                          background: "oklch(0.40 0.012 250)",
                          borderRadius: "1px",
                          transition: "background 0.15s",
                        }}
                        className="resize-handle-bar"
                      />
                    </div>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r}>
              {/* Row number */}
              <td
                className="row-number"
                style={{
                  width: `${ROW_HEADER_WIDTH}px`,
                  minWidth: `${ROW_HEADER_WIDTH}px`,
                  maxWidth: `${ROW_HEADER_WIDTH}px`,
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
                const cellWidth = colWidths[c] ?? DEFAULT_COL_WIDTH;
                return (
                  <Cell
                    key={key}
                    row={r}
                    col={c}
                    width={cellWidth}
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
