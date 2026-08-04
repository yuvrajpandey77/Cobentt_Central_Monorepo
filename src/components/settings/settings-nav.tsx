"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  User,
  Shield,
  CreditCard,
  Key,
  Palette,
  Eye,
  Activity,
  BarChart3,
  Settings,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    title: "Account",
    items: [
      { label: "Profile", href: "/settings/profile", icon: User },
      { label: "Account", href: "/settings/account", icon: Settings },
      { label: "Security", href: "/settings/security", icon: Shield },
    ],
  },
  {
    title: "Billing",
    items: [
      { label: "Subscription", href: "/settings/billing", icon: CreditCard },
      { label: "Usage", href: "/settings/user", icon: BarChart3 },
      { label: "Billing History", href: "/settings/billing/history", icon: CreditCard },
    ],
  },
  {
    title: "Developer",
    items: [
      { label: "API Keys", href: "/settings/api-keys", icon: Key },
    ],
  },
  {
    title: "Preferences",
    items: [
      { label: "Appearance", href: "/settings/appearance", icon: Palette },
      { label: "Privacy", href: "/settings/privacy", icon: Eye },
    ],
  },
  {
    title: "Compliance",
    items: [
      { label: "Audit Logs", href: "/settings/audit", icon: Activity },
    ],
  },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="w-64 shrink-0 border-r border-border bg-background">
      <div className="sticky top-0 p-4">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Settings
        </h2>
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-4">
            <h3 className="mb-1 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {section.title}
            </h3>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
