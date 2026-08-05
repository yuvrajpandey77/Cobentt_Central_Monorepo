"use client";

import { useState } from "react";
import { ArtifactBlock } from "@/lib/modes/types";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Type } from "lucide-react";
import { HyperFormula } from "hyperformula";

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

  const update = (nextProps: AnyProps) => {
    onChange({ ...block, props: { ...block.props, ...nextProps } });
  };

  const [activeCell, setActiveCell] = useState<[number, number] | null>(null);

  const numCols = columns.length;
  const numRows = Math.max(rows.length, 1);

  const evaluate = (raw: unknown, c: number, r: number): string => {
    const str = String(raw ?? "");
    if (!str.startsWith("=")) return str;
    try {
      const sheetData: (string | number | null)[][] = [];
      for (let rr = 0; rr < numRows; rr++) {
        const arr: (string | number | null)[] = [];
        for (let cc = 0; cc < numCols; cc++) {
          const cell = rows[rr]?.[cc];
          arr.push(typeof cell === "string" && cell.startsWith("=") ? null : (cell ?? ""));
        }
        sheetData.push(arr);
      }
      const hf = HyperFormula.buildFromArray(sheetData, { licenseKey: "gpl-v3" });
      hf.setCellContents({ col: c, row: r, sheet: 0 }, str);
      const v = hf.getCellValue({ col: c, row: r, sheet: 0 });
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

  const sum: string = (() => {
    if (!activeCell || columns[activeCell[0]]?.type !== "number") return "";
    const v = rows[activeCell[1]]?.[activeCell[0]];
    if (typeof v === "number") return String(v);
    return "";
  })();

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
        <span className="text-[10px] text-white/30">{numCols} cols × {numRows} rows</span>
        <div className="flex-1" />
        <button onClick={(e) => { e.stopPropagation(); addRow(); }} className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white px-2 py-1 rounded-md hover:bg-white/5" title="Add row">
          <Plus className="h-3 w-3" /> Row
        </button>
        <button onClick={(e) => { e.stopPropagation(); addColumn(); }} className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white px-2 py-1 rounded-md hover:bg-white/5" title="Add column">
          <Plus className="h-3 w-3" /> Col
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

      {/* Grid */}
      <div className="overflow-x-auto thin-scrollbar">
        <div className="min-w-[640px]" style={{ width: numCols * 140 + 44 }}>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-neutral-900 border-b border-r border-white/10 p-1 w-10" />
                {columns.map((col, c) => (
                  <th key={col.key + c} className="bg-neutral-900 border-b border-r border-white/10 p-0 group/th">
                    <div className="flex items-center justify-between px-1.5 py-1">
                      <input
                        value={col.header}
                        onChange={(e) => setColumnHeader(c, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-transparent text-[11px] font-medium text-white/60 outline-none w-[60%]"
                      />
                      <div className="flex items-center gap-0.5 opacity-0 group-hover/th:opacity-100">
                        <select
                          value={col.type || "text"}
                          onChange={(e) => setColumnType(c, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-neutral-800 border border-white/10 rounded text-[9px] text-white/50 outline-none"
                          title="Column type"
                        >
                          <option value="text">T</option>
                          <option value="number">#</option>
                        </select>
                        <button onClick={(e) => { e.stopPropagation(); clearColumn(c); }} className="text-white/30 hover:text-white p-0.5" title="Clear column">
                          <Type className="h-2.5 w-2.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); removeColumn(c); }} className="text-white/30 hover:text-red-400 p-0.5" title="Delete column">
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>
                    <div className="px-1.5 pb-0.5 text-[9px] text-white/25">{colLetter(c)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: numRows }).map((_, r) => (
                <tr key={r}>
                  <td className="sticky left-0 bg-neutral-900 border-r border-white/10 text-center text-[10px] text-white/30 py-1 px-1 w-10 select-none">{r + 1}</td>
                  {columns.map((col, c) => {
                    const raw = rows[r]?.[c];
                    const display = evaluate(raw, c, r);
                    const isFormula = typeof raw === "string" && raw.startsWith("=");
                    const isNumber = col.type === "number";
                    return (
                      <td key={c} className="border-b border-r border-white/[0.06] p-0">
                        <input
                          value={display}
                          onChange={(e) => setCell(c, r, e.target.value)}
                          onClick={(e) => { e.stopPropagation(); setActiveCell([c, r]); }}
                          type={isNumber ? "number" : "text"}
                          className={cn(
                            "w-full bg-transparent px-2 py-1 text-[11px] text-white/80 outline-none focus:bg-white/[0.04]",
                            isFormula && "text-cyan-300",
                            isNumber && "text-right font-medium tabular-nums",
                            activeCell && activeCell[0] === c && activeCell[1] === r && "shadow-[inset_0_0_0_1.5px_#f97316]"
                          )}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-t border-white/10 text-[10px] text-white/40">
        <span className="font-mono">fx</span>
        <span>Formulas supported: =SUM(A1:B2), =A1*2, =AVG(...)</span>
        {sum && <span className="ml-auto text-white/50">Active: <b>{sum}</b></span>}
      </div>
    </div>
  );
}