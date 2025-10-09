"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Book, 
  Mail, 
  Phone, 
  Clock, 
  Users,
  FileText,
  Video,
  HelpCircle,
  Search,
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
      color: "bg-purple-600"
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
      question: "How do I get started with Cogerphere?",
      answer: "Simply describe your app idea in the input box on our homepage, and our AI will generate a complete application for you in minutes."
    },
    {
      question: "What programming languages does Cogerphere support?",
      answer: "Cogerphere primarily generates applications using React, TypeScript, Node.js, and modern web technologies."
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
      answer: "Yes! Cogerphere includes instant hosting and deployment capabilities for all generated applications."
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-20">
          <Badge className="mb-6 px-6 py-3 text-lg font-semibold">
            Support
          </Badge>
          <h1 className="text-6xl font-bold mb-8">
            We're here to help
          </h1>
          <p className="text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Get the support you need to build amazing applications with Cogerphere. Our team is ready to assist you every step of the way.
          </p>
        </div>

        {/* Support Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {supportOptions.map((option, index) => (
            <Card key={index} className="flex flex-col h-full">
              <CardHeader className="text-center pb-4 flex-shrink-0">
                <div className={`w-16 h-16 ${option.color} rounded-xl flex items-center justify-center mx-auto mb-6`}>
                  {option.icon}
                </div>
                <CardTitle className="text-xl break-words">{option.title}</CardTitle>
                <p className="text-muted-foreground break-words">{option.description}</p>
              </CardHeader>
              <CardContent className="text-center flex flex-col flex-1">
                <div className="mb-6 flex-shrink-0">
                  <p className="text-sm text-green-400 mb-2 font-semibold">{option.availability}</p>
                  <p className="text-xs text-muted-foreground break-words">{option.responseTime}</p>
                </div>
                <Button className={`w-full ${option.color} hover:opacity-90 text-white font-semibold mt-auto`}>
                  {option.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <Card className="flex flex-col h-full">
            <CardContent className="p-8 text-center flex flex-col h-full">
              <Phone className="h-12 w-12 mx-auto mb-6 text-primary flex-shrink-0" />
              <h3 className="text-2xl font-bold mb-4 break-words">Phone Support</h3>
              <p className="text-muted-foreground mb-6 text-lg break-words">Speak directly with our support team</p>
              <p className="text-lg text-muted-foreground font-semibold break-words">+1 (555) 123-4567</p>
              <p className="text-sm text-muted-foreground mt-2 break-words">Mon-Fri, 9AM-6PM EST</p>
            </CardContent>
          </Card>

          <Card className="flex flex-col h-full">
            <CardContent className="p-8 text-center flex flex-col h-full">
              <Mail className="h-12 w-12 mx-auto mb-6 text-primary flex-shrink-0" />
              <h3 className="text-2xl font-bold mb-4 break-words">Email Support</h3>
              <p className="text-muted-foreground mb-6 text-lg break-words">Send us detailed questions</p>
              <p className="text-lg text-muted-foreground font-semibold break-words">support@cogerphere.com</p>
              <p className="text-sm text-muted-foreground mt-2 break-words">24/7 Response</p>
            </CardContent>
          </Card>

          <Card className="flex flex-col h-full">
            <CardContent className="p-8 text-center flex flex-col h-full">
              <Users className="h-12 w-12 mx-auto mb-6 text-primary flex-shrink-0" />
              <h3 className="text-2xl font-bold mb-4 break-words">Community</h3>
              <p className="text-muted-foreground mb-6 text-lg break-words">Join our developer community</p>
              <p className="text-lg text-muted-foreground font-semibold break-words">Discord & GitHub</p>
              <p className="text-sm text-muted-foreground mt-2 break-words">Always Active</p>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="max-w-5xl mx-auto mb-20">
          <h2 className="text-4xl font-bold text-center mb-16">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqItems.map((item, index) => (
              <Card key={index}>
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold mb-4 flex items-start">
                    <HelpCircle className="h-6 w-6 mr-3 text-primary flex-shrink-0 mt-0.5" />
                    <span className="break-words">{item.question}</span>
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed break-words">{item.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl font-bold mb-4">Still need help?</CardTitle>
              <p className="text-xl text-muted-foreground">Send us a message and we'll get back to you quickly.</p>
            </CardHeader>
            <CardContent className="p-8">
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input
                    type="text"
                    placeholder="Your Name"
                    className="w-full px-6 py-4 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                  />
                  <input
                    type="email"
                    placeholder="Your Email"
                    className="w-full px-6 py-4 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Subject"
                  className="w-full px-6 py-4 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                />
                <textarea
                  placeholder="Your Message"
                  rows={5}
                  className="w-full px-6 py-4 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 resize-none"
                />
                <Button className="w-full py-4 text-lg font-semibold">
                  <Send className="h-5 w-5 mr-2" />
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
