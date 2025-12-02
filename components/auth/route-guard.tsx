"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/stores/useUserStore";
import { Skeleton } from "@/components/ui/skeleton";

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: ("super_admin" | "branch_admin" | "staff")[];
  redirectTo?: string;
}

/**
 * Route Guard Component
 * Protects routes based on user roles
 * 
 * @param allowedRoles - Array of roles that can access this route. If undefined, all authenticated users can access.
 * @param redirectTo - Where to redirect if access is denied. Defaults to "/orders"
 */
export function RouteGuard({
  children,
  allowedRoles,
  redirectTo = "/orders",
}: RouteGuardProps) {
  const { user } = useUserStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      // User not loaded yet, wait
      return;
    }

    // If allowedRoles is specified, check if user's role is allowed
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(user.role)) {
        // User doesn't have required role, redirect
        router.push(redirectTo);
      }
    }
  }, [user, allowedRoles, redirectTo, router]);

  // Show loading state while checking
  if (!user) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // If allowedRoles is specified and user doesn't have required role, show nothing (redirecting)
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      return (
        <div className="p-4 md:p-6">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm font-medium">
              Access Denied
            </p>
            <p className="text-yellow-600 text-xs mt-1">
              You don't have permission to access this page. Redirecting...
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

