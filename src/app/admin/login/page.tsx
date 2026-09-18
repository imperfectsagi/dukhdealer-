"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminButton from "@/components/admin/AdminButton";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error || "Invalid email or password");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--admin-bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-[var(--admin-primary-bg)]">Dukh Admin</h1>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">Sign in to manage the site</p>
        </div>
        <form
          onSubmit={submit}
          className="admin-card space-y-4 p-6"
        >
          {error && (
            <div role="alert" className="rounded-lg border border-[#F0C9C8] bg-[#FBEAEA] px-3 py-2 text-sm text-[#9A2F2C]">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="admin-email" className="text-xs font-medium text-[var(--admin-text-muted)]">Email</label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="username"
              className="mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="text-xs font-medium text-[var(--admin-text-muted)]">Password</label>
            <input
              id="admin-password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <AdminButton type="submit" block loading={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </AdminButton>
        </form>
        <p className="mt-4 text-center text-xs text-[var(--admin-text-muted)]">
          No account yet? Run the one-time setup — see README.md &quot;First deploy&quot;.
        </p>
      </div>
    </div>
  );
}
