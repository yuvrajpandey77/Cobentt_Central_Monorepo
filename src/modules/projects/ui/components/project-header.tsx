import Link from "next/link";
import Image from "next/image";
import {useTheme} from "next-themes";
import {useSuspenseQuery} from "@tanstack/react-query";
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    EditIcon,
    SunMoonIcon,
    ChevronDownIcon,
} from "lucide-react";

import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";


interface Props {
    projectId: string;
}

export const ProjectHeader = ({ projectId }: Props) => {
    const trpc = useTRPC();
    const {data: project} = useSuspenseQuery(trpc.projects.getOne.queryOptions({ id: projectId }));
    
    const {theme, setTheme} = useTheme();
   
   
    return (
    <header className="p-3 flex justify-between items-center border-b">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="focus-visible:ring-0 hover:bg-transparent hover:opacity-75 transition-opacity pl-2">
                    <Image src="/cogerpherelogoonly.png" alt="Cogerphere AI" width={32} height={32} className="rounded-lg" /> 
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
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2">
                        <SunMoonIcon className="size-4 text-muted-foreground" />
                        <span>Theme</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                            <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                                <DropdownMenuRadioItem value="light">
                                    <span> 
                                        Light
                                    </span>
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="dark">
                                    <span> 
                                        Dark
                                    </span>
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="system">
                                    <span> 
                                        System
                                    </span>
                                </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>
              </DropdownMenuContent>
        </DropdownMenu>
    </header>
    )
    
}