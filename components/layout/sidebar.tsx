"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { signOut } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Briefcase,
  User,
  Settings,
  LogOut,
  GraduationCap,
  FileText,
  PlusCircle,
  Folder,
  ChevronRight,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { subscribeToUnreadCount } from "@/lib/firebase/chat";

const navigation = {
  student: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, color: "from-blue-500 to-blue-600", badge: null, description: "Overview", dynamic: false },
    { name: "Feed", href: "/posts", icon: Sparkles, color: "from-violet-500 to-purple-600", badge: null, description: "Share & Connect", dynamic: false },
    { name: "Browse Users", href: "/users", icon: Users, color: "from-purple-500 to-purple-600", badge: null, description: "Connect", dynamic: false },
    { name: "Find Mentors", href: "/mentorship", icon: GraduationCap, color: "from-green-500 to-green-600", badge: null, description: "Learn", dynamic: false },
    { name: "Messages", href: "/chat", icon: MessageSquare, color: "from-pink-500 to-pink-600", badge: null, description: "Chat", dynamic: true },
    { name: "Browse Jobs", href: "/jobs", icon: Briefcase, color: "from-orange-500 to-orange-600", badge: null, description: "Career", dynamic: false },
    { name: "My Applications", href: "/jobs/my-applications", icon: FileText, color: "from-indigo-500 to-indigo-600", badge: null, description: "Track", dynamic: false },
    { name: "Profile", href: "/profile", icon: User, color: "from-cyan-500 to-cyan-600", badge: null, description: "You", dynamic: false },
    { name: "Settings", href: "/settings", icon: Settings, color: "from-gray-500 to-gray-600", badge: null, description: "Preferences", dynamic: false },
  ],
  alumni: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, color: "from-blue-500 to-blue-600", badge: null, description: "Overview", dynamic: false },
    { name: "Feed", href: "/posts", icon: Sparkles, color: "from-violet-500 to-purple-600", badge: null, description: "Share & Connect", dynamic: false },
    { name: "Browse Users", href: "/users", icon: Users, color: "from-purple-500 to-purple-600", badge: null, description: "Network", dynamic: false },
    { name: "Mentorship Requests", href: "/mentorship", icon: GraduationCap, color: "from-green-500 to-green-600", badge: null, description: "Guide", dynamic: false },
    { name: "Messages", href: "/chat", icon: MessageSquare, color: "from-pink-500 to-pink-600", badge: null, description: "Chat", dynamic: true },
    { name: "Post a Job", href: "/jobs/create", icon: PlusCircle, color: "from-emerald-500 to-emerald-600", badge: null, description: "Recruit", dynamic: false },
    { name: "My Job Posts", href: "/jobs/my-posts", icon: Folder, color: "from-amber-500 to-amber-600", badge: null, description: "Manage", dynamic: false },
    { name: "Profile", href: "/profile", icon: User, color: "from-cyan-500 to-cyan-600", badge: null, description: "You", dynamic: false },
    { name: "Settings", href: "/settings", icon: Settings, color: "from-gray-500 to-gray-600", badge: null, description: "Preferences", dynamic: false },
  ],
  aspirant: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, color: "from-blue-500 to-blue-600", badge: null, description: "Overview", dynamic: false },
    { name: "Feed", href: "/posts", icon: Sparkles, color: "from-violet-500 to-purple-600", badge: null, description: "Share & Connect", dynamic: false },
    { name: "Browse Students", href: "/users", icon: Users, color: "from-purple-500 to-purple-600", badge: null, description: "Connect", dynamic: false },
    { name: "Find Mentors", href: "/mentorship", icon: GraduationCap, color: "from-green-500 to-green-600", badge: null, description: "Guidance", dynamic: false },
    { name: "Messages", href: "/chat", icon: MessageSquare, color: "from-pink-500 to-pink-600", badge: null, description: "Chat", dynamic: true },
    { name: "Profile", href: "/profile", icon: User, color: "from-cyan-500 to-cyan-600", badge: null, description: "You", dynamic: false },
    { name: "Settings", href: "/settings", icon: Settings, color: "from-gray-500 to-gray-600", badge: null, description: "Preferences", dynamic: false },
  ],
  admin: [
    { name: "Admin Panel", href: "/admin", icon: Settings, color: "from-red-500 to-red-600", badge: null, description: "Control", dynamic: false },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, color: "from-blue-500 to-blue-600", badge: null, description: "Overview", dynamic: false },
    { name: "Feed", href: "/posts", icon: Sparkles, color: "from-violet-500 to-purple-600", badge: null, description: "Share & Connect", dynamic: false },
    { name: "Messages", href: "/chat", icon: MessageSquare, color: "from-pink-500 to-pink-600", badge: null, description: "Chat", dynamic: true },
    { name: "Profile", href: "/profile", icon: User, color: "from-cyan-500 to-cyan-600", badge: null, description: "You", dynamic: false },
  ],
};

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const router = useRouter();
  const [userRole, setUserRole] = useState<"student" | "alumni" | "aspirant" | "admin" | null>(null);
  const [isRoleLoaded, setIsRoleLoaded] = useState(false);
  
  const isFetchingRef = useRef(false);
  
  const [unreadCount, setUnreadCount] = useState(0);

  // Memoize userId to prevent unnecessary re-renders
  const userId = useMemo(() => user?.uid || null, [user?.uid]);

  // Load cached role immediately on mount to prevent flicker
  useEffect(() => {
    const cachedRole = localStorage.getItem('userRole');
    if (cachedRole && ['student', 'alumni', 'aspirant', 'admin'].includes(cachedRole)) {
      setUserRole(cachedRole as "student" | "alumni" | "aspirant" | "admin");
    }
  }, []);

  useEffect(() => {
    // Always fetch user role when user changes
    if (userId && !isFetchingRef.current) {
      isFetchingRef.current = true;
      
      import("@/lib/firebase/auth").then(({ getUserData }) => {
        getUserData(userId)
          .then((userData) => {
            if (userData?.role) {
              // Map mentor role to alumni (mentor uses same navigation as alumni)
              const role = userData.role === 'mentor' ? 'alumni' : userData.role;
              if (['student', 'alumni', 'aspirant', 'admin'].includes(role)) {
                setUserRole(role as "student" | "alumni" | "aspirant" | "admin");
                localStorage.setItem('userRole', role);
              }
            }
            setIsRoleLoaded(true);
          })
          .catch(() => {
            // Fallback to cached role if fetch fails
            const cachedRole = localStorage.getItem('userRole');
            if (cachedRole && ['student', 'alumni', 'aspirant', 'admin'].includes(cachedRole)) {
              setUserRole(cachedRole as "student" | "alumni" | "aspirant" | "admin");
            } else {
              setUserRole('student'); // Default fallback
            }
            setIsRoleLoaded(true);
          })
          .finally(() => {
            isFetchingRef.current = false;
          });
      });
    } else if (!userId) {
      setIsRoleLoaded(false);
      setUserRole(null);
    }
  }, [userId]);

  // Subscribe to unread message count - only when user is authenticated and role is loaded
  useEffect(() => {
    if (!userId || !isRoleLoaded) {
      setUnreadCount(0);
      return;
    }

    let unsubscribe: (() => void) | null = null;
    
    // Small delay to ensure Firebase auth is fully ready
    const timeoutId = setTimeout(() => {
      try {
        unsubscribe = subscribeToUnreadCount(userId, (count) => {
          setUnreadCount(count);
        });
      } catch (error) {
        console.error("Failed to subscribe to unread count:", error);
        setUnreadCount(0);
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (unsubscribe) unsubscribe();
    };
  }, [userId, isRoleLoaded]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    localStorage.removeItem('userRole');
    router.push("/login");
  }, [router]);

  // Don't render until user is available
  if (!user) return null;
  
  // Show minimal loading state while role is being determined
  if (!userRole) {
    return (
      <div className="flex h-screen w-72 flex-col bg-white border-r border-gray-100 shadow-sm overflow-hidden">
        <div className="relative h-24 flex items-center px-6 border-b border-gray-100 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"></div>
          <div className="relative flex items-center gap-3 z-10">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                CampusLink
              </h1>
              <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Loading...
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse flex flex-col gap-3 w-full px-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Memoize navigation items to prevent recalculation
  const navItems = navigation[userRole] || navigation.student;

  return (
    <div className="flex h-screen w-64 flex-col bg-card border-r border-border">
      {/* Header */}
      <div className="h-16 flex items-center px-4 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">CampusLink</span>
        </Link>
      </div>

      {/* User Card */}
      <div className="p-3 border-b border-border">
        <Link href="/profile" className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.photoURL || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
              {user.displayName?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user.displayName || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate capitalize">{userRole}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            const showBadge = item.dynamic ? unreadCount > 0 : item.badge && item.badge > 0;
            const badgeCount = item.dynamic ? unreadCount : item.badge;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 truncate">{item.name}</span>
                
                {showBadge && (
                  <Badge 
                    variant={isActive ? "secondary" : "default"}
                    className={cn(
                      "h-5 min-w-5 px-1.5 text-xs",
                      isActive 
                        ? "bg-primary-foreground/20 text-primary-foreground" 
                        : "bg-primary text-primary-foreground"
                    )}
                  >
                    {badgeCount && badgeCount > 99 ? "99+" : badgeCount}
                  </Badge>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Sign Out */}
      <div className="p-3 border-t border-border">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

