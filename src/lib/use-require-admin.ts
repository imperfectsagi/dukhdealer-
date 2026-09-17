"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Client-side belt-and-suspenders check: confirms the session is actually
 * valid in D1 (not just "a cookie exists", which is all middleware checks)
 * before rendering admin content. Redirects to /admin/login if invalid.
 */
export function useRequireAdmin() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((res) => {
        if (!res.ok) {
          router.replace("/admin/login");
        } else {
          setChecked(true);
        }
      })
      .catch(() => router.replace("/admin/login"));
  }, [router]);

  return checked;
}
