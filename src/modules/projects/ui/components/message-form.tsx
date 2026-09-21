import { z } from "zod";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import TextareaAutosize from "react-textarea-autosize";
import { SendIcon, Loader2Icon, Zap } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Form, FormField } from "@/components/ui/form";
import { toast } from "sonner";
import { TokenCounter } from "@/components/token-counter";
import { estimateTokens } from "@/lib/token-estimator";



interface Props {
    projectId: string;
}

const formSchema = z.object({
    value: z.string().min(1, { message: "Value is required" }).max(10000, { message: "Value must be less than 10000 characters" }),
});




export const MessageForm = ({ projectId }: Props) => {

    

    const queryClient = useQueryClient();
    const trpc = useTRPC();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            value: "",
        },
    });

    const createMessage = useMutation(trpc.messages.create.mutationOptions({
        onSuccess: () => {
            form.reset();
            queryClient.invalidateQueries(trpc.messages.getMany.queryOptions({
                projectId: projectId,
            }));
            // Invalidate usage queries to refresh quota display
            queryClient.invalidateQueries({ queryKey: trpc.usage.quotaStatus.queryKey() });
            queryClient.invalidateQueries({ queryKey: trpc.usage.projectTotals.queryKey({ projectId }) });
        },
        onError: (error) => {
            // Show error toast for quota exceeded or other errors
            if (error.message.includes("quota") || error.message.includes("limit")) {
                toast.error(error.message, {
                    description: "Consider upgrading your plan for higher limits",
                    duration: 5000,
                });
            } else {
                toast.error(error.message);
            }
        },
    }))

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        await createMessage.mutateAsync({
            value: values.value,
            projectId: projectId,
        });
      
    }

    const [isFocused, setIsFocused] = useState(false);
    const watchValue = form.watch("value");
    const estimatedTokens = useMemo(() => estimateTokens(watchValue || ""), [watchValue]);
    const isPending = createMessage.isPending;
    const isButtonDisabled = isPending || !form.formState.isValid;
    
    return (
        <Form {...form}>
            <div className="space-y-2">
                {/* Token Counter Bar */}
                <TokenCounter projectId={projectId} variant="bar" />

                <form onSubmit={form.handleSubmit(onSubmit)} className={cn(
                    "relative border p-4 pt-1 rounded-xl bg-sidebar dark:bg-sidebar transition-all",
                    isFocused && "shadow-xs"
                )}>
                    <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                        <TextareaAutosize
                            {...field}
                            disabled={isPending}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            minRows={2}
                            maxRows={8}
                            className="pt-4 resize-none border-none w-full outline-none bg-transparent"
                            placeholder="What would you like to Build?"
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault();
                                    form.handleSubmit(onSubmit)(e);
                                }
                            }}
                        />
                    )}
                />
                <div className="flex gap-x-2 items-end justify-between pt-2">
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
                        {watchValue && (
                            <span className="flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                ~{estimatedTokens} token{estimatedTokens !== 1 ? 's' : ''}
                            </span>
                        )}
                        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-mono font-medium text-muted-foreground ">
                            Ctrl + Enter
                        </kbd>
                        &nbsp; to submit
                    </div>
                    <Button 
                    disabled={isButtonDisabled}
                    className={cn(
                        "size-8 rounded-full",
                        isButtonDisabled && "bg-muted-foreground border"
                    )}
                    >
                    {isPending ? (
                        <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                        <SendIcon />
                    )}
                    
                    </Button>
                </div>
            </form>
            </div>
        </Form>
    )
}
