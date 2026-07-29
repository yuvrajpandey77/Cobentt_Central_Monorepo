"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface AsymmetricButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  as?: "button";
}

interface AsymmetricLinkProps extends Omit<ButtonHTMLAttributes<HTMLAnchorElement>, "type"> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  as: "a";
  href: string;
}

type Props = AsymmetricButtonProps | AsymmetricLinkProps;

const styles = {
  base: "relative inline-flex items-center justify-center font-medium transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary select-none",
  primary:
    "bg-white text-bg-primary hover:bg-accent-hover shadow-lg shadow-white/10 hover:shadow-white/20",
  secondary:
    "bg-white/5 text-text-primary border border-border hover:bg-white/10 hover:border-white/20",
  ghost: "text-text-secondary hover:text-text-primary hover:bg-white/5",
  outline: "border border-border bg-transparent text-text-primary hover:bg-white/5 hover:border-accent/50",
  sizes: {
    sm: "text-sm px-4 py-2 gap-1.5",
    md: "text-sm px-5 py-2.5 gap-2",
    lg: "text-base px-7 py-3.5 gap-2.5",
  },
};

const borderRadius = (variant?: string) => {
  if (variant === "ghost") return "rounded-lg";
  return "rounded-tr-lg rounded-bl-lg rounded-tl-[14px] rounded-br-[14px]";
};

export const AsymmetricButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, Props>(
  (props, ref) => {
    const { variant = "primary", size = "md", fullWidth, className, children, ...rest } = props;

    const classes = cn(
      styles.base,
      styles[variant],
      styles.sizes[size],
      borderRadius(variant),
      fullWidth && "w-full",
      className
    );

    if ("as" in rest && rest.as === "a") {
      const { as: _, ...anchorProps } = rest as AsymmetricLinkProps & { as: "a" };
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={classes}
          {...anchorProps}
        >
          {children}
        </a>
      );
    }

    const { ...buttonProps } = rest as AsymmetricButtonProps;
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={classes}
        {...buttonProps}
      >
        {children}
      </button>
    );
  }
);

AsymmetricButton.displayName = "AsymmetricButton";
