"use client";

import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "./sidebar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Show timeout message if loading takes too long (5 seconds)
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setShowTimeout(true), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowTimeout(false);
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-muted"></div>
            <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          </div>
          <p className="text-sm font-medium text-foreground">Loading...</p>
          <p className="text-xs text-muted-foreground mt-1">Please wait</p>
          {showTimeout && (
            <div className="mt-4 p-3 bg-muted rounded-lg max-w-sm mx-auto">
              <p className="text-sm text-muted-foreground">
                Taking longer than usual.
              </p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 text-sm text-primary hover:underline"
              >
                Refresh page
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-muted/30">
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main 
          id="main-content"
          className="flex-1 overflow-y-auto"
        >
          <div className="max-w-6xl mx-auto px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

