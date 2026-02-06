"use client";

import { useState, useEffect, useMemo } from "react";
import { Flag, Check, X, Eye, MessageSquare, User } from "lucide-react";
import { collection, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase/config";
import { PageHeader, DataTable, SearchFilter, StatsCard, StatsGrid } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { logAdminActivity } from "@/lib/firebase/adminLogs";
import { useAdminAuth } from "@/hooks/use-admin-auth";

interface Report {
  id: string;
  type: "user" | "chat";
  reporterId: string;
  reporterName?: string;
  reportedId: string;
  reportedName?: string;
  reason: string;
  description?: string;
  status: string;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  actionTaken?: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  resolved: "bg-green-500/20 text-green-400 border-green-500/30",
  dismissed: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const typeColors: Record<string, string> = {
  user: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  chat: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export default function ReportsPage() {
  const { user: adminUser, isAuthReady } = useAdminAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // View dialog
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isAuthReady) return;
    fetchReports();
  }, [isAuthReady]);

  async function fetchReports() {
    try {
      const db = getDb();

      // Fetch both user reports and chat reports
      const [userReportsSnap, chatReportsSnap] = await Promise.all([
        getDocs(collection(db, "userReports")),
        getDocs(collection(db, "chatReports")),
      ]);

      const userReports = userReportsSnap.docs.map((doc) => ({
        id: doc.id,
        type: "user" as const,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      }));

      const chatReports = chatReportsSnap.docs.map((doc) => ({
        id: doc.id,
        type: "chat" as const,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      }));

      const allReports = [...userReports, ...chatReports].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      ) as Report[];

      setReports(allReports);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  }

  // Stats
  const stats = useMemo(() => {
    const pending = reports.filter((r) => r.status === "pending").length;
    const resolved = reports.filter((r) => r.status === "resolved").length;
    const dismissed = reports.filter((r) => r.status === "dismissed").length;
    return { total: reports.length, pending, resolved, dismissed };
  }, [reports]);

  // Filter
  const filteredReports = useMemo(() => {
    return reports.filter((rep) => {
      const matchesSearch =
        !search ||
        rep.reporterName?.toLowerCase().includes(search.toLowerCase()) ||
        rep.reportedName?.toLowerCase().includes(search.toLowerCase()) ||
        rep.reason?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || rep.status === statusFilter;
      const matchesType = typeFilter === "all" || rep.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [reports, search, statusFilter, typeFilter]);

  // Paginate
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReports.slice(start, start + pageSize);
  }, [filteredReports, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredReports.length / pageSize) || 1;

  // Handle resolve/dismiss
  async function handleAction(resolved: boolean) {
    if (!selectedReport) return;
    setProcessing(true);

    try {
      const db = getDb();
      const collection = selectedReport.type === "user" ? "userReports" : "chatReports";
      const status = resolved ? "resolved" : "dismissed";

      await updateDoc(doc(db, collection, selectedReport.id), {
        status,
        resolvedBy: adminUser?.uid,
        resolvedAt: serverTimestamp(),
        actionTaken: actionNote || null,
        updatedAt: serverTimestamp(),
      });

      await logAdminActivity({
        adminId: adminUser?.uid || "",
        adminEmail: adminUser?.email || "",
        action: resolved ? "resolve_report" : "dismiss_report",
        targetType: "report",
        targetId: selectedReport.id,
        details: `${resolved ? "Resolved" : "Dismissed"} ${selectedReport.type} report: ${actionNote || "No notes"}`,
      });

      setReports((prev) =>
        prev.map((r) =>
          r.id === selectedReport.id ? { ...r, status } : r
        )
      );
      setSelectedReport(null);
      setActionNote("");
    } catch (error) {
      console.error("Error processing report:", error);
    } finally {
      setProcessing(false);
    }
  }

  const columns = [
    {
      key: "type",
      label: "Type",
      render: (rep: Report) => (
        <Badge className={typeColors[rep.type]}>
          {rep.type === "user" ? <User className="w-3 h-3 mr-1" /> : <MessageSquare className="w-3 h-3 mr-1" />}
          {rep.type}
        </Badge>
      ),
    },
    {
      key: "reportedName",
      label: "Reported",
      render: (rep: Report) => (
        <span className="text-slate-200">{rep.reportedName || rep.reportedId || "-"}</span>
      ),
    },
    {
      key: "reason",
      label: "Reason",
      render: (rep: Report) => (
        <span className="text-slate-300 truncate max-w-xs block">{rep.reason}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (rep: Report) => (
        <Badge className={statusColors[rep.status] || statusColors.pending}>
          {rep.status}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Reported",
      render: (rep: Report) => (
        <span className="text-slate-400">
          {rep.createdAt.toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (rep: Report) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedReport(rep);
          }}
          className="text-slate-400 hover:text-cyan-400"
        >
          <Eye className="w-4 h-4 mr-1" />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Flag}
        title="Reports"
        description="Manage user and chat reports"
        iconColor="orange"
      />

      {/* Stats */}
      <StatsGrid columns={4}>
        <StatsCard title="Total" value={stats.total} icon={Flag} color="cyan" />
        <StatsCard title="Pending" value={stats.pending} icon={Flag} color="orange" />
        <StatsCard title="Resolved" value={stats.resolved} icon={Check} color="green" />
        <StatsCard title="Dismissed" value={stats.dismissed} icon={X} color="red" />
      </StatsGrid>

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search reports..."
        filters={[
          {
            key: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "all", label: "All Status" },
              { value: "pending", label: "Pending" },
              { value: "resolved", label: "Resolved" },
              { value: "dismissed", label: "Dismissed" },
            ],
          },
          {
            key: "type",
            label: "Type",
            value: typeFilter,
            onChange: setTypeFilter,
            options: [
              { value: "all", label: "All Types" },
              { value: "user", label: "User Reports" },
              { value: "chat", label: "Chat Reports" },
            ],
          },
        ]}
        onClear={() => {
          setSearch("");
          setStatusFilter("pending");
          setTypeFilter("all");
        }}
      />

      <DataTable
        columns={columns}
        data={paginatedReports}
        loading={loading}
        emptyMessage="No reports found"
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={filteredReports.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
      />

      {/* View Report Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Report Details</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Type</p>
                  <Badge className={typeColors[selectedReport.type]}>
                    {selectedReport.type}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Status</p>
                  <Badge className={statusColors[selectedReport.status]}>
                    {selectedReport.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Reporter</p>
                  <p className="text-slate-200">{selectedReport.reporterName || selectedReport.reporterId}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Reported User</p>
                  <p className="text-slate-200">{selectedReport.reportedName || selectedReport.reportedId}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-400">Reason</p>
                <p className="text-slate-200">{selectedReport.reason}</p>
              </div>

              {selectedReport.description && (
                <div>
                  <p className="text-sm text-slate-400">Description</p>
                  <p className="text-slate-300">{selectedReport.description}</p>
                </div>
              )}

              {/* Actions for pending reports */}
              {selectedReport.status === "pending" && (
                <div className="border-t border-slate-800 pt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Action Notes
                    </label>
                    <Textarea
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      placeholder="Enter notes about action taken..."
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleAction(false)}
                      disabled={processing}
                      className="bg-slate-800 border-slate-700"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Dismiss
                    </Button>
                    <Button
                      onClick={() => handleAction(true)}
                      disabled={processing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Resolve
                    </Button>
                  </div>
                </div>
              )}

              {/* Already processed */}
              {selectedReport.status !== "pending" && selectedReport.actionTaken && (
                <div className="border-t border-slate-800 pt-4">
                  <p className="text-sm text-slate-400">Action Taken</p>
                  <p className="text-slate-300">{selectedReport.actionTaken}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
