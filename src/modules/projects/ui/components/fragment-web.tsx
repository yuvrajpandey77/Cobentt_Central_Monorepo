import { Fragment } from "@/generated/prisma";
import { ExternalLinkIcon, RefreshCcwIcon, Loader2, AlertTriangle, RotateCcw } from "lucide-react";
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
                <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
                    <div className="w-full md:w-11/12 lg:w-5/6 xl:w-3/4 max-w-4xl max-h-[70vh] overflow-auto rounded-xl border border-border/50 bg-card shadow-sm p-6 mt-6">
                        {/* Header Section */}
                        <div className="text-center mb-6">
                            <div className="relative mb-4">
                                {isRestoring ? (
                                    <div className="w-10 h-10 mx-auto bg-muted rounded-full flex items-center justify-center">
                                        <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 mx-auto bg-muted rounded-full flex items-center justify-center">
                                        <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                )}
                            </div>
                            
                            <h3 className="text-lg font-semibold text-foreground mb-1">
                                {isRestoring ? "Restoring Your Sandbox" : "Sandbox Unavailable"}
                            </h3>
                            
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {isRestoring
                                    ? "We're provisioning a fresh development environment and restoring your project files. This usually takes 30-60 seconds."
                                    : "The previous sandbox has expired or is unreachable. Click retry to restore it."}
                            </p>
                        </div>

                        {/* Progress Section */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-medium text-foreground">
                                    {isRestoring ? "Restoration Progress" : "Status"}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    {isRestoring ? "Step 2 of 3" : "Ready to retry"}
                                </span>
                            </div>
                            
                            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div className={`h-full bg-primary transition-all duration-1000 ${
                                    isRestoring ? 'animate-pulse' : 'w-0'
                                }`} style={{ width: isRestoring ? '70%' : '0%' }} />
                            </div>
                            
                            {isRestoring && (
                                <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                                    <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                                    <span>Provisioning environment...</span>
                                </div>
                            )}
                        </div>

                        {/* Action Section */}
                        {!isRestoring && (
                            <div className="text-center">
                                <Button 
                                    variant="default" 
                                    size="sm" 
                                    onClick={onRefresh}
                                    className="gap-2"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    Restore Sandbox
                                </Button>
                            </div>
                        )}

                        {/* Preview Skeleton */}
                        <div className="mt-6 space-y-3">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                                <span className="text-xs font-medium text-foreground">Preview Loading</span>
                            </div>
                            
                            <div className="space-y-3">
                                {/* Header skeleton */}
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-6 w-6 rounded-full" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-3 w-3/4" />
                                        <Skeleton className="h-2.5 w-1/2" />
                                    </div>
                                </div>
                                
                                {/* Content skeleton */}
                                <div className="grid grid-cols-4 gap-3">
                                    <Skeleton className="h-10 col-span-2 rounded-lg" />
                                    <Skeleton className="h-10 rounded-lg" />
                                    <Skeleton className="h-10 rounded-lg" />
                                </div>
                                
                                {/* Main content skeleton */}
                                <Skeleton className="h-20 w-full rounded-lg" />
                                
                                {/* Footer skeleton */}
                                <div className="flex justify-between items-center">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-7 w-20 rounded-full" />
                                </div>
                            </div>
                        </div>

                        {/* Footer Info */}
                        <div className="mt-6 pt-4 border-t border-border/30">
                            <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span>Secure • Isolated • Temporary</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
