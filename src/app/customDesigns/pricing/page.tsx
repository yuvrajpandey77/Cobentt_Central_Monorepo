"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Info } from "lucide-react";

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);

  const pricingPlans = [
    {
      name: "Free",
      price: "$0",
      description: "",
      features: [
        "Public & private projects",
        "400K tokens daily",
        "2.5M tokens monthly",
        "Cogerphere branding",
        "10MB file upload",
        "Website hosting",
        "333k web requests",
        "Unlimited databases"
      ],
      buttonText: "Get started",
      buttonVariant: "default" as const,
      popular: false
    },
    {
      name: "Pro",
      price: "$5",
      description: "per month",
      features: [
        "Public & private projects",
        "No daily token limit",
        "10M tokens monthly",
        "No branding",
        "100MB file upload",
        "Website hosting",
        "1M web requests",
        "Token rollover",
        "Custom domains",
        "SEO optimization",
        "Unlimited databases",
        "Expanded capacity"
      ],
      buttonText: "Get started",
      buttonVariant: "default" as const,
      popular: true
    },
    {
      name: "Teams",
      price: "$20",
      description: "per member",
      features: [
        "Everything in Pro, plus:",
        "Centralized billing",
        "Team access management",
        "Admin controls",
        "Private NPM registries",
        "Design system knowledge",
        "Token rollover"
      ],
      buttonText: "Get started",
      buttonVariant: "default" as const,
      popular: false
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "",
      features: [
        "Everything in Pro, plus:",
        "Advanced security (SSO)",
        "Admin controls",
        "24/7 priority support",
        "Custom workflows",
        "Scalable for large teams",
        "Flexible billing",
        "Data governance",
        "Enterprise training"
      ],
      buttonText: "Ask for a quote",
      buttonVariant: "secondary" as const,
      popular: false,
      customDescription: "Advanced security, compliance, and 24/7 support."
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-6">
            Pricing
          </h1>
          <p className="text-2xl text-muted-foreground mb-12">Start for free. Upgrade as you go.</p>
          
          {/* Toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-card rounded-xl p-2 flex border">
              <button
                onClick={() => setIsYearly(false)}
                className={`px-8 py-3 rounded-lg transition-all font-medium ${
                  !isYearly 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`px-8 py-3 rounded-lg transition-all font-medium ${
                  isYearly 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>
          
          <p className="text-lg font-semibold text-primary">Save 10% on a yearly subscription.</p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <Card key={index} className="relative flex flex-col">
              {plan.popular && (
                <Badge className="absolute -top-4 right-6 px-4 py-2 rounded-full text-sm font-semibold">
                  POPULAR
                </Badge>
              )}
              
              <CardHeader className="text-center pb-20 pt-8 flex-shrink-0 relative h-64">
                <h3 className="text-3xl font-bold mb-4">{plan.name}</h3>
                <div className="mb-6">
                  <div className="text-5xl font-bold mb-2">
                    {plan.price}
                  </div>
                  {plan.description && (
                    <div className="text-sm text-muted-foreground whitespace-pre-line">
                      {plan.description}
                    </div>
                  )}
                  {plan.customDescription && (
                    <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                      {plan.customDescription}
                    </p>
                  )}
                </div>
                
                <Button 
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[calc(100%-3rem)] h-12 text-lg font-semibold border-white/15 bg-white/5 text-white hover:bg-white/20 hover:text-black backdrop-blur-sm transition-all duration-200 ease-out hover:scale-[1.01] focus:ring-2 focus:ring-white/20 focus:outline-none"
                >
                  {plan.buttonText}
                </Button>
              </CardHeader>

              <CardContent className="pt-0 px-6 pb-6 flex-1 flex flex-col">
                <ul className="space-y-4 flex-1">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground leading-relaxed break-words">
                        {feature}
                        {feature.includes("roll over") && (
                          <Info className="h-3 w-3 inline ml-1 text-muted-foreground" />
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
