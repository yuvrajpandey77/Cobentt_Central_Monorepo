import { Fragment } from "@/generated/prisma";
import { ExternalLinkIcon, RefreshCcwIcon, Loader2, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { Hint } from "@/components/hint";






interface Props {
    data: Fragment;
    isRestoring?: boolean;
    onSandboxStateChange?: (isDead: boolean) => void;
}

export const FragmentWeb = ({ data, isRestoring = false, onSandboxStateChange }: Props) => {


    const [fragmentkey, setFragmentKey] = useState(0);
    const [copied, setCopied] = useState(false);
    const [isDead, setIsDead] = useState(false);
    const loadTimeoutRef = useRef<number | null>(null);

    const onRefresh = () => {
        setFragmentKey((prev) => prev + 1);
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(data.sandboxUrl);
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
        }, 2000);
    }

    // Start a load timeout on URL/key change. If iframe doesn't load in time, mark as dead.
    useEffect(() => {
        if (loadTimeoutRef.current) {
            window.clearTimeout(loadTimeoutRef.current);
            loadTimeoutRef.current = null;
        }
        setIsDead(false);
        loadTimeoutRef.current = window.setTimeout(() => {
            setIsDead(true);
        }, 6000);
        return () => {
            if (loadTimeoutRef.current) {
                window.clearTimeout(loadTimeoutRef.current);
                loadTimeoutRef.current = null;
            }
        };
    }, [fragmentkey, data.sandboxUrl]);

    // Notify parent when sandbox liveness changes
    useEffect(() => {
        if (typeof onSandboxStateChange === "function") {
            onSandboxStateChange(isDead);
        }
    }, [isDead, onSandboxStateChange]);


    return (
        <div className="relative flex flex-col h-full w-full">
            <div className="p-2 border-b bg-sidebar flex items-center gap-x-2">
                <Hint text="Refresh" side="bottom" align="start">          
                <Button variant="outline" size="sm" onClick={onRefresh}>
                    <RefreshCcwIcon />
                </Button>
                </Hint>

                <Hint text="Copy URL" side="bottom" align="start">
                    <Button variant="outline" size="sm" onClick={handleCopy} className="flex-1 justify-start text-start font-normal" disabled={!data.sandboxUrl || copied}>
                        <span className="truncate">
                            {data.sandboxUrl}
                        </span>
                    </Button>
                </Hint>

                <Hint text="Open in new tab" side="bottom" align="start">
                    <Button variant="outline" size="sm" disabled={!data.sandboxUrl} onClick={() => {
                        if (!data.sandboxUrl) return;
                        window.open(data.sandboxUrl, "_blank");
                    }}>
                        <ExternalLinkIcon />
                    </Button>
                </Hint>


            </div>
            <iframe
                key={fragmentkey}
                className="h-full w-full"
                sandbox="allow-scripts allow-forms allow-same-origin "
                loading="lazy"
                src={data.sandboxUrl}
                onLoad={() => {
                    if (loadTimeoutRef.current) {
                        window.clearTimeout(loadTimeoutRef.current);
                        loadTimeoutRef.current = null;
                    }
                    setIsDead(false);
                }}
                onError={() => {
                    if (loadTimeoutRef.current) {
                        window.clearTimeout(loadTimeoutRef.current);
                        loadTimeoutRef.current = null;
                    }
                    setIsDead(true);
                }}
            />
            {(isRestoring || isDead) && (
                <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md rounded-lg border bg-card shadow-sm p-6">
                        <div className="flex items-center gap-3">
                            {isRestoring ? (
                                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                            ) : (
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                            )}
                            <div>
                                <p className="text-sm font-medium">
                                    {isRestoring ? "Recreating sandbox" : "Sandbox not reachable"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {isRestoring
                                        ? "We’re provisioning a fresh environment and restoring your files."
                                        : "The previous sandbox expired. You can retry loading the preview."}
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 h-2 w-full overflow-hidden rounded bg-muted">
                            <div className={`h-full bg-primary ${isRestoring ? 'animate-[loading_1.2s_ease-in-out_infinite]' : 'animate-[loading_2s_ease-in-out_infinite]'}`} style={{ width: '50%' }} />
                        </div>

                        {!isRestoring && (
                            <div className="mt-4 flex items-center justify-end">
                                <Button variant="outline" size="sm" onClick={onRefresh}>
                                    Retry load
                                </Button>
                            </div>
                        )}

                        <div className="mt-6 space-y-3">
                            <Skeleton className="h-8 w-full" />
                            <div className="grid grid-cols-3 gap-3">
                                <Skeleton className="h-24 col-span-2" />
                                <Skeleton className="h-24" />
                            </div>
                            <Skeleton className="h-40 w-full" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
