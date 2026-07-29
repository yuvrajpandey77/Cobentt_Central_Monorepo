"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Archive, ChevronDown } from "lucide-react";

export interface SectionConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
  collapsible?: boolean;
}

const defaultSections: SectionConfig[] = [
  { id: "recent", label: "Recent", icon: <Clock className="w-3 h-3" />, collapsible: false },
  { id: "archive", label: "Archive", icon: <Archive className="w-3 h-3" />, defaultOpen: false, collapsible: true },
];

interface SidebarSectionsProps {
  children?: React.ReactNode;
  sections?: SectionConfig[];
  archiveContent?: React.ReactNode;
}

export function SidebarSections({ children, sections = defaultSections, archiveContent }: SidebarSectionsProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    sections.forEach((s) => { if (s.defaultOpen) initial.add(s.id); });
    return initial;
  });

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-0.5">
      {sections.map((section) => {
        const isOpen = openSections.has(section.id);

        return (
          <div key={section.id}>
            {section.collapsible !== false && (
              <button
                onClick={() => toggleSection(section.id)}
                className="flex items-center gap-2 w-full h-9 px-3 rounded-lg hover:bg-card/40 transition-all duration-150"
              >
                <motion.div
                  animate={{ rotate: isOpen ? 0 : -90 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-2.5 h-2.5 text-muted-foreground" />
                </motion.div>
                <span className="text-muted-foreground">{section.icon}</span>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {section.label}
                </span>
                {section.count !== undefined && (
                  <span className="text-[9px] text-muted-foreground ml-auto">{section.count}</span>
                )}
              </button>
            )}

            {!section.collapsible && (
              <div className="flex items-center gap-2 h-9 px-3">
                <span className="text-muted-foreground">{section.icon}</span>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {section.label}
                </span>
              </div>
            )}

            <AnimatePresence initial={false}>
              {(isOpen || !section.collapsible) && (
                <motion.div
                  key={section.id}
                  initial={section.collapsible !== false ? { height: 0, opacity: 0 } : undefined}
                  animate={section.collapsible !== false ? { height: "auto", opacity: 1 } : undefined}
                  exit={section.collapsible !== false ? { height: 0, opacity: 0 } : undefined}
                  transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                  className={section.collapsible !== false ? "overflow-hidden" : undefined}
                >
                  <div className="pb-0.5">
                    {section.id === "recent" && children}
                    {section.id === "archive" && archiveContent}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
