import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { CellFormat } from "./FormattingToolbar";

interface CellProps {
  row: number;
  col: number;
  displayValue: string;
  isSelected: boolean;
  isEditing: boolean;
  editValue: string;
  format: CellFormat;
  onSelect: (row: number, col: number) => void;
  onStartEdit: (row: number, col: number, initialChar?: string) => void;
  onEditChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onNavigate: (dRow: number, dCol: number) => void;
}

export const Cell = memo(function Cell({
  row,
  col,
  displayValue,
  isSelected,
  isEditing,
  editValue,
  format,
  onSelect,
  onStartEdit,
  onEditChange,
  onCommit,
  onCancel,
  onNavigate,
}: CellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Position cursor at end
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const handleClick = useCallback(() => {
    onSelect(row, col);
  }, [row, col, onSelect]);

  const handleDoubleClick = useCallback(() => {
    onStartEdit(row, col);
  }, [row, col, onStartEdit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case "Enter":
          e.preventDefault();
          onCommit();
          onNavigate(1, 0);
          break;
        case "Escape":
          e.preventDefault();
          onCancel();
          break;
        case "Tab":
          e.preventDefault();
          onCommit();
          onNavigate(0, e.shiftKey ? -1 : 1);
          break;
        case "ArrowUp":
          if (!isEditing) {
            e.preventDefault();
            onNavigate(-1, 0);
          }
          break;
        case "ArrowDown":
          if (!isEditing) {
            e.preventDefault();
            onNavigate(1, 0);
          }
          break;
        case "ArrowLeft":
          if (!isEditing) {
            e.preventDefault();
            onNavigate(0, -1);
          }
          break;
        case "ArrowRight":
          if (!isEditing) {
            e.preventDefault();
            onNavigate(0, 1);
          }
          break;
      }
    },
    [isEditing, onCommit, onCancel, onNavigate],
  );

  const handleCellKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isEditing) {
        if (e.key === "F2") {
          e.preventDefault();
          onStartEdit(row, col);
          return;
        }
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          onStartEdit(row, col, "");
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          onNavigate(-1, 0);
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          onNavigate(1, 0);
          return;
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          onNavigate(0, -1);
          return;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          onNavigate(0, 1);
          return;
        }
        if (e.key === "Tab") {
          e.preventDefault();
          onNavigate(0, e.shiftKey ? -1 : 1);
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          onStartEdit(row, col);
          return;
        }
        // Start typing
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          onStartEdit(row, col, e.key);
        }
      }
    },
    [isEditing, row, col, onStartEdit, onNavigate],
  );

  const textStyle: React.CSSProperties = {
    fontWeight: format.bold ? "bold" : "normal",
    fontStyle: format.italic ? "italic" : "normal",
    color: format.color || undefined,
  };

  const isError =
    displayValue === "#ERROR!" ||
    displayValue === "#CYCLE!" ||
    displayValue === "#DIV/0!" ||
    displayValue === "#REF!";

  return (
    <td
      className="relative p-0 overflow-hidden"
      style={{
        width: "100px",
        minWidth: "100px",
        maxWidth: "100px",
        height: "24px",
        background: isSelected
          ? "oklch(0.72 0.18 155 / 0.08)"
          : isHovered
            ? "oklch(0.18 0.011 250)"
            : "oklch(0.14 0.009 250)",
        outline: isSelected ? "2px solid oklch(0.72 0.18 155)" : "none",
        outlineOffset: "-1px",
        boxShadow: isSelected ? "0 0 8px oklch(0.72 0.18 155 / 0.20)" : "none",
        zIndex: isSelected ? 1 : 0,
        cursor: "default",
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleCellKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={isSelected ? 0 : -1}
      aria-selected={isSelected}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          className="cell-input"
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={onCommit}
          spellCheck={false}
          autoComplete="off"
          style={{
            background: "oklch(0.20 0.012 250)",
            fontWeight: format.bold ? "bold" : "normal",
            fontStyle: format.italic ? "italic" : "normal",
            color: format.color || "oklch(0.93 0.01 240)",
          }}
        />
      ) : (
        <div
          className="w-full h-full flex items-center px-1 text-xs font-mono truncate"
          style={{
            ...textStyle,
            color: isError
              ? "oklch(0.60 0.22 25)"
              : format.color || "oklch(0.88 0.01 240)",
          }}
        >
          {displayValue}
        </div>
      )}
    </td>
  );
});
