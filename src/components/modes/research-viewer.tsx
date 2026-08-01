"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileDown,
  Check,
  Loader2,
  MessageSquare,
  ExternalLink,
  Search,
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ModeChatPanel, ModeChatMessage } from "@/components/modes/mode-chat-panel";
import { ResearchMarkdown } from "@/components/modes/renderers";

interface ResearchArtifact {
  title: string;
  summary?: string;
  sections: { heading: string; content: string }[];
  sources: { title: string; url: string }[];
}

const PHASES = ["Planning", "Searching sources", "Writing", "Summarizing findings", "Compiling report", "Complete"];

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
  const [chatOpen, setChatOpen] = useState(true);
  const [currentPhase, setCurrentPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [docLight, setDocLight] = useState(true);

  const conversation = useQuery(trpc.conversations.getById.queryOptions({ id: conversationId }));

  const fragment = conversation.data?.messages
    ?.flatMap((m) => m.fragments ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .find((f: any) => f.mode === "deep-research" || !f.mode);

  const artifact = parseArtifact((fragment?.files as Record<string, unknown>)?.artifact);

  const hasReport = !!artifact?.sections?.length;

  const runResearch = useCallback(
    async (message: string) => {
      setRunning(true);
      setCurrentPhase("Planning");
      setProgress(5);
      try {
        const res = await fetch(`/api/modes/deep-research/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, message }),
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
                throw new Error(data.error);
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
    [conversationId, queryClient, trpc]
  );

  const createMessage = useMutation(
    trpc.chatMessages.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: conversationId }));
        runResearch(data.content);
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
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${artifact.title || "research"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported PDF");
    } catch {
      toast.error("Export failed");
    }
  };

  const messages = useMemo(() => conversation.data?.messages ?? [], [conversation.data]);

  const autoRan = useRef(false);
  const autoRunning = useRef(false);

  useEffect(() => {
    if (autoRan.current || autoRunning.current) return;
    if (!conversation.data) return;

    const lastUser = messages
      .filter((m) => m.role === "USER")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .pop();

    if (lastUser && !hasReport) {
      autoRan.current = true;
      autoRunning.current = true;
      runResearch(lastUser.content).finally(() => {
        autoRunning.current = false;
      });
    } else {
      autoRan.current = true;
    }
  }, [conversation.data, messages, hasReport, runResearch]);

  return (
    <div className="flex h-full w-full">
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="flex items-center justify-between px-4 h-12 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => router.push("/deep-research")} className="text-white/50 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-white/80 truncate">
              {artifact?.title || "Deep Research"}
            </span>
          </div>
          <div className="flex items-center gap-2">
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
                chatOpen ? "bg-primary/20 border-primary/30 text-white" : "text-white/40 border-white/10"
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
                <p className="text-sm text-white/60">Describe a topic to research</p>
                <p className="text-xs text-white/30">Use the chat panel to start deep research</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-white/70">{currentPhase || "Idle"}</span>
                  <span className="text-xs text-white/40">{progress}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-primary rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PHASES.map((phase, i) => {
                    const phaseIndex = PHASES.indexOf(currentPhase);
                    const isActive = running && i === phaseIndex && phase !== "Complete";
                    const done = running ? i < phaseIndex || phase === "Complete" && phaseIndex === PHASES.length - 1 : hasReport;
                    return (
                      <span
                        key={phase}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] border transition-colors",
                          isActive
                            ? "bg-primary/30 border-primary/50 text-white"
                            : done
                              ? "bg-primary/20 border-primary/30 text-white"
                              : "border-white/10 text-white/30"
                        )}
                      >
                        {isActive ? (
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        ) : done ? (
                          <Check className="h-2.5 w-2.5" />
                        ) : null}
                        {phase}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Report */}
          {hasReport && artifact && (
            <div className="max-w-3xl mx-auto py-8 px-6" style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
              <div className={cn(
                "shadow-2xl px-10 py-12 space-y-8",
                docLight
                  ? "bg-white text-neutral-900 border border-neutral-200 light-surface"
                  : "bg-neutral-900 text-white border border-white/10"
              )}>
                <header className="border-b-2 pb-6">
                  <h1 className={cn("text-3xl font-serif font-bold tracking-tight", docLight ? "text-neutral-900" : "text-white")}>
                    {artifact.title}
                  </h1>
                  {artifact.summary && (
                    <p className={cn("mt-4 text-sm leading-relaxed", docLight ? "text-neutral-600" : "text-white/60")}>
                      {artifact.summary}
                    </p>
                  )}
                </header>

                <div className="space-y-6">
                  {artifact.sections.map((section, i) => (
                    <section key={i}>
                      <h2 className={cn(
                        "flex items-center gap-2 text-lg font-serif font-semibold pb-2 mb-3 border-b",
                        docLight ? "text-neutral-800 border-neutral-200" : "text-white border-white/10"
                      )}>
                        <span className={cn("text-xs font-mono", docLight ? "text-neutral-400" : "text-violet-400")}>
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

                {artifact.sources?.length > 0 && (
                  <div className="pt-6 border-t">
                    <h2 className={cn("text-lg font-serif font-semibold mb-3", docLight ? "text-neutral-800" : "text-white")}>
                      Sources
                    </h2>
                    <ul className="space-y-2">
                      {artifact.sources.map((src, i) => (
                        <li key={i} className={cn("flex items-start gap-2 text-xs", docLight ? "text-neutral-500" : "text-white/50")}>
                          <ExternalLink className={cn("h-3 w-3 mt-0.5 flex-shrink-0", docLight ? "text-neutral-400" : "text-violet-400")} />
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
          messages={messages as ModeChatMessage[]}
          isPending={createMessage.isPending || running}
          onSend={(c) => createMessage.mutate({ conversationId, content: c })}
          running={running}
          runningText="Researching..."
          emptyText="Ask about a topic to begin multi-phase research with iterative refinement."
        />
      )}
    </div>
  );
}
