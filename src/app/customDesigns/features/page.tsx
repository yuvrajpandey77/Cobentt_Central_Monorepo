"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Zap, 
  Code, 
  Shield, 
  Globe, 
  Database, 
  Smartphone, 
  Cloud, 
  Users,
  Lock,
  Rocket,
  Palette,
  BarChart3
} from "lucide-react";

export default function FeaturesPage() {
  const features = [
    {
      icon: <Zap className="h-8 w-8" />,
      title: "Lightning Fast Development",
      description: "Build applications 10x faster with AI-powered code generation and intelligent suggestions."
    },
    {
      icon: <Code className="h-8 w-8" />,
      title: "Full-Stack Ready",
      description: "Generate complete applications with frontend, backend, and database integration out of the box."
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Production Ready",
      description: "Deploy with confidence. All generated code follows best practices and security standards."
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: "Modern Stack",
      description: "Built with the latest technologies: React, TypeScript, Tailwind CSS, and more."
    },
    {
      icon: <Database className="h-8 w-8" />,
      title: "Unlimited Databases",
      description: "Create and manage unlimited databases with automatic schema generation and optimization."
    },
    {
      icon: <Smartphone className="h-8 w-8" />,
      title: "Mobile Responsive",
      description: "All generated applications are fully responsive and work perfectly on all devices."
    },
    {
      icon: <Cloud className="h-8 w-8" />,
      title: "Instant Hosting",
      description: "Deploy your applications instantly with our integrated hosting solution."
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Team Collaboration",
      description: "Work together with your team using centralized billing and access management."
    },
    {
      icon: <Lock className="h-8 w-8" />,
      title: "Advanced Security",
      description: "Enterprise-grade security with SSO, audit logs, and compliance support."
    },
    {
      icon: <Rocket className="h-8 w-8" />,
      title: "Custom Domains",
      description: "Use your own domain with custom domain support and SEO optimization."
    },
    {
      icon: <Palette className="h-8 w-8" />,
      title: "Design Systems",
      description: "Build with design system knowledge and per-package prompts for consistency."
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Analytics & Monitoring",
      description: "Track performance and usage with built-in analytics and monitoring tools."
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-20">
          <Badge className="mb-6 px-6 py-3 text-lg font-semibold">
            Features
          </Badge>
          <h1 className="text-6xl font-bold mb-8">
            Everything you need to build amazing apps
          </h1>
          <p className="text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Cogerphere provides all the tools and features you need to create, deploy, and scale your applications with AI-powered development.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto mb-20">
          {features.map((feature, index) => (
            <Card key={index} className="flex flex-col h-full">
              <CardContent className="p-8 flex flex-col h-full">
                <div className="flex items-center mb-6 flex-shrink-0">
                  <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mr-6">
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold break-words">{feature.title}</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed text-lg flex-1 break-words">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center bg-card rounded-3xl p-12 border">
          <h2 className="text-4xl font-bold mb-6">
            Ready to experience these features?
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Start building with Cogerphere today and see the difference AI can make.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button className="px-10 py-4 text-lg font-semibold">
              Get Started Free
            </Button>
            <Button variant="outline" className="px-10 py-4 text-lg font-semibold">
              View Pricing
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
