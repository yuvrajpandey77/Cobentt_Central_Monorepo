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
    <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 min-h-screen">
      {/* Header Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Pricing
          </h1>
          <p className="text-2xl text-gray-300 mb-12">Start for free. Upgrade as you go.</p>
          
          {/* Toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-2 flex border border-gray-700/50">
              <button
                onClick={() => setIsYearly(false)}
                className={`px-8 py-3 rounded-lg transition-all font-medium ${
                  !isYearly 
                    ? 'bg-primary text-primary-foreground shadow-lg' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`px-8 py-3 rounded-lg transition-all font-medium ${
                  isYearly 
                    ? 'bg-primary text-primary-foreground shadow-lg' 
                    : 'text-gray-300 hover:text-white'
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
            <Card key={index} className="bg-gray-900/80 backdrop-blur-sm border-gray-800/50 relative hover:border-gray-700/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 group flex flex-col">
              {plan.popular && (
                <Badge className="absolute -top-4 right-6 bg-gradient-to-r from-primary to-secondary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                  POPULAR
                </Badge>
              )}
              
              <CardHeader className="text-center pb-20 pt-8 flex-shrink-0 relative h-64">
                <h3 className="text-3xl font-bold mb-4">{plan.name}</h3>
                <div className="mb-6">
                  <div className="text-5xl font-bold mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    {plan.price}
                  </div>
                  {plan.description && (
                    <div className="text-sm text-gray-400 whitespace-pre-line">
                      {plan.description}
                    </div>
                  )}
                  {plan.customDescription && (
                    <p className="text-sm text-gray-300 mt-3 leading-relaxed">
                      {plan.customDescription}
                    </p>
                  )}
                </div>
                
                <Button 
                  className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[calc(100%-3rem)] h-12 text-lg font-semibold ${
                    plan.buttonVariant === 'secondary' 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600' 
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl'
                  }`}
                >
                  {plan.buttonText}
                </Button>
              </CardHeader>

              <CardContent className="pt-0 px-6 pb-6 flex-1 flex flex-col">
                <ul className="space-y-4 flex-1">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-300 leading-relaxed break-words">
                        {feature}
                        {feature.includes("roll over") && (
                          <Info className="h-3 w-3 inline ml-1 text-gray-500" />
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
