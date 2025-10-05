import type { Metadata } from "next";
import { Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TRPCReactProvider } from "@/trpc/client";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { ClerkProvider } from "@clerk/nextjs";
const sora = Sora({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Cogerphere",
    template: "%s | Cogerphere",
  },
  description: "Cogerphere – Crafting intelligent platforms that merge AI and development.",
  icons: {
    icon: "/cogerpherelogoonly.png",
    apple: "/cogerpherelogoonly.png",
    shortcut: "/cogerpherelogoonly.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider> 
    <TRPCReactProvider>  
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sora.variable} ${jetBrainsMono.variable} antialiased`}
      >
        <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        >
        <Toaster />
        {children}
        </ThemeProvider>
      </body>
    </html>
    </TRPCReactProvider>
    </ClerkProvider>
  );
}
