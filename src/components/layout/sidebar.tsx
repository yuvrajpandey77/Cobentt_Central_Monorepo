"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen, Search, Layout, Clock, PanelLeft, PanelLeftClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/sidebar-context";
import { Skeleton } from "@/components/ui/skeleton";

interface SidebarProps {
  className?: string;
}

export const Sidebar = ({ className }: SidebarProps) => {
  const { user } = useUser();
  const trpc = useTRPC();
  const { data: projects, isLoading } = useQuery(trpc.projects.getMany.queryOptions());
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProjects = useMemo(() => {
    if (!projects) return [] as any[];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return projects as any[];
    return (projects as any[]).filter((project: any) => {
      const nameMatch = project.name?.toLowerCase().includes(query);
      const messageMatch = project.messages?.some((m: any) =>
        m?.content?.toLowerCase().includes(query)
      );
      return nameMatch || messageMatch;
    });
  }, [projects, searchQuery]);

  if (!user) {
    return null;
  }

  return (
    <div className={cn(
      "bg-gradient-to-b from-card/60 via-card/40 to-card/60 backdrop-blur-xl border-r border-border/30 shadow-2xl transition-all duration-500 ease-in-out relative overflow-hidden",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/20 via-transparent to-secondary/20"></div>
        <div className="absolute top-10 right-4 w-20 h-20 bg-primary/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 left-4 w-16 h-16 bg-secondary/10 rounded-full blur-xl"></div>
      </div>

      <div className="px-3 py-4 h-full flex flex-col relative z-10 overflow-x-hidden">
        {/* Header */}
        <div className={cn(
          "flex items-center mb-6 flex-shrink-0",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                {user?.firstName || user?.emailAddresses[0]?.emailAddress || 'User'}'s Projects
              </h2>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="h-8 w-8 p-0 hover:bg-primary/10 hover:scale-110 transition-all duration-300 rounded-lg flex-shrink-0"
          >
            {isCollapsed ? (
              <PanelLeft className="h-4 w-4 text-primary" />
            ) : (
              <PanelLeftClose className="h-4 w-4 text-primary" />
            )}
          </Button>
        </div>

        {/* Search and Navigation */}
        {!isCollapsed && (
          <div className="space-y-3 mb-6 flex-shrink-0">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm bg-card/40 border border-border/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-300 backdrop-blur-sm"
              />
            </div>

            {/* Navigation Buttons */}
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start text-left h-9 px-3 hover:bg-primary/10 hover:text-primary transition-all duration-300"
              >
                <Layout className="w-4 h-4 mr-2" />
                Templates
              </Button>
              
              <Link href="/all-projects">
                <Button
                  variant="ghost"
                  className="w-full justify-between text-left h-9 px-3 hover:bg-primary/10 hover:text-primary transition-all duration-300"
                >
                  <div className="flex items-center">
                    <FolderOpen className="w-4 h-4 mr-2" />
                    All Projects
                  </div>
                  <div className="text-xs text-muted-foreground bg-gradient-to-r from-primary/20 to-secondary/20 px-2 py-1 rounded-full border border-primary/20">
                    {projects?.length || 0}
                  </div>
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Projects List */}
        {!isCollapsed && (
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            {/* Recently Made Header */}
            <div className="flex items-center gap-2 mb-4 px-1">
              <Clock className="w-4 h-4 text-primary/60" />
              <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">
                Recently Made
              </h3>
            </div>

            <div 
              className="space-y-3 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar min-w-0"
            >
            {isLoading && (
              <div className="space-y-3 px-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-card/40 border border-border/20 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-6" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!isLoading && projects?.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <FolderOpen className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-sm font-medium mb-1 text-foreground">No projects yet</h3>
                <p className="text-xs text-muted-foreground">
                  Start building your first project
                </p>
              </div>
            )}
            
            {!isLoading && projects && filteredProjects.length === 0 && searchQuery && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No results for "{searchQuery}"
              </div>
            )}

            {!isLoading && filteredProjects?.map((project: any, index: number) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="bg-gradient-to-r from-card/40 via-card/30 to-card/40 hover:from-card/60 hover:via-card/50 hover:to-card/60 border border-border/20 hover:border-primary/40 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.02] backdrop-blur-sm p-3 min-w-0">
                  <div className="flex flex-col gap-1 min-w-0">
                    <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors duration-300 min-w-0">
                      {project.name}
                    </h3>
                    <div className="text-xs text-muted-foreground truncate min-w-0">
                      <span>{formatDistanceToNow(new Date(project.updatedAt), { addSuffix: false })}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            </div>
          </div>
        )}

        {/* Create New Project Button */}
        {!isCollapsed && (
          <div className="mt-auto pt-4 border-t border-border/20 flex-shrink-0">
            <Button 
              className="w-full bg-gradient-to-r from-primary/20 via-primary/15 to-secondary/20 hover:from-primary/30 hover:via-primary/25 hover:to-secondary/30 text-primary border border-primary/30 hover:border-primary/50 shadow-lg hover:shadow-primary/20 transition-all duration-300 hover:scale-[1.02] backdrop-blur-sm"
              size="sm"
            >
              <Plus className="w-3.5 h-3.5 mr-2" />
              New Project
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
