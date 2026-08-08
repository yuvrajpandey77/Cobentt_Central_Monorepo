"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, Copy, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCarriedAttachments } from "@/lib/attachments/use-carried";
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
  PanelLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { friendlyAIErrorMessage } from "@/lib/ai/client";
import { MODE_DEFINITIONS, SLIDE_THEMES } from "@/lib/modes/definitions";
import {
  Artifact,
  ArtifactBlock,
  ModeKey,
  ModeDefinition,
  BlockTypeDef,
  makeId,
} from "@/lib/modes/types";
import { PropertyEditor } from "./property-editor";
import { SlidesRenderer, DocumentBlockRenderer, styleToAttr } from "./renderers";
import { ModeChatPanel, ModeChatMessage } from "./mode-chat-panel";
import { SheetEditor } from "./sheet-editor";
import CodeMirror from "@uiw/react-codemirror";
import { markdown as cmMarkdown } from "@codemirror/lang-markdown";
import { blocksToMarkdown, markdownToBlocks } from "@/lib/modes/markdown";

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
  const { carriedIds } = useCarriedAttachments(conversationId);

  const [activeTab, setActiveTab] = useState<"blocks" | "properties">("blocks");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [chatOpen, setChatOpen] = useState(true);
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);
  const [editingSource, setEditingSource] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [exporting, setExporting] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [docLight, setDocLight] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [blockSearch, setBlockSearch] = useState("");
  const [themeId, setThemeId] = useState<string>("midnight");
  const [revealTick, setRevealTick] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [draft, setDraft] = useState<Artifact | null>(null);
  const blockRefs = useRef(new Map<string, HTMLDivElement | null>());
  const [floatingPos, setFloatingPos] = useState<{ top: number; left: number } | null>(null);
  const addPageSentinelRef = useRef<HTMLDivElement>(null);
  const [atCanvasBottom, setAtCanvasBottom] = useState(false);

  const conversation = useQuery(trpc.conversations.getById.queryOptions({ id: conversationId }));

  const fragment = conversation.data?.messages
    ?.flatMap((m) => m.fragments ?? [])
    .reverse()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .find((f: any) => f.mode === mode || !f.mode);

  const serverArtifact = useMemo<Artifact>(() => {
    if (!fragment) return { title: "", blocks: [] };
    return parseArtifact((fragment.files as Record<string, unknown>)?.artifact);
  }, [fragment]);

  // Local draft wins while the user is editing (instant, no refetch flicker).
  // When the server fragment changes identity (fresh AI generation / initial load)
  // we adopt the new server artifact; otherwise the draft persists across refetches.
  const artifact: Artifact = draft ?? serverArtifact;

  const activeTheme = SLIDE_THEMES.find((t) => t.id === (artifact.theme || themeId)) ?? SLIDE_THEMES[0];

  const artifactRef = useRef<Artifact>(artifact);
  artifactRef.current = artifact;

  const lastFragmentId = useRef<string | undefined>(undefined);
  useEffect(() => {
    const fragId = (fragment as unknown as { id?: string } | undefined)?.id;
    if (!fragId) return;
    if (lastFragmentId.current !== fragId) {
      lastFragmentId.current = fragId;
      setDraft(null);
    }
  }, [fragment]);

  const selectedBlock = useMemo(() => {
    if (!selectedId) return null;
    return artifact.blocks.find((b) => b.id === selectedId) ?? null;
  }, [artifact, selectedId]);

  // Position the floating property card just to the right of the selected block.
  const computeFloatingPos = useCallback(() => {
    const el = selectedId ? blockRefs.current.get(selectedId) : null;
    if (!el) {
      setFloatingPos(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    const gap = 14;
    const cardW = 280;
    const margin = 12;
    let left = rect.right + gap;
    if (left + cardW > window.innerWidth - margin) {
      left = rect.left - gap - cardW;
    }
    left = Math.max(margin, left);
    const top = Math.min(Math.max(margin, rect.top), window.innerHeight - 60);
    setFloatingPos({ top, left });
  }, [selectedId]);

  useEffect(() => {
    computeFloatingPos();
  }, [computeFloatingPos, artifact, selectedId, viewport, zoom, docLight, sidebarOpen, chatOpen]);

  useEffect(() => {
    if (!selectedId) return;
    const onScroll = () => computeFloatingPos();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [selectedId, computeFloatingPos]);

  // Reveal an inline "+ Add page" bar when the user scrolls to the bottom
  // of the canvas, so they can keep appending content naturally.
  useEffect(() => {
    if (!addPageSentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setAtCanvasBottom(entry.isIntersecting),
      { root: null, rootMargin: "0px 0px 120px 0px", threshold: 0 }
    );
    observer.observe(addPageSentinelRef.current);
    return () => observer.disconnect();
  }, [mode, artifact.blocks.length]);

  const persist = useCallback(
    (next: Artifact, cb?: () => void) => {
      // Apply instantly to the local draft so the UI has zero latency.
      setDraft(next);
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

  const setTheme = (id: string) => {
    setThemeId(id);
    persist({ ...artifact, theme: id });
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

  const duplicateBlock = (id: string) => {
    const idx = artifact.blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const src = artifact.blocks[idx];
    const copy: ArtifactBlock = { ...src, id: makeId(), props: JSON.parse(JSON.stringify(src.props)) };
    const blocks = [...artifact.blocks];
    blocks.splice(idx + 1, 0, copy);
    persist({ ...artifact, blocks });
    setSelectedId(copy.id);
    setActiveTab("properties");
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    const blocks = [...artifact.blocks];
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    persist({ ...artifact, blocks });
  };

  // The most useful block type to append when adding a new "page" for this mode.
  const defaultAddType = useMemo(() => {
    if (mode === "slides") return "content-slide";
    if (mode === "sheet") return "sheet";
    return "heading";
  }, [mode]);

  const addDefaultBlock = () => {
    if (!defaultAddType) return;
    addBlock(defaultAddType);
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
      if (!res.ok) {
        let message = "Export failed";
        try {
          const body = await res.json();
          if (body?.error) message = body.error;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${artifact.title || "untitled"}.${format === "pdf" ? "pdf" : format === "pptx" ? "pptx" : format === "docx" ? "docx" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
      toast.success("Exported successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const pendingAttachmentIds = useRef<string[] | undefined>(undefined);

  const sendChat = (content: string, attachmentIds?: string[]) => {
    pendingAttachmentIds.current = attachmentIds;
    createMessage.mutate({ conversationId, content, attachmentIds });
  };

  const createMessage = useMutation(
    trpc.chatMessages.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: conversationId }));
        const atts = pendingAttachmentIds.current;
        pendingAttachmentIds.current = undefined;
        triggerAI(data.content, atts);
      },
      onError: (err) => toast.error(err.message || "Failed to send"),
    })
  );

  const triggerAI = useCallback(
    async (message: string, attachmentIds?: string[]) => {
      setGenerating(true);
      try {
        const res = await fetch(`/api/modes/${mode}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            message,
            currentArtifact: serializeArtifact(artifactRef.current),
            attachmentIds,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          const msg =
            (data as { error?: string } | null)?.error ||
            (data as { message?: string } | null)?.message ||
            "Generation failed";
          throw new Error(friendlyAIErrorMessage(msg, "Generation failed"));
        }

        // Stream tokens so the canvas can show a skeleton and reveal blocks
        // progressively instead of swapping the whole document at once.
        const reader = res.body?.getReader();
        if (!reader) throw new Error("No stream");
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";
          for (const evt of events) {
            const line = evt.trim();
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.event === "error") {
                throw new Error(friendlyAIErrorMessage(data.error, "Generation failed"));
              }
              if (data.event === "done") {
                setRevealTick((t) => t + 1);
                queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: conversationId }));
              }
            } catch (err) {
              throw err;
            }
          }
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to generate with AI");
      } finally {
        setGenerating(false);
      }
    },
    [conversationId, mode, queryClient, trpc]
  );

  const autoRan = useRef(false);
  const autoRunning = useRef(false);

  useEffect(() => {
    if (autoRan.current || autoRunning.current) return;
    if (!conversation.data || !def) return;
    if (carriedIds === undefined) return;

    const hasArtifact = artifact.blocks.length > 0 || !!artifact.title;
    const lastUser = conversation.data.messages
      ?.filter((m) => m.role === "USER")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .pop();

    if (lastUser && !hasArtifact) {
      autoRan.current = true;
      autoRunning.current = true;
      const attIds =
        carriedIds && carriedIds.length > 0
          ? carriedIds
          : ((lastUser.attachments as Array<{ id: string }> | null) ?? []).map((a) => a.id);
      triggerAI(lastUser.content, attIds.length > 0 ? attIds : undefined).finally(() => {
        autoRunning.current = false;
      });
    } else {
      autoRan.current = true;
    }
  }, [conversation.data, artifact, def, triggerAI, carriedIds]);

  const isLoading = conversation.isLoading;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/40 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading workspace...
        </div>
      </div>
    );
  }

  if (!def) {
    return <div className="flex-1 flex items-center justify-center text-white/40 text-sm">Unknown mode</div>;
  }

  const viewportWidth = viewport === "desktop" ? "max-w-4xl" : viewport === "tablet" ? "max-w-xl" : "max-w-[360px]";

  return (
    <div className="flex h-full w-full">
      {/* Editor sidebar (left) */}
      <div className={cn("hidden md:flex flex-col w-64 flex-shrink-0 min-h-0 border-r border-white/10 bg-white/[0.02] transition-all", !sidebarOpen && "hidden")}>
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
              {mode === "slides" && (
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium px-1">Theme</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {SLIDE_THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        title={t.label}
                        className={cn(
                          "h-8 rounded-lg border transition-all flex items-center justify-center",
                          activeTheme.id === t.id ? "border-primary ring-1 ring-primary" : "border-white/10 hover:border-white/30"
                        )}
                        style={{ background: `linear-gradient(135deg, ${t.bg}, ${t.accent})` }}
                      >
                        <span className="text-[9px] font-medium px-1 truncate" style={{ color: t.muted }}>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium px-1">Add Block</p>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
                  <input
                    value={blockSearch}
                    onChange={(e) => setBlockSearch(e.target.value)}
                    placeholder="Search blocks..."
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg pl-8 pr-2 py-1.5 text-xs text-white/80 outline-none focus:border-primary/40"
                  />
                </div>
                {def.blockTypes
                  .filter((b) => b.label.toLowerCase().includes(blockSearch.trim().toLowerCase()))
                  .map((b) => {
                    const used = artifact.blocks.filter((x) => x.type === b.type).length;
                    return (
                      <button
                        key={b.type}
                        onClick={() => addBlock(b.type)}
                        className="w-full text-left px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 hover:border-primary/30 hover:bg-white/[0.06] transition-colors group"
                      >
                        <span className="flex items-center justify-between w-full">
                          <span className="text-xs text-white/80 font-medium group-hover:text-white">+ {b.label}</span>
                          {used > 0 && (
                            <span className="text-[10px] text-white/30 tabular-nums">{used} used</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                {def.blockTypes.filter((b) => b.label.toLowerCase().includes(blockSearch.trim().toLowerCase())).length === 0 && (
                  <p className="text-xs text-white/30 px-1">No blocks match “{blockSearch}”</p>
                )}
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium px-1 pt-3">
                  Layers
                  {artifact.blocks.length > 0 && (
                    <span className="text-white/20 ml-1 tabular-nums">{artifact.blocks.length}</span>
                  )}
                </p>
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
                      <span className="flex items-center gap-1.5">
                        <button onClick={(e) => { e.stopPropagation(); moveBlock(i, -1); }} disabled={i === 0} className="p-1.5 text-white/60 hover:text-white disabled:opacity-30 hover:bg-white/10 rounded-md" title="Move up">
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); moveBlock(i, 1); }} disabled={i === artifact.blocks.length - 1} className="p-1.5 text-white/60 hover:text-white disabled:opacity-30 hover:bg-white/10 rounded-md" title="Move down">
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <div className="w-px h-4 bg-white/10" />
                        <button onClick={(e) => { e.stopPropagation(); duplicateBlock(b.id); }} className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-md" title="Duplicate">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteBlock(b.id); }} className="p-1.5 text-white/40 hover:text-red-400 hover:bg-white/10 rounded-md" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
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
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              title={sidebarOpen ? "Hide editor panel" : "Show editor panel"}
              className={cn(
                "hidden md:flex h-7 w-7 items-center justify-center rounded-lg border transition-colors",
                sidebarOpen ? "text-white border-white/20 bg-primary/10" : "text-white/40 border-white/10 hover:text-white"
              )}
            >
              <PanelLeft className="h-3.5 w-3.5" />
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

        <div className="relative flex-1 min-h-0 overflow-y-auto thin-scrollbar">
          {generating && (
            <div className="pointer-events-none absolute inset-0 z-10">
              <CanvasSkeleton mode={mode} docLight={docLight} />
            </div>
          )}
          <div className={cn("mx-auto py-8 px-4 space-y-4", viewportWidth)}>
            {mode === "slides" && (
              <div
                className="flex flex-col items-center gap-6 transition-transform duration-200 origin-top"
                style={{ transform: `scale(${zoom})` }}
              >
                {artifact.blocks.map((b, i) => (
                  <div
                    key={b.id}
                    ref={(el) => { if (el) blockRefs.current.set(b.id, el); }}
                    style={{ ...styleToAttr(b.style), animationDelay: `${Math.min(i, 8) * 60}ms` }}
                    className={cn(
                      "w-full transition-all",
                      selectedId === b.id && "ring-2 ring-primary/60 rounded-xl",
                      revealTick > 0 && "animate-fade-in-up"
                    )}
                    onClick={() => setSelectedId(b.id)}
                  >
                    <SlidesRenderer block={b} viewport={viewport} theme={activeTheme} editable={selectedId === b.id} onEdit={updateBlock} />
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
                  {artifact.blocks.map((b, i) => (
                    <div
                      key={b.id}
                      ref={(el) => { if (el) blockRefs.current.set(b.id, el); }}
                      onClick={(e) => { e.stopPropagation(); setSelectedId(b.id); }}
                      style={{ ...styleToAttr(b.style), animationDelay: `${Math.min(i, 8) * 60}ms` }}
                      className={cn(
                        "rounded-lg px-1 transition-all",
                        selectedId === b.id && "ring-2 ring-primary/50 bg-primary/5",
                        revealTick > 0 && "animate-fade-in-up"
                      )}
                    >
                      <DocumentBlockRenderer block={b} light={docLight} editable={selectedId === b.id} onEdit={updateBlock} />
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
                    <div
                      key={b.id}
                      ref={(el) => { if (el) blockRefs.current.set(b.id, el); }}
                      style={styleToAttr(b.style)}
                    >
                      {b.type === "stats" ? (
                        <SheetStatsBlock block={b} selected={selectedId === b.id} onSelect={() => setSelectedId(b.id)} />
                      ) : (
                        <SheetEditor
                          block={b}
                          selected={selectedId === b.id}
                          onSelect={() => setSelectedId(b.id)}
                          onChange={updateBlock}
                        />
                      )}
                    </div>
                  ))}
                  {artifact.blocks.length === 0 && (
                    <p className="text-white/30 text-sm text-center py-16">Add a sheet block to start</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Scroll-to-bottom Add Page bar */}
          <div
            ref={addPageSentinelRef}
            className={cn(
              "mt-2 pb-6 flex items-center justify-center transition-all duration-300",
              atCanvasBottom ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
            )}
          >
            <button
              onClick={addDefaultBlock}
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-white/25 bg-white/[0.03] px-4 py-2 text-xs font-medium text-white/60 hover:text-white hover:bg-white/[0.07] hover:border-white/40 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add page
            </button>
          </div>
        </div>
      </div>

      {/* Chat panel (right) */}
      {chatOpen && (
        <ModeChatPanel
          messages={(conversation.data?.messages ?? []) as unknown as ModeChatMessage[]}
          isPending={createMessage.isPending || generating}
          running={generating}
          runningText={generating ? `Generating ${def.label}...` : "Working..."}
          onSend={sendChat}
          emptyText="Describe changes to make, or ask the AI to generate content."
          conversationId={conversationId}
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
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
                  <input
                    value={blockSearch}
                    onChange={(e) => setBlockSearch(e.target.value)}
                    placeholder="Search blocks..."
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg pl-8 pr-2 py-1.5 text-xs text-white/80 outline-none focus:border-primary/40"
                  />
                </div>
                {def.blockTypes
                  .filter((b) => b.label.toLowerCase().includes(blockSearch.trim().toLowerCase()))
                  .map((b) => (
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

      {/* Floating property card (beside selected block) */}
      {floatingPos && selectedBlock && (
        <FloatingPropertyCard
          top={floatingPos.top}
          left={floatingPos.left}
          block={selectedBlock}
          def={def.blockTypes.find((t) => t.type === selectedBlock.type)!}
          label={def.blockTypes.find((t) => t.type === selectedBlock.type)?.label ?? selectedBlock.type}
          onChange={updateBlock}
          onDelete={() => deleteBlock(selectedBlock.id)}
          onDuplicate={() => duplicateBlock(selectedBlock.id)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function CanvasSkeleton({ mode, docLight }: { mode: string; docLight: boolean }) {
  const lines = Array.from({ length: mode === "slides" ? 3 : 6 });
  return (
    <div className="w-full h-full bg-black/40 backdrop-blur-[2px] flex items-start justify-center p-6">
      <div className="w-full max-w-2xl space-y-4 animate-pulse">
        {lines.map((_, i) =>
          mode === "slides" ? (
            <div
              key={i}
              className="w-full aspect-video rounded-xl border border-white/10 bg-white/[0.04] flex items-center justify-center"
            >
              <div className="w-3/5 space-y-3">
                <div className="h-5 rounded bg-white/10 w-1/2 mx-auto" />
                <div className="h-3 rounded bg-white/5 w-3/4 mx-auto" />
                <div className="h-3 rounded bg-white/5 w-2/3 mx-auto" />
              </div>
            </div>
          ) : (
            <div key={i} className="w-full space-y-2">
              <div className={cn("h-4 rounded w-3/4", docLight ? "bg-neutral-200" : "bg-white/10")} />
              <div className={cn("h-3 rounded w-full", docLight ? "bg-neutral-100" : "bg-white/5")} />
              <div className={cn("h-3 rounded w-5/6", docLight ? "bg-neutral-100" : "bg-white/5")} />
            </div>
          )
        )}
      </div>
    </div>
  );
}

function SheetStatsBlock({ block, selected, onSelect }: { block: ArtifactBlock; selected: boolean; onSelect: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = block.props as any;
  const items: { label?: string; value?: string }[] = Array.isArray(p.items) ? p.items : [];
  return (
    <div onClick={onSelect} className={cn("p-4", selected && "ring-2 ring-primary/50")}>
      <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-3">{p.title || "Overview"}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-xl font-bold text-white">{item.value ?? "—"}</p>
            <p className="text-[10px] text-white/40 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

interface FloatingPropertyCardProps {
  top: number;
  left: number;
  block: ArtifactBlock;
  def: BlockTypeDef;
  label: string;
  onChange: (block: ArtifactBlock) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onClose: () => void;
}

function FloatingPropertyCard({
  top,
  left,
  block,
  def,
  label,
  onChange,
  onDelete,
  onDuplicate,
  onClose,
}: FloatingPropertyCardProps) {
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardTop, setCardTop] = useState(top);

  useEffect(() => {
    const clamp = () => {
      const el = cardRef.current;
      if (!el) return;
      const h = el.offsetHeight;
      const margin = 12;
      const t = Math.max(margin, Math.min(top, window.innerHeight - h - margin));
      setCardTop(t);
    };
    clamp();
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, [top, expanded]);

  return createPortal(
    <div
      ref={cardRef}
      className={cn(
        "fixed z-40 flex-col rounded-xl border border-white/10 bg-neutral-900/95 backdrop-blur-xl shadow-2xl overflow-hidden",
        expanded ? "w-[340px]" : "w-72"
      )}
      style={{ top: cardTop, left }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/[0.03]">
        <span className="text-[11px] font-medium text-white/80 truncate">{label}</span>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setExpanded(!expanded)} title={expanded ? "Compact" : "Expand"} className="p-1 text-white/40 hover:text-white rounded-md">
            {expanded ? <ChevronRight className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </button>
          <button onClick={onDuplicate} title="Duplicate" className="p-1 text-white/40 hover:text-white rounded-md">
            <Copy className="h-3 w-3" />
          </button>
          <button onClick={onDelete} title="Delete" className="p-1 text-white/40 hover:text-red-400 rounded-md">
            <Trash2 className="h-3 w-3" />
          </button>
          <button onClick={onClose} title="Close" className="p-1 text-white/40 hover:text-white rounded-md">
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className={cn("overflow-y-auto thin-scrollbar p-3", expanded ? "max-h-[75vh]" : "max-h-[60vh]")}>
        <PropertyEditor block={block} def={def} onChange={onChange} />
      </div>
    </div>,
    document.body
  );
}
