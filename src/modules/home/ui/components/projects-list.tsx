"use client";

import Link from "next/link";
import Image from "next/image";
import {formatDistanceToNow} from "date-fns";
import { useTRPC } from "@/trpc/client";
import {useQuery} from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";

export const ProjectsList = () => {
    const {user} = useUser();
    const trpc = useTRPC();
    const {data: projects} = useQuery(trpc.projects.getMany.queryOptions());
    if (!user) {
        return null;
    }
    return (
        <div className="w-full bg-card/50 backdrop-blur-sm rounded-2xl p-8 border border-border/50 shadow-lg">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-semibold">{user?.firstName}&apos;s Projects</h2>
                <div className="text-sm text-muted-foreground">
                    {projects?.length || 0} project{projects?.length !== 1 ? 's' : ''}
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects?.length === 0 && (
                    <div className="col-span-full text-center py-12">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">🚀</span>
                        </div>
                        <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Start building your first project using the form above
                        </p>
                    </div>
                )}
                
                {projects?.map((project) => (
                    <div
                        key={project.id}
                        className="group relative bg-card/50 hover:bg-card border border-border/50 hover:border-primary/50 rounded-xl p-6 transition-all duration-200 hover:shadow-lg cursor-pointer"
                    >
                        <Link href={`/projects/${project.id}`} className="block">
                            <div className="flex items-start gap-4">
                                <div className="relative">
                                    <div className="w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
                                        <Image
                                            src="/cogerpherelogoonly.png"
                                            alt="Cogerphere AI"
                                            width={24}
                                            height={24}
                                            className="object-contain"
                                        />
                                    </div>
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-card"></div>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-lg mb-1 truncate group-hover:text-primary transition-colors">
                                        {project.name}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Updated {formatDistanceToNow(project.updatedAt, {addSuffix: true})}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span>Active</span>
                                    </div>
                                </div>
                                
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="text-primary text-xs">→</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    )


}
