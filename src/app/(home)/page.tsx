"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";

import { ProjectForm } from "@/modules/home/ui/components/project-form";
import { ProjectsList } from "@/modules/home/ui/components/projects-list";
import { Header } from "@/components/layout/header";
import { FeaturesSection, CTASection, Footer } from "@/components/sections/landing-sections";
import Image from "next/image";
import { ArrowDown, Sparkles, Zap, Code2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

const Page = () => {
    return (
        <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed" style={{backgroundImage: 'url(/mainbg.webp)'}}>
            <Header />
            
            {/* Hero Section */}
            <section className="relative">
                <div className="mx-auto pt-48 pb-16 max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto">
                        {/* Main Heading */}
                        <h1 className="text-4xl md:text-5xl font-semibold mb-5 text-white drop-shadow-lg">
                            Build your app with Cogy
                        </h1>
                        
                        {/* Subtitle */}
                        <p className="text-lg text-white/90 mb-10 max-w-xl mx-auto drop-shadow-md">
                            Describe your app idea and watch Cogerphere build it for you in minutes, not months.
                        </p>

                        {/* Project Form */}
                        <div className="max-w-2xl mx-auto mb-10">
                            <ProjectForm />
                        </div>

                        {/* Trust Indicators */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-7 text-base text-white/80">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span>Free to start</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span>No credit card required</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                <span>Deploy instantly</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Projects Section */}
            <section className="py-16 bg-black/20 backdrop-blur-sm">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-xl font-semibold mb-2 text-white">
                            Your Projects
                        </h2>
                        <p className="text-sm text-white/80">
                            Continue building on your existing projects or start something new.
                        </p>
                    </div>
                    <ProjectsList />
                </div>
            </section>

            {/* Footer */}
            <Footer />
        </div>
    )
}

export default Page;