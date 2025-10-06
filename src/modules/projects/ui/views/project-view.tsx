"use client";

import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { MessagesContainer } from "@/modules/projects/ui/components/messages-container";
import { Suspense, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Fragment } from "@/generated/prisma";
import { ProjectHeader } from "../components/project-header";
import { FragmentWeb } from "../components/fragment-web";
import { CodeIcon, CrownIcon, EyeIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileExplorer } from "@/components/file-explorer";
import { UserControl } from "@/components/user-control";
import { ErrorBoundary } from "react-error-boundary";

interface Props {
    projectId: string;
}

export const ProjectView = ({ projectId }: Props) => {
    const [activeFragment, setActiveFragment] = useState<Fragment | null>(null);

    const [tabsState, setTabsState] = useState<"preview" | "code">("preview");
    // const trpc = useTRPC();
    // const {data: project} = useSuspenseQuery(trpc.projects.getOne.queryOptions({ id: projectId }));
    return (
        <div className="h-screen">
            <ResizablePanelGroup direction="horizontal">
                <ResizablePanel
                    defaultSize={35}
                    minSize={20}
                    className="flex flex-col min-h-0"
                >
                    <ErrorBoundary fallback={<div>Error loading project...</div>}>
                        <Suspense fallback={<div>Loading project...</div>}>
                            <ProjectHeader projectId={projectId} />
                        </Suspense>
                    </ErrorBoundary>
                    <ErrorBoundary fallback={<div>Error loading messages...</div>}>
                    <Suspense fallback={<div>Loading messages...</div>}>
                        <MessagesContainer
                            projectId={projectId}
                            activeFragment={activeFragment}
                            setActiveFragment={setActiveFragment}

                            />
                        </Suspense>
                    </ErrorBoundary>
                </ResizablePanel>

                <ResizableHandle className="hover:bg-primary trasition-colors" />
                <ResizablePanel
                    defaultSize={65}
                    minSize={50}


                >
                    <Tabs className="h-full gap-y-0 "
                        defaultValue="preview"
                        value={tabsState}
                        onValueChange={(value) => setTabsState(value as "preview" | "code")}
                    >
                        <div className="w-full flex items-center p-2 border-b bg-sidebar">
                            <TabsList className="h-10 p-1 border rounded-md w-auto">
                                <TabsTrigger value="preview" className="rounded-md h-8 px-3 flex items-center gap-2">
                                    <EyeIcon className="h-4 w-4" />
                                    <span>Demo</span>
                                </TabsTrigger>
                                <TabsTrigger value="code" className="rounded-md h-8 px-3 flex items-center gap-2">
                                    <CodeIcon className="h-4 w-4" />
                                    <span>Code</span>
                                </TabsTrigger>
                            </TabsList>
                            <div className="ml-auto flex items-center gap-x-2">
                                <Button asChild variant="tertiary" size="sm" className="flex items-center gap-2  text-white px-4 py-2 min-w-[100px]">
                                    <Link href="/pricing" className="flex items-center gap-2 w-full justify-center">
                                        <CrownIcon className="h-4 w-4" />
                                        <span className="font-medium">Upgrade</span>
                                    </Link>
                                </Button>

                            </div>
                            <div className="ml-2 gap-x-2 flex items-center">
                                <UserControl showName={false} />
                            </div>



                        </div>
                        <TabsContent value="preview">
                            {!!activeFragment && <FragmentWeb data={activeFragment} />}
                        </TabsContent>
                        <TabsContent value="code" className="min-h-0">
                            {!!activeFragment?.files && (
                                <FileExplorer
                                    files={activeFragment.files as { [path: string]: string }} />
                            )}
                        </TabsContent>

                    </Tabs>

                </ResizablePanel>

            </ResizablePanelGroup>

        </div>
    )
}