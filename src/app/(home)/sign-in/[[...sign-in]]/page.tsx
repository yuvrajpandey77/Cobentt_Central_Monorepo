"use client";

import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

    
export default function Page() {
    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 relative">
            <div className="absolute inset-0 bg-black/60" />
            {/* Left: Form */}
            <div className="flex items-center justify-center px-6 py-12 lg:px-10 relative z-10">
                <div className="w-full max-w-md" >
                    <SignIn routing="path" path="/sign-in" appearance={{
                        baseTheme: dark,
                    }} />
                </div>
            </div>

            {/* Right: Brand panel (uses parent background) */}
            <div
                className="hidden lg:flex relative z-10 items-center justify-center"
            >
                <div className="relative z-10 max-w-lg px-10 text-white">
                    <p className="text-sm uppercase tracking-widest text-white/80 mb-2">Cogerphere</p>
                    <h2 className="text-3xl font-semibold mb-3">Crafting Intelligent Platforms</h2>
                    <p className="text-white/90">
                        We merge AI and modern development to turn ideas into production-ready products.
                        Build faster with opinionated tooling, delightful UX, and scalable architecture.
                    </p>
                </div>
            </div>
        </div>
    );
}