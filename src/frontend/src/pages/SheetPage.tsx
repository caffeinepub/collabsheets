import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Download, Grid3X3 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Presence } from "../backend.d";
import {
  DEFAULT_FORMAT,
  FormattingToolbar,
} from "../components/spreadsheet/FormattingToolbar";
import type { CellFormat } from "../components/spreadsheet/FormattingToolbar";
import { FormulaBar } from "../components/spreadsheet/FormulaBar";
import { Grid } from "../components/spreadsheet/Grid";
import type { CellMap, FormatMap } from "../components/spreadsheet/Grid";
import { PresenceBar } from "../components/spreadsheet/PresenceBar";
import { SyncStatus } from "../components/spreadsheet/SyncStatus";
import type { SyncState } from "../components/spreadsheet/SyncStatus";
import { useUser } from "../context/UserContext";
import { useActor } from "../hooks/useActor";
import { getRandomColor } from "../utils/colors";
import { downloadCSV, generateCSV } from "../utils/csv";
import { getDisplayValue } from "../utils/formula";

const ROWS = 100;
const COLS = 26;

export default function SheetPage() {
  const params = useParams({ from: "/sheet/$id" });
  const docId = params.id;
  const navigate = useNavigate();
  const { actor } = useActor();
  const { user } = useUser();

  // Grid state
  const [cellMap, setCellMap] = useState<CellMap>(new Map());
  const [formatMap, setFormatMap] = useState<FormatMap>(new Map());
  const [selectedRow, setSelectedRow] = useState(0);
  const [selectedCol, setSelectedCol] = useState(0);
  const [editingCell, setEditingCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [syncState, setSyncState] = useState<SyncState>("saved");
  const [loading, setLoading] = useState(true);
  const [presence, setPresence] = useState<Presence[]>([]);
  const [docTitle, setDocTitle] = useState("Spreadsheet");

  const sessionIdRef = useRef<string | null>(null);
  const writingRef = useRef(false);
  const pendingWriteRef = useRef<{
    row: number;
    col: number;
    value: string;
    formula: string;
  } | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate({ to: "/" });
    }
  }, [user, navigate]);

  // Load cells
  const loadCells = useCallback(async () => {
    if (!actor) return;
    try {
      const cells = await actor.getCells(docId);
      setCellMap((prev) => {
        const next = new Map(prev);
        for (const cell of cells) {
          const key = `${cell.row},${cell.col}`;
          next.set(key, {
            value: cell.value,
            formula: cell.formula,
            editedBy: cell.editedBy,
            timestamp: cell.timestamp,
          });
        }
        return next;
      });
    } catch {
      // silent
    }
  }, [actor, docId]);

  // Load documents to get title
  const loadDocTitle = useCallback(async () => {
    if (!actor) return;
    try {
      const docs = await actor.listDocuments();
      const doc = docs.find((d) => d.id === docId);
      if (doc) setDocTitle(doc.title);
    } catch {
      // silent
    }
  }, [actor, docId]);

  // Join document presence
  const joinDocument = useCallback(async () => {
    if (!actor || !user) return;
    try {
      const color = user.color || getRandomColor();
      const sessionId = await actor.joinDocument(docId, color);
      sessionIdRef.current = sessionId;
    } catch {
      // silent
    }
  }, [actor, docId, user]);

  // Leave document
  const leaveDocument = useCallback(async () => {
    if (!actor || !sessionIdRef.current) return;
    try {
      await actor.leaveDocument(docId, sessionIdRef.current);
    } catch {
      // silent
    }
  }, [actor, docId]);

  // Heartbeat
  const sendHeartbeat = useCallback(async () => {
    if (!actor || !sessionIdRef.current) return;
    try {
      await actor.heartbeat(docId, sessionIdRef.current);
    } catch {
      // silent
    }
  }, [actor, docId]);

  // Load presence
  const loadPresence = useCallback(async () => {
    if (!actor) return;
    try {
      const data = await actor.getPresence(docId);
      setPresence(data);
    } catch {
      // silent
    }
  }, [actor, docId]);

  // Initial load
  useEffect(() => {
    if (!actor) return;
    Promise.all([loadCells(), loadDocTitle(), joinDocument()]).finally(() => {
      setLoading(false);
    });

    // Poll cells every 3s
    const cellInterval = setInterval(loadCells, 3000);
    // Poll presence every 5s
    const presenceInterval = setInterval(loadPresence, 5000);
    // Heartbeat every 15s
    const heartbeatInterval = setInterval(sendHeartbeat, 15000);

    return () => {
      clearInterval(cellInterval);
      clearInterval(presenceInterval);
      clearInterval(heartbeatInterval);
      leaveDocument();
    };
  }, [
    actor,
    loadCells,
    loadDocTitle,
    joinDocument,
    loadPresence,
    sendHeartbeat,
    leaveDocument,
  ]);

  // Commit a cell edit to backend
  const commitCellWrite = useCallback(
    async (row: number, col: number, value: string, formula: string) => {
      if (!actor) return;
      if (writingRef.current) {
        pendingWriteRef.current = { row, col, value, formula };
        return;
      }
      writingRef.current = true;
      setSyncState("saving");
      try {
        await actor.updateCell(docId, BigInt(row), BigInt(col), value, formula);
        setSyncState("saved");
      } catch {
        setSyncState("offline");
        toast.error("Failed to save cell");
      } finally {
        writingRef.current = false;
        // Flush pending write
        if (pendingWriteRef.current) {
          const pending = pendingWriteRef.current;
          pendingWriteRef.current = null;
          commitCellWrite(
            pending.row,
            pending.col,
            pending.value,
            pending.formula,
          );
        }
      }
    },
    [actor, docId],
  );

  // Apply a cell value locally + queue write
  const applyCellValue = useCallback(
    (row: number, col: number, rawValue: string) => {
      const key = `${row},${col}`;
      const isFormula = rawValue.startsWith("=");
      const formula = isFormula ? rawValue : "";
      const value = isFormula ? "" : rawValue;

      // Optimistic update
      setCellMap((prev) => {
        const next = new Map(prev);
        next.set(key, {
          value,
          formula,
          editedBy: user?.name ?? "unknown",
          timestamp: BigInt(Date.now()) * BigInt(1_000_000),
        });
        return next;
      });

      commitCellWrite(row, col, value, formula);
    },
    [user, commitCellWrite],
  );

  // Selection
  const handleSelectCell = useCallback((row: number, col: number) => {
    setSelectedRow(row);
    setSelectedCol(col);
    setEditingCell(null);
  }, []);

  // Start editing
  const handleStartEdit = useCallback(
    (row: number, col: number, initialChar?: string) => {
      const key = `${row},${col}`;
      const cell = cellMap.get(key);
      let startValue: string;
      if (initialChar !== undefined) {
        startValue = initialChar;
      } else {
        startValue = cell?.formula?.startsWith("=")
          ? cell.formula
          : (cell?.value ?? "");
      }
      setSelectedRow(row);
      setSelectedCol(col);
      setEditingCell({ row, col });
      setEditValue(startValue);
    },
    [cellMap],
  );

  const handleEditChange = useCallback((value: string) => {
    setEditValue(value);
  }, []);

  const handleCommit = useCallback(() => {
    if (!editingCell) return;
    applyCellValue(editingCell.row, editingCell.col, editValue);
    setEditingCell(null);
  }, [editingCell, editValue, applyCellValue]);

  const handleCancel = useCallback(() => {
    setEditingCell(null);
    setEditValue("");
  }, []);

  const handleNavigate = useCallback((dRow: number, dCol: number) => {
    setSelectedRow((r) => Math.max(0, Math.min(ROWS - 1, r + dRow)));
    setSelectedCol((c) => Math.max(0, Math.min(COLS - 1, c + dCol)));
    setEditingCell(null);
  }, []);

  // Formula bar
  const formulaBarValue = useMemo(() => {
    if (editingCell?.row === selectedRow && editingCell?.col === selectedCol) {
      return editValue;
    }
    const key = `${selectedRow},${selectedCol}`;
    const cell = cellMap.get(key);
    return cell?.formula?.startsWith("=") ? cell.formula : (cell?.value ?? "");
  }, [editingCell, selectedRow, selectedCol, editValue, cellMap]);

  const handleFormulaChange = useCallback(
    (value: string) => {
      if (
        !editingCell ||
        editingCell.row !== selectedRow ||
        editingCell.col !== selectedCol
      ) {
        setEditingCell({ row: selectedRow, col: selectedCol });
      }
      setEditValue(value);
    },
    [editingCell, selectedRow, selectedCol],
  );

  const handleFormulaCommit = useCallback(() => {
    applyCellValue(selectedRow, selectedCol, formulaBarValue);
    setEditingCell(null);
  }, [selectedRow, selectedCol, formulaBarValue, applyCellValue]);

  const handleFormulaCancel = useCallback(() => {
    setEditingCell(null);
  }, []);

  // Formatting
  const currentFormat = useMemo(() => {
    const key = `${selectedRow},${selectedCol}`;
    return formatMap.get(key) ?? DEFAULT_FORMAT;
  }, [formatMap, selectedRow, selectedCol]);

  const handleFormatChange = useCallback(
    (fmt: CellFormat) => {
      const key = `${selectedRow},${selectedCol}`;
      setFormatMap((prev) => {
        const next = new Map(prev);
        next.set(key, fmt);
        return next;
      });
    },
    [selectedRow, selectedCol],
  );

  // CSV export
  const getCellDisplayValue = useCallback(
    (key: string): string => {
      const cell = cellMap.get(key);
      if (!cell) return "";
      return getDisplayValue(
        cell.formula,
        cell.value,
        (k) => {
          const c = cellMap.get(k);
          return c?.formula?.startsWith("=") ? c.formula : (c?.value ?? "");
        },
        new Set([key]),
        key,
      );
    },
    [cellMap],
  );

  const handleExportCSV = useCallback(() => {
    const csv = generateCSV(
      cellMap as Map<string, { value: string; formula: string }>,
      getCellDisplayValue,
    );
    downloadCSV(csv, `${docTitle}.csv`);
    toast.success("CSV exported");
  }, [cellMap, getCellDisplayValue, docTitle]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col"
        data-ocid="sheet.loading_state"
        style={{ background: "oklch(0.12 0.008 250)" }}
      >
        <div
          className="flex items-center gap-3 px-4 py-2 border-b"
          style={{
            background: "oklch(0.14 0.009 250)",
            borderColor: "oklch(0.24 0.012 250)",
          }}
        >
          <Skeleton
            className="w-8 h-8 rounded-lg"
            style={{ background: "oklch(0.20 0.01 250)" }}
          />
          <Skeleton
            className="w-48 h-5 rounded"
            style={{ background: "oklch(0.20 0.01 250)" }}
          />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "oklch(0.72 0.18 155 / 0.10)" }}
            >
              <Grid3X3
                className="w-6 h-6"
                style={{ color: "oklch(0.72 0.18 155)" }}
              />
            </div>
            <p className="text-muted-foreground text-sm">
              Loading spreadsheet...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      data-ocid="sheet.page"
      style={{ background: "oklch(0.12 0.008 250)" }}
    >
      {/* Top bar */}
      <header
        className="flex items-center gap-3 px-3 py-1.5 border-b shrink-0"
        style={{
          background: "oklch(0.14 0.009 250)",
          borderColor: "oklch(0.24 0.012 250)",
          height: "40px",
        }}
      >
        <Button
          data-ocid="sheet.back_button"
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/dashboard" })}
          className="h-7 px-2 text-muted-foreground hover:text-foreground gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="text-xs hidden sm:block">Dashboard</span>
        </Button>

        <div
          className="w-px h-4 shrink-0"
          style={{ background: "oklch(0.26 0.012 250)" }}
        />

        <div className="flex items-center gap-1.5">
          <div
            className="w-5 h-5 rounded flex items-center justify-center"
            style={{ background: "oklch(0.72 0.18 155 / 0.10)" }}
          >
            <Grid3X3
              className="w-3 h-3"
              style={{ color: "oklch(0.72 0.18 155)" }}
            />
          </div>
          <span className="text-sm font-medium truncate max-w-[200px]">
            {docTitle}
          </span>
        </div>

        <div className="flex-1" />

        {/* Presence bar */}
        <PresenceBar presence={presence} />

        <SyncStatus state={syncState} />

        <Button
          data-ocid="sheet.export_button"
          variant="ghost"
          size="sm"
          onClick={handleExportCSV}
          className="h-7 px-2 text-muted-foreground hover:text-foreground gap-1"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="text-xs hidden sm:block">Export CSV</span>
        </Button>
      </header>

      {/* Formatting toolbar */}
      <FormattingToolbar
        format={currentFormat}
        onFormatChange={handleFormatChange}
      />

      {/* Formula bar */}
      <FormulaBar
        selectedRow={selectedRow}
        selectedCol={selectedCol}
        formula={formulaBarValue}
        onFormulaChange={handleFormulaChange}
        onFormulaCommit={handleFormulaCommit}
        onFormulaCancel={handleFormulaCancel}
      />

      {/* Grid */}
      <Grid
        cellMap={cellMap}
        formatMap={formatMap}
        selectedRow={selectedRow}
        selectedCol={selectedCol}
        editingCell={editingCell}
        editValue={editValue}
        onSelectCell={handleSelectCell}
        onStartEdit={handleStartEdit}
        onEditChange={handleEditChange}
        onCommit={handleCommit}
        onCancel={handleCancel}
        onNavigate={handleNavigate}
      />
    </div>
  );
}
