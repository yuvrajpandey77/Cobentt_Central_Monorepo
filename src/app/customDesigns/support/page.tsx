"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Book, 
  Mail, 
  Phone, 
  Users,
  Video,
  HelpCircle,
  Send
} from "lucide-react";

export default function SupportPage() {
  const supportOptions = [
    {
      icon: <MessageCircle className="h-6 w-6" />,
      title: "Live Chat",
      description: "Get instant help from our support team",
      availability: "24/7 Available",
      responseTime: "Average response: 2 minutes",
      buttonText: "Start Chat",
      color: "bg-green-600"
    },
    {
      icon: <Book className="h-6 w-6" />,
      title: "Documentation",
      description: "Comprehensive guides and tutorials",
      availability: "Always Available",
      responseTime: "Self-service resources",
      buttonText: "Browse Docs",
      color: "bg-blue-600"
    },
    {
      icon: <Mail className="h-6 w-6" />,
      title: "Email Support",
      description: "Detailed help via email",
      availability: "24/7 Available",
      responseTime: "Response within 4 hours",
      buttonText: "Send Email",
      color: "bg-blue-600"
    },
    {
      icon: <Video className="h-6 w-6" />,
      title: "Video Tutorials",
      description: "Step-by-step video guides",
      availability: "Always Available",
      responseTime: "Learn at your own pace",
      buttonText: "Watch Videos",
      color: "bg-orange-600"
    }
  ];

  const faqItems = [
    {
      question: "How do I get started with Cobentt?",
      answer: "Simply describe your app idea in the input box on our homepage, and our AI will generate a complete application for you in minutes."
    },
    {
      question: "What programming languages does Cobentt support?",
      answer: "Cobentt primarily generates applications using React, TypeScript, Node.js, and modern web technologies."
    },
    {
      question: "Can I customize the generated code?",
      answer: "Yes! All generated code is fully customizable. You can modify, extend, and enhance the generated applications as needed."
    },
    {
      question: "Is there a limit to the number of projects I can create?",
      answer: "The free plan includes unlimited projects. Paid plans offer additional features and higher token limits."
    },
    {
      question: "How does the token system work?",
      answer: "Tokens are used to measure AI usage. Each code generation request consumes tokens based on complexity and length."
    },
    {
      question: "Can I deploy my applications?",
      answer: "Yes! Cobentt includes instant hosting and deployment capabilities for all generated applications."
    }
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Header Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-20">
          <Badge className="mb-6 px-6 py-3 text-lg font-semibold bg-white/10 text-white border-white/20 backdrop-blur-sm">
            Support
          </Badge>
          <h1 className="text-6xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-200 to-white drop-shadow-lg leading-tight">
            We&apos;re here to help
          </h1>
          <p className="text-2xl text-text-secondary max-w-4xl mx-auto leading-relaxed">
             Get the support you need to build amazing applications with Cobentt. Our team is ready to assist you every step of the way.
          </p>
        </div>

        {/* Support Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {supportOptions.map((option, index) => (
            <Card key={index} className="flex flex-col h-full border-white/15 bg-white/5 backdrop-blur-md ring-1 ring-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
              <CardHeader className="text-center pb-4 flex-shrink-0">
                <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-6 text-white">
                  {option.icon}
                </div>
                <CardTitle className="text-xl break-words text-white">{option.title}</CardTitle>
                <p className="text-text-secondary break-words">{option.description}</p>
              </CardHeader>
              <CardContent className="text-center flex flex-col flex-1">
                <div className="mb-6 flex-shrink-0">
                  <p className="text-sm text-green-400 mb-2 font-semibold">{option.availability}</p>
                  <p className="text-xs text-text-secondary break-words">{option.responseTime}</p>
                </div>
                <Button asChild className="w-full bg-white/10 text-white hover:bg-white/20 border-white/15 backdrop-blur-sm font-semibold mt-auto">
                  <Link href="/docs">
                    {option.buttonText}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <Card className="flex flex-col h-full border-white/15 bg-white/5 backdrop-blur-md ring-1 ring-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
            <CardContent className="p-8 text-center flex flex-col h-full">
              <Phone className="h-12 w-12 mx-auto mb-6 text-white flex-shrink-0" />
              <h3 className="text-2xl font-bold mb-4 break-words text-white">Phone Support</h3>
              <p className="text-text-secondary mb-6 text-lg break-words">Speak directly with our support team</p>
              <p className="text-lg text-white font-semibold break-words">+1 (555) 123-4567</p>
              <p className="text-sm text-text-secondary mt-2 break-words">Mon-Fri, 9AM-6PM EST</p>
            </CardContent>
          </Card>

          <Card className="flex flex-col h-full border-white/15 bg-white/5 backdrop-blur-md ring-1 ring-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
            <CardContent className="p-8 text-center flex flex-col h-full">
              <Mail className="h-12 w-12 mx-auto mb-6 text-white flex-shrink-0" />
              <h3 className="text-2xl font-bold mb-4 break-words text-white">Email Support</h3>
              <p className="text-text-secondary mb-6 text-lg break-words">Send us detailed questions</p>
              <p className="text-lg text-white font-semibold break-words">support@cobentt.com</p>
              <p className="text-sm text-text-secondary mt-2 break-words">24/7 Response</p>
            </CardContent>
          </Card>

          <Card className="flex flex-col h-full border-white/15 bg-white/5 backdrop-blur-md ring-1 ring-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
            <CardContent className="p-8 text-center flex flex-col h-full">
              <Users className="h-12 w-12 mx-auto mb-6 text-white flex-shrink-0" />
              <h3 className="text-2xl font-bold mb-4 break-words text-white">Community</h3>
              <p className="text-text-secondary mb-6 text-lg break-words">Join our developer community</p>
              <p className="text-lg text-white font-semibold break-words">Discord & GitHub</p>
              <p className="text-sm text-text-secondary mt-2 break-words">Always Active</p>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="max-w-5xl mx-auto mb-20">
          <h2 className="text-4xl font-bold text-center mb-16 text-white">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqItems.map((item, index) => (
              <Card key={index} className="border-white/15 bg-white/5 backdrop-blur-md ring-1 ring-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold mb-4 flex items-start text-white">
                    <HelpCircle className="h-6 w-6 mr-3 text-white flex-shrink-0 mt-0.5" />
                    <span className="break-words">{item.question}</span>
                  </h3>
                  <p className="text-text-secondary text-lg leading-relaxed break-words">{item.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div className="max-w-3xl mx-auto">
          <Card className="border-white/15 bg-white/5 backdrop-blur-md ring-1 ring-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl font-bold mb-4 text-white">Still need help?</CardTitle>
              <p className="text-xl text-text-secondary">Send us a message and we&apos;ll get back to you quickly.</p>
            </CardHeader>
            <CardContent className="p-8">
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input
                    type="text"
                    placeholder="Your Name"
                    className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-text-muted focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-300 backdrop-blur-sm"
                  />
                  <input
                    type="email"
                    placeholder="Your Email"
                    className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-text-muted focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-300 backdrop-blur-sm"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Subject"
                  className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-text-muted focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-300 backdrop-blur-sm"
                />
                <textarea
                  placeholder="Your Message"
                  rows={5}
                  className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-text-muted focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-300 resize-none backdrop-blur-sm"
                />
                <Button asChild className="w-full py-4 text-lg font-semibold bg-white/10 text-white hover:bg-white/20 border-white/15 backdrop-blur-sm">
                  <Link href="/sign-up">
                    <Send className="h-5 w-5 mr-2" />
                    Send Message
                  </Link>
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
