"use client";

import { ReactNode, useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared admin primitives. Everything here is mobile-first: single column by
 * default, full-width controls, real <label for> associations, and 44px touch
 * targets. The base input styling lives in globals.css under .admin-scope so
 * it applies even to plain <input> elements inside admin pages.
 */

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-[var(--admin-text)] sm:text-2xl">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div>}
    </div>
  );
}

export function AdminCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("admin-card p-4 sm:p-6", className)}>
      {(title || actions) && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {title && <h2 className="font-medium text-[var(--admin-text)]">{title}</h2>}
            {description && (
              <p className="mt-1 text-xs text-[var(--admin-text-muted)]">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function FieldLabel({
  htmlFor,
  children,
  required,
  hint,
}: {
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-[var(--admin-text-muted)]">
      {children}
      {required && (
        <span aria-hidden="true" className="ml-0.5 text-[var(--admin-destructive-bg)]">
          *
        </span>
      )}
      {hint && <span className="ml-1 font-normal opacity-80">({hint})</span>}
    </label>
  );
}

export function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-[var(--admin-destructive-bg)]">
      {children}
    </p>
  );
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  error,
  hint,
  disabled,
  autoComplete,
  min,
  max,
  className,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  autoComplete?: string;
  min?: number | string;
  max?: number | string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("min-w-0", className)}>
      <FieldLabel htmlFor={id} required={required} hint={hint}>
        {label}
      </FieldLabel>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        min={min}
        max={max}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1"
      />
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  required,
  error,
  hint,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("min-w-0", className)}>
      <FieldLabel htmlFor={id} required={required} hint={hint}>
        {label}
      </FieldLabel>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        required={required}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1"
      />
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  required,
  error,
  hint,
  disabled,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("min-w-0", className)}>
      <FieldLabel htmlFor={id} required={required} hint={hint}>
        {label}
      </FieldLabel>
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function ToggleField({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--admin-primary-bg)]"
      />
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm text-[var(--admin-text)]">
          {label}
        </label>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">{description}</p>
        )}
      </div>
    </div>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "error" | "warning";
  children: ReactNode;
}) {
  const tones = {
    info: "bg-[var(--admin-surface-2)] text-[var(--admin-text)] border-[var(--admin-border)]",
    success: "bg-[var(--admin-activate-bg)] text-[var(--admin-activate-text)] border-[var(--admin-activate-border)]",
    error: "bg-[#FBEAEA] text-[#9A2F2C] border-[#F0C9C8]",
    warning: "bg-[#FDF3E6] text-[#8A5620] border-[#F3DFC2]",
  } as const;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-lg border px-3 py-2 text-sm break-anywhere", tones[tone])}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--admin-border-strong)] p-8 text-center">
      <p className="text-sm font-medium text-[var(--admin-text)]">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--admin-text-muted)]">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-8 text-sm text-[var(--admin-text-muted)]">
      <span
        aria-hidden="true"
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--admin-border-strong)] border-t-[var(--admin-primary-bg)]"
      />
      {label}
    </div>
  );
}

/**
 * One record rendered as a stacked label/value card on mobile. Admin lists use
 * this instead of squeezing an 9-column desktop table into a 320px viewport.
 */
export function RecordCard({
  title,
  subtitle,
  rows,
  badges,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  rows?: { label: string; value: ReactNode }[];
  badges?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="admin-card p-4">
      <div className="flex flex-col gap-1">
        <div className="text-sm font-medium break-anywhere text-[var(--admin-text)]">{title}</div>
        {subtitle && <div className="text-xs text-[var(--admin-text-muted)]">{subtitle}</div>}
      </div>
      {badges && <div className="mt-2 flex flex-wrap gap-1.5">{badges}</div>}
      {rows && rows.length > 0 && (
        <dl className="mt-3 grid grid-cols-[minmax(0,7rem)_1fr] gap-x-3 gap-y-1.5 text-xs">
          {rows.map((r) => (
            <div key={r.label} className="contents">
              <dt className="text-[var(--admin-text-muted)]">{r.label}</dt>
              <dd className="break-anywhere text-[var(--admin-text)]">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
