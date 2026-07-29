export type SidebarDataSource = "trpc" | "local";

export interface SidebarConversation {
  id: string;
  title: string;
  updatedAt: Date;
  isPinned: boolean;
  isArchived: boolean;
  mode?: string;
  messages?: { content: string; role: string }[];
  projectId?: string;
}

export interface SidebarProject {
  id: string;
  name: string;
  updatedAt: Date;
  isPinned: boolean;
  isArchived: boolean;
  projectType: string;
  messages?: { content: string; role: string }[];
}

export interface SidebarAdapter {
  dataSource: SidebarDataSource;
  conversations: SidebarConversation[];
  projects: SidebarProject[];
  isLoading: boolean;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
  onTogglePinChat: (id: string) => void;
  onToggleArchiveChat: (id: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onTogglePinProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  convRoute: (conv: SidebarConversation) => string;
}
