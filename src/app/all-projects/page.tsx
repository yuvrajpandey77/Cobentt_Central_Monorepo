"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarProvider, useSidebar } from "@/contexts/sidebar-context";
import { ProjectCard, ProjectCardSkeleton } from "@/components/project-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
    Code2, 
    Plus, 
    Search, 
    Filter, 
    Grid3X3, 
    List, 
    Calendar,
    Clock,
    FolderOpen,
    Loader2,
    Trash2,
    Edit,
    Eye,
    MoreHorizontal
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AllProjectsContent = () => {
    const { isCollapsed } = useSidebar();
    const trpc = useTRPC();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    
    const { data: projects, isLoading, error } = useQuery(
        trpc.projects.getMany.queryOptions()
    );

    const queryClient = useQueryClient();

    const [renameTarget, setRenameTarget] = useState<any>(null);
    const [renameValue, setRenameValue] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<any>(null);

    const renameMutation = useMutation(trpc.projects.rename.mutationOptions({
        onSuccess: () => {
            queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
            toast.success("Project renamed");
            setRenameTarget(null);
        },
        onError: (err) => toast.error(err.message || "Failed to rename"),
    }));

    const togglePinMutation = useMutation(trpc.projects.togglePin.mutationOptions({
        onSuccess: () => {
            queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
        },
        onError: (err) => toast.error(err.message || "Failed to update pin"),
    }));

    const deleteMutation = useMutation(trpc.projects.delete.mutationOptions({
        onSuccess: () => {
            queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
            toast.success("Project deleted");
            setDeleteTarget(null);
        },
        onError: (err) => toast.error(err.message || "Failed to delete"),
    }));

    // Filter projects based on search query
    const filteredProjects = projects?.filter((project: any) =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.messages.some((message: any) => 
            message.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
    ) ?? [];

    const ProjectGridView = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProjects.map((project: any) => (
                <ProjectCard
                    key={project.id}
                    project={project}
                    onRename={(id, name) => { setRenameTarget(project); setRenameValue(name); }}
                    onTogglePin={(id) => togglePinMutation.mutate({ projectId: id })}
                    onDelete={(id) => setDeleteTarget(project)}
                />
            ))}
        </div>
    );

    const ProjectListView = () => (
        <div className="space-y-4">
            {filteredProjects.map((project: any) => {
                const latestMessage = project.messages[0];
                const previewText = latestMessage?.content?.slice(0, 200) + "..." || "No description available";
                const isSmartContract = project.projectType === 'SMART_CONTRACT' || project.contractType;
                
                return (
                    <Card key={project.id} className="group hover:shadow-lg transition-all duration-200 ease-out bg-white/10 backdrop-blur-sm border-white/20 hover:border-white/40 focus-within:ring-2 focus-within:ring-white/20">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Link href={isSmartContract ? `/projects/${project.id}/build` : `/projects/${project.id}`}>
                                            <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors duration-200 ease-out cursor-pointer">
                                                {project.name}
                                            </h3>
                                        </Link>
                                        <Badge variant="secondary" className="bg-white/20 text-white/90 border-white/30">
                                            <Code2 className="w-3 h-3 mr-1" />
                                            {isSmartContract ? 'Contract' : 'Project'}
                                        </Badge>
                                    </div>
                                    
                                    <p className="text-sm text-white/80 mb-4 line-clamp-2">
                                        {previewText}
                                    </p>
                                    
                                    <div className="flex items-center gap-4 text-xs text-white/60">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            <span>Created {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>Updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <FolderOpen className="w-3 h-3" />
                                            <span>{project.messages.length} message{project.messages.length !== 1 ? 's' : ''}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2 ml-4">
                                    <Link href={isSmartContract ? `/projects/${project.id}/build` : `/projects/${project.id}`}>
                                        <Button variant="ghost" size="sm" className="text-white/60 hover:text-black hover:bg-white/20 transition-all duration-200 ease-out focus:ring-2 focus:ring-white/20 focus:outline-none">
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </Link>
                                    <Button variant="ghost" size="sm" className="text-white/60 hover:text-black hover:bg-white/20 transition-all duration-200 ease-out focus:ring-2 focus:ring-white/20 focus:outline-none">
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-white/60 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200 ease-out focus:ring-2 focus:ring-red-400/20 focus:outline-none">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );

    return (
        <>
        <div className="min-h-screen flex">
            {/* Sidebar */}
            <Sidebar className="hidden lg:block fixed left-0 top-0 h-screen z-50" />
            
            {/* Main Content */}
            <div className={cn(
                "flex-1 transition-all duration-500 ease-in-out",
                isCollapsed ? "lg:ml-[52px]" : "lg:ml-[240px]"
            )}>
                <Header />
                
                {/* Page Header */}
                <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-2">
                                    My Projects
                                </h1>
                                <p className="text-white/80">
                                    Manage and view all your Cobentt projects
                                </p>
                            </div>
                            
                            <Link href="/">
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Project
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Controls Section */}
                <div className="bg-black/10 backdrop-blur-sm border-b border-white/10">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex items-center justify-between gap-4">
                            {/* Search */}
                            <div className="flex-1 max-w-md">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search projects..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ease-out hover:border-white/30"
                                    />
                                </div>
                            </div>
                            
                            {/* View Mode Toggle */}
                            <div className="flex items-center gap-2">
                                <Button
                                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('grid')}
                                    className={cn(
                                        viewMode === 'grid' 
                                            ? 'bg-blue-600 text-white' 
                                            : 'text-white/60 hover:text-black hover:bg-white/20 transition-all duration-200 ease-out focus:ring-2 focus:ring-blue-500/20 focus:outline-none'
                                    )}
                                >
                                    <Grid3X3 className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('list')}
                                    className={cn(
                                        viewMode === 'list' 
                                            ? 'bg-blue-600 text-white' 
                                            : 'text-white/60 hover:text-black hover:bg-white/20 transition-all duration-200 ease-out focus:ring-2 focus:ring-blue-500/20 focus:outline-none'
                                    )}
                                >
                                    <List className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Projects Content */}
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <ProjectCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Code2 className="w-8 h-8 text-red-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-white/80 mb-2">
                                Error loading projects
                            </h3>
                            <p className="text-white/60 mb-4">
                                There was a problem loading your projects. Please try again.
                            </p>
                            <Button 
                                onClick={() => window.location.reload()} 
                                variant="outline"
                                className="border-white/20 text-white hover:bg-white/20 hover:text-black"
                            >
                                Retry
                            </Button>
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FolderOpen className="w-8 h-8 text-white/40" />
                            </div>
                            <h3 className="text-xl font-semibold text-white/80 mb-2">
                                {searchQuery ? 'No projects found' : 'No projects yet'}
                            </h3>
                            <p className="text-white/60 mb-6">
                                {searchQuery 
                                    ? `No projects match "${searchQuery}". Try a different search term.`
                                    : 'Create your first project to get started with Cobentt!'
                                }
                            </p>
                            {!searchQuery && (
                                <Link href="/">
                                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create Your First Project
                                    </Button>
                                </Link>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Projects Stats */}
                            <div className="mb-6">
                                <p className="text-white/60 text-sm">
                                    Showing {filteredProjects.length} of {projects?.length || 0} projects
                                    {searchQuery && ` matching "${searchQuery}"`}
                                </p>
                            </div>
                            
                            {/* Projects Display */}
                            {viewMode === 'grid' ? <ProjectGridView /> : <ProjectListView />}
                        </>
                    )}
                </div>
            </div>
        </div>

        {/* Rename Dialog */}
        <Dialog open={!!renameTarget} onOpenChange={(open) => { if (!open) setRenameTarget(null); }}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Rename Project</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); if (renameValue.trim()) renameMutation.mutate({ projectId: renameTarget?.id, name: renameValue.trim() }); }}>
                    <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-black/40 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-white"
                        placeholder="Project name"
                        maxLength={255}
                    />
                    <DialogFooter className="mt-4">
                        <Button type="button" variant="ghost" onClick={() => setRenameTarget(null)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!renameValue.trim() || renameMutation.isPending}>
                            {renameMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Project</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete <span className="font-semibold text-white">{deleteTarget?.name}</span>? This action cannot be undone. All messages, files, and data will be permanently removed.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => deleteMutation.mutate({ projectId: deleteTarget?.id })}
                        disabled={deleteMutation.isPending}
                    >
                        {deleteMutation.isPending ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
    );
};

const AllProjectsPage = () => {
    return (
        <SidebarProvider>
            <AllProjectsContent />
        </SidebarProvider>
    );
};

export default AllProjectsPage;
