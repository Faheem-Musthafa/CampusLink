"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  GraduationCap,
  Flag,
  Briefcase,
  UserCheck,
  Clock,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase/config";
import { PageHeader, StatsCard, StatsGrid } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/hooks/use-admin-auth";

interface DashboardStats {
  totalUsers: number;
  pendingVerifications: number;
  activeJobs: number;
  totalReports: number;
  verifiedAlumni: number;
  approvedUsers: number;
}

interface QuickAction {
  label: string;
  count: number;
  href: string;
  color: "cyan" | "orange" | "purple" | "red";
}

export default function AdminDashboard() {
  const { isAuthReady } = useAdminAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    pendingVerifications: 0,
    activeJobs: 0,
    totalReports: 0,
    verifiedAlumni: 0,
    approvedUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch data when Firebase Auth is ready
    if (!isAuthReady) return;

    async function fetchStats() {
      try {
        const db = getDb();

        // Fetch all stats in parallel
        const [
          usersSnap,
          pendingSnap,
          jobsSnap,
          reportsSnap,
          alumniSnap,
          approvedSnap,
        ] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(query(collection(db, "verificationRequests"), where("status", "==", "pending"))),
          getDocs(collection(db, "jobPostings")),
          getDocs(collection(db, "userReports")),
          getDocs(collection(db, "verifiedAlumni")),
          getDocs(query(collection(db, "users"), where("verificationStatus", "==", "approved"))),
        ]);

        setStats({
          totalUsers: usersSnap.size,
          pendingVerifications: pendingSnap.size,
          activeJobs: jobsSnap.size,
          totalReports: reportsSnap.size,
          verifiedAlumni: alumniSnap.size,
          approvedUsers: approvedSnap.size,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [isAuthReady]);

  const quickActions: QuickAction[] = [
    {
      label: "Pending Verifications",
      count: stats.pendingVerifications,
      href: "/admin/verifications",
      color: "orange",
    },
    {
      label: "Open Reports",
      count: stats.totalReports,
      href: "/admin/reports",
      color: "red",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description="Overview of your platform"
      />

      {/* Stats Grid */}
      <StatsGrid columns={4}>
        <StatsCard
          title="Total Users"
          value={loading ? "..." : stats.totalUsers}
          icon={Users}
          color="cyan"
        />
        <StatsCard
          title="Verified Users"
          value={loading ? "..." : stats.approvedUsers}
          icon={UserCheck}
          color="green"
          description={`${stats.totalUsers > 0 ? Math.round((stats.approvedUsers / stats.totalUsers) * 100) : 0}% of total`}
        />
        <StatsCard
          title="Pending Verifications"
          value={loading ? "..." : stats.pendingVerifications}
          icon={Clock}
          color="orange"
        />
        <StatsCard
          title="Active Jobs"
          value={loading ? "..." : stats.activeJobs}
          icon={Briefcase}
          color="purple"
        />
      </StatsGrid>

      {/* Second Row */}
      <StatsGrid columns={3}>
        <StatsCard
          title="Alumni Database"
          value={loading ? "..." : stats.verifiedAlumni}
          icon={GraduationCap}
          color="blue"
          description="Pre-verified records"
        />
        <StatsCard
          title="User Reports"
          value={loading ? "..." : stats.totalReports}
          icon={Flag}
          color="red"
        />
        <StatsCard
          title="Verification Rate"
          value={loading ? "..." : `${stats.totalUsers > 0 ? Math.round((stats.approvedUsers / stats.totalUsers) * 100) : 0}%`}
          icon={TrendingUp}
          color="green"
        />
      </StatsGrid>

      {/* Quick Actions */}
      {quickActions.some((a) => a.count > 0) && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <h2 className="text-sm font-medium text-slate-400 mb-3">
            Requires Attention
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {quickActions
              .filter((a) => a.count > 0)
              .map((action) => (
                <Link key={action.href} href={action.href}>
                  <div
                    className={`
                      flex items-center justify-between p-4 rounded-lg border
                      transition-colors hover:bg-slate-800/50
                      ${action.color === "orange" ? "border-orange-500/20 bg-orange-500/5" : ""}
                      ${action.color === "red" ? "border-red-500/20 bg-red-500/5" : ""}
                    `}
                  >
                    <div>
                      <p className="text-sm text-slate-400">{action.label}</p>
                      <p
                        className={`text-2xl font-bold ${
                          action.color === "orange" ? "text-orange-400" : "text-red-400"
                        }`}
                      >
                        {action.count}
                      </p>
                    </div>
                    <ArrowRight
                      className={`w-5 h-5 ${
                        action.color === "orange" ? "text-orange-400" : "text-red-400"
                      }`}
                    />
                  </div>
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* Quick Navigation */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
        <h2 className="text-sm font-medium text-slate-400 mb-3">
          Quick Navigation
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/admin/users">
            <Button
              variant="outline"
              className="w-full justify-start bg-slate-800/50 border-slate-700 hover:bg-slate-700"
            >
              <Users className="w-4 h-4 mr-2 text-cyan-400" />
              Manage Users
            </Button>
          </Link>
          <Link href="/admin/verifications">
            <Button
              variant="outline"
              className="w-full justify-start bg-slate-800/50 border-slate-700 hover:bg-slate-700"
            >
              <ShieldCheck className="w-4 h-4 mr-2 text-green-400" />
              Verifications
            </Button>
          </Link>
          <Link href="/admin/alumni-database">
            <Button
              variant="outline"
              className="w-full justify-start bg-slate-800/50 border-slate-700 hover:bg-slate-700"
            >
              <GraduationCap className="w-4 h-4 mr-2 text-purple-400" />
              Alumni Database
            </Button>
          </Link>
          <Link href="/admin/content">
            <Button
              variant="outline"
              className="w-full justify-start bg-slate-800/50 border-slate-700 hover:bg-slate-700"
            >
              <Briefcase className="w-4 h-4 mr-2 text-orange-400" />
              Manage Content
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
