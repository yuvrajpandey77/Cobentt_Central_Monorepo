import type { Metadata } from "next";
import { Sora, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { TRPCReactProvider } from "@/trpc/client";
import { Toaster } from "sonner";
import { ClerkProvider } from "@clerk/nextjs";
import GlobalQueryProgress from "@/components/global-query-progress";

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

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Cobentt",
    template: "%s | Cobentt",
  },
  description: "Cobentt – Crafting intelligent platforms that merge AI and development.",
  icons: {
      icon: "/cobentttransparent.webp",
      apple: "/cobentttransparent.webp",
      shortcut: "/cobentttransparent.webp",
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
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${sora.variable} ${jetBrainsMono.variable} ${plusJakartaSans.variable} antialiased`}
      >
        <GlobalQueryProgress />
        <Toaster />
        {children}
      </body>
    </html>
    </TRPCReactProvider>
    </ClerkProvider>
  );
}
