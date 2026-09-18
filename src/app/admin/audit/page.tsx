"use client";

import { useCallback, useEffect, useState } from "react";
import { useRequireAdmin } from "@/lib/use-require-admin";
import AdminButton from "@/components/admin/AdminButton";
import {
  AdminPageHeader,
  EmptyState,
  LoadingState,
  Notice,
} from "@/components/admin/AdminUI";
import type { AuditEntry } from "@/types";

const FILTERS = [
  { value: "", label: "All" },
  { value: "booking", label: "Bookings" },
  { value: "availability", label: "Availability" },
  { value: "package", label: "Packages" },
  { value: "banner", label: "Banners" },
  { value: "logo", label: "Logo" },
  { value: "theme", label: "Theme" },
  { value: "cms", label: "CMS" },
] as const;

/** Read-only audit trail of sensitive admin actions. */
export default function AdminAuditPage() {
  const authChecked = useRequireAdmin();
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [entityType, setEntityType] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (type: string) => {
    setEntries(null);
    try {
      const res = await fetch(`/api/admin/audit?limit=200${type ? `&entityType=${type}` : ""}`);
      setEntries(res.ok ? ((await res.json()) as AuditEntry[]) : []);
    } catch {
      setError("Couldn't load the audit log.");
      setEntries([]);
    }
  }, []);

  useEffect(() => {
    load(entityType);
  }, [entityType, load]);

  if (!authChecked) return null;

  return (
    <div className="animate-fade-in max-w-3xl space-y-5">
      <AdminPageHeader
        title="Audit Log"
        description="Who changed what, and when. Records are written automatically and cannot be edited."
      />

      {error && <Notice tone="error">{error}</Notice>}

      <div className="scroll-x -mx-1 flex gap-2 px-1 pb-1">
        {FILTERS.map((f) => (
          <AdminButton
            key={f.value}
            size="sm"
            variant={entityType === f.value ? "primary" : "secondary"}
            onClick={() => setEntityType(f.value)}
            className="shrink-0"
          >
            {f.label}
          </AdminButton>
        ))}
      </div>

      {entries === null ? (
        <LoadingState label="Loading audit log…" />
      ) : entries.length === 0 ? (
        <EmptyState
          title="Nothing recorded yet"
          description="Actions like approving a payment or deleting a booking will show up here."
        />
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.id} className="admin-card p-3 sm:p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <p className="break-anywhere text-sm text-[var(--admin-text)]">{e.summary}</p>
                <time
                  dateTime={e.createdAt}
                  className="shrink-0 text-xs text-[var(--admin-text-muted)]"
                >
                  {new Date(e.createdAt).toLocaleString("en-IN")}
                </time>
              </div>
              <p className="mt-1 break-anywhere text-xs text-[var(--admin-text-muted)]">
                {e.adminEmail || "system"} · {e.action}
                {e.entityId ? ` · ${e.entityId}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
