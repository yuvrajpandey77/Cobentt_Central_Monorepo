"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Code2, ExternalLink, Zap, Play, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    projectType?: string;
    contractType?: string;
    messages: Array<{
      id: string;
      content: string;
      role: string;
      type: string;
    }>;
  };
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const latestMessage = project.messages[0];
  const previewText = latestMessage?.content?.slice(0, 120) + "..." || "No description available";
  const isSmartContract = 
    project.projectType === 'DAPP' || 
    project.projectType === 'SMART_CONTRACT' || 
    Boolean(project.contractType);

  if (isSmartContract) {
    // Smart Contract Card - Enhanced attractive design
    return (
      <Card className="group hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 ease-out hover:scale-[1.02] bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm border border-slate-700/50 hover:border-blue-500/50 h-[16rem] w-full flex flex-col overflow-hidden p-0 rounded-2xl focus-within:ring-2 focus-within:ring-blue-500/30">
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
              <Button size="sm" className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 text-white border border-blue-400/40 hover:border-blue-400/60 backdrop-blur-sm transition-all duration-200 ease-out shadow-lg">
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
          
          {/* Enhanced Action Button */}
          <div className="mt-auto">
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
          </div>
        </div>
      </Card>
    );
  }

  // Web App Card - Taller rectangle with screenshot background and overlay content
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 ease-out hover:scale-[1.02] bg-transparent backdrop-blur-sm border-white/10 hover:border-white/30 h-[15.4rem] w-full flex flex-col overflow-hidden p-0 rounded-xl focus-within:ring-2 focus-within:ring-white/20">
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
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out flex items-center justify-center">
          <Link href={`/projects/${project.id}`}>
            <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50 backdrop-blur-sm transition-all duration-200 ease-out">
              <Eye className="w-3 h-3 mr-1" />
              View Project
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
};

export const ProjectCardSkeleton: React.FC = () => {
  return (
    <div className="group hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 ease-out hover:scale-[1.02] bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm border border-slate-700/50 hover:border-blue-500/50 h-[16rem] w-full flex flex-col overflow-hidden p-0 rounded-2xl">
      {/* Top Section - Enhanced Code Preview */}
      <div className="relative w-full h-28 bg-gradient-to-br from-blue-900/30 via-slate-800/40 to-purple-900/30 border-b border-slate-600/30">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <Skeleton className="w-20 h-4 rounded-md" />
          </div>
        </div>
      </div>

      {/* Bottom Section - Enhanced Content */}
      <div className="flex-1 flex flex-col p-5 bg-gradient-to-b from-slate-800/50 to-slate-900/50">
        {/* Title */}
        <Skeleton className="h-5 w-full mb-4 flex-1" />
        
        {/* Enhanced Action Button */}
        <div className="mt-auto">
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
};
