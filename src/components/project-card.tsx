"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Code2, ExternalLink, Zap, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
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
  const isSmartContract = project.projectType === 'SMART_CONTRACT' || project.contractType;

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 ease-out hover:scale-[1.02] bg-white/10 backdrop-blur-sm border-white/20 hover:border-white/40 h-[26rem] flex flex-col overflow-hidden p-0 rounded-2xl focus-within:ring-2 focus-within:ring-white/20">
      <Link href={isSmartContract ? `/projects/${project.id}/build` : `/projects/${project.id}`}>
        <div className="relative w-full flex-1 min-h-0 bg-black/30">
          <Image
            src={`/api/projects/${project.id}/screenshot`}
            alt={`${project.name} preview`}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      </Link>
      <div className="flex-shrink-0">
        <CardHeader className="py-0 px-3 -mt-2.5 text-left">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base font-semibold text-white group-hover:text-blue-300 transition-colors duration-200 ease-out line-clamp-2 text-left">
              {project.name}
            </CardTitle>
            <Badge variant="secondary" className="bg-white/20 text-white/90 border-white/30 flex-shrink-0">
              <Code2 className="w-3 h-3 mr-1" />
              {isSmartContract ? 'Contract' : 'Project'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-1 px-3 text-left">
          <p className="text-xs text-white/80 mb-2 line-clamp-1 text-left">
            {previewText}
          </p>
          
          {/* Contract Interaction Buttons */}
          {isSmartContract && (
            <div className="flex gap-1 mb-2">
              <Link href={`/projects/${project.id}/contract`}>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-6 px-2 text-xs bg-blue-500/20 border-blue-400/30 text-blue-300 hover:bg-blue-500/30 hover:text-blue-200 transition-all duration-200 ease-out focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                >
                  <Zap className="w-3 h-3 mr-1" />
                  Interact
                </Button>
              </Link>
              <Link href={`/projects/${project.id}/deploy`}>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-6 px-2 text-xs bg-green-500/20 border-green-400/30 text-green-300 hover:bg-green-500/30 hover:text-green-200 transition-all duration-200 ease-out focus:ring-2 focus:ring-green-500/20 focus:outline-none"
                >
                  <Play className="w-3 h-3 mr-1" />
                  Deploy
                </Button>
              </Link>
            </div>
          )}
          
          <div className="flex items-center justify-between text-xs text-white/60">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}</span>
            </div>
            <Link href={isSmartContract ? `/projects/${project.id}/build` : `/projects/${project.id}`}>
              <div className="flex items-center gap-1 group-hover:text-blue-300 transition-colors duration-200 ease-out cursor-pointer">
                <ExternalLink className="w-3 h-3" />
                <span>View</span>
              </div>
            </Link>
          </div>
        </CardContent>
      </div>
    </Card>
  );
};

export const ProjectCardSkeleton: React.FC = () => {
  return (
    <div>
      <div className="group hover:shadow-lg transition-all duration-300 hover:scale-105 bg-white/10 backdrop-blur-sm border-white/20 hover:border-white/40 h-[26rem] flex flex-col overflow-hidden p-0 rounded-lg">
        <div className="relative w-full flex-1 min-h-0 bg-black/30">
          <Skeleton className="absolute inset-0 h-full w-full" />
        </div>
        <div className="flex-shrink-0">
          <div className="py-2 px-6">
            <div className="flex items-start justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <div className="pt-0 pb-2 px-6 space-y-2">
            <Skeleton className="h-3 w-3/4" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
