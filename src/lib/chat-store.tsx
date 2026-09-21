"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  thinking?: string;
  thinkingTime?: number;
  sources?: { index: number; title: string }[];
  attachments?: { id: string; name: string; size: number }[];
}

export interface Thread {
  id: string;
  title: string;
  date: string;
  messages: Message[];
}

type Provider = "openrouter" | "openai" | "anthropic" | "google" | "custom";

interface ChatCtx {
  threads: Thread[];
  activeThreadId: string | null;
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (c: boolean) => void;
  activeThread: Thread | null;
  createThread: (initialMessages?: Message[]) => string;
  deleteThread: (id: string) => void;
  selectThread: (id: string) => void;
  addMessage: (msg: Message, threadId?: string) => void;
  isStreaming: boolean;
  setIsStreaming: (s: boolean) => void;

  provider: Provider;
  setProvider: (p: Provider) => void;
  apiKey: string;
  setApiKey: (k: string) => void;
  baseUrl: string;
  setBaseUrl: (u: string) => void;
  modelId: string;
  setModelId: (m: string) => void;
  temperature: number;
  setTemperature: (t: number) => void;
  topP: number;
  setTopP: (t: number) => void;
  topK: number;
  setTopK: (t: number) => void;
  contentFilter: "off" | "standard" | "strict";
  setContentFilter: (f: "off" | "standard" | "strict") => void;
  webSearch: boolean;
  setWebSearch: (s: boolean) => void;
  webSearchEngine: "duckduckgo" | "searxng";
  setWebSearchEngine: (e: "duckduckgo" | "searxng") => void;
  searxngUrl: string;
  setSearxngUrl: (u: string) => void;
  customInstructions: string;
  setCustomInstructions: (s: string) => void;
  renameThread: (id: string, title: string) => void;
  togglePinThread: (id: string, isPinned: boolean) => void;
  toggleArchiveThread: (id: string, isArchived: boolean) => void;
  deleteAllData: () => void;
  saveSettings: () => void;
  loaded: boolean;
  editMessage: (msgId: string) => void;
  pendingEditContent: string | null;
  clearPendingEdit: () => void;
  refetchConversations: () => void;
}

const ChatContext = createContext<ChatCtx>(null!);

const STORAGE_KEYS = {
  settings: "cb_settings",
  activeThread: "cb_active_thread",
} as const;

interface StoredSettings {
  provider?: Provider;
  // NOTE: apiKey is intentionally NOT persisted. BYOK keys live encrypted
  // server-side only and must never touch localStorage (XSS exfiltration risk).
  baseUrl?: string;
  modelId?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  contentFilter?: "off" | "standard" | "strict";
  webSearch?: boolean;
  webSearchEngine?: "duckduckgo" | "searxng";
  searxngUrl?: string;
  customInstructions?: string;
  sidebarCollapsed?: boolean;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      console.warn("localStorage quota exceeded.");
    }
  }
}

function loadSettings(): StoredSettings {
  return loadFromStorage<StoredSettings>(STORAGE_KEYS.settings, {});
}

interface PrismaMessageLike {
  id: string; content: string; role: string;
  createdAt: Date | string; modelUsed?: string | null;
  thinking?: unknown; sources?: unknown; attachments?: unknown;
}

function mapPrismaMessage(m: PrismaMessageLike): Message {
  return {
    id: m.id,
    role: m.role.toLowerCase() as "user" | "assistant",
    content: m.content,
    timestamp: new Date(m.createdAt).getTime(),
    thinking: m.thinking ? (typeof m.thinking === "string" ? m.thinking : undefined) : undefined,
    sources: m.sources ? (typeof m.sources === "string" ? JSON.parse(m.sources) : m.sources) : undefined,
    attachments: m.attachments
      ? ((typeof m.attachments === "string" ? JSON.parse(m.attachments) : m.attachments) as Array<{ id: string; fileName?: string; name?: string; size: number }>)
          .map((a) => ({ id: a.id, name: a.fileName ?? a.name ?? "file", size: a.size }))
      : undefined,
  };
}

interface PrismaMessagePreview {
  content: string; role: string;
  createdAt: Date | string;
}

function mapPrismaConversation(c: {
  id: string; title?: string | null; updatedAt: Date | string;
  messages: PrismaMessagePreview[];
}): Thread {
  return {
    id: c.id,
    title: c.title || "New chat",
    date: new Date(c.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    messages: (c.messages || []).map((m) => mapPrismaMessage(m as unknown as PrismaMessageLike)),
  };
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [loaded, setLoaded] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingEditContent, setPendingEditContent] = useState<string | null>(null);

  const [provider, setProvider] = useState<Provider>("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [modelId, setModelId] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(1);
  const [topK, setTopK] = useState(0);
  const [contentFilter, setContentFilter] = useState<"off" | "standard" | "strict">("standard");
  const [webSearch, setWebSearch] = useState(false);
  const [webSearchEngine, setWebSearchEngine] = useState<"duckduckgo" | "searxng">("duckduckgo");
  const [searxngUrl, setSearxngUrl] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");

  const initialLoadDone = useRef(false);

  const { data: dbConversations, refetch: refetchConversations } = useQuery({
    ...trpc.conversations.getAll.queryOptions(),
    enabled: true,
  });

  const { data: activeConversation } = useQuery({
    ...trpc.conversations.getById.queryOptions({ id: activeThreadId || "" }),
    enabled: !!activeThreadId,
  });

  const createConvMutation = useMutation(trpc.conversations.create.mutationOptions({
    onSuccess: (data) => {
      queryClient.invalidateQueries(trpc.conversations.getAll.queryOptions());
      setActiveThreadId(data.id);
      saveToStorage(STORAGE_KEYS.activeThread, data.id);
    },
    onError: (err) => toast.error(err.message || "Failed to create conversation"),
  }));

  const deleteConvMutation = useMutation(trpc.conversations.delete.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries(trpc.conversations.getAll.queryOptions());
      setActiveThreadId(null);
      saveToStorage(STORAGE_KEYS.activeThread, null);
    },
    onError: (err) => toast.error(err.message || "Failed to delete"),
  }));

  const renameConvMutation = useMutation(trpc.conversations.update.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries(trpc.conversations.getAll.queryOptions());
      if (activeThreadId) {
        queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: activeThreadId }));
      }
      toast.success("Chat renamed");
    },
    onError: (err) => toast.error(err.message || "Failed to rename"),
  }));

  const togglePinConvMutation = useMutation(trpc.conversations.update.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries(trpc.conversations.getAll.queryOptions());
      if (activeThreadId) {
        queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: activeThreadId }));
      }
    },
    onError: (err) => toast.error(err.message || "Failed to update pin"),
  }));

  const toggleArchiveConvMutation = useMutation(trpc.conversations.update.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries(trpc.conversations.getAll.queryOptions());
      if (activeThreadId) {
        queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: activeThreadId }));
      }
    },
    onError: (err) => toast.error(err.message || "Failed to archive"),
  }));

  const addMsgMutation = useMutation(trpc.chatMessages.create.mutationOptions({
    onSuccess: () => {
      if (activeThreadId) {
        queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: activeThreadId }));
      }
    },
    onError: (err) => toast.error(err.message || "Failed to send message"),
  }));

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedActiveId = loadFromStorage<string | null>(STORAGE_KEYS.activeThread, null);
    const savedSettings = loadSettings();

    if (savedActiveId) setActiveThreadId(savedActiveId);
    if (savedSettings.provider) setProvider(savedSettings.provider);
    // Legacy localStorage apiKey/baseUrl are ignored (BYOK keys are server-side only).
    try {
      localStorage.removeItem("cb_settings_apiKey");
      const raw = localStorage.getItem(STORAGE_KEYS.settings);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && ("apiKey" in parsed || "baseUrl" in parsed)) {
          delete parsed.apiKey;
          delete parsed.baseUrl;
          localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(parsed));
        }
      }
    } catch {}
    if (savedSettings.modelId) setModelId(savedSettings.modelId);
    if (savedSettings.temperature !== undefined) setTemperature(savedSettings.temperature);
    if (savedSettings.topP !== undefined) setTopP(savedSettings.topP);
    if (savedSettings.topK !== undefined) setTopK(savedSettings.topK);
    if (savedSettings.contentFilter) setContentFilter(savedSettings.contentFilter);
    if (savedSettings.webSearch !== undefined) setWebSearch(savedSettings.webSearch);
    if (savedSettings.webSearchEngine) setWebSearchEngine(savedSettings.webSearchEngine);
    if (savedSettings.searxngUrl) setSearxngUrl(savedSettings.searxngUrl);
    if (savedSettings.customInstructions) setCustomInstructions(savedSettings.customInstructions);
    if (savedSettings.sidebarCollapsed !== undefined) setSidebarCollapsed(savedSettings.sidebarCollapsed);

    initialLoadDone.current = true;
    setLoaded(true);
  }, []);

  // Auto-save activeThreadId
  useEffect(() => {
    if (!initialLoadDone.current) return;
    saveToStorage(STORAGE_KEYS.activeThread, activeThreadId);
  }, [activeThreadId]);

  // Auto-save settings (debounced)
  // NOTE: apiKey/baseUrl secrets are never written to localStorage.
  useEffect(() => {
    if (!initialLoadDone.current) return;
    const timer = setTimeout(() => {
      saveToStorage(STORAGE_KEYS.settings, {
        provider, modelId, temperature, topP, topK,
        contentFilter, webSearch, webSearchEngine, searxngUrl, customInstructions,
        sidebarCollapsed,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [
    provider, baseUrl, modelId, temperature, topP, topK,
    contentFilter, webSearch, webSearchEngine, searxngUrl, customInstructions,
    sidebarCollapsed,
  ]);

  // Map DB threads to Thread format
  const threads: Thread[] = (dbConversations || []).map(mapPrismaConversation);

  // Build active thread from DB data
  const activeThread: Thread | null = activeConversation
    ? {
        id: activeConversation.id,
        title: activeConversation.title || "New chat",
        date: new Date(activeConversation.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        messages: (activeConversation.messages || []).map(mapPrismaMessage),
      }
    : null;

  const saveSettings = useCallback(() => {
    saveToStorage(STORAGE_KEYS.settings, {
      provider, modelId, temperature, topP, topK,
      contentFilter, webSearch, webSearchEngine, searxngUrl, customInstructions,
      sidebarCollapsed,
    });
  }, [
    provider, modelId, temperature, topP, topK,
    contentFilter, webSearch, webSearchEngine, searxngUrl, customInstructions,
    sidebarCollapsed,
  ]);

  const createThread = useCallback((_initialMessages?: Message[]) => {
    const msg = _initialMessages?.find(m => m.role === "user");
    createConvMutation.mutate({ initialMessage: msg?.content || "New chat" });
    return "pending";
  }, [createConvMutation]);

  const deleteThread = useCallback((id: string) => {
    deleteConvMutation.mutate({ id });
  }, [deleteConvMutation]);

  const renameThread = useCallback((id: string, title: string) => {
    renameConvMutation.mutate({ id, title });
  }, [renameConvMutation]);

  const togglePinThread = useCallback((id: string, isPinned: boolean) => {
    togglePinConvMutation.mutate({ id, isPinned });
  }, [togglePinConvMutation]);

  const toggleArchiveThread = useCallback((id: string, isArchived: boolean) => {
    toggleArchiveConvMutation.mutate({ id, isArchived });
  }, [toggleArchiveConvMutation]);

  const selectThread = useCallback((id: string) => {
    setActiveThreadId(id);
    setSidebarOpen(false);
    saveToStorage(STORAGE_KEYS.activeThread, id);
  }, []);

  const addMessage = useCallback((msg: Message, threadId?: string) => {
    const targetId = threadId || activeThreadId;
    if (!targetId || msg.role !== "user") return;
    addMsgMutation.mutate({ conversationId: targetId, content: msg.content });
  }, [activeThreadId, addMsgMutation]);

  const deleteAllData = useCallback(() => {
    if (window.confirm("Delete all conversations? This cannot be undone.")) {
      setActiveThreadId(null);
      localStorage.clear();
      refetchConversations();
    }
  }, [refetchConversations]);

  const editMessage = useCallback((msgId: string) => {
    if (!activeThreadId || !activeConversation) return;
    const msgs = activeConversation.messages || [];
    const idx = msgs.findIndex((m: { id: string }) => m.id === msgId);
    if (idx === -1) return;
    setPendingEditContent(msgs[idx].content);
  }, [activeThreadId, activeConversation]);

  const clearPendingEdit = useCallback(() => setPendingEditContent(null), []);

  return (
    <ChatContext.Provider
      value={{
        threads, activeThreadId,
        sidebarOpen, setSidebarOpen,
        sidebarCollapsed, setSidebarCollapsed,
        activeThread,
        createThread, deleteThread, selectThread,
        renameThread, togglePinThread, toggleArchiveThread,
        addMessage,
        isStreaming, setIsStreaming,

        provider, setProvider,
        apiKey, setApiKey,
        baseUrl, setBaseUrl,
        modelId, setModelId,
        temperature, setTemperature,
        topP, setTopP,
        topK, setTopK,
        contentFilter, setContentFilter,
        webSearch, setWebSearch,
        webSearchEngine, setWebSearchEngine,
        searxngUrl, setSearxngUrl,
        customInstructions, setCustomInstructions,

        deleteAllData, saveSettings,
        loaded,
        editMessage, pendingEditContent, clearPendingEdit,
        refetchConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
