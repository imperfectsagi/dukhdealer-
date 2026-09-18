"use client";

import { usePathname, useRouter } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // The login page renders its own full-screen layout with no sidebar/chrome.
  if (pathname === "/admin/login") {
    return <div className="admin-scope min-h-screen">{children}</div>;
  }

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return <AdminNav onLogout={logout}>{children}</AdminNav>;
}
