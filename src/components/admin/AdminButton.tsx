"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * The single button used everywhere in the Admin Panel.
 *
 * Admin actions previously reused the public <Button>, which is styled from
 * the live public theme (CTA orange on white). That made Save/Delete/Activate
 * all look the same and, on some themes, unreadable. These variants are
 * semantic and use the fixed --admin-* tokens from globals.css, so they are
 * legible no matter what the customer-facing theme is set to.
 *
 * The public CTA style (#E76F35 on #FFFFFF) is intentionally NOT available
 * here — it belongs to the customer-facing site only.
 */
export type AdminButtonVariant =
  | "primary" // Save, Create, Upload, Publish
  | "secondary" // Edit, Cancel, back-out actions
  | "activate"
  | "deactivate"
  | "destructive" // Delete, archive, reject
  | "ghost"; // low-emphasis inline actions

export type AdminButtonSize = "sm" | "md" | "lg";

export interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
  loading?: boolean;
  /** Full width — the default on mobile for primary form actions. */
  block?: boolean;
}

const VARIANTS: Record<AdminButtonVariant, string> = {
  primary:
    "bg-[var(--admin-primary-bg)] text-[var(--admin-primary-text)] border border-transparent hover:bg-[var(--admin-primary-bg-hover)] focus-visible:ring-[var(--admin-primary-bg)]",
  secondary:
    "bg-[var(--admin-secondary-bg)] text-[var(--admin-secondary-text)] border border-[var(--admin-secondary-border)] hover:bg-[var(--admin-secondary-bg-hover)] hover:text-[var(--admin-secondary-text-hover)] focus-visible:ring-[var(--admin-primary-bg)]",
  activate:
    "bg-[var(--admin-activate-bg)] text-[var(--admin-activate-text)] border border-[var(--admin-activate-border)] hover:bg-[var(--admin-activate-bg-hover)] hover:text-[var(--admin-activate-text-hover)] focus-visible:ring-[var(--admin-activate-text)]",
  deactivate:
    "bg-[var(--admin-deactivate-bg)] text-[var(--admin-deactivate-text)] border border-[var(--admin-deactivate-border)] hover:bg-[var(--admin-deactivate-bg-hover)] hover:text-[var(--admin-deactivate-text-hover)] focus-visible:ring-[var(--admin-deactivate-text)]",
  destructive:
    "bg-[var(--admin-destructive-bg)] text-[var(--admin-destructive-text)] border border-transparent hover:bg-[var(--admin-destructive-bg-hover)] focus-visible:ring-[var(--admin-destructive-bg)]",
  ghost:
    "bg-transparent text-[var(--admin-text-muted)] border border-transparent hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-text)] focus-visible:ring-[var(--admin-primary-bg)]",
};

/* Every size keeps a >=44px tap target on touch screens (min-h-11 = 2.75rem). */
const SIZES: Record<AdminButtonSize, string> = {
  sm: "min-h-11 sm:min-h-0 px-3 py-2 text-sm gap-1.5",
  md: "min-h-11 px-4 py-2.5 text-sm gap-2",
  lg: "min-h-12 px-5 py-3 text-base gap-2",
};

const AdminButton = forwardRef<HTMLButtonElement, AdminButtonProps>(function AdminButton(
  { className, variant = "primary", size = "md", loading = false, block = false, disabled, children, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium leading-none",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-bg)]",
        "disabled:opacity-55 disabled:cursor-not-allowed",
        // Labels wrap instead of being clipped on a 320px screen.
        "whitespace-normal text-center",
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        className
      )}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="mr-1 inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      <span className="min-w-0">{children}</span>
    </button>
  );
});

export default AdminButton;
