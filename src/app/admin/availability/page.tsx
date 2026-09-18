"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRequireAdmin } from "@/lib/use-require-admin";
import AdminButton from "@/components/admin/AdminButton";
import { ConfirmDialog } from "@/components/admin/AdminDialog";
import {
  AdminCard,
  AdminPageHeader,
  EmptyState,
  LoadingState,
  Notice,
  SelectField,
  TextField,
  ToggleField,
} from "@/components/admin/AdminUI";
import { formatDate, formatTime } from "@/lib/utils";
import { addDays } from "@/lib/timezone";
import type { AvailabilityWindow, Listener } from "@/types";

interface BusyBooking {
  bookingId: string;
  listenerId: string;
  date: string;
  time: string;
  duration: number;
  customerNickname: string;
}

interface Payload {
  windows: AvailabilityWindow[];
  listeners: Listener[];
  bookings: BusyBooking[];
  timezone: string;
  timezoneLabel: string;
}

/**
 * Availability Manager.
 *
 * This is the control customers are constrained by: if no open window exists
 * for a listener on a date, that date does not appear in the booking flow at
 * all. Blocks carve unavailable periods back out of an open window.
 *
 * Slot start times are derived server-side from these windows and the chosen
 * package duration, so a 10:00-13:00 window never offers 12:30 for a 60-minute
 * package.
 */
export default function AdminAvailabilityPage() {
  const authChecked = useRequireAdmin();

  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [saving, setSaving] = useState(false);

  const [listenerId, setListenerId] = useState("");
  const [date, setDate] = useState(() => addDays(new Date().toISOString().slice(0, 10), 1));
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("13:00");
  const [isBlock, setIsBlock] = useState(false);
  const [note, setNote] = useState("");
  const [repeatDays, setRepeatDays] = useState("1");
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<AvailabilityWindow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/availability");
      if (!res.ok) {
        setError("Couldn't load availability.");
        return;
      }
      const payload = (await res.json()) as Payload;
      setData(payload);
      setListenerId((current) => current || payload.listeners.find((l) => l.active)?.id || "");
    } catch {
      setError("Network error while loading availability.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showFlash = (message: string) => {
    setFlash(message);
    setTimeout(() => setFlash(""), 2500);
  };

  const create = async () => {
    setFormError("");
    if (!listenerId) {
      setFormError("Choose a listener first.");
      return;
    }
    if (endTime <= startTime) {
      setFormError("The end time must be later than the start time.");
      return;
    }

    // "Repeat for N days" so opening a week does not mean filling this form
    // seven times on a phone.
    const count = Math.max(1, Math.min(Number(repeatDays) || 1, 31));
    const dates = Array.from({ length: count }, (_, i) => addDays(date, i));

    setSaving(true);
    try {
      const res = await fetch("/api/admin/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listenerId,
          dates,
          startTime,
          endTime,
          kind: isBlock ? "block" : "open",
          note: note || undefined,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setFormError(body.error || "That window could not be saved.");
        return;
      }
      setNote("");
      showFlash(
        `${isBlock ? "Blocked" : "Opened"} ${formatTime(startTime)}–${formatTime(endTime)} on ${count} day${count === 1 ? "" : "s"}`
      );
      await load();
    } catch {
      setFormError("Network error — nothing was saved.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/admin/availability/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteTarget(null);
        showFlash("Availability window removed");
        await load();
      }
    } finally {
      setDeleteBusy(false);
    }
  };

  const listenerWindows = useMemo(() => {
    if (!data) return [];
    const today = new Date().toISOString().slice(0, 10);
    return data.windows
      .filter((w) => (listenerId ? w.listenerId === listenerId : true))
      .filter((w) => w.date >= today)
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  }, [data, listenerId]);

  const byDate = useMemo(() => {
    const map = new Map<string, AvailabilityWindow[]>();
    for (const w of listenerWindows) {
      map.set(w.date, [...(map.get(w.date) || []), w]);
    }
    return [...map.entries()];
  }, [listenerWindows]);

  if (!authChecked) return null;
  if (!data) return <LoadingState label="Loading availability…" />;

  const listenerOptions = data.listeners.map((l) => ({
    value: l.id,
    label: l.active ? l.nickname : `${l.nickname} (inactive)`,
  }));

  return (
    <div className="animate-fade-in max-w-3xl space-y-5">
      <AdminPageHeader
        title="Availability"
        description={`Customers can only book inside the windows you open here. All times are ${data.timezone} (${data.timezoneLabel}).`}
      />

      {error && <Notice tone="error">{error}</Notice>}
      {flash && <Notice tone="success">{flash}</Notice>}

      {data.listeners.length === 0 ? (
        <EmptyState
          title="No listeners yet"
          description="Add and approve a listener before opening availability."
        />
      ) : (
        <AdminCard title="Open or block a time window">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label="Listener"
              value={listenerId}
              onChange={setListenerId}
              options={listenerOptions}
              required
            />
            <TextField label="Date" type="date" value={date} onChange={setDate} required />
            <TextField label="Start time" type="time" value={startTime} onChange={setStartTime} required />
            <TextField label="End time" type="time" value={endTime} onChange={setEndTime} required />
            <TextField
              label="Repeat for"
              type="number"
              min={1}
              max={31}
              value={repeatDays}
              onChange={setRepeatDays}
              hint="days, starting on the date above"
            />
            <TextField label="Note" value={note} onChange={setNote} hint="optional, admin only" />
          </div>

          <div className="mt-4">
            <ToggleField
              label="This is an unavailable period"
              description="Blocks are cut out of any open window that overlaps them — use this for breaks or leave."
              checked={isBlock}
              onChange={setIsBlock}
            />
          </div>

          {formError && (
            <div className="mt-3">
              <Notice tone="error">{formError}</Notice>
            </div>
          )}

          <div className="mt-4">
            <AdminButton loading={saving} onClick={create} block className="sm:w-auto">
              {isBlock ? "Block this period" : "Open this window"}
            </AdminButton>
          </div>
        </AdminCard>
      )}

      <AdminCard
        title="Upcoming windows"
        description={listenerId ? undefined : "Showing every listener."}
      >
        {byDate.length === 0 ? (
          <EmptyState
            title="Nothing open yet"
            description="Until you open a window, customers cannot select any date or time."
          />
        ) : (
          <div className="space-y-5">
            {byDate.map(([day, windows]) => {
              const dayBookings = data.bookings.filter(
                (b) => b.date === day && (!listenerId || b.listenerId === listenerId)
              );
              return (
                <div key={day}>
                  <h3 className="mb-2 text-sm font-medium text-[var(--admin-text)]">
                    {formatDate(day)}
                  </h3>
                  <ul className="space-y-2">
                    {windows.map((w) => {
                      const listener = data.listeners.find((l) => l.id === w.listenerId);
                      return (
                        <li
                          key={w.id}
                          className="flex flex-col gap-2 rounded-lg border border-[var(--admin-border)] p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="text-sm text-[var(--admin-text)]">
                              <span
                                className={
                                  w.kind === "block"
                                    ? "font-medium text-[var(--admin-destructive-bg)]"
                                    : "font-medium text-[var(--admin-activate-text)]"
                                }
                              >
                                {w.kind === "block" ? "Blocked" : "Open"}
                              </span>{" "}
                              {formatTime(w.startTime)} – {formatTime(w.endTime)}
                            </p>
                            <p className="text-xs text-[var(--admin-text-muted)]">
                              {listener?.nickname || w.listenerId}
                              {w.note ? ` · ${w.note}` : ""}
                            </p>
                          </div>
                          <AdminButton
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteTarget(w)}
                            className="sm:shrink-0"
                          >
                            Remove
                          </AdminButton>
                        </li>
                      );
                    })}
                  </ul>
                  {dayBookings.length > 0 && (
                    <p className="mt-2 text-xs text-[var(--admin-text-muted)]">
                      Already booked:{" "}
                      {dayBookings
                        .map((b) => `${formatTime(b.time)} (${b.duration}m, ${b.customerNickname})`)
                        .join(" · ")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </AdminCard>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove this window?"
        description={
          deleteTarget
            ? `${formatDate(deleteTarget.date)}, ${formatTime(deleteTarget.startTime)}–${formatTime(deleteTarget.endTime)}. Existing bookings are not affected, but no new bookings can be made in this period.`
            : undefined
        }
        confirmLabel="Remove"
        destructive
        busy={deleteBusy}
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
