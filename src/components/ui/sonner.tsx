"use client"

import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg text-sm py-2.5 px-3",
          description: "group-[.toast]:text-muted-foreground text-xs mt-1",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground text-xs h-7 px-2",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground text-xs h-7 px-2",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
