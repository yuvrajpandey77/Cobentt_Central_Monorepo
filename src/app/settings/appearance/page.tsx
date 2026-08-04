"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const THEMES = [
  { id: "dark", label: "Dark", icon: Moon },
  { id: "light", label: "Light", icon: Sun },
  { id: "system", label: "System", icon: Monitor },
];

const DENSITIES = [
  { id: "compact", label: "Compact" },
  { id: "default", label: "Default" },
  { id: "comfortable", label: "Comfortable" },
];

export default function AppearancePage() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("cobentt-theme") || "dark";
    }
    return "dark";
  });
  const [density, setDensity] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("cobentt-density") || "default";
    }
    return "default";
  });
  const [animations, setAnimations] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("cobentt-animations") !== "false";
    }
    return true;
  });

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("cobentt-theme", newTheme);
    document.documentElement.classList.remove("light", "dark");
    if (newTheme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.add(prefersDark ? "dark" : "light");
    } else {
      document.documentElement.classList.add(newTheme);
    }
    toast.success(`Theme set to ${newTheme}`);
  };

  const handleDensityChange = (newDensity: string) => {
    setDensity(newDensity);
    localStorage.setItem("cobentt-density", newDensity);
  };

  const handleAnimationsToggle = () => {
    const newValue = !animations;
    setAnimations(newValue);
    localStorage.setItem("cobentt-animations", String(newValue));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Appearance</h1>
        <p className="text-sm text-muted-foreground">
          Customize the look and feel of Cobentt.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>
            Select your preferred color theme.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors",
                  theme === t.id
                    ? "border-primary bg-accent"
                    : "border-border hover:border-primary/50"
                )}
              >
                <t.icon className="h-6 w-6" />
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Display</CardTitle>
          <CardDescription>
            Adjust the density and animation preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Density</Label>
            <div className="flex gap-2">
              {DENSITIES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => handleDensityChange(d.id)}
                  className={cn(
                    "rounded-md border px-4 py-2 text-sm transition-colors",
                    density === d.id
                      ? "border-primary bg-accent font-medium"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Animations</Label>
              <p className="text-sm text-muted-foreground">
                Enable or disable UI animations.
              </p>
            </div>
            <button
              onClick={handleAnimationsToggle}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                animations ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  animations ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
