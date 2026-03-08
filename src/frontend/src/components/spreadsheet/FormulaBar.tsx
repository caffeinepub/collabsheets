import { memo, useCallback } from "react";
import { cellKeyToAddress, colIndexToLetter } from "../../utils/formula";

interface FormulaBarProps {
  selectedRow: number;
  selectedCol: number;
  formula: string;
  onFormulaChange: (value: string) => void;
  onFormulaCommit: () => void;
  onFormulaCancel: () => void;
}

export const FormulaBar = memo(function FormulaBar({
  selectedRow,
  selectedCol,
  formula,
  onFormulaChange,
  onFormulaCommit,
  onFormulaCancel,
}: FormulaBarProps) {
  const address = `${colIndexToLetter(selectedCol)}${selectedRow + 1}`;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onFormulaCommit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onFormulaCancel();
      }
    },
    [onFormulaCommit, onFormulaCancel],
  );

  return (
    <div
      className="flex items-center border-b"
      style={{
        background: "oklch(0.14 0.009 250)",
        borderColor: "oklch(0.24 0.012 250)",
        height: "32px",
      }}
    >
      {/* Cell address indicator */}
      <div
        className="flex items-center justify-center border-r text-xs font-mono font-medium shrink-0"
        style={{
          background: "oklch(0.17 0.011 250)",
          borderColor: "oklch(0.24 0.012 250)",
          color: "oklch(0.72 0.18 155)",
          minWidth: "64px",
          height: "100%",
          padding: "0 8px",
        }}
      >
        {address}
      </div>

      {/* Formula fx indicator */}
      <div className="formula-bar-fx" aria-hidden="true">
        <em>fx</em>
      </div>

      {/* Formula input */}
      <input
        data-ocid="sheet.formula_input"
        className="formula-bar-input flex-1 h-full px-2 text-sm outline-none bg-transparent"
        style={{ color: "oklch(0.93 0.01 240)" }}
        value={formula}
        onChange={(e) => onFormulaChange(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        autoComplete="off"
        placeholder="Value or formula (e.g. =A1+B1, =SUM(A1:A5))"
      />
    </div>
  );
});
