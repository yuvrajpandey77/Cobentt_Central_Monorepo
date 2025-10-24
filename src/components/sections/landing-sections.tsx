"use client";

import { ArrowRight, Zap, Shield, Globe, Code, Sparkles, Github, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

export const FeaturesSection = () => {
  const features = [
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Lightning Fast",
      description: "Build projects in seconds with our AI-powered automation. No more complex setups or configurations."
    },
    {
      icon: <Code className="h-6 w-6" />,
      title: "Full-Stack Ready",
      description: "Generate complete applications with frontend, backend, and database integration out of the box."
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Production Ready",
      description: "Deploy with confidence. All generated code follows best practices and security standards."
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Modern Stack",
      description: "Built with the latest technologies: React, TypeScript, Tailwind CSS, and more."
    }
  ];

  return (
    <section id="features" className="py-24 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Choose Cogerphere?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Experience the future of development with our AI-powered platform that transforms ideas into production-ready applications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-lg transition-all duration-200 ease-out border-0 bg-card/50 backdrop-blur-sm hover:scale-[1.02] focus-within:ring-2 focus-within:ring-primary/20">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary text-primary-foreground mb-4 group-hover:scale-110 transition-transform duration-200 ease-out">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export const CTASection = () => {
  const scrollToForm = () => {
    const formElement = document.getElementById('main-project-form');
    if (formElement) {
      formElement.scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
      });
      // Focus the textarea after scrolling
      setTimeout(() => {
        const textarea = formElement.querySelector('textarea');
        if (textarea) {
          textarea.focus();
        }
      }, 500);
    }
  };

  return (
    <section className="py-24 bg-primary/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Build Something Amazing?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of developers who are already building faster with Cogerphere. 
            Start your first project in under 30 seconds.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              onClick={scrollToForm}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 transition-all duration-200 ease-out hover:scale-105 hover:shadow-lg focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Start Building Now
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Free to start</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>No credit card required</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const Footer = () => {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Image
                src="/cogerpherelogoonly.jpg"
                alt="Cogerphere AI"
                width={32}
                height={32}
                className="rounded-full"
              />
              <span className="text-xl font-bold">Cogerphere</span>
            </div>
            <p className="text-muted-foreground mb-4 max-w-md">
              The AI-powered platform that transforms your ideas into production-ready applications. 
              Build faster, deploy smarter.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground transition-colors duration-200 ease-out">Features</a></li>
              <li><a href="#pricing" className="hover:text-foreground transition-colors duration-200 ease-out">Pricing</a></li>
              <li><a href="#docs" className="hover:text-foreground transition-colors duration-200 ease-out">Documentation</a></li>
              <li><a href="#api" className="hover:text-foreground transition-colors duration-200 ease-out">API</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#about" className="hover:text-foreground transition-colors duration-200 ease-out">About</a></li>
              <li><a href="#blog" className="hover:text-foreground transition-colors duration-200 ease-out">Blog</a></li>
              <li><a href="#careers" className="hover:text-foreground transition-colors duration-200 ease-out">Careers</a></li>
              <li><a href="#contact" className="hover:text-foreground transition-colors duration-200 ease-out">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © 2024 Cogerphere. All rights reserved.
          </p>
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <div className="flex space-x-4">
              <a 
                href="https://github.com/COGERPHEREAILABS" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors duration-200 ease-out"
              >
                <Github className="h-5 w-5" />
              </a>
              <a 
                href="https://x.com/cogerphere" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors duration-200 ease-out"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a 
                href="https://www.linkedin.com/company/cogerphere" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors duration-200 ease-out"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
            <div className="flex space-x-6">
              <a href="#privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 ease-out">
                Privacy Policy
              </a>
              <a href="#terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 ease-out">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
