"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileDown,
  MessageSquare,
  ExternalLink,
  Search,
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
  PanelLeft,
  List,
  ChevronUp,
  ChevronDown,
  Trash2,
  Copy,
  X,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ModeChatPanel, ModeChatMessage } from "@/components/modes/mode-chat-panel";
import { ResearchMarkdown, styleToAttr } from "@/components/modes/renderers";
import { friendlyAIErrorMessage } from "@/lib/ai/client";
import { useCarriedAttachments } from "@/lib/attachments/use-carried";
import { DocumentSkeleton } from "@/components/ui/skeleton";
import { ResearchProgress } from "@/components/ui/research-progress";
import { BlockStyleEditor } from "@/components/modes/block-style-editor";
import { BlockStyle } from "@/lib/modes/types";

interface ResearchArtifact {
  title: string;
  summary?: string;
  sections: { heading: string; content: string; style?: BlockStyle }[];
  sources: { title: string; url: string }[];
  titleStyle?: BlockStyle;
}

function parseArtifact(raw: unknown): ResearchArtifact | null {
  try {
    if (typeof raw === "string") return JSON.parse(raw);
    if (typeof raw === "object" && raw !== null) return raw as ResearchArtifact;
  } catch {}
  return null;
}

export function ResearchViewer({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { carriedIds } = useCarriedAttachments(conversationId);
  const [chatOpen, setChatOpen] = useState(true);
  const [currentPhase, setCurrentPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [docLight, setDocLight] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [draft, setDraft] = useState<ResearchArtifact | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [styleOpen, setStyleOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const conversation = useQuery(trpc.conversations.getById.queryOptions({ id: conversationId }));

  const fragment = [...(conversation.data?.messages ?? [])]
    .reverse()
    ?.flatMap((m) => m.fragments ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .find((f: any) => f.mode === "deep-research" || !f.mode);

  const artifact = parseArtifact((fragment?.files as Record<string, unknown>)?.artifact);

  const current = draft ?? artifact;

  const selectedStyle =
    selectedSection === null
      ? (current?.titleStyle ?? undefined)
      : selectedSection !== undefined
        ? (current?.sections[selectedSection]?.style ?? undefined)
        : undefined;

  const persist = useCallback(
    (next: ResearchArtifact) => {
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
              mode: "deep-research",
              artifact: JSON.stringify(next),
            }),
          });
          queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: conversationId }));
        } catch {
          toast.error("Failed to save");
        }
      }, 300);
    },
    [fragment, conversationId, queryClient, trpc]
  );

  const lastFragId = useRef<string | undefined>(undefined);
  useEffect(() => {
    const fid = (fragment as unknown as { id?: string } | undefined)?.id;
    if (!fid) return;
    if (lastFragId.current !== fid) {
      lastFragId.current = fid;
      setDraft(null);
    }
  }, [fragment]);

  const hasReport = !!current?.sections?.length;

  const runResearch = useCallback(async (message: string, attachmentIds?: string[]) => {
      setRunning(true);
      setCurrentPhase("Planning");
      setProgress(5);
      try {
        const res = await fetch(`/api/modes/deep-research/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            message,
            attachmentIds,
            currentArtifact: fragment ? JSON.stringify({ title: (artifact as { title?: string } | null)?.title, summary: (artifact as { summary?: string } | null)?.summary } as { title?: string; summary?: string }) : undefined,
          }),
        });
        if (!res.ok) throw new Error("Research failed");
        const reader = res.body?.getReader();
        if (!reader) return;
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
              if (data.event === "phase") {
                setCurrentPhase(data.phase);
                setProgress((prev) => data.progress ?? prev);
              } else if (data.event === "done") {
                setCurrentPhase("Complete");
                setProgress(100);
                queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: conversationId }));
                toast.success("Research complete");
              } else if (data.event === "error") {
                throw new Error(friendlyAIErrorMessage(data.error, "Research failed"));
              }
            } catch {}
          }
        }
      } catch (err) {
        toast.error((err instanceof Error ? err.message : "") || "Research failed");
      } finally {
        setRunning(false);
      }
    },
    [conversationId, queryClient, trpc, fragment, artifact]
  );

  const pendingAttachmentIds = useRef<string[] | undefined>(undefined);

  const createMessage = useMutation(
    trpc.chatMessages.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: conversationId }));
        const atts = pendingAttachmentIds.current;
        pendingAttachmentIds.current = undefined;
        runResearch(data.content, atts);
      },
      onError: (err) => toast.error(err.message || "Failed to send"),
    })
  );

  const exportPdf = async () => {
    if (!artifact) return;
    try {
      const res = await fetch(`/api/modes/deep-research/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, format: "pdf", artifact: JSON.stringify(artifact) }),
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
      a.download = `${artifact.title || "research"}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
      toast.success("Exported PDF");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  };

  const updateTitle = (title: string) => {
    if (!current) return;
    persist({ ...current, title });
  };

  const updateSummary = (summary: string) => {
    if (!current) return;
    persist({ ...current, summary });
  };

  const updateSectionHeading = (idx: number, heading: string) => {
    if (!current) return;
    const sections = current.sections.map((s, i) => (i === idx ? { ...s, heading } : s));
    persist({ ...current, sections });
  };

  const updateSectionContent = (idx: number, content: string) => {
    if (!current) return;
    const sections = current.sections.map((s, i) => (i === idx ? { ...s, content } : s));
    persist({ ...current, sections });
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    if (!current) return;
    const sections = [...current.sections];
    const target = idx + dir;
    if (target < 0 || target >= sections.length) return;
    [sections[idx], sections[target]] = [sections[target], sections[idx]];
    persist({ ...current, sections });
    setSelectedSection(target);
  };

  const addSection = () => {
    if (!current) return;
    persist({ ...current, sections: [...current.sections, { heading: "New section", content: "" }] });
  };

  const removeSection = (idx: number) => {
    if (!current) return;
    persist({ ...current, sections: current.sections.filter((_, i) => i !== idx) });
    if (selectedSection === idx) setSelectedSection(null);
  };

  const duplicateSection = (idx: number) => {
    if (!current) return;
    const sections = [...current.sections];
    sections.splice(idx + 1, 0, { ...sections[idx], heading: `${sections[idx].heading} (copy)` });
    persist({ ...current, sections });
  };

  const messages = useMemo(() => conversation.data?.messages ?? [], [conversation.data]);

  const autoRan = useRef(false);
  const autoRunning = useRef(false);

  useEffect(() => {
    if (autoRan.current || autoRunning.current) return;
    if (!conversation.data) return;
    if (carriedIds === undefined) return;

    const lastUser = messages
      .filter((m) => m.role === "USER")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .pop();

    if (lastUser && !hasReport) {
      autoRan.current = true;
      autoRunning.current = true;
      const attIds =
        carriedIds && carriedIds.length > 0
          ? carriedIds
          : ((lastUser.attachments as Array<{ id: string }> | null) ?? []).map((a) => a.id);
      runResearch(lastUser.content, attIds.length > 0 ? attIds : undefined).finally(() => {
        autoRunning.current = false;
      });
    } else {
      autoRan.current = true;
    }
  }, [conversation.data, messages, hasReport, runResearch, carriedIds]);

  return (
    <div className="flex h-full w-full">
      {/* Editor sidebar (left) */}
      <div className={cn("hidden md:flex flex-col w-64 flex-shrink-0 min-h-0 border-r border-white/10 bg-white/[0.02]", !sidebarOpen && "hidden")}>
        <div className="flex items-center gap-1 px-3 h-12 border-b border-white/10 flex-shrink-0">
          <List className="h-3.5 w-3.5 text-text-tertiary" />
          <span className="text-xs font-medium text-text-secondary">Outline</span>
          {current?.sections?.length ? <span className="text-text-disabled text-xs ml-auto tabular-nums">{current.sections.length} sections</span> : null}
        </div>
        <div className="flex-1 overflow-y-auto thin-scrollbar p-3 space-y-3">
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium px-1">Report</p>
            <button onClick={() => { setSelectedSection(null); setStyleOpen(false); }} className={cn("w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors", selectedSection === null ? "bg-primary/15 border-primary/30 text-white" : "border-white/5 text-text-secondary hover:bg-white/[0.04]")}>
              Title & summary
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center px-1 pt-3">
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Sections</p>
              <button onClick={addSection} title="Add section" className="ml-auto text-text-tertiary hover:text-white p-0.5">
                <Plus className="h-3 w-3" />
              </button>
            </div>
            {current?.sections.map((s, i) => (
              <div
                key={i}
                onClick={() => { setSelectedSection(i); setStyleOpen(false); }}
                className={cn(
                  "group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer border text-xs transition-colors",
                  selectedSection === i ? "bg-primary/15 border-primary/30 text-white" : "border-white/5 text-text-secondary hover:bg-white/[0.04]"
                )}
              >
                <span className="truncate min-w-0">
                  <span className="text-text-disabled mr-1">{i + 1}.</span>
                  {s.heading}
                </span>
                <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); moveSection(i, -1); }} disabled={i === 0} className="p-0.5 text-text-tertiary hover:text-white disabled:opacity-30"><ChevronUp className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); moveSection(i, 1); }} disabled={i === current.sections.length - 1} className="p-0.5 text-text-tertiary hover:text-white disabled:opacity-30"><ChevronDown className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); duplicateSection(i); }} className="p-0.5 text-text-tertiary hover:text-white"><Copy className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); removeSection(i); }} className="p-0.5 text-text-tertiary hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
                </span>
              </div>
            ))}
            {!current?.sections?.length && <p className="text-xs text-text-muted px-1">No sections yet</p>}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="flex items-center justify-between px-4 h-12 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => router.push("/deep-research")} className="text-text-tertiary hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              title={sidebarOpen ? "Hide editor panel" : "Show editor panel"}
              className={cn(
                "hidden md:flex h-7 w-7 items-center justify-center rounded-lg border transition-colors",
                sidebarOpen ? "text-white border-white/20 bg-primary/10" : "text-text-tertiary border-white/10 hover:text-white"
              )}
            >
              <PanelLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-sm font-medium text-white/80 truncate">
              {current?.title || "Deep Research"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-lg p-0.5">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 100) / 100))}
                title="Zoom out"
                className="h-7 w-7 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-secondary transition-colors"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="text-[10px] text-text-tertiary w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(2.5, Math.round((z + 0.1) * 100) / 100))}
                title="Zoom in"
                className="h-7 w-7 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-secondary transition-colors"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={() => setDocLight(!docLight)}
              title={docLight ? "Switch to dark paper" : "Switch to white paper"}
              className={cn(
                "h-7 w-7 flex items-center justify-center rounded-lg border transition-colors",
                docLight ? "bg-white text-black border-white/20" : "bg-primary/20 border-primary/30 text-white"
              )}
            >
              {docLight ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={cn(
                "h-7 w-7 flex items-center justify-center rounded-lg border transition-colors",
                chatOpen ? "bg-primary/20 border-primary/30 text-white" : "text-text-tertiary border-white/10"
              )}
              title="Toggle chat"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={exportPdf}
              disabled={!hasReport}
              className="h-7 flex items-center gap-1.5 px-2.5 rounded-lg bg-primary/20 border border-primary/30 text-xs text-white hover:bg-primary/30 transition-colors disabled:opacity-40"
            >
              <FileDown className="h-3.5 w-3.5" /> Export PDF
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar">
          {/* Phase stepper */}
          <div className="border-b border-white/10 px-6 py-4">
            {!hasReport && !running ? (
              <div className="text-center py-6 space-y-2">
                <Search className="h-8 w-8 text-violet-400/60 mx-auto" />
                <p className="text-sm text-text-secondary">Describe a topic to research</p>
                <p className="text-xs text-text-muted">Use the chat panel to start deep research</p>
              </div>
            ) : running ? (
              <div className="py-4">
                <div className="relative max-w-2xl mx-auto px-4">
                  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    <ResearchProgress
                      currentPhase={currentPhase}
                      progress={progress}
                      running={running}
                      runningText="Researching..."
                    />
                  </div>
                  <DocumentSkeleton className="opacity-40" />
                </div>
              </div>
            ) : null}
          </div>

          {/* Report */}
          {hasReport && current && (
            <div className="max-w-3xl mx-auto py-8 px-6" style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
              <div className={cn(
                "shadow-2xl px-10 py-12 space-y-8",
                docLight
                  ? "bg-white text-neutral-900 border border-neutral-200 light-surface"
                  : "bg-neutral-900 text-white border border-white/10"
              )}>
                <header className="border-b-2 pb-6">
                  <h1
                    className={cn("text-3xl font-serif font-bold tracking-tight", docLight ? "text-neutral-900" : "text-white")}
                    style={styleToAttr(current.titleStyle)}
                  >
                    {current.title}
                  </h1>
                  {current.summary && (
                    <p className={cn("mt-4 text-sm leading-relaxed", docLight ? "text-neutral-600" : "text-text-secondary")}>
                      {current.summary}
                    </p>
                  )}
                </header>

                <div className="space-y-6">
                  {current.sections.map((section, i) => (
                    <section
                      key={i}
                      onClick={() => { setSelectedSection(i); setStyleOpen(false); }}
                      className={cn("rounded-lg -mx-2 px-2 cursor-pointer transition-colors", selectedSection === i && "ring-2 ring-primary/40 bg-primary/5")}
                    >
                      <h2
                        className={cn(
                          "flex items-center gap-2 text-lg font-serif font-semibold pb-2 mb-3 border-b",
                          docLight ? "text-neutral-800 border-neutral-200" : "text-white border-white/10"
                        )}
                        style={styleToAttr(section.style)}
                      >
                        <span className={cn("text-xs font-mono", docLight ? "text-text-secondary" : "text-violet-400")}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {section.heading}
                      </h2>
                      <div className={cn("text-sm leading-relaxed", docLight ? "text-neutral-700" : "text-white/80")}>
                        <ResearchMarkdown content={section.content} light={docLight} />
                      </div>
                    </section>
                  ))}
                </div>

                {current.sources?.length > 0 && (
                  <div className="pt-6 border-t">
                    <h2 className={cn("text-lg font-serif font-semibold mb-3", docLight ? "text-neutral-800" : "text-white")}>
                      Sources
                    </h2>
                    <ul className="space-y-2">
                      {current.sources.map((src, i) => (
                        <li key={i} className={cn("flex items-start gap-2 text-xs", docLight ? "text-neutral-500" : "text-text-tertiary")}>
                          <ExternalLink className={cn("h-3 w-3 mt-0.5 flex-shrink-0", docLight ? "text-text-secondary" : "text-violet-400")} />
                          <span className="min-w-0">
                            {src.title}
                            {src.url && (
                              <a href={src.url} target="_blank" rel="noopener noreferrer" className={cn("block truncate", docLight ? "text-neutral-600 hover:underline" : "text-violet-400 hover:underline")}>
                                {src.url}
                              </a>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat panel */}
      {chatOpen && (
        <ModeChatPanel
          messages={messages as unknown as ModeChatMessage[]}
          isPending={createMessage.isPending || running}
          onSend={(c, attachmentIds) => {
            pendingAttachmentIds.current = attachmentIds;
            createMessage.mutate({ conversationId, content: c, attachmentIds });
          }}
          running={running}
          runningText="Researching..."
          emptyText="Ask about a topic to begin multi-phase research with iterative refinement."
          conversationId={conversationId}
        />
      )}

      {/* Floating editor card */}
      {sidebarOpen && selectedSection !== undefined && current && hasReport && (
        <div className="fixed right-4 top-16 bottom-16 z-50 hidden md:flex flex-col w-80 rounded-xl border border-white/10 bg-neutral-900/95 backdrop-blur shadow-2xl">
          <div className="flex items-center gap-2 px-3 h-10 border-b border-white/10 flex-shrink-0">
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Editor</span>
            <button
              onClick={() => setStyleOpen((o) => !o)}
              className={cn(
                "ml-auto flex items-center gap-1 px-2 h-6 rounded-md text-[10px] border transition-colors",
                styleOpen ? "bg-primary/20 border-primary/30 text-white" : "border-white/10 text-text-tertiary hover:text-white"
              )}
            >
              <SlidersHorizontal className="h-3 w-3" /> Style
            </button>
            <button onClick={() => setSelectedSection(null)} className="p-1 text-text-tertiary hover:text-white rounded-md">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar p-4 space-y-4">
            {selectedSection === null ? (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Title</label>
                  <textarea
                    value={current.title}
                    onChange={(e) => updateTitle(e.target.value)}
                    rows={2}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary/50 resize-none thin-scrollbar"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Summary</label>
                  <textarea
                    value={current.summary ?? ""}
                    onChange={(e) => updateSummary(e.target.value)}
                    rows={5}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary/50 resize-none thin-scrollbar"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Heading</label>
                  <textarea
                    value={current.sections[selectedSection]?.heading ?? ""}
                    onChange={(e) => updateSectionHeading(selectedSection, e.target.value)}
                    rows={2}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary/50 resize-none thin-scrollbar"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Content</label>
                  <textarea
                    value={current.sections[selectedSection]?.content ?? ""}
                    onChange={(e) => updateSectionContent(selectedSection, e.target.value)}
                    rows={14}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary/50 resize-none thin-scrollbar font-mono"
                  />
                </div>
              </>
            )}
            {styleOpen && (
              <div className="border-t border-white/10 pt-4">
                <BlockStyleEditor
                  style={selectedStyle ?? undefined}
                  onChange={(style) => {
                    if (!current) return;
                    const next = { ...style } as BlockStyle;
                    if (selectedSection === null) {
                      persist({ ...current, titleStyle: next });
                    } else if (selectedSection !== undefined) {
                      const sections = current.sections.map((s, i) =>
                        i === selectedSection ? { ...s, style: next } : s
                      );
                      persist({ ...current, sections });
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
