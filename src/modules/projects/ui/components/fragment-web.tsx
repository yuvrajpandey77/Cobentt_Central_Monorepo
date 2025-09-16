import { Fragment } from "@/generated/prisma";
import { ExternalLinkIcon, RefreshCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Hint } from "@/components/hint";






interface Props {
    data: Fragment;
}

export const FragmentWeb = ({ data }: Props) => {


    const [fragmentkey, setFragmentKey] = useState(0);
    const [copied, setCopied] = useState(false);

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


    return (
        <div className="flex flex-col h-full w-full">
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
            />
        </div>
    )
}
