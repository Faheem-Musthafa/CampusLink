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
      <div className="flex h-screen items-center justify-center bg-linear-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-lg font-medium text-gray-700">Loading your workspace...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait a moment</p>
          {showTimeout && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg max-w-sm mx-auto">
              <p className="text-sm text-yellow-800">
                Taking longer than usual. Please check your internet connection.
              </p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 text-sm text-blue-600 hover:underline"
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content */}
        <main 
          id="main-content"
          className="flex-1 overflow-y-auto scroll-smooth"
        >
          <div className="container mx-auto px-8 py-8 max-w-[1400px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

