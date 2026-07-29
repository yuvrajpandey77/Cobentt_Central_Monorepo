"use client";

import { useRef, useEffect, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useInView,
} from "framer-motion";
import {
  ArrowRight,
  Plus,
  Mic,
  Send,
  Code2,
  BrainCircuit,
  Route,
  Bot,
  Cpu,
  FileText,
  BookOpen,
  Search,
  Settings,
  MessageSquare,
  FolderKanban,
  GitBranch,
  Puzzle,
  User,
  ChevronDown,
  Heart,
  Share2,
  RefreshCw,
  Sparkles,
  Globe,
  Terminal,
  Smartphone,
  Database,
  Check,
  MessageCircle,
} from "lucide-react";

/* ───────────────────────────────────────────
   Floating Capability Cards
   ─────────────────────────────────────────── */
function FloatCard({
  children,
  className = "",
  style,
  mouseX,
  mouseY,
  floatClass,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  mouseX: any;
  mouseY: any;
  floatClass: string;
}) {
  const rotateY = useSpring(useTransform(mouseX, [-400, 400], [4, -4]), { stiffness: 30, damping: 15 });
  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [-4, 4]), { stiffness: 30, damping: 15 });

  return (
    <motion.div
      style={{ rotateX, rotateY, perspective: 800, ...style }}
      className={`absolute ${floatClass} ${className}`}
    >
      {children}
    </motion.div>
  );
}

/* ── Left: Meridian Intelligence chip ── */
function MeridianFloatCard({ mouseX, mouseY }: { mouseX: any; mouseY: any }) {
  return (
    <FloatCard mouseX={mouseX} mouseY={mouseY} floatClass="cardFloat1" className="left-[3%] top-[10%] z-10">
      <div className="w-[170px] bg-bg-card/70 backdrop-blur-lg border border-white/10 rounded-tl-[40px] rounded-tr-[12px] rounded-br-[40px] rounded-bl-[12px] p-3.5 shadow-2xl shadow-black/30">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-tr-[6px] rounded-bl-[6px] rounded-tl-[4px] rounded-br-[4px] bg-white/10 flex items-center justify-center">
            <Cpu className="w-3.5 h-3.5 text-white/70" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-white tracking-tight">Meridian</p>
            <p className="text-[7px] text-white/40 leading-none">Built by Cogerphere</p>
          </div>
        </div>
        <div className="flex items-center gap-1 mb-1.5">
          <div className="h-1 bg-white/5 rounded-full flex-1 overflow-hidden">
            <motion.div
              className="h-full bg-white/15 rounded-full"
              animate={{ width: ["30%", "70%", "45%", "80%", "30%"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>
        <span className="text-[8px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded-tr-[4px] rounded-bl-[4px] rounded-tl-[3px] rounded-br-[3px]">
          Local SLM
        </span>
      </div>
    </FloatCard>
  );
}

/* ── Left: Context card ── */
function ContextFloatCard({ mouseX, mouseY }: { mouseX: any; mouseY: any }) {
  const items = [
    { label: "Memory", icon: BrainCircuit },
    { label: "Projects", icon: FolderKanban },
    { label: "Research", icon: Search },
    { label: "Documents", icon: FileText },
    { label: "Agents", icon: Bot },
  ];
  return (
    <FloatCard mouseX={mouseX} mouseY={mouseY} floatClass="cardFloat3" className="left-[5%] top-[68%] z-10">
      <div className="w-[180px] bg-bg-card/70 backdrop-blur-lg border border-white/10 rounded-tl-[40px] rounded-tr-[12px] rounded-br-[40px] rounded-bl-[12px] p-3.5 shadow-2xl shadow-black/30">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Database className="w-3 h-3 text-white/50" />
          <span className="text-[9px] font-medium text-white/60">Context</span>
        </div>
        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2 px-1.5 py-1">
              <item.icon className="w-2.5 h-2.5 text-white/30" />
              <span className="text-[8px] text-white/40">{item.label}</span>
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/10" />
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-1">
          <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent" />
          <span className="text-[7px] text-white/20">6 sources active</span>
        </div>
      </div>
    </FloatCard>
  );
}

/* ── Right: Code Editor card ── */
function CodeEditorFloatCard({ mouseX, mouseY }: { mouseX: any; mouseY: any }) {
  return (
    <FloatCard mouseX={mouseX} mouseY={mouseY} floatClass="cardFloat4" className="right-[3%] top-[6%] z-10">
      <div className="w-[180px] bg-bg-card/70 backdrop-blur-lg border border-white/10 rounded-tl-[12px] rounded-tr-[40px] rounded-br-[12px] rounded-bl-[40px] p-3.5 shadow-2xl shadow-black/30">
        <div className="flex items-center gap-1.5 mb-2">
          <Code2 className="w-3 h-3 text-white/50" />
          <span className="text-[7px] text-white/30 font-mono">data-table.tsx</span>
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/15 animate-pulse" />
        </div>
        <div className="bg-black/40 rounded-tr-[6px] rounded-bl-[6px] rounded-tl-[4px] rounded-br-[4px] p-2 font-mono text-[7px] leading-relaxed">
          <div><span className="text-white/20">import</span><span className="text-white/30">{' {'}</span><span className="text-white/40">useState</span><span className="text-white/30">{'}'} from </span><span className="text-white/30">&quot;react&quot;</span></div>
          <div><span className="text-white/20">interface</span><span className="text-white/40"> DataTable</span><span className="text-white/30">&lt;T&gt; {'{'}</span></div>
          <div className="pl-2"><span className="text-white/30">data: T[]</span></div>
          <div className="pl-2"><span className="text-white/30">columns: Column&lt;T&gt;[]</span></div>
          <div className="pl-2"><span className="text-white/30">pageSize</span><span className="text-white/20">?</span><span className="text-white/30">: number</span></div>
          <div><span className="text-white/30">{'}'}</span></div>
          <div className="flex items-center gap-1 mt-1.5 pt-1 border-t border-white/5">
            <span className="w-1.5 h-3 bg-white/30" style={{ animation: "cursorBlink 1s step-end infinite" }} />
            <span className="text-white/20">|</span>
          </div>
        </div>
      </div>
    </FloatCard>
  );
}

/* ── Right: Research card ── */
function ResearchFloatCard({ mouseX, mouseY }: { mouseX: any; mouseY: any }) {
  return (
    <FloatCard mouseX={mouseX} mouseY={mouseY} floatClass="cardFloat1" className="right-[1%] top-[30%] z-10">
      <div className="w-[175px] bg-bg-card/70 backdrop-blur-lg border border-white/10 rounded-tl-[40px] rounded-tr-[12px] rounded-br-[40px] rounded-bl-[12px] p-3.5 shadow-2xl shadow-black/30">
        <div className="flex items-center gap-1.5 mb-2">
          <BookOpen className="w-3 h-3 text-white/50" />
          <span className="text-[8px] text-white/30 font-medium">Research</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 bg-white/5 rounded-tr-[4px] rounded-bl-[4px] rounded-tl-[3px] rounded-br-[3px] px-1.5 py-1">
            <FileText className="w-2.5 h-2.5 text-white/30" />
            <span className="text-[7px] text-white/40 flex-1 truncate">Attention Is All You Need</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 rounded-tr-[4px] rounded-bl-[4px] rounded-tl-[3px] rounded-br-[3px] px-1.5 py-1">
            <FileText className="w-2.5 h-2.5 text-white/30" />
            <span className="text-[7px] text-white/40 flex-1 truncate">GPT-4 Technical Report</span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-white/5">
          <span className="text-[7px] text-white/20">12 sources</span>
          <span className="text-[7px] text-white/20">·</span>
          <span className="text-[7px] text-white/20">34 citations</span>
        </div>
      </div>
    </FloatCard>
  );
}

/* ── Right: Model Router card ── */
function ModelRouterFloatCard({ mouseX, mouseY }: { mouseX: any; mouseY: any }) {
  const models = ["GPT-4o", "Claude", "Gemini", "DeepSeek", "Qwen"];
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % models.length), 2200);
    return () => clearInterval(t);
  }, [models.length]);

  return (
    <FloatCard mouseX={mouseX} mouseY={mouseY} floatClass="cardFloat2" className="right-[4%] top-[55%] z-10">
      <div className="w-[175px] bg-bg-card/70 backdrop-blur-lg border border-white/10 rounded-tl-[12px] rounded-tr-[40px] rounded-br-[12px] rounded-bl-[40px] p-3.5 shadow-2xl shadow-black/30">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Route className="w-3 h-3 text-white/50" />
          <span className="text-[8px] text-white/30 font-medium">Model Router</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[6px] text-white/40 font-bold">P</span>
            </div>
            <div className="h-px flex-1 bg-white/10" />
            <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <BrainCircuit className="w-2 h-2 text-white/60" />
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-white/5" />
            <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0" style={{ animation: "neuralPulse 2.2s ease-in-out infinite" }}>
              <span className="text-[5px] text-white/50 font-bold">{models[active].slice(0, 2)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {models.map((m, i) => (
              <span
                key={m}
                className={`text-[6px] px-1.5 py-0.5 rounded-tr-[4px] rounded-bl-[4px] rounded-tl-[3px] rounded-br-[3px] transition-all duration-500 ${
                  i === active
                    ? "bg-white/20 text-white/70"
                    : "bg-white/5 text-white/25"
                }`}
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </FloatCard>
  );
}

/* ── Right: Agent Execution card ── */
function AgentExecFloatCard({ mouseX, mouseY }: { mouseX: any; mouseY: any }) {
  const steps = [
    { label: "Planning", status: "done" as const },
    { label: "Reasoning", status: "done" as const },
    { label: "Tool Calling", status: "running" as const },
    { label: "Verification", status: "pending" as const },
  ];

  return (
    <FloatCard mouseX={mouseX} mouseY={mouseY} floatClass="cardFloat3" className="right-[2%] top-[78%] z-10">
      <div className="w-[180px] bg-bg-card/70 backdrop-blur-lg border border-white/10 rounded-tl-[40px] rounded-tr-[12px] rounded-br-[40px] rounded-bl-[12px] p-3.5 shadow-2xl shadow-black/30">
        <div className="flex items-center gap-1.5 mb-2">
          <Bot className="w-3 h-3 text-white/50" />
          <span className="text-[8px] text-white/30 font-medium">Agent Execution</span>
        </div>
        <div className="space-y-1.5">
          {steps.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full flex items-center justify-center flex-shrink-0 ${
                  s.status === "done"
                    ? "bg-white/20"
                    : s.status === "running"
                    ? "bg-white/15"
                    : "bg-white/5"
                }`}
              >
                {s.status === "done" && <Check className="w-1.5 h-1.5 text-white/50" />}
                {s.status === "running" && (
                  <div className="w-1 h-1 rounded-full bg-white/60" style={{ animation: "neuralPulse 1s ease-in-out infinite" }} />
                )}
              </div>
              <span
                className={`text-[8px] ${
                  s.status === "done"
                    ? "text-white/50"
                    : s.status === "running"
                    ? "text-white/70"
                    : "text-white/20"
                }`}
              >
                {s.label}
              </span>
              <span className="ml-auto text-[6px] text-white/20 font-mono">
                {s.status === "done" ? "✓" : s.status === "running" ? "..." : ""}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-white/5">
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white/20 rounded-full"
              animate={{ width: ["0%", "65%", "65%", "85%", "85%", "100%"] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>
      </div>
    </FloatCard>
  );
}

/* ───────────────────────────────────────────
   Sidebar (inside browser window)
   ─────────────────────────────────────────── */
function Sidebar() {
  const mainItems = [
    { icon: MessageSquare, label: "Chat", active: true },
    { icon: BookOpen, label: "Research" },
    { icon: Bot, label: "Agents" },
    { icon: FolderKanban, label: "Projects" },
    { icon: GitBranch, label: "Artifacts" },
    { icon: Puzzle, label: "Connectors" },
  ];

  return (
    <div className="w-[160px] sm:w-[200px] lg:w-[220px] flex-shrink-0 border-r border-white/[0.04] bg-black/30 flex flex-col h-full">
      <div className="px-3 pt-3 pb-2 space-y-2.5">
        <div className="flex items-center gap-2 px-2">
          <div className="w-6 h-6 rounded-tr-[5px] rounded-bl-[5px] rounded-tl-[3px] rounded-br-[3px] bg-white/15 flex items-center justify-center">
            <User className="w-3 h-3 text-white/60" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-white/60 truncate">Alex Chen</p>
            <p className="text-[7px] text-white/20 truncate">Pro plan</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-tr-[6px] rounded-bl-[6px] rounded-tl-[4px] rounded-br-[4px] cursor-pointer">
          <span className="text-[9px] text-white/50 flex-1 truncate">Cobentt Workspace</span>
          <ChevronDown className="w-2.5 h-2.5 text-white/30" />
        </div>

        <a
          href="#"
          className="flex items-center gap-2 px-2 py-1.5 bg-white/10 text-white/60 rounded-tr-[6px] rounded-bl-[6px] rounded-tl-[4px] rounded-br-[4px] text-[9px] font-medium hover:bg-white/15 transition-colors"
        >
          <Plus className="w-2.5 h-2.5" />
          New Chat
        </a>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-0.5 scrollbar-hide">
        {mainItems.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-tr-[6px] rounded-bl-[6px] rounded-tl-[4px] rounded-br-[4px] cursor-pointer transition-colors ${
              item.active ? "bg-white/10 text-white/70" : "text-white/30 hover:text-white/50 hover:bg-white/5"
            }`}
          >
            <item.icon className="w-3 h-3 flex-shrink-0" />
            <span className="text-[9px] font-medium truncate">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="px-3 py-2 border-t border-white/[0.04] space-y-0.5">
        <div className="flex items-center gap-2 px-2 py-1.5 text-white/30 hover:text-white/50 hover:bg-white/5 rounded-tr-[6px] rounded-bl-[6px] rounded-tl-[4px] rounded-br-[4px] cursor-pointer transition-colors">
          <Search className="w-3 h-3" />
          <span className="text-[9px]">Search</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5 text-white/30 hover:text-white/50 hover:bg-white/5 rounded-tr-[6px] rounded-bl-[6px] rounded-tl-[4px] rounded-br-[4px] cursor-pointer transition-colors">
          <Settings className="w-3 h-3" />
          <span className="text-[9px]">Settings</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────
   Prompt Bar
   ─────────────────────────────────────────── */
function PromptBar() {
  return (
    <div className="flex items-center gap-1.5 mx-3 mb-2.5 mt-auto">
      <div className="flex items-center gap-1.5 flex-1 bg-white/5 border border-white/10 rounded-tl-[14px] rounded-tr-[6px] rounded-br-[14px] rounded-bl-[6px] px-2.5 py-2 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.07]">
        <button className="w-5 h-5 rounded-tr-[4px] rounded-bl-[4px] rounded-tl-[3px] rounded-br-[3px] hover:bg-white/10 flex items-center justify-center flex-shrink-0 transition-colors">
          <Plus className="w-2.5 h-2.5 text-white/40" />
        </button>

        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/10 rounded-tr-[4px] rounded-bl-[4px] rounded-tl-[3px] rounded-br-[3px] cursor-pointer flex-shrink-0">
          <BrainCircuit className="w-2.5 h-2.5 text-white/40" />
          <span className="text-[8px] text-white/50">GPT-4o</span>
          <ChevronDown className="w-2 h-2 text-white/30" />
        </div>

        <input
          type="text"
          placeholder="Message Cobentt..."
          className="flex-1 bg-transparent text-[10px] text-white/60 placeholder:text-white/20 outline-none min-w-0"
          readOnly
        />

        <button className="w-5 h-5 rounded-tr-[4px] rounded-bl-[4px] rounded-tl-[3px] rounded-br-[3px] hover:bg-white/10 flex items-center justify-center flex-shrink-0 transition-colors">
          <Mic className="w-2.5 h-2.5 text-white/40" />
        </button>

        <button className="w-5 h-5 rounded-tr-[4px] rounded-bl-[4px] rounded-tl-[3px] rounded-br-[3px] bg-white/20 hover:bg-white/30 flex items-center justify-center flex-shrink-0 transition-colors">
          <Send className="w-2.5 h-2.5 text-white/70" />
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────
   Browser Window
   ─────────────────────────────────────────── */
function BrowserWindow({ mouseX, mouseY }: { mouseX: any; mouseY: any }) {
  const windowRotateY = useSpring(useTransform(mouseX, [-400, 400], [1.5, -1.5]), { stiffness: 25, damping: 20 });
  const windowRotateX = useSpring(useTransform(mouseY, [-300, 300], [-1.5, 1.5]), { stiffness: 25, damping: 20 });

  return (
    <motion.div
      style={{ rotateX: windowRotateX, rotateY: windowRotateY, perspective: 1000 }}
      className="w-full mx-auto max-w-[900px] relative"
    >
      {/* Reflection */}
      <div
        className="absolute -bottom-6 left-[5%] right-[5%] h-16 bg-gradient-to-b from-white/[0.02] to-transparent rounded-full blur-2xl pointer-events-none"
        aria-hidden
      />

      <div className="relative bg-bg-card/90 backdrop-blur-xl border border-white/[0.08] rounded-tl-[40px] rounded-tr-[16px] rounded-br-[40px] rounded-bl-[16px] overflow-hidden shadow-2xl shadow-black/40">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04] bg-black/20">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-white/20 hover:bg-[#FF5F56] transition-colors duration-300 cursor-pointer" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/15 hover:bg-[#FFBD2E] transition-colors duration-300 cursor-pointer" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/10 hover:bg-[#27C93F] transition-colors duration-300 cursor-pointer" />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-tr-[6px] rounded-bl-[6px] rounded-tl-[4px] rounded-br-[4px] max-w-[240px]">
              <div className="w-3 h-3 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-[5px] font-bold text-white/40">C</span>
              </div>
              <span className="text-[8px] text-white/30 truncate">cobentt.app/workspace</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[8px] text-white/20">
            <span>Chat</span>
            <span className="text-white/10">·</span>
            <span className="text-white/40">Models</span>
            <span className="text-white/10">·</span>
            <span>Code</span>
            <span className="text-white/10">·</span>
            <span className="text-white/30">Agents</span>
          </div>
        </div>

        {/* Content area */}
        <div className="flex h-[360px] sm:h-[420px] md:h-[480px] lg:h-[520px]">
          <Sidebar />

          {/* Main panel */}
          <div className="flex-1 flex flex-col bg-black/15 min-w-0">
            {/* Chat header */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04]">
              <span className="text-[11px] font-medium text-white/60">Chat</span>
              <div className="flex items-center gap-1 ml-2">
                <span className="text-[8px] px-1.5 py-0.5 bg-white/15 text-white/60 rounded-tr-[4px] rounded-bl-[4px] rounded-tl-[3px] rounded-br-[3px]">GPT-4o</span>
                <span className="text-[8px] px-1.5 py-0.5 bg-white/5 text-white/30 rounded-tr-[4px] rounded-bl-[4px] rounded-tl-[3px] rounded-br-[3px]">Claude 4</span>
                <span className="text-[8px] px-1.5 py-0.5 bg-white/5 text-white/20 rounded-tr-[4px] rounded-bl-[4px] rounded-tl-[3px] rounded-br-[3px]">Gemini</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[8px] text-white/20">
                  <BrainCircuit className="w-3 h-3 inline text-white/30" /> Meridian
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-hide">
              {/* User message */}
              <div className="flex items-start gap-2.5 max-w-[80%]">
                <div className="w-6 h-6 rounded-tr-[5px] rounded-bl-[5px] rounded-tl-[3px] rounded-br-[3px] bg-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-3 h-3 text-white/50" />
                </div>
                <div className="bg-white/5 rounded-tr-[12px] rounded-bl-[12px] rounded-tl-[8px] rounded-br-[8px] px-3 py-2.5">
                  <p className="text-[10px] text-white/60 leading-relaxed">
                    Build a React data table with sorting, filtering, and pagination.
                  </p>
                </div>
              </div>

              {/* Assistant message */}
              <div className="flex items-start gap-2.5 flex-row-reverse">
                <div className="w-6 h-6 rounded-tr-[5px] rounded-bl-[5px] rounded-tl-[3px] rounded-br-[3px] bg-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[8px] font-bold text-bg-primary">C</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-white/5 rounded-tl-[12px] rounded-br-[12px] rounded-tr-[8px] rounded-bl-[8px] px-3 py-2.5">
                    <p className="text-[10px] text-white/50 leading-relaxed mb-2">
                      Here is a production-ready data table component with sorting, filtering, and pagination built with React and TypeScript.
                    </p>

                    {/* Code preview */}
                    <div className="bg-black/50 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] p-2.5 font-mono text-[8px] leading-relaxed overflow-x-auto">
                      <div><span className="text-white/25">import</span><span className="text-white/35"> React, {'{'}useState, useMemo{'}'} </span><span className="text-white/25">from</span><span className="text-white/35"> &apos;react&apos;</span></div>
                      <div><span className="text-white/25">interface</span><span className="text-white/45"> Column</span><span className="text-white/35">&lt;T&gt; {'{'}</span></div>
                      <div className="pl-2"><span className="text-white/35">key: keyof T</span></div>
                      <div className="pl-2"><span className="text-white/35">header: string</span></div>
                      <div className="pl-2"><span className="text-white/35">sortable</span><span className="text-white/20">?</span><span className="text-white/35">: boolean</span></div>
                      <div className="pl-2"><span className="text-white/35">render</span><span className="text-white/20">?</span><span className="text-white/35">: (item: T) =&gt; ReactNode</span></div>
                      <div><span className="text-white/35">{'}'}</span></div>
                      <div><span className="text-white/25">export function</span><span className="text-white/45"> DataTable</span><span className="text-white/35">&lt;T&gt;(props: DataTableProps&lt;T&gt;) {'{'}</span></div>
                      <div className="pl-3"><span className="text-white/30">const [sortKey, setSortKey] = useState&lt;keyof T | null&gt;(null)</span></div>
                      <div className="pl-3"><span className="text-white/30">const [sortDir, setSortDir] = useState&lt;&apos;asc&apos; | &apos;desc&apos;&gt;(&apos;asc&apos;)</span></div>
                      <div className="pl-3"><span className="text-white/30">const [filter, setFilter] = useState(&apos;&apos;)</span></div>
                      <div className="pl-3"><span className="text-white/30">const [page, setPage] = useState(1)</span></div>
                      <div className="mt-1"><span className="text-white/30">const filtered = useMemo(() =&gt;</span></div>
                      <div className="pl-3"><span className="text-white/30">data.filter(row =&gt; /* filter logic */), [data, filter])</span></div>
                      <div><span className="text-white/30">const sorted = useMemo(() =&gt; /* sort */, [filtered, sortKey, sortDir])</span></div>
                      <div><span className="text-white/30">const paginated = useMemo(() =&gt; /* paginate */, [sorted, page])</span></div>
                      <div className="mt-1"><span className="text-white/30">return (/* table */)</span></div>
                      <div><span className="text-white/35">{'}'}</span></div>
                    </div>

                    {/* Artifact badge */}
                    <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-white/5">
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/10 rounded-tr-[4px] rounded-bl-[4px] rounded-tl-[3px] rounded-br-[3px]">
                        <Code2 className="w-2 h-2 text-white/40" />
                        <span className="text-[7px] text-white/40">data-table.tsx</span>
                      </div>
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/5 rounded-tr-[4px] rounded-bl-[4px] rounded-tl-[3px] rounded-br-[3px]">
                        <Terminal className="w-2 h-2 text-white/30" />
                        <span className="text-[7px] text-white/30">preview</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 mt-1.5 px-1">
                    <button className="p-1 rounded-tr-[4px] rounded-bl-[4px] rounded-tl-[3px] rounded-br-[3px] hover:bg-white/10 transition-colors">
                      <Heart className="w-2.5 h-2.5 text-white/25" />
                    </button>
                    <button className="p-1 rounded-tr-[4px] rounded-bl-[4px] rounded-tl-[3px] rounded-br-[3px] hover:bg-white/10 transition-colors">
                      <MessageCircle className="w-2.5 h-2.5 text-white/25" />
                    </button>
                    <button className="p-1 rounded-tr-[4px] rounded-bl-[4px] rounded-tl-[3px] rounded-br-[3px] hover:bg-white/10 transition-colors">
                      <RefreshCw className="w-2.5 h-2.5 text-white/25" />
                    </button>
                    <button className="p-1 rounded-tr-[4px] rounded-bl-[4px] rounded-tl-[3px] rounded-br-[3px] hover:bg-white/10 transition-colors">
                      <Share2 className="w-2.5 h-2.5 text-white/25" />
                    </button>
                    <div className="ml-auto flex items-center gap-1">
                      <span className="text-[7px] text-white/20">3.2s</span>
                      <span className="text-white/10">·</span>
                      <span className="text-[7px] text-white/20">412 tokens</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Prompt Bar */}
            <PromptBar />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ───────────────────────────────────────────
   Main Hero Export
   ─────────────────────────────────────────── */
export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const rawHeadlineY = useTransform(scrollYProgress, [0, 1], [0, 50]);
  const rawOpacityY = useTransform(scrollYProgress, [0, 0.15], [1, 0.6]);
  const headlineY = useSpring(rawHeadlineY, { stiffness: 80, damping: 25 });
  const opacityY = useSpring(rawOpacityY, { stiffness: 80, damping: 25 });

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    let rafId: number;
    const handleMouse = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        mouseX.set(e.clientX - cx);
        mouseY.set(e.clientY - cy);
      });
    };
    window.addEventListener("mousemove", handleMouse, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouse);
      cancelAnimationFrame(rafId);
    };
  }, [mouseX, mouseY]);

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center pt-20 lg:pt-24 pb-16 lg:pb-20 overflow-hidden"
    >
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10 w-full relative z-10">
        <div className="relative">
          {/* Floating cards */}
          <div className="hidden xl:block" aria-hidden>
            <MeridianFloatCard mouseX={mouseX} mouseY={mouseY} />
            <ContextFloatCard mouseX={mouseX} mouseY={mouseY} />
            <CodeEditorFloatCard mouseX={mouseX} mouseY={mouseY} />
            <ResearchFloatCard mouseX={mouseX} mouseY={mouseY} />
            <ModelRouterFloatCard mouseX={mouseX} mouseY={mouseY} />
            <AgentExecFloatCard mouseX={mouseX} mouseY={mouseY} />
          </div>

          {/* Mobile backdrop hint */}
          <div className="xl:hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 60%)" }}
          />

          {/* Headline section */}
          <motion.div style={{ y: headlineY, opacity: opacityY }} className="text-center mb-10 lg:mb-14">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-8 lg:mb-10"
            >
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-white/50 bg-white/5 border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px]">
                <Cpu className="w-3 h-3 text-white/40" />
                Built by{" "}
                <a
                  href="https://cogerphere.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Cogerphere <ArrowRight className="w-2.5 h-2.5 inline" />
                </a>{" "}
                · Meridian Orchestration Layer
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[96px] font-bold leading-[1.05] tracking-tight"
            >
              <span className="block mb-2 lg:mb-3">The workspace</span>
              <span className="block">that thinks with you.</span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 lg:mt-8"
            >
              <a
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black text-sm font-medium rounded-tr-[12px] rounded-bl-[12px] rounded-tl-[8px] rounded-br-[8px] hover:bg-gray-100 transition-all duration-300 shadow-lg shadow-white/10"
              >
                Open Workspace
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <a
                href="/overview/docs"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white/50 hover:text-white transition-all duration-300"
              >
                <Globe className="w-3.5 h-3.5" />
                Documentation
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white/50 hover:text-white border border-white/10 hover:border-white/20 rounded-tr-[12px] rounded-bl-[12px] rounded-tl-[8px] rounded-br-[8px] transition-all duration-300"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Download App
              </a>
            </motion.div>
          </motion.div>

          {/* Browser Window */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.9, delay: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative"
          >
            <BrowserWindow mouseX={mouseX} mouseY={mouseY} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
