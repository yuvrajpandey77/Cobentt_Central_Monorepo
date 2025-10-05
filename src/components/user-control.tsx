"use client";
import {dark} from "@clerk/themes";
import { useTheme } from "@/hooks/use-theme";
import { UserButton } from "@clerk/nextjs";

interface Props {
    showName?: boolean;
};

export const UserControl = ({ showName = true }: Props) => {
    const theme = useTheme();
    return (
        <UserButton
            showName={showName}
            appearance={{
                elements: {
                    // Glassy card that adapts to theme colors
                    userButtonPopoverCard:
                        "backdrop-blur-lg rounded-lg border bg-white/80 border-white/30 dark:bg-white/10 dark:border-white/20",
                    userButtonPopoverCardHeader:
                        "border-b border-white/30 dark:border-white/20 rounded-t-lg",
                    userButtonPopoverCardFooter:
                        "border-t border-white/30 dark:border-white/20 rounded-b-lg",
                },
                baseTheme: theme === "dark" ? dark : undefined,
            }}
        />
    );
};

