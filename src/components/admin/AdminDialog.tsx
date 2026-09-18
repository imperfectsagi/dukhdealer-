"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import AdminButton from "@/components/admin/AdminButton";
import { Notice } from "@/components/admin/AdminUI";

/**
 * Admin modal.
 *
 * Sized for a 320px phone first: full-width sheet pinned to the bottom of the
 * viewport on mobile, centred dialog from sm up. The panel itself is capped at
 * the visible height and scrolls internally, so the confirm/cancel buttons can
 * never end up below the fold — which is how the old inline confirm() flows
 * became unusable on mobile.
 */
export function AdminDialog({
  open,
  title,
  description,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Move focus into the dialog for keyboard and screen-reader users.
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative z-10 flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-2xl bg-[var(--admin-surface)] shadow-xl outline-none sm:max-h-[85dvh] sm:rounded-2xl"
      >
        <div className="border-b border-[var(--admin-border)] px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="text-base font-semibold text-[var(--admin-text)]">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{description}</p>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-[var(--admin-border)] px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/** Simple yes/no confirmation. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AdminDialog
      open={open}
      title={title}
      description={description}
      onClose={onClose}
      footer={
        <>
          <AdminButton variant="secondary" onClick={onClose} disabled={busy} block className="sm:w-auto">
            {cancelLabel}
          </AdminButton>
          <AdminButton
            variant={destructive ? "destructive" : "primary"}
            onClick={onConfirm}
            loading={busy}
            block
            className="sm:w-auto"
          >
            {confirmLabel}
          </AdminButton>
        </>
      }
    >
      {error ? <Notice tone="error">{error}</Notice> : null}
    </AdminDialog>
  );
}

/**
 * Destructive confirmation that requires the admin's own password.
 *
 * The password is only ever POSTed to the server for the one action that needs
 * it — it is never compared in the browser, never stored, and the field is
 * cleared as soon as the dialog closes.
 */
export function PasswordConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  busy = false,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  busy?: boolean;
  error?: string;
  onConfirm: (password: string) => void;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!open) setPassword("");
  }, [open]);

  const close = () => {
    setPassword("");
    onClose();
  };

  return (
    <AdminDialog
      open={open}
      title={title}
      description={description}
      onClose={close}
      footer={
        <>
          <AdminButton variant="secondary" onClick={close} disabled={busy} block className="sm:w-auto">
            Cancel
          </AdminButton>
          <AdminButton
            variant="destructive"
            onClick={() => onConfirm(password)}
            loading={busy}
            disabled={!password}
            block
            className="sm:w-auto"
          >
            {confirmLabel}
          </AdminButton>
        </>
      }
    >
      <div className="space-y-3">
        <Notice tone="warning">
          This action is destructive. The booking leaves normal booking history and an audit record
          is written.
        </Notice>
        <div>
          <label htmlFor="admin-password-confirm" className="block text-xs font-medium text-[var(--admin-text-muted)]">
            Re-enter your admin password to continue
          </label>
          <input
            id="admin-password-confirm"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && password && !busy) onConfirm(password);
            }}
            className="mt-1"
          />
        </div>
        {error ? <Notice tone="error">{error}</Notice> : null}
      </div>
    </AdminDialog>
  );
}
