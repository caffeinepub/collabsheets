import { Toggle } from "@/components/ui/toggle";
import { Bold, Italic } from "lucide-react";
import { memo } from "react";

export interface CellFormat {
  bold: boolean;
  italic: boolean;
  color: string;
}

export const DEFAULT_FORMAT: CellFormat = {
  bold: false,
  italic: false,
  color: "",
};

const TEXT_COLORS = [
  { value: "", label: "Default", display: "oklch(0.93 0.01 240)" },
  { value: "#ef4444", label: "Red", display: "#ef4444" },
  { value: "#f59e0b", label: "Amber", display: "#f59e0b" },
  { value: "#22c55e", label: "Green", display: "#22c55e" },
  { value: "#3b82f6", label: "Blue", display: "#3b82f6" },
  { value: "#8b5cf6", label: "Violet", display: "#8b5cf6" },
  { value: "#ec4899", label: "Pink", display: "#ec4899" },
];

interface FormattingToolbarProps {
  format: CellFormat;
  onFormatChange: (format: CellFormat) => void;
}

export const FormattingToolbar = memo(function FormattingToolbar({
  format,
  onFormatChange,
}: FormattingToolbarProps) {
  return (
    <div
      className="flex items-center gap-1 px-2 border-b"
      style={{
        background: "oklch(0.14 0.009 250)",
        borderColor: "oklch(0.24 0.012 250)",
        height: "30px",
      }}
    >
      <Toggle
        data-ocid="sheet.bold_toggle"
        size="sm"
        pressed={format.bold}
        onPressedChange={(p) => onFormatChange({ ...format, bold: p })}
        className="h-6 w-6 p-0 data-[state=on]:bg-accent/20"
        aria-label="Bold"
        style={{
          color: format.bold ? "oklch(0.72 0.18 155)" : "oklch(0.56 0.01 250)",
        }}
      >
        <Bold className="w-3 h-3" />
      </Toggle>

      <Toggle
        data-ocid="sheet.italic_toggle"
        size="sm"
        pressed={format.italic}
        onPressedChange={(p) => onFormatChange({ ...format, italic: p })}
        className="h-6 w-6 p-0 data-[state=on]:bg-accent/20"
        aria-label="Italic"
        style={{
          color: format.italic
            ? "oklch(0.72 0.18 155)"
            : "oklch(0.56 0.01 250)",
        }}
      >
        <Italic className="w-3 h-3" />
      </Toggle>

      <div
        className="w-px h-4 mx-1"
        style={{ background: "oklch(0.26 0.012 250)" }}
      />

      <div className="flex items-center gap-0.5">
        {TEXT_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            data-ocid="sheet.color_select"
            onClick={() => onFormatChange({ ...format, color: c.value })}
            title={c.label}
            className="w-5 h-5 rounded flex items-center justify-center transition-transform hover:scale-110"
            style={{
              background: c.display,
              outline:
                format.color === c.value
                  ? "2px solid oklch(0.93 0.01 240)"
                  : "none",
              outlineOffset: "1px",
            }}
            aria-label={`Text color: ${c.label}`}
          />
        ))}
      </div>
    </div>
  );
});
