"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileCheck,
  AlertTriangle,
  Briefcase,
  Activity,
  UserCircle2,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Shield,
  Bell,
  Search,
  Settings,
  ChevronRight,
  GraduationCap,
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("adminAuthenticated");
    sessionStorage.removeItem("adminUsername");
    router.push("/admin/login");
  };

  const adminUsername = mounted && typeof window !== 'undefined' ? sessionStorage.getItem("adminUsername") : null;
  const userInitial = adminUsername ? adminUsername.charAt(0).toUpperCase() : "A";

  const sidebarLinks = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: LayoutDashboard,
      exact: true,
      description: "Overview & analytics",
    },
    {
      href: "/admin/users",
      label: "Users",
      icon: Users,
      description: "Manage user accounts",
    },
    {
      href: "/admin/verifications",
      label: "Verifications",
      icon: FileCheck,
      description: "Review ID requests",
    },
    {
      href: "/admin/verified-alumni",
      label: "Alumni Database",
      icon: GraduationCap,
      description: "Manage verified admissions",
    },
    {
      href: "/admin/posts",
      label: "Job Posts",
      icon: Briefcase,
      description: "Manage job listings",
    },
    {
      href: "/admin/reports",
      label: "Reports",
      icon: AlertTriangle,
      description: "Handle user reports",
    },
    {
      href: "/admin/activity-logs",
      label: "Activity Logs",
      icon: Activity,
      description: "Track admin actions",
    },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname?.startsWith(href) && pathname !== "/admin";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-gray-100">
      {/* Animated Background Pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-blue-500/5 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-purple-500/5 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 z-50">
        <div className="h-full px-4 lg:px-6 flex items-center justify-between">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo */}
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                <span className="text-[8px] font-bold text-white">A</span>
              </div>
            </div>
            <div className="hidden md:block">
              <span className="text-lg font-bold text-white">AlumniLink</span>
              <span className="text-xs text-blue-400 block -mt-0.5">Admin Portal</span>
            </div>
          </Link>

          {/* Search Bar - Hidden on mobile */}
          <div className="hidden lg:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search users, posts, reports..."
                className="w-full h-10 pl-10 pr-4 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">⌘K</kbd>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Notifications */}
            <button className="relative p-2 hover:bg-slate-800/50 rounded-xl transition-colors group">
              <Bell className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </button>

            {/* Settings */}
            <button className="hidden md:block p-2 hover:bg-slate-800/50 rounded-xl transition-colors group">
              <Settings className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
            </button>

            {/* Divider */}
            <div className="hidden md:block h-8 w-px bg-slate-700/50" />

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 hover:bg-slate-800/50 rounded-xl px-2 py-1.5 transition-all"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-pink-500/20">
                  {userInitial}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-white">{adminUsername || "Admin"}</p>
                  <p className="text-[10px] text-slate-400 -mt-0.5">Administrator</p>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 text-slate-400 transition-transform duration-200",
                  showUserMenu && "rotate-180"
                )} />
              </button>
              
              {showUserMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowUserMenu(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-slate-700/50">
                      <p className="text-sm font-medium text-white">{adminUsername || "Admin"}</p>
                      <p className="text-xs text-slate-400">admin@alumnilink.com</p>
                    </div>
                    <div className="py-2">
                      <Link href="/dashboard">
                        <button className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white flex items-center gap-3 transition-colors">
                          <LayoutDashboard className="h-4 w-4" />
                          User Dashboard
                          <ChevronRight className="h-4 w-4 ml-auto text-slate-500" />
                        </button>
                      </Link>
                      <Link href="/profile">
                        <button className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white flex items-center gap-3 transition-colors">
                          <UserCircle2 className="h-4 w-4" />
                          My Profile
                          <ChevronRight className="h-4 w-4 ml-auto text-slate-500" />
                        </button>
                      </Link>
                    </div>
                    <div className="pt-2 border-t border-slate-700/50">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-3 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-16 bottom-0 w-72 bg-slate-900/80 backdrop-blur-xl border-r border-slate-700/50 overflow-y-auto z-40 transition-transform duration-300 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-4 lg:p-6">
          {/* Admin Badge */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Admin Mode</p>
                <p className="text-xs text-slate-400">Full access enabled</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="mb-6">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-3">
              Main Navigation
            </h3>
            <nav className="space-y-1">
              {sidebarLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.href, link.exact);
                
                return (
                  <Link key={link.href} href={link.href} onClick={() => setSidebarOpen(false)}>
                    <div
                      className={cn(
                        "group relative px-3 py-3 rounded-xl transition-all duration-200 flex items-center gap-3",
                        active
                          ? "bg-gradient-to-r from-blue-500/20 via-blue-500/10 to-transparent text-white"
                          : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                      )}
                    >
                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-blue-600 rounded-r-full" />
                      )}
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
                        active
                          ? "bg-blue-500/20"
                          : "bg-slate-800/50 group-hover:bg-slate-700/50"
                      )}>
                        <Icon className={cn(
                          "h-5 w-5 transition-colors",
                          active ? "text-blue-400" : "text-slate-400 group-hover:text-white"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">{link.label}</span>
                        <span className="text-[10px] text-slate-500 truncate block">{link.description}</span>
                      </div>
                      {active && (
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Quick Links */}
          <div className="pt-6 border-t border-slate-700/50">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-3">
              Quick Actions
            </h3>
            <nav className="space-y-1">
              <Link href="/dashboard" onClick={() => setSidebarOpen(false)}>
                <div className="group px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800/50 group-hover:bg-slate-700/50 flex items-center justify-center transition-all">
                    <LayoutDashboard className="h-4 w-4" />
                  </div>
                  <span className="text-sm">User Dashboard</span>
                </div>
              </Link>
              <Link href="/profile" onClick={() => setSidebarOpen(false)}>
                <div className="group px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800/50 group-hover:bg-slate-700/50 flex items-center justify-center transition-all">
                    <UserCircle2 className="h-4 w-4" />
                  </div>
                  <span className="text-sm">My Profile</span>
                </div>
              </Link>
            </nav>
          </div>

          {/* Version Info */}
          <div className="mt-8 p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Version</span>
              <span className="text-slate-400 font-mono">2.0.0</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-slate-500">Status</span>
              <span className="flex items-center gap-1 text-green-400">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                Online
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "min-h-screen pt-16 transition-all duration-300",
        "lg:ml-72"
      )}>
        <div className="relative">
          {children}
        </div>
      </main>
    </div>
  );
}
