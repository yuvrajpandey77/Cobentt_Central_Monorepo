import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";


interface HindProps {
    children: React.ReactNode;
    text: string;
    side?: "top" | "bottom" | "left" | "right";
    align?: "start" | "center" | "end";
}

export const Hint = ({ children, text, side = "top", align = "center" }: HindProps) => {

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    {children}
                </TooltipTrigger>
                <TooltipContent 
                    side={side} 
                    align={align}
                    className="bg-black/90 text-white border border-white/20 backdrop-blur-sm"
                >
                    <p className="text-white text-xs">
                        {text}
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>

    )


}