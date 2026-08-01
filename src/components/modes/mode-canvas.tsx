"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Boxes,
  Eye,
  MessageSquare,
  Layers,
  X,
  ChevronUp,
  ChevronDown,
  Trash2,
  FileDown,
  Maximize2,
  Monitor,
  Tablet,
  Smartphone,
  Code2,
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MODE_DEFINITIONS } from "@/lib/modes/definitions";
import {
  Artifact,
  ArtifactBlock,
  ModeKey,
  ModeDefinition,
  makeId,
} from "@/lib/modes/types";
import { PropertyEditor } from "./property-editor";
import { SlidesRenderer, DocumentBlockRenderer } from "./renderers";
import { ModeChatPanel, ModeChatMessage } from "./mode-chat-panel";
import { DataEditor, GridCellKind } from "@glideapps/glide-data-grid";
import CodeMirror from "@uiw/react-codemirror";
import { markdown as cmMarkdown } from "@codemirror/lang-markdown";
import { blocksToMarkdown, markdownToBlocks } from "@/lib/modes/markdown";
import { HyperFormula } from "hyperformula";

export type Viewport = "desktop" | "tablet" | "phone";

interface ModeCanvasProps {
  mode: ModeKey;
  conversationId: string;
}

function serializeArtifact(artifact: Artifact): string {
  return JSON.stringify(artifact);
}

function parseArtifact(raw: unknown): Artifact {
  try {
    let parsed: Artifact;
    if (typeof raw === "string") parsed = JSON.parse(raw);
    else if (typeof raw === "object" && raw !== null) parsed = raw as Artifact;
    else return { title: "Untitled", blocks: [] };

    const seen = new Set<string>();
    const blocks = (parsed.blocks ?? []).map((b) => {
      const id = typeof b?.id === "string" && b.id && !seen.has(b.id) ? b.id : makeId();
      seen.add(id);
      return { ...b, id };
    });
    return { ...parsed, title: parsed.title || "Untitled", blocks };
  } catch {}
  return { title: "Untitled", blocks: [] };
}

export function ModeCanvas({ mode, conversationId }: ModeCanvasProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const def = MODE_DEFINITIONS[mode] as ModeDefinition | undefined;

  const [activeTab, setActiveTab] = useState<"blocks" | "properties">("blocks");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [chatOpen, setChatOpen] = useState(true);
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);
  const [editingSource, setEditingSource] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [exporting, setExporting] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [docLight, setDocLight] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const conversation = useQuery(trpc.conversations.getById.queryOptions({ id: conversationId }));

  const fragment = conversation.data?.messages
    ?.flatMap((m) => m.fragments ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .find((f: any) => f.mode === mode || !f.mode);

  const artifact = useMemo<Artifact>(() => {
    if (!fragment) return { title: "", blocks: [] };
    return parseArtifact((fragment.files as Record<string, unknown>)?.artifact);
  }, [fragment]);

  const selectedBlock = useMemo(() => {
    if (!selectedId) return null;
    return artifact.blocks.find((b) => b.id === selectedId) ?? null;
  }, [artifact, selectedId]);

  const persist = useCallback(
    (next: Artifact, cb?: () => void) => {
      if (!fragment) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          await fetch(`/api/modes/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fragmentId: (fragment as unknown as { id: string }).id,
              mode,
              artifact: serializeArtifact(next),
            }),
          });
          queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: conversationId }));
          cb?.();
        } catch {
          toast.error("Failed to save changes");
        }
      }, 300);
    },
    [fragment, mode, conversationId, queryClient, trpc]
  );

  const updateBlock = (updated: ArtifactBlock) => {
    const next: Artifact = {
      ...artifact,
      blocks: artifact.blocks.map((b) => (b.id === updated.id ? updated : b)),
    };
    persist(next);
  };

  const addBlock = (type: string) => {
    const blockDef = def?.blockTypes.find((b) => b.type === type);
    if (!blockDef) return;
    const block: ArtifactBlock = {
      id: makeId(),
      type,
      props: JSON.parse(JSON.stringify(blockDef.defaultProps)),
    };
    const next: Artifact = { ...artifact, blocks: [...artifact.blocks, block] };
    persist(next);
    setSelectedId(block.id);
    setActiveTab("properties");
  };

  const deleteBlock = (id: string) => {
    const next: Artifact = { ...artifact, blocks: artifact.blocks.filter((b) => b.id !== id) };
    persist(next);
    if (selectedId === id) setSelectedId(null);
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    const blocks = [...artifact.blocks];
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    persist({ ...artifact, blocks });
  };

  const exportFile = async (format: string) => {
    setExporting(true);
    try {
      const res = await fetch(`/api/modes/${mode}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          format,
          artifact: serializeArtifact(artifact),
        }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${artifact.title || "untitled"}.${format === "pdf" ? "pdf" : format === "pptx" ? "pptx" : format === "docx" ? "docx" : "xlsx"}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported successfully");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const sendChat = (content: string) => {
    createMessage.mutate({ conversationId, content });
  };

  const createMessage = useMutation(
    trpc.chatMessages.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: conversationId }));
        triggerAI(data.content);
      },
      onError: (err) => toast.error(err.message || "Failed to send"),
    })
  );

  const triggerAI = useCallback(
    async (message: string) => {
      try {
        const res = await fetch(`/api/modes/${mode}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, message }),
        });
        if (!res.ok) throw new Error("Generation failed");
        queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: conversationId }));
      } catch {
        toast.error("Failed to generate with AI");
      }
    },
    [conversationId, mode, queryClient, trpc]
  );

  const autoRan = useRef(false);
  const autoRunning = useRef(false);

  useEffect(() => {
    if (autoRan.current || autoRunning.current) return;
    if (!conversation.data || !def) return;

    const hasArtifact = artifact.blocks.length > 0 || !!artifact.title;
    const lastUser = conversation.data.messages
      ?.filter((m) => m.role === "USER")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .pop();

    if (lastUser && !hasArtifact) {
      autoRan.current = true;
      autoRunning.current = true;
      triggerAI(lastUser.content).finally(() => {
        autoRunning.current = false;
      });
    } else {
      autoRan.current = true;
    }
  }, [conversation.data, artifact, def, triggerAI]);

  const isLoading = conversation.isLoading;

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-white/40 text-sm">Loading...</div>;
  }

  if (!def) {
    return <div className="flex-1 flex items-center justify-center text-white/40 text-sm">Unknown mode</div>;
  }

  const viewportWidth = viewport === "desktop" ? "max-w-4xl" : viewport === "tablet" ? "max-w-xl" : "max-w-[360px]";

  return (
    <div className="flex h-full w-full">
      {/* Editor sidebar (left) */}
      <div className="hidden md:flex flex-col w-64 flex-shrink-0 min-h-0 border-r border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-1 px-3 h-12 border-b border-white/10 flex-shrink-0">
          {(["blocks", "properties"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                activeTab === tab ? "bg-primary/20 text-white" : "text-white/50 hover:text-white/70"
              )}
            >
              {tab === "blocks" ? <Boxes className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {tab === "blocks" ? "Blocks" : "Properties"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto thin-scrollbar p-3 space-y-3">
          {activeTab === "blocks" && (
            <>
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium px-1">Add Block</p>
                {def.blockTypes.map((b) => (
                  <button
                    key={b.type}
                    onClick={() => addBlock(b.type)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 hover:border-primary/30 hover:bg-white/[0.06] transition-colors"
                  >
                    <span className="text-xs text-white/80 font-medium">+ {b.label}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium px-1 pt-3">Layers</p>
                {artifact.blocks.length === 0 && (
                  <p className="text-xs text-white/30 px-1">No blocks yet</p>
                )}
                {artifact.blocks.map((b, i) => {
                  const typeDef = def.blockTypes.find((t) => t.type === b.type);
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedId(b.id)}
                      className={cn(
                        "group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer border text-xs transition-colors",
                        selectedId === b.id
                          ? "bg-primary/15 border-primary/30 text-white"
                          : "border-white/5 text-white/60 hover:bg-white/[0.04]"
                      )}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Layers className="h-3 w-3 text-white/30 flex-shrink-0" />
                        <span className="truncate">
                          {typeDef?.label ?? b.type}
                          <span className="text-white/25"> · {i + 1}</span>
                        </span>
                      </span>
                      <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); moveBlock(i, -1); }} disabled={i === 0} className="p-0.5 text-white/40 hover:text-white">
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); moveBlock(i, 1); }} disabled={i === artifact.blocks.length - 1} className="p-0.5 text-white/40 hover:text-white">
                          <ChevronDown className="h-3 w-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteBlock(b.id); }} className="p-0.5 text-white/40 hover:text-red-400">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === "properties" && (
            <div className="space-y-3">
              {selectedBlock ? (
                <>
                  <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium px-1">Edit block</p>
                  <PropertyEditor
                    block={selectedBlock}
                    def={def.blockTypes.find((t) => t.type === selectedBlock.type)!}
                    onChange={updateBlock}
                  />
                </>
              ) : (
                <p className="text-xs text-white/30 px-1">Select a block to edit its properties</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Canvas (center) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-neutral-950/50">
        <div className="flex items-center justify-between px-3 h-12 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push(`/${mode}`)} className="text-white/50 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-white/80 truncate max-w-[180px]">
              {artifact.title || "Untitled"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Viewport switcher */}
            <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-lg p-0.5">
              {(["desktop", "tablet", "phone"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setViewport(v)}
                  title={v}
                  className={cn(
                    "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
                    viewport === v ? "bg-primary/20 text-white" : "text-white/40 hover:text-white/70"
                  )}
                >
                  {v === "desktop" ? <Monitor className="h-3.5 w-3.5" /> : v === "tablet" ? <Tablet className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>

            {/* Zoom controls */}
            <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-lg p-0.5">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 100) / 100))}
                title="Zoom out"
                className="h-7 w-7 flex items-center justify-center rounded-md text-white/40 hover:text-white/70 transition-colors"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="text-[10px] text-white/50 w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(2.5, Math.round((z + 0.1) * 100) / 100))}
                title="Zoom in"
                className="h-7 w-7 flex items-center justify-center rounded-md text-white/40 hover:text-white/70 transition-colors"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setZoom(1)}
                title="Reset zoom"
                className="h-7 w-7 flex items-center justify-center rounded-md text-white/40 hover:text-white/70 transition-colors"
              >
                <span className="text-[9px]">1:1</span>
              </button>
            </div>

            {/* Document theme toggle (light default, dark for doc part only) */}
            {mode === "document" && (
              <button
                onClick={() => setDocLight(!docLight)}
                title={docLight ? "Switch to dark document" : "Switch to white document"}
                className={cn(
                  "h-7 w-7 flex items-center justify-center rounded-lg border transition-colors",
                  docLight ? "bg-white text-black border-white/20" : "bg-primary/20 border-primary/30 text-white"
                )}
              >
                {docLight ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
            )}
            <button
              onClick={() => setChatOpen(!chatOpen)}
              title="Toggle chat"
              className={cn(
                "h-7 w-7 flex items-center justify-center rounded-lg border transition-colors",
                chatOpen ? "bg-primary/20 border-primary/30 text-white" : "text-white/40 border-white/10 hover:text-white/70"
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
            {mode === "document" && (
              <button
                onClick={() => {
                  if (editingSource) {
                    const blocks = markdownToBlocks(sourceText);
                    persist({ ...artifact, blocks, title: artifact.title || sourceText.split("\n")[0]?.replace(/^#\s*/, "").slice(0, 80) || "" });
                    setEditingSource(false);
                  } else {
                    setSourceText(blocksToMarkdown(artifact));
                    setEditingSource(true);
                  }
                }}
                title="Toggle markdown source"
                className={cn(
                  "h-7 w-7 flex items-center justify-center rounded-lg border transition-colors",
                  editingSource ? "bg-primary/20 border-primary/30 text-white" : "text-white/40 border-white/10 hover:text-white/70"
                )}
              >
                <Code2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => setMobileEditorOpen(true)}
              className="md:hidden h-7 w-7 flex items-center justify-center rounded-lg border border-white/10 text-white/60 hover:text-white"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => exportFile(mode === "slides" ? "pptx" : mode === "document" ? "docx" : "xlsx")}
              disabled={exporting}
              className="h-7 flex items-center gap-1.5 px-2.5 rounded-lg bg-primary/20 border border-primary/30 text-xs text-white hover:bg-primary/30 transition-colors"
            >
              <FileDown className="h-3.5 w-3.5" />
              Export
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar">
          <div className={cn("mx-auto py-8 px-4 space-y-4", viewportWidth)}>
            {mode === "slides" && (
              <div
                className="flex flex-col items-center gap-6 transition-transform duration-200 origin-top"
                style={{ transform: `scale(${zoom})` }}
              >
                {artifact.blocks.map((b, i) => (
                  <div
                    key={b.id}
                    className={cn(
                      "w-full transition-all",
                      selectedId === b.id && "ring-2 ring-primary/60 rounded-xl"
                    )}
                    onClick={() => setSelectedId(b.id)}
                  >
                    <SlidesRenderer block={b} viewport={viewport} />
                    <p className="text-center text-[10px] text-white/30 mt-1">{i + 1}</p>
                  </div>
                ))}
                {artifact.blocks.length === 0 && (
                  <p className="text-white/30 text-sm text-center py-16">Add slides from the Blocks panel to start building</p>
                )}
              </div>
            )}
            {mode === "document" && !editingSource && (
              <div
                className="mx-auto transition-transform duration-200 origin-top"
                style={{ transform: `scale(${zoom})`, width: viewport === "phone" ? "340px" : "min(100%, 794px)" }}
              >
                <div
                  className={cn(
                    "aspect-[210/297] w-full p-10 shadow-2xl",
                    viewport === "phone" && "p-4",
                    docLight
                      ? "bg-white text-neutral-900 light-surface"
                      : "bg-neutral-900 text-white border border-white/10"
                  )}
                  onClick={() => setSelectedId(null)}
                >
                  {artifact.blocks.map((b) => (
                    <div
                      key={b.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedId(b.id); }}
                      className={cn("rounded-lg px-1 transition-all", selectedId === b.id && "ring-2 ring-primary/50 bg-primary/5")}
                    >
                      <DocumentBlockRenderer block={b} light={docLight} />
                    </div>
                  ))}
                  {artifact.blocks.length === 0 && (
                    <p className={cn("text-sm text-center py-16", docLight ? "text-neutral-400" : "text-white/30")}>Add document blocks from the Blocks panel</p>
                  )}
                </div>
              </div>
            )}
            {mode === "document" && editingSource && (
              <div className="bg-neutral-900 rounded-xl border border-white/10 min-h-[60vh] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
                  <span className="text-[10px] uppercase tracking-wider text-white/30 font-medium">Markdown source</span>
                  <button
                    onClick={() => {
                      const blocks = markdownToBlocks(sourceText);
                      persist({ ...artifact, blocks });
                      setEditingSource(false);
                    }}
                    className="text-xs text-primary hover:text-primary/80"
                  >
                    Apply & exit
                  </button>
                </div>
                <CodeMirror
                  value={sourceText}
                  height="60vh"
                  extensions={[cmMarkdown()]}
                  theme="dark"
                  onChange={(val) => setSourceText(val)}
                  className="text-sm"
                />
              </div>
            )}
            {mode === "sheet" && (
              <div
                className={cn(
                  "transition-transform duration-200 origin-top",
                  viewport === "phone" && "max-w-[340px]"
                )}
                style={{ transform: `scale(${zoom})`, width: viewport === "phone" ? "340px" : "100%" }}
              >
                <div className="bg-neutral-900 border border-white/10 overflow-x-auto">
                  {artifact.blocks.map((b) => (
                    <SheetBlock
                      key={b.id}
                      block={b}
                      selected={selectedId === b.id}
                      onSelect={() => setSelectedId(b.id)}
                    />
                  ))}
                  {artifact.blocks.length === 0 && (
                    <p className="text-white/30 text-sm text-center py-16">Add a sheet block to start</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat panel (right) */}
      {chatOpen && (
        <ModeChatPanel
          messages={(conversation.data?.messages ?? []) as ModeChatMessage[]}
          isPending={createMessage.isPending}
          onSend={sendChat}
          emptyText="Describe changes to make, or ask the AI to generate content."
        />
      )}

      {/* Mobile editor dialog */}
      {mobileEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col md:hidden">
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <span className="text-sm font-medium text-white">Editor</span>
            <button onClick={() => setMobileEditorOpen(false)} className="text-white/60 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-1 p-2 border-b border-white/10">
            {(["blocks", "properties"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium",
                  activeTab === tab ? "bg-primary/20 text-white" : "text-white/50"
                )}
              >
                {tab === "blocks" ? "Blocks" : "Properties"}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto thin-scrollbar p-3 space-y-3">
            {activeTab === "blocks" ? (
              <div className="space-y-1.5">
                {def.blockTypes.map((b) => (
                  <button
                    key={b.type}
                    onClick={() => { addBlock(b.type); }}
                    className="w-full text-left px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 text-xs text-white/80"
                  >
                    + {b.label}
                  </button>
                ))}
              </div>
            ) : (
              selectedBlock && (
                <PropertyEditor
                  block={selectedBlock}
                  def={def.blockTypes.find((t) => t.type === selectedBlock.type)!}
                  onChange={updateBlock}
                />
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SheetBlock({
  block,
  selected,
  onSelect,
}: {
  block: ArtifactBlock;
  selected: boolean;
  onSelect: () => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = block.props as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = Array.isArray(p.columns) ? (p.columns as any[]) : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = Array.isArray(p.rows) ? (p.rows as any[][]) : [];

  const evaluateCell = (raw: unknown, col: number, row: number): string => {
    const str = String(raw ?? "");
    if (!str.startsWith("=")) return str;
    try {
      const sheetData: (string | number)[][] = [];
      for (let r = 0; r < Math.max(rows.length, 1); r++) {
        const rowArr: (string | number)[] = [];
        for (let c = 0; c < Math.max(columns.length, 1); c++) {
          const cellRaw = rows[r]?.[c];
          rowArr.push(typeof cellRaw === "string" && cellRaw.startsWith("=") ? null : (cellRaw ?? ""));
        }
        sheetData.push(rowArr);
      }
      if (sheetData.length === 0) sheetData.push([]);
      const hf = HyperFormula.buildFromArray(sheetData, { licenseKey: "gpl-v3" });
      hf.setCellContents({ col, row, sheet: 0 }, str);
      const value = hf.getCellValue({ col, row, sheet: 0 });
      return typeof value === "number" ? String(value) : String(value ?? "");
    } catch {
      return str;
    }
  };

  const getCell = ([col, row]: readonly [number, number]) => {
    if (row < rows.length && col < columns.length) {
      const value = evaluateCell(rows[row][col], col, row);
      return {
        kind: GridCellKind.Text as const,
        allowOverlay: true,
        data: value,
        displayData: value,
      };
    }
    return { kind: GridCellKind.Text as const, allowOverlay: true, data: "", displayData: "" };
  };

  return (
    <div onClick={onSelect} className={cn("min-w-[600px]", selected && "ring-2 ring-primary/50")}>
      <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2">
        <span className="text-xs font-medium text-white/70">{p.name || "Sheet"}</span>
        <span className="text-[10px] text-white/30">{columns.length} cols × {rows.length} rows</span>
      </div>
      <DataEditor
        getCellContent={getCell}
        getCellsForSelection={true}
        columns={columns.map((c: { header?: string; key?: string }, i: number) => ({
          title: c.header ?? c.key ?? String.fromCharCode(65 + i),
          id: c.key ?? String(i),
          width: 140,
        }))}
        rows={Math.max(rows.length, 20)}
        rowMarkers="checkbox"
        className="w-full"
        smoothScrollX
        smoothScrollY
        onCellEdited={() => {}}
        width="100%"
      />
    </div>
  );
}
