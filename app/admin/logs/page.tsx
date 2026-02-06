"use client";

import { useState, useEffect, useMemo } from "react";
import { Activity, Download, ChevronDown, ChevronUp } from "lucide-react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { getDb } from "@/lib/firebase/config";
import { PageHeader, DataTable, SearchFilter } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getActionDescription, getActionColor } from "@/lib/firebase/adminLogs";
import { useAdminAuth } from "@/hooks/use-admin-auth";

interface ActivityLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

const actionColors: Record<string, string> = {
  approve_verification: "bg-green-500/20 text-green-400 border-green-500/30",
  reject_verification: "bg-red-500/20 text-red-400 border-red-500/30",
  update_user_role: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  delete_user: "bg-red-500/20 text-red-400 border-red-500/30",
  resolve_report: "bg-green-500/20 text-green-400 border-green-500/30",
  dismiss_report: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  delete_job_post: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  update_settings: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  add_verified_alumni: "bg-green-500/20 text-green-400 border-green-500/30",
  update_verified_alumni: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  delete_verified_alumni: "bg-red-500/20 text-red-400 border-red-500/30",
  bulk_import_verified_alumni: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

export default function LogsPage() {
  const { isAuthReady } = useAdminAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthReady) return;
    fetchLogs();
  }, [isAuthReady]);

  async function fetchLogs() {
    try {
      const db = getDb();
      const q = query(
        collection(db, "adminActivityLogs"),
        orderBy("timestamp", "desc"),
        limit(500)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date(),
      })) as ActivityLog[];
      setLogs(data);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  }

  // Get unique actions for filter
  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map((l) => l.action));
    return Array.from(actions).sort();
  }, [logs]);

  // Filter
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        !search ||
        log.adminEmail?.toLowerCase().includes(search.toLowerCase()) ||
        log.details?.toLowerCase().includes(search.toLowerCase()) ||
        log.targetId?.toLowerCase().includes(search.toLowerCase());
      const matchesAction = actionFilter === "all" || log.action === actionFilter;
      return matchesSearch && matchesAction;
    });
  }, [logs, search, actionFilter]);

  // Paginate
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;

  // Export
  function handleExport() {
    const headers = ["Timestamp", "Admin", "Action", "Target", "Details"];
    const rows = filteredLogs.map((l) => [
      l.timestamp.toISOString(),
      l.adminEmail,
      l.action,
      `${l.targetType}:${l.targetId}`,
      l.details,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "activity_logs.csv";
    a.click();
  }

  const columns = [
    {
      key: "timestamp",
      label: "Time",
      render: (log: ActivityLog) => (
        <div className="text-sm">
          <p className="text-slate-300">{log.timestamp.toLocaleDateString()}</p>
          <p className="text-xs text-slate-500">{log.timestamp.toLocaleTimeString()}</p>
        </div>
      ),
    },
    {
      key: "adminEmail",
      label: "Admin",
      render: (log: ActivityLog) => (
        <span className="text-slate-300">{log.adminEmail}</span>
      ),
    },
    {
      key: "action",
      label: "Action",
      render: (log: ActivityLog) => (
        <Badge className={actionColors[log.action] || "bg-slate-500/20 text-slate-400"}>
          {getActionDescription(log.action as Parameters<typeof getActionDescription>[0])}
        </Badge>
      ),
    },
    {
      key: "targetType",
      label: "Target",
      render: (log: ActivityLog) => (
        <div className="text-sm">
          <p className="text-slate-300 capitalize">{log.targetType}</p>
          <p className="text-xs text-slate-500 font-mono">{log.targetId?.substring(0, 12)}</p>
        </div>
      ),
    },
    {
      key: "details",
      label: "Details",
      render: (log: ActivityLog) => (
        <div className="max-w-xs">
          <p className="text-slate-300 truncate">{log.details}</p>
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedRow(expandedRow === log.id ? null : log.id);
              }}
              className="text-cyan-400 text-xs p-0 h-auto mt-1"
            >
              {expandedRow === log.id ? (
                <>
                  <ChevronUp className="w-3 h-3 mr-1" />
                  Hide metadata
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3 mr-1" />
                  Show metadata
                </>
              )}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Activity}
        title="Activity Logs"
        description="Admin action audit trail"
        iconColor="purple"
        actions={
          <Button
            variant="outline"
            onClick={handleExport}
            className="bg-slate-800 border-slate-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        }
      />

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by admin, details, or target..."
        filters={[
          {
            key: "action",
            label: "Action",
            value: actionFilter,
            onChange: setActionFilter,
            options: [
              { value: "all", label: "All Actions" },
              ...uniqueActions.map((a) => ({
                value: a,
                label: a.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
              })),
            ],
          },
        ]}
        onClear={() => {
          setSearch("");
          setActionFilter("all");
        }}
      />

      <DataTable
        columns={columns}
        data={paginatedLogs}
        loading={loading}
        emptyMessage="No activity logs found"
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={filteredLogs.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        rowClassName={(log) =>
          expandedRow === log.id ? "bg-slate-800/30" : ""
        }
      />

      {/* Expanded metadata view */}
      {expandedRow && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 rounded-lg p-4 shadow-xl max-w-lg w-full">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-200">Metadata</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedRow(null)}
              className="text-slate-400"
            >
              Close
            </Button>
          </div>
          <pre className="text-xs text-slate-300 bg-slate-800 rounded p-3 overflow-auto max-h-48">
            {JSON.stringify(
              logs.find((l) => l.id === expandedRow)?.metadata || {},
              null,
              2
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
