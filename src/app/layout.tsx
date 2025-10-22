import type { Metadata } from "next";
import { Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { TRPCReactProvider } from "@/trpc/client";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
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

export const metadata: Metadata = {
  title: {
    default: "Cogerphere",
    template: "%s | Cogerphere",
  },
  description: "Cogerphere – Crafting intelligent platforms that merge AI and development.",
  icons: {
    icon: "/cogerpherelogoonly.jpg",
    apple: "/cogerpherelogoonly.jpg",
    shortcut: "/cogerpherelogoonly.jpg",
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
        className={`${sora.variable} ${jetBrainsMono.variable} antialiased`}
      >
        <ThemeProvider
        attribute="class"
        forcedTheme="dark"
        disableTransitionOnChange
        >
        <GlobalQueryProgress />
        <Toaster />
        {children}
        </ThemeProvider>
      </body>
    </html>
    </TRPCReactProvider>
    </ClerkProvider>
  );
}
