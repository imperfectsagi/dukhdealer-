"use client";

import { useEffect, useState } from "react";
import { useRequireAdmin } from "@/lib/use-require-admin";
import AdminButton from "@/components/admin/AdminButton";
import { AdminCard, AdminPageHeader, LoadingState, Notice, TextField } from "@/components/admin/AdminUI";

/** Change the admin username and password. The current password is always required. */
export default function AdminAccountPage() {
  const authChecked = useRequireAdmin();
  const [loaded, setLoaded] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/account")
      .then((res) => (res.ok ? (res.json() as Promise<{ email: string; username: string }>) : null))
      .then((data) => {
        if (data) {
          setEmail(data.email);
          setUsername(data.username);
        }
        setLoaded(true);
      })
      .catch(() => {
        setError("Couldn't load your account.");
        setLoaded(true);
      });
  }, []);

  const save = async () => {
    setError("");
    setFlash("");
    if (!currentPassword) {
      setError("Enter your current password to make changes.");
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          username,
          newPassword: newPassword || undefined,
          confirmPassword: newPassword ? confirmPassword : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        changed?: string[];
        username?: string;
      };
      if (!res.ok) {
        setError(data.error || "Your account could not be updated.");
        return;
      }
      if (data.username) setUsername(data.username);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFlash(`Saved: ${(data.changed || []).join(" and ")} updated. Use the new details next time you sign in.`);
    } catch {
      setError("Network error — nothing was changed.");
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked) return null;
  if (!loaded) return <LoadingState label="Loading account…" />;

  return (
    <div className="animate-fade-in max-w-xl space-y-5">
      <AdminPageHeader
        title="Account"
        description="Change the username and password you use to sign in to this panel."
      />

      {flash && <Notice tone="success">{flash}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <AdminCard title="Sign-in details">
        <div className="space-y-4">
          {email && (
            <p className="text-xs text-[var(--admin-text-muted)]">
              Account email: <span className="text-[var(--admin-text)]">{email}</span> (you can also sign in with it)
            </p>
          )}
          <TextField
            label="Username"
            value={username}
            onChange={setUsername}
            autoComplete="username"
            placeholder="3–32 characters, lowercase"
          />
          <TextField
            label="New password"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            placeholder="Leave blank to keep the current password"
          />
          {newPassword && (
            <TextField
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />
          )}
          <TextField
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
            required
            hint="required to save any change"
          />
          <AdminButton loading={saving} onClick={save} block className="sm:w-auto">
            Save account
          </AdminButton>
        </div>
      </AdminCard>
    </div>
  );
}
