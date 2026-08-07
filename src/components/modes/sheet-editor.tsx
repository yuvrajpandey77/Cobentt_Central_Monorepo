"use client";

import { useState, useMemo } from "react";
import { ArtifactBlock } from "@/lib/modes/types";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Type, Sigma } from "lucide-react";
import { HyperFormula } from "hyperformula";
import {
  DataEditor,
  GridCellKind,
  GridColumn,
  Item,
} from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";

interface SheetEditorProps {
  block: ArtifactBlock;
  selected: boolean;
  onSelect: () => void;
  onChange: (block: ArtifactBlock) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProps = Record<string, any>;

const COL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function colLetter(i: number): string {
  let n = i;
  let s = "";
  while (n >= 0) {
    s = COL_LETTERS[n % 26] + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

export function SheetEditor({ block, selected, onSelect, onChange }: SheetEditorProps) {
  const p = block.props as AnyProps;
  const columns: { key: string; header: string; type?: string }[] = Array.isArray(p.columns)
    ? p.columns
    : [{ key: "A", header: "Column A", type: "text" }];
  const rows: (string | number | null)[][] = Array.isArray(p.rows) ? p.rows : [];

  const [activeCell, setActiveCell] = useState<Item | null>(null);
  const [formulaDraft, setFormulaDraft] = useState("");
  const [showColMenu, setShowColMenu] = useState(false);

  const update = (nextProps: AnyProps) => {
    onChange({ ...block, props: { ...block.props, ...nextProps } });
  };

  const numCols = columns.length;
  const numRows = Math.max(rows.length, 8);

  // Build a HyperFormula instance for evaluating formula cells across the sheet.
  const evaluator = useMemo(() => {
    const sheetData: (string | number | null)[][] = [];
    for (let r = 0; r < numRows; r++) {
      const arr: (string | number | null)[] = [];
      for (let c = 0; c < numCols; c++) {
        const cell = rows[r]?.[c];
        arr.push(typeof cell === "string" && cell.startsWith("=") ? null : (cell ?? ""));
      }
      sheetData.push(arr);
    }
    try {
      return HyperFormula.buildFromArray(sheetData, { licenseKey: "gpl-v3" });
    } catch {
      return null;
    }
  }, [rows, numRows, numCols]);

  const evaluate = (raw: unknown, c: number, r: number): string => {
    const str = String(raw ?? "");
    if (!str.startsWith("=")) return str;
    try {
      if (!evaluator) return str;
      evaluator.setCellContents({ col: c, row: r, sheet: 0 }, str);
      const v = evaluator.getCellValue({ col: c, row: r, sheet: 0 });
      if (typeof v === "number") return (Math.round(v * 10000) / 10000).toString();
      return String(v ?? "");
    } catch {
      return str;
    }
  };

  const setCell = (c: number, r: number, value: string | number | null) => {
    const grid = rows.map((row) => [...row]) as (string | number | null)[][];
    while (grid.length <= r) grid.push(new Array(numCols).fill(""));
    for (let cc = 0; cc < numCols; cc++) {
      if (grid[r][cc] === undefined) grid[r][cc] = "";
    }
    grid[r][c] = value === "" ? null : value;
    update({ rows: grid });
  };

  const addRow = () => {
    const grid = rows.map((row) => [...row]);
    grid.push(new Array(numCols).fill(""));
    update({ rows: grid });
  };

  const addColumn = () => {
    const nextCols = [
      ...columns.map((c) => ({ ...c })),
      { key: colLetter(numCols), header: `Column ${colLetter(numCols)}`, type: "text" },
    ];
    const grid = rows.map((row) => [...row, ""]);
    update({ columns: nextCols, rows: grid });
  };

  const removeColumn = (idx: number) => {
    const nextCols = columns.filter((_: unknown, i: number) => i !== idx).map((c, i) => ({ ...c, key: colLetter(i) }));
    const grid = rows.map((row) => row.filter((_: unknown, i: number) => i !== idx));
    update({ columns: nextCols, rows: grid });
  };

  const clearColumn = (idx: number) => {
    const grid = rows.map((row) => row.map((cell, i) => (i === idx ? null : cell)));
    update({ rows: grid });
  };

  const setColumnType = (idx: number, type: string) => {
    const nextCols = columns.map((c, i) => (i === idx ? { ...c, type } : c));
    update({ columns: nextCols });
  };

  const setColumnHeader = (idx: number, header: string) => {
    const nextCols = columns.map((c, i) => (i === idx ? { ...c, header } : c));
    update({ columns: nextCols });
  };

  const gridColumns: GridColumn[] = useMemo(
    () =>
      columns.map((col, c) => ({
        id: col.key,
        title: col.header || colLetter(c),
        width: 140,
        icon: col.type === "number" ? "headerNumber" : "headerString",
        themeOverride: { bgHeader: "#1a1a1a", textHeader: "#a1a1aa" },
        hasMenu: false,
      })),
    [columns]
  );

  const getCellContent = (cell: Item): import("@glideapps/glide-data-grid").GridCell => {
    const [c, r] = cell;
    if (c >= numCols) return { kind: GridCellKind.Text, allowOverlay: false, displayData: "", data: "" };
    const col = columns[c];
    const raw = rows[r]?.[c];
    const isNumber = col?.type === "number";
    if (isNumber) {
      const n = typeof raw === "number" ? raw : raw != null && raw !== "" ? Number(raw) : undefined;
      return {
        kind: GridCellKind.Number,
        allowOverlay: true,
        data: Number.isFinite(n) ? n : undefined,
        displayData: evaluate(raw, c, r),
        allowNegative: true,
      };
    }
    return {
      kind: GridCellKind.Text,
      allowOverlay: true,
      data: String(raw ?? ""),
      displayData: evaluate(raw, c, r),
    };
  };

  const onCellEdited = (cell: Item, newValue: import("@glideapps/glide-data-grid").EditableGridCell) => {
    const [c, r] = cell;
    let value: string | number | null = null;
    if (newValue.kind === GridCellKind.Number) value = newValue.data ?? null;
    else if (newValue.kind === GridCellKind.Text) value = newValue.data;
    setCell(c, r, value);
  };

  const onColumnResize = (_column: GridColumn, newSize: number, colIndex: number) => {
    // glide emits resize; persist column widths into props for durability
    const widths = { ...(p.widths ?? {}), [colLetter(colIndex)]: Math.round(newSize) };
    update({ widths });
  };

  const activeRaw = activeCell ? rows[activeCell[1]]?.[activeCell[0]] : null;
  const activeDisplay = activeCell ? evaluate(activeRaw, activeCell[0], activeCell[1]) : "";

  return (
    <div
      onClick={onSelect}
      className={cn("bg-neutral-900 border border-white/10 overflow-hidden", selected && "ring-2 ring-primary/50")}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 flex-wrap">
        <input
          value={p.name || "Sheet"}
          onChange={(e) => update({ name: e.target.value })}
          className="bg-transparent text-xs font-semibold text-white/80 outline-none focus:border-b focus:border-primary/40"
          onClick={(e) => e.stopPropagation()}
        />
        <span className="text-[10px] text-white/30">{numCols} cols × {rows.length} rows</span>
        <div className="flex-1" />
        <button onClick={(e) => { e.stopPropagation(); addRow(); }} className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white px-2 py-1 rounded-md hover:bg-white/5" title="Add row">
          <Plus className="h-3 w-3" /> Row
        </button>
        <button onClick={(e) => { e.stopPropagation(); addColumn(); }} className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white px-2 py-1 rounded-md hover:bg-white/5" title="Add column">
          <Plus className="h-3 w-3" /> Col
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setShowColMenu((v) => !v); }}
          className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white px-2 py-1 rounded-md hover:bg-white/5"
          title="Manage columns"
        >
          <Trash2 className="h-3 w-3" /> Cols
        </button>
        <div className="w-px h-4 bg-white/10" />
        <button
          onClick={(e) => { e.stopPropagation(); if (activeCell) setCell(activeCell[0], activeCell[1], null); }}
          disabled={!activeCell}
          className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white disabled:opacity-30 px-2 py-1 rounded-md hover:bg-white/5"
          title="Clear active cell"
        >
          <Type className="h-3 w-3" /> Clear
        </button>
      </div>

      {/* Column manager */}
      {showColMenu && (
        <div className="px-3 py-2 border-b border-white/10 bg-black/40 backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-2">Columns</p>
          <div className="flex flex-col gap-1.5">
            {columns.map((col, c) => (
              <div key={col.key + c} className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-white/30 w-5">{colLetter(c)}</span>
                <input
                  value={col.header}
                  onChange={(e) => setColumnHeader(c, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-white/80 outline-none focus:border-primary/40"
                />
                <select
                  value={col.type || "text"}
                  onChange={(e) => setColumnType(c, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-neutral-800 border border-white/10 rounded text-[10px] text-white/60 outline-none px-1 py-1"
                  title="Column type"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                </select>
                <button onClick={(e) => { e.stopPropagation(); clearColumn(c); }} className="text-white/30 hover:text-white p-1" title="Clear column">
                  <Type className="h-3 w-3" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); removeColumn(c); }} className="text-white/30 hover:text-red-400 p-1" title="Delete column">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formula bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/10 bg-white/[0.02]">
        <Sigma className="h-3 w-3 text-cyan-400/70" />
        <span className="font-mono text-[10px] text-white/40 w-8 text-right">{activeCell ? colLetter(activeCell[0]) + (activeCell[1] + 1) : ""}</span>
        <input
          value={formulaDraft !== "" ? formulaDraft : String(activeRaw ?? "")}
          onChange={(e) => setFormulaDraft(e.target.value)}
          onBlur={() => setFormulaDraft("")}
          onKeyDown={(e) => {
            if (e.key === "Enter" && activeCell && formulaDraft !== "") {
              setCell(activeCell[0], activeCell[1], formulaDraft);
              setFormulaDraft("");
            }
          }}
          placeholder={activeCell ? "Enter value or formula (e.g. =SUM(A1:A5))" : "Select a cell"}
          className="flex-1 bg-transparent outline-none font-mono text-[11px] text-white/80 placeholder:text-white/25"
          onClick={(e) => e.stopPropagation()}
        />
        {activeCell && <span className="text-[10px] text-white/40 whitespace-nowrap">= {activeDisplay}</span>}
      </div>

      {/* Grid */}
      <div className="h-[360px] w-full overflow-hidden">
        <DataEditor
          getCellContent={getCellContent}
          onCellEdited={onCellEdited}
          onColumnResize={onColumnResize}
          columns={gridColumns}
          rows={numRows}
          rowMarkers="number"
          width="100%"
          height="100%"
          onCellClicked={(cell: Item) => { setActiveCell(cell); setFormulaDraft(""); }}
          onGridSelectionChange={(sel) => {
            if (sel.current && sel.current.cell) setActiveCell(sel.current.cell);
          }}
          freezeColumns={0}
          theme={{
            accentColor: "#f97316",
            accentFg: "#ffffff",
            accentLight: "rgba(249,115,22,0.25)",
            textDark: "#e4e4e7",
            textMedium: "#a1a1aa",
            textLight: "#71717a",
            textBubble: "#e4e4e7",
            bgIconHeader: "#171717",
            fgIconHeader: "#a1a1aa",
            textHeader: "#a1a1aa",
            textHeaderSelected: "#ffffff",
            bgCell: "#0f0f0f",
            bgCellMedium: "#121212",
            bgHeader: "#171717",
            bgHeaderHasFocus: "#1c1c1c",
            bgHeaderHovered: "#1f1f1f",
            bgBubble: "#27272a",
            bgBubbleSelected: "#3f3f46",
            bgSearchResult: "rgba(249,115,22,0.2)",
            borderColor: "rgba(255,255,255,0.08)",
            drilldownBorder: "rgba(255,255,255,0.15)",
            linkColor: "#38bdf8",
            cellHorizontalPadding: 10,
            cellVerticalPadding: 6,
            headerFontStyle: "500 12px system-ui",
            headerIconSize: 14,
            baseFontStyle: "13px system-ui",
            markerFontStyle: "12px system-ui",
            fontFamily: "system-ui",
            editorFontSize: "13px",
            lineHeight: 1.4,
          }}
        />
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-t border-white/10 text-[10px] text-white/40">
        <span className="font-mono">fx</span>
        <span>Formulas supported: =SUM(A1:B2), =A1*2, =AVG(...)</span>
        {activeCell && <span className="ml-auto text-white/50">Active: <b className="text-cyan-300">{activeDisplay}</b></span>}
      </div>
    </div>
  );
}
