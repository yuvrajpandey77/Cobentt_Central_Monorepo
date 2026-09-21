"use client";

import { Card, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Code2, Zap, Eye, Copy, Loader2, MoreHorizontal, Pin, PinOff, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    isPinned?: boolean;
    projectType?: string;
    contractType?: string;
    contractAddress?: string;
    messages: Array<{
      id: string;
      content: string;
      role: string;
      type: string;
    }>;
  };
  showCopyButton?: boolean;
  onCopy?: (projectId: string) => void;
  isCopying?: boolean;
  onRename?: (projectId: string, currentName: string) => void;
  onTogglePin?: (projectId: string) => void;
  onDelete?: (projectId: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, showCopyButton, onCopy, isCopying, onRename, onTogglePin, onDelete }) => {
  const isSmartContract = 
    project.projectType === 'DAPP' || 
    project.projectType === 'SMART_CONTRACT' || 
    Boolean(project.contractType);

  if (isSmartContract) {
    // Smart Contract Card - Enhanced attractive design
    return (
      <Card className="group hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 ease-out hover:scale-[1.02] bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm border border-slate-700/50 hover:border-blue-500/50 h-[16rem] w-full flex flex-col overflow-hidden p-0 rounded-2xl focus-within:ring-2 focus-within:ring-blue-500/30 relative">
        {/* Three-dot menu */}
        {(onRename || onTogglePin || onDelete) && (
          <div className="absolute top-2 right-2 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-7 w-7 rounded-lg border border-white/10 bg-black/40 hover:bg-white/10 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none backdrop-blur-sm">
                  <MoreHorizontal className="h-3.5 w-3.5 text-white/70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom" className="w-40">
                {onRename && (
                  <DropdownMenuItem onClick={() => onRename(project.id, project.name)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Rename
                  </DropdownMenuItem>
                )}
                {onTogglePin && (
                  <DropdownMenuItem onClick={() => onTogglePin(project.id)}>
                    {project.isPinned ? (
                      <><PinOff className="h-3.5 w-3.5 mr-2" /> Unpin</>
                    ) : (
                      <><Pin className="h-3.5 w-3.5 mr-2" /> Pin</>
                    )}
                  </DropdownMenuItem>
                )}
                {(onRename || onTogglePin) && onDelete && <DropdownMenuSeparator />}
                {onDelete && (
                  <DropdownMenuItem
                    className="text-red-400 focus:text-red-400"
                    onClick={() => onDelete(project.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        {/* Top Section - Enhanced Code Preview */}
        <div className="relative w-full h-28 bg-gradient-to-br from-blue-900/30 via-slate-800/40 to-purple-900/30 border-b border-slate-600/30">
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-2 left-2 w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="absolute top-4 right-3 w-1 h-1 bg-purple-400 rounded-full animate-pulse delay-100"></div>
            <div className="absolute bottom-3 left-4 w-1 h-1 bg-cyan-400 rounded-full animate-pulse delay-200"></div>
          </div>
          
          {/* Enhanced Code Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600/40 to-purple-600/40 rounded-xl flex items-center justify-center border border-blue-500/30 shadow-lg shadow-blue-500/20">
                <Code2 className="w-5 h-5 text-blue-300" />
              </div>
              <div className="text-center">
                <span className="text-xs font-mono text-blue-300/80 bg-slate-800/50 px-2 py-1 rounded-md border border-slate-600/30">
                  contract.sol
                </span>
              </div>
            </div>
          </div>
          
          {/* Enhanced hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out flex items-center justify-center">
            <Link href={`/projects/${project.id}/build`}>
              <Button size="sm" className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 text-white hover:text-black border border-blue-400/40 hover:border-blue-400/60 backdrop-blur-sm transition-all duration-200 ease-out shadow-lg">
                <Eye className="w-3 h-3 mr-1" />
                View Project
              </Button>
            </Link>
          </div>
        </div>

        {/* Bottom Section - Enhanced Content */}
        <div className="flex-1 flex flex-col p-5 bg-gradient-to-b from-slate-800/50 to-slate-900/50">
          {/* Title with enhanced styling */}
          <CardTitle className="text-base font-bold text-white group-hover:text-blue-300 transition-colors duration-200 ease-out line-clamp-2 text-left mb-4 flex-1 leading-tight">
            {project.name}
          </CardTitle>
          
          {/* Enhanced Action Button with Deployment Status */}
          <div className="mt-auto space-y-2">
            {/* Deployment Status */}
            {project.contractAddress ? (
              <div className="flex items-center justify-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                <span className="text-xs text-green-300 font-medium">Deployed</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5 px-2 py-1 rounded-md bg-orange-500/10 border border-orange-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                <span className="text-xs text-orange-300 font-medium">Not Deployed</span>
              </div>
            )}
            
            <Link href={`/projects/${project.id}/contract`}>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full h-9 text-sm font-medium bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/40 text-blue-300 hover:from-blue-500/30 hover:to-purple-500/30 hover:text-blue-200 hover:border-blue-400/60 transition-all duration-200 ease-out focus:ring-2 focus:ring-blue-500/30 focus:outline-none rounded-lg shadow-md hover:shadow-lg hover:shadow-blue-500/20"
              >
                <Zap className="w-4 h-4 mr-2" />
                Interact with Contract
              </Button>
            </Link>

            {showCopyButton && onCopy && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onCopy(project.id)}
                disabled={isCopying}
                className="w-full h-9 text-sm font-medium text-white/60 hover:text-blue-300 hover:bg-blue-500/10 border border-transparent hover:border-blue-400/30 transition-all duration-200 ease-out rounded-lg"
              >
                {isCopying ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                Use as Template
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // Web App Card - Taller rectangle with screenshot background and overlay content
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 ease-out hover:scale-[1.02] bg-transparent backdrop-blur-sm border-white/10 hover:border-white/30 h-[15.4rem] w-full flex flex-col overflow-hidden p-0 rounded-xl focus-within:ring-2 focus-within:ring-white/20 relative">
      {/* Three-dot menu */}
      {(onRename || onTogglePin || onDelete) && (
        <div className="absolute top-2 right-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-7 w-7 rounded-lg border border-white/10 bg-black/40 hover:bg-white/10 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none backdrop-blur-sm">
                <MoreHorizontal className="h-3.5 w-3.5 text-white/70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" className="w-40">
              {onRename && (
                <DropdownMenuItem onClick={() => onRename(project.id, project.name)}>
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  Rename
                </DropdownMenuItem>
              )}
              {onTogglePin && (
                <DropdownMenuItem onClick={() => onTogglePin(project.id)}>
                  {project.isPinned ? (
                    <><PinOff className="h-3.5 w-3.5 mr-2" /> Unpin</>
                  ) : (
                    <><Pin className="h-3.5 w-3.5 mr-2" /> Pin</>
                  )}
                </DropdownMenuItem>
              )}
              {(onRename || onTogglePin) && onDelete && <DropdownMenuSeparator />}
              {onDelete && (
                <DropdownMenuItem
                  className="text-red-400 focus:text-red-400"
                  onClick={() => onDelete(project.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      {/* Full Background Screenshot */}
      <div className="relative w-full h-full">
        <Image
          src={`/api/projects/${project.id}/screenshot`}
          alt={`${project.name} preview`}
          fill
          className="object-cover"
          unoptimized
        />
        
        {/* Subtle dark overlay on hover for better button visibility */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 ease-out" />
        
        {/* Content Overlay - Project Name in Bottom Left */}
        <div className="absolute inset-0 flex items-end p-4">
          <CardTitle className="text-lg font-semibold text-white transition-colors duration-200 ease-out line-clamp-2 text-left">
            {project.name}
          </CardTitle>
        </div>
        
        {/* Hover Overlay with Actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out flex flex-col items-center justify-center gap-3">
          <Link href={`/projects/${project.id}`}>
            <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50 backdrop-blur-sm transition-all duration-200 ease-out">
              <Eye className="w-3 h-3 mr-1" />
              View Project
            </Button>
          </Link>
          {showCopyButton && onCopy && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onCopy(project.id)}
              disabled={isCopying}
              className="bg-white/10 hover:bg-blue-500/20 text-white/80 hover:text-blue-300 border border-white/20 hover:border-blue-400/40 backdrop-blur-sm transition-all duration-200 ease-out"
            >
              {isCopying ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Copy className="w-3 h-3 mr-1" />
              )}
              Use as Template
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export const ProjectCardSkeleton: React.FC = () => {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
      <Skeleton className="h-8 w-full rounded-lg" />
    </div>
  );
};
