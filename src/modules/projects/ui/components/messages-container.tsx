import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MessageCard } from "./message-card";
import { MessageForm } from "./message-form";
import { useEffect, useRef } from "react";


interface Props {
    projectId: string;
}

export const MessagesContainer = ({ projectId }: Props) => {
    const trpc = useTRPC();
    const bottomRef = useRef<HTMLDivElement>(null);

    const {data: messages} = useSuspenseQuery(trpc.messages.getMany.queryOptions({ projectId: projectId }));

    useEffect(() => {
        const lastAssistantMessage = messages.findLast(
            (message) => message.role === "ASSISTANT"
        );

        if (lastAssistantMessage) {
            //set active fragment to last assistant message
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

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
                        isActiveFragment={false}
                        onFragmentClick={() => {}}
                        type={messages.type}
                        />
                    ))}
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