import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MessageCard } from "./message-card";
import { MessageForm } from "./message-form";
import { useEffect, useRef } from "react";
import { Fragment } from "@/generated/prisma";
import { MessageLoading } from "./message-loading";
import { BuildTimer } from "@/components/ui/build-timer";


interface Props {
    projectId: string;
    activeFragment: Fragment | null;
    setActiveFragment: (fragments: Fragment | null) => void;
    isReadOnly?: boolean;
}

export const MessagesContainer = ({ projectId, activeFragment, setActiveFragment, isReadOnly }: Props) => {
    const trpc = useTRPC();
    const bottomRef = useRef<HTMLDivElement>(null);
    const {data: messages} = useSuspenseQuery(trpc.messages.getMany.queryOptions({ projectId: projectId },
        // temporary refetch interval
        {  refetchInterval: 5000 }));


       const initialSelectDone = useRef(false);

       useEffect(() => {
        if (initialSelectDone.current) return;

        const assistantWithFragment = [...messages].reverse().find(
            (m) => m.role === "ASSISTANT" && m.fragments
        );

        if (assistantWithFragment?.fragments) {
            setActiveFragment(assistantWithFragment.fragments);
            initialSelectDone.current = true;
        }
       }, [messages, setActiveFragment]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);


    const lastMessage = messages[messages.length - 1];
    const isLastMessageUser = lastMessage.role === "USER";
    
    // Always show timer - it will show "Ready" when complete, "Building" when in progress
    const shouldShowTimer = true;
    const isCurrentlyBuilding = Boolean(isLastMessageUser || (activeFragment && !activeFragment.sandboxUrl));

    return (
        <div className="flex flex-col min-h-0 flex-1">
            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="pt-2 pr-1">
                    {messages.map((messages) => (
                        <MessageCard 
                        key={messages.id}
                        content={messages.content}
                        role={messages.role}
                        fragments={messages.fragments}
                        createdAt={messages.createdAt}
                        isActiveFragment={activeFragment?.id === messages.fragments?.id}
                        onFragmentClick={() => setActiveFragment(messages.fragments)}
                        type={messages.type}
                        />
                    ))}
                    {isLastMessageUser && <MessageLoading />}
                    <div ref={bottomRef} />
                </div>
            </div>
            <div className="relative p-3 pt-1">
                <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-b from-transparent to-background pointer-events-none">

                </div>
                {isReadOnly ? (
                    <div className="text-center text-sm text-text-tertiary py-4">
                        Sign in to use this project as a template
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-2">
                            <div />
                            {shouldShowTimer && <BuildTimer isBuilding={isCurrentlyBuilding} />}
                        </div>
                        <MessageForm projectId={projectId} />
                    </>
                )}
            </div>
           
        </div>
    )
}   