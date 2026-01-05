"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileCheck,
  AlertTriangle,
  BarChart3,
  Share2,
  Upload,
  Trash2,
  Video,
  UserCircle2,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    sessionStorage.removeItem("adminAuthenticated");
    sessionStorage.removeItem("adminUsername");
    router.push("/admin/login");
  };

  const adminUsername = typeof window !== 'undefined' ? sessionStorage.getItem("adminUsername") : null;
  const userInitial = adminUsername ? adminUsername.charAt(0).toUpperCase() : "A";

  const sidebarLinks = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: "/admin/users",
      label: "Manage Users",
      icon: Users,
    },
    {
      href: "/admin/verifications",
      label: "Verifications",
      icon: FileCheck,
    },
    {
      href: "/admin/posts",
      label: "Job Posts",
      icon: BarChart3,
    },
    {
      href: "/admin/reports",
      label: "User Reports",
      icon: AlertTriangle,
    },
    {
      href: "/admin/activity-logs",
      label: "Activity Logs",
      icon: Share2,
    },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#0f1419] text-gray-100">
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-[#1a1f2e] border-b border-gray-800 z-50">
        <div className="h-full px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">AL</span>
            </div>
            <span className="text-xl font-semibold text-white">AlumniLink</span>
          </Link>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Welcome, <span className="text-white font-medium">{adminUsername || "admin"}</span></span>
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 hover:bg-gray-800/50 rounded-lg px-2 py-1 transition-colors"
              >
                <div className="w-8 h-8 bg-linear-to-br from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {userInitial}
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-[#1a1f2e] border border-gray-800 rounded-lg shadow-xl py-2 z-50">
                  <Link href="/dashboard">
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800/50 hover:text-white flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      User Dashboard
                    </button>
                  </Link>
                  <hr className="my-2 border-gray-800" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="fixed left-0 top-16 bottom-0 w-64 bg-[#1a1f2e] border-r border-gray-800 overflow-y-auto">
        <div className="p-4">
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Admin Navigation
            </h3>
          </div>
          
          <nav className="space-y-1">
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href, link.exact);
              
              return (
                <Link key={link.href} href={link.href}>
                  <button
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3",
                      active
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        : "text-gray-400 hover:bg-gray-800/50 hover:text-white border border-transparent"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{link.label}</span>
                  </button>
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 pt-6 border-t border-gray-800">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Quick Links
            </h3>
            <nav className="space-y-1">
              <Link href="/dashboard">
                <button
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800/50 hover:text-white transition-colors flex items-center gap-3 border border-transparent"
                  )}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  <span className="text-sm font-medium">User Dashboard</span>
                </button>
              </Link>

              <Link href="/profile">
                <button
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800/50 hover:text-white transition-colors flex items-center gap-3 border border-transparent"
                  )}
                >
                  <UserCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">My Profile</span>
                </button>
              </Link>
            </nav>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 mt-16 min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </div>
  );
}
