import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MessageCard } from "./message-card";
import { MessageForm } from "./message-form";
import { useEffect, useRef } from "react";
import { Fragment } from "@/generated/prisma";
import { MessageLoading } from "./message-loading";


interface Props {
    projectId: string;
    activeFragment: Fragment | null;
    setActiveFragment: (fragments: Fragment | null) => void;
}

export const MessagesContainer = ({ projectId, activeFragment, setActiveFragment }: Props) => {
    const trpc = useTRPC();
    const bottomRef = useRef<HTMLDivElement>(null);
    const lastAssistantMessageIdRef = useRef<string | null>(null);
    const {data: messages} = useSuspenseQuery(trpc.messages.getMany.queryOptions({ projectId: projectId },
        // temporary refetch interval
        {  refetchInterval: 5000 }));


       // automatic latest code gragment selector 
       useEffect(() => {
        const lastAssistantMessage = messages.findLast(
            (message) => message.role === "ASSISTANT"
        );

        if( 
            lastAssistantMessage?.fragments && 
            lastAssistantMessage.id !== lastAssistantMessageIdRef.current
        ){
            setActiveFragment(lastAssistantMessage.fragments);
            lastAssistantMessageIdRef.current = lastAssistantMessage.id;
        }
       },[messages, setActiveFragment]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);


    const lastMessage = messages[messages.length - 1];
    const isLastMessageUser = lastMessage.role === "USER";

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
                <MessageForm projectId={projectId} />
            </div>
           
        </div>
    )
}   