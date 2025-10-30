import Link from "next/link";
import Image from "next/image";
import {useSuspenseQuery} from "@tanstack/react-query";
import {
    ChevronLeftIcon,
    ChevronDownIcon,
    Zap,
    Play,
} from "lucide-react";

import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


interface Props {
    projectId: string;
}

export const ProjectHeader = ({ projectId }: Props) => {
    const trpc = useTRPC();
    const {data: project} = useSuspenseQuery(trpc.projects.getOne.queryOptions({ id: projectId }));
    
    const isSmartContract = project.projectType === 'SMART_CONTRACT' || project.contractType;
   
   
    return (
    <header className="p-3 flex justify-between items-center border-b">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="focus-visible:ring-0 hover:bg-transparent hover:opacity-75 transition-all duration-200 ease-out pl-2 focus:ring-2 focus:ring-primary/20 focus:outline-none">
                    <Image src="/cogerpherelogoonly.png" alt="Cogerphere AI" width={32} height={32} className="rounded-full" /> 
                    <span className="text-sm font-medium">{project.name}</span>
                    <ChevronDownIcon className="size-4" />
                </Button>
            </DropdownMenuTrigger>  
              <DropdownMenuContent side="bottom" align="start">
                <DropdownMenuItem asChild>
                    <Link href="/">
                    <ChevronLeftIcon className="size-4" />
                    <span>Dashboard</span>
                    </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Contract Interaction Buttons */}
        {isSmartContract && (
            <div className="flex gap-2">
                <Link href={`/projects/${projectId}/contract`}>
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="bg-blue-500/20 border-blue-400/30 text-blue-300 hover:bg-blue-500/30 hover:text-blue-200 transition-all duration-200 ease-out focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    >
                        <Zap className="w-4 h-4 mr-2" />
                        Interact
                    </Button>
                </Link>
                <Link href={`/projects/${projectId}/deploy`}>
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="bg-green-500/20 border-green-400/30 text-green-300 hover:bg-green-500/30 hover:text-green-200 transition-all duration-200 ease-out focus:ring-2 focus:ring-green-500/20 focus:outline-none"
                    >
                        <Play className="w-4 h-4 mr-2" />
                        Deploy
                    </Button>
                </Link>
            </div>
        )}
    </header>
    )
    
}