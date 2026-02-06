"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

interface AdminAuthState {
  isAdmin: boolean;
  isLoading: boolean;
  isAuthReady: boolean; // New: indicates Firebase Auth is ready for Firestore
  error: string | null;
}

/**
 * Hook for admin authentication
 * Checks if current user has admin role in Firebase or fallback session
 * IMPORTANT: isAuthReady must be true before making Firestore calls
 */
export function useAdminAuth() {
  const { user, firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<AdminAuthState>({
    isAdmin: false,
    isLoading: true,
    isAuthReady: false,
    error: null,
  });

  useEffect(() => {
    // Always wait for auth to finish loading first
    if (authLoading) {
      setState(prev => ({ ...prev, isLoading: true, isAuthReady: false }));
      return;
    }

    // Check for fallback admin session
    const isFallbackAdmin = sessionStorage.getItem("adminFallback") === "true" && 
                            sessionStorage.getItem("adminAuthenticated") === "true";
    
    if (isFallbackAdmin) {
      // Even for fallback, we need Firebase Auth to be ready for Firestore
      // The login page now ensures Firebase user is created/signed in
      if (firebaseUser && user?.role === "admin") {
        setState({ isAdmin: true, isLoading: false, isAuthReady: true, error: null });
        return;
      }
      
      // If we have fallback session but no Firebase user yet, keep waiting briefly
      // This handles the case where page refreshes and auth is still initializing
      if (!firebaseUser) {
        // Clear invalid fallback session if auth completed but no user
        sessionStorage.removeItem("adminAuthenticated");
        sessionStorage.removeItem("adminFallback");
        setState({ isAdmin: false, isLoading: false, isAuthReady: false, error: "Session expired" });
        router.push("/admin/login");
        return;
      }
    }

    if (!user) {
      setState({ isAdmin: false, isLoading: false, isAuthReady: false, error: "Not authenticated" });
      router.push("/admin/login");
      return;
    }

    // Check if user has admin role
    const isAdmin = user.role === "admin";
    
    if (!isAdmin) {
      setState({ isAdmin: false, isLoading: false, isAuthReady: false, error: "Access denied" });
      router.push("/admin/login");
      return;
    }

    // Firebase user is authenticated and has admin role - safe to make Firestore calls
    setState({ isAdmin: true, isLoading: false, isAuthReady: true, error: null });
  }, [user, firebaseUser, authLoading, router]);

  const logout = useCallback(async () => {
    sessionStorage.removeItem("adminAuthenticated");
    sessionStorage.removeItem("adminFallback");
    
    // Also sign out from Firebase Auth
    try {
      const { getAuth, signOut } = await import("firebase/auth");
      const auth = getAuth();
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
    
    router.push("/admin/login");
  }, [router]);

  return {
    ...state,
    user,
    firebaseUser,
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
