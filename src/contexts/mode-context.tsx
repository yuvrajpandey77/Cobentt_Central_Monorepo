"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export const MODES = [
  { id: "chat", label: "Chat", icon: "MessageCircle" },
  { id: "website", label: "Website", icon: "Globe" },
  { id: "smart-contract", label: "Smart Contract", icon: "Code2" },
  { id: "slides", label: "Slides", icon: "Presentation" },
  { id: "document", label: "Docs", icon: "FileText" },
  { id: "deep-research", label: "Deep Research", icon: "Search" },
  { id: "sheet", label: "Sheet", icon: "FileSpreadsheet" },
] as const;

export type ModeId = (typeof MODES)[number]["id"];

interface ModeContextType {
  mode: ModeId;
  setMode: (mode: ModeId) => void;
  templateId: string;
  setTemplateId: (id: string) => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ModeId>("chat");
  const [templateId, setTemplateId] = useState<string>("");

  return (
    <ModeContext.Provider value={{ mode, setMode, templateId, setTemplateId }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error("useMode must be used within a ModeProvider");
  }
  return context;
}
