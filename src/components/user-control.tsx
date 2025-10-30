"use client";
import {dark} from "@clerk/themes";
import { UserButton } from "@clerk/nextjs";

interface Props {
    showName?: boolean;
};

export const UserControl = ({ showName = true }: Props) => {
    return (
        <UserButton
            showName={showName}
            appearance={{
                elements: {
                    // Glassy card that adapts to theme colors
                    userButtonPopoverCard:
                        "backdrop-blur-lg rounded-lg border bg-white/10 border-white/20",
                    userButtonPopoverCardHeader:
                        "border-b border-white/20 rounded-t-lg",
                    userButtonPopoverCardFooter:
                        "border-t border-white/20 rounded-b-lg",
                    // Make the user button avatar similar size to company logo (32x32)
                    userButtonAvatarBox: "w-8 h-8",
                    userButtonAvatarImage: "w-8 h-8",
                    userButtonTrigger: "w-8 h-8",
                },
                baseTheme: dark,
            }}
        />
    );
};

