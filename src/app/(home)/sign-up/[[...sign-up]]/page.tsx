"use client";

import { SignUp } from "@clerk/nextjs";
import { useTheme } from "@/hooks/use-theme";
import { dark } from "@clerk/themes";
export default function Page() {
    const theme = useTheme();
    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 relative" style={{ backgroundImage: 'url(/mainbg.webp)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="absolute inset-0 bg-black/60" />
            {/* Left: Form */}
            <div className="flex items-center justify-center px-6 py-12 lg:px-10 relative z-10">
                <div className="w-full max-w-md">
                    <SignUp routing="path" path="/sign-up" appearance={{
                        baseTheme: theme === "dark" ? dark : undefined,
                    }} />
                </div>
            </div>

            {/* Right: Brand panel (uses parent background) */}
            <div
                className="hidden lg:flex relative z-10 items-center justify-center"
            >
                <div className="relative z-10 max-w-lg px-10 text-white">
                    <p className="text-sm uppercase tracking-widest text-white/80 mb-2">Cogerphere</p>
                    <h2 className="text-3xl font-semibold mb-3">Build Faster with AI</h2>
                    <p className="text-white/90">
                        Generate, iterate, and ship with confidence. Our platform gives you the speed
                        of AI with the control of a modern, type-safe stack.
                    </p>
                </div>
            </div>
        </div>
    );
}