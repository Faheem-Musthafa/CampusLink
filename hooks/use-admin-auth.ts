"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

interface AdminAuthState {
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for admin authentication
 * Checks if current user has admin role in Firebase or fallback session
 */
export function useAdminAuth() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<AdminAuthState>({
    isAdmin: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    // Check for fallback admin session first
    const isFallbackAdmin = sessionStorage.getItem("adminFallback") === "true" && 
                            sessionStorage.getItem("adminAuthenticated") === "true";
    
    if (isFallbackAdmin) {
      setState({ isAdmin: true, isLoading: false, error: null });
      return;
    }

    if (authLoading) return;

    if (!user) {
      setState({ isAdmin: false, isLoading: false, error: "Not authenticated" });
      router.push("/admin/login");
      return;
    }

    // Check if user has admin role
    const isAdmin = user.role === "admin";
    
    if (!isAdmin) {
      setState({ isAdmin: false, isLoading: false, error: "Access denied" });
      router.push("/admin/login");
      return;
    }

    setState({ isAdmin: true, isLoading: false, error: null });
  }, [user, authLoading, router]);

  const logout = useCallback(() => {
    sessionStorage.removeItem("adminAuthenticated");
    sessionStorage.removeItem("adminFallback");
    router.push("/admin/login");
  }, [router]);

  return {
    ...state,
    user,
    logout,
  };
}

/**
 * Simple session-based admin auth for login page
 */
export function useAdminSession() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = sessionStorage.getItem("adminAuthenticated");
    setIsAuthenticated(session === "true");
    setIsLoading(false);
  }, []);

  const login = useCallback((success: boolean) => {
    if (success) {
      sessionStorage.setItem("adminAuthenticated", "true");
      setIsAuthenticated(true);
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("adminAuthenticated");
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, isLoading, login, logout };
}
