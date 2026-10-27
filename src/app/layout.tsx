import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { TRPCReactProvider } from "@/trpc/client";
import { Toaster } from "sonner";
import { ClerkProvider } from "@clerk/nextjs";
import GlobalQueryProgress from "@/components/global-query-progress";
import { OptionalAnalytics } from "@/components/optional-analytics";
import { CommandPalette } from "@/components/command-palette";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
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

/** viewport-fit=cover lets fixed headers and sheets use env(safe-area-inset-*) on notched phones. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Providers MUST live inside <body>. Wrapping <html> with client providers
  // breaks document structure and causes React hydration error #418 (text/
  // markup mismatch between server and client) in production builds.
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${plusJakartaSans.variable} ${jetBrainsMono.variable} antialiased`}
      >
        <ClerkProvider>
          <TRPCReactProvider>
            <GlobalQueryProgress />
            <Toaster />
            {children}
            <CommandPalette />
            <OptionalAnalytics />
          </TRPCReactProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
