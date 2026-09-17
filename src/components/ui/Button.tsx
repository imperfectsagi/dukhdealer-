"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
      primary:
        "bg-[var(--color-cta)] text-[var(--color-cta-text)] hover:opacity-90 focus-visible:ring-[var(--color-accent)]",
      secondary:
        "bg-[var(--color-secondary)] text-[var(--color-foreground)] hover:opacity-90 border border-[var(--color-border)]",
      outline:
        "border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-card)]",
      ghost: "text-[var(--color-foreground)] hover:bg-[var(--color-card)]",
      danger: "bg-[var(--color-danger)] text-white hover:opacity-90",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2.5 text-sm",
      lg: "px-6 py-3 text-base",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
