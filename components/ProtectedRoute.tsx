"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode, requiredRole?: "admin" | "user" }) {
  const { session, loading, hasPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!session) {
        router.push("/login");
      } else if (requiredRole && session.user.role !== requiredRole) {
        // User doesn't have the required role
        router.push("/");
      } else if (!hasPermission(pathname)) {
        // User doesn't have module access
        router.push("/");
      }
    }
  }, [session, loading, pathname, requiredRole, router, hasPermission]);

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>; // Simple loading state
  }

  // Double check conditions before rendering
  if (requiredRole && session.user.role !== requiredRole) return null;
  if (!hasPermission(pathname)) return null;

  return <>{children}</>;
}
