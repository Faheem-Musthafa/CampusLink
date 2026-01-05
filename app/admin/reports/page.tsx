"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { handleError } from "@/lib/utils/error-handling";
import { getUserReports, updateReportStatus } from "@/lib/firebase/reports";
import { UserReport } from "@/types";
import { 
  AlertTriangle, 
  ArrowLeft, 
  CheckCircle, 
  XCircle,
  User,
  Clock,
  Search,
  Filter,
  Download,
  Shield,
  FileDown
} from "lucide-react";
import { logAdminActivity } from "@/lib/firebase/adminLogs";
import { downloadCSV, prepareReportsExport } from "@/lib/utils/exportData";

// Admin authentication check
function useAdminAuth() {
  const router = useRouter();
  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem("adminAuthenticated");
    if (!isAuthenticated) {
      router.push("/admin/login");
    }
  }, [router]);
}

export default function ReportsPage() {
  useAdminAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<UserReport[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
  const [reviewAction, setReviewAction] = useState<"resolved" | "dismissed" | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    // Filter reports based on search
    if (searchQuery.trim() === "") {
      setFilteredReports(reports);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = reports.filter(report => 
        report.reportedUserName?.toLowerCase().includes(query) ||
        report.reporterName?.toLowerCase().includes(query) ||
        report.reason?.toLowerCase().includes(query)
      );
      setFilteredReports(filtered);
    }
  }, [searchQuery, reports]);

  const loadReports = async () => {
    try {
      const data = await getUserReports();
      setReports(data);
      setFilteredReports(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (report: UserReport, action: "resolved" | "dismissed") => {
    setSelectedReport(report);
    setReviewAction(action);
    setActionNote("");
  };

  const handleSubmitReview = async () => {
    if (!selectedReport || !reviewAction) return;

    if (!actionNote.trim()) {
      toast({
        title: "Error",
        description: "Please provide action notes",
        variant: "destructive",
      });
      return;
    }

    const adminUsername = sessionStorage.getItem("adminUsername") || "admin";

    setSubmitting(true);
    try {
      // Pass the collection name to update the correct document
      await updateReportStatus(
        selectedReport.id,
        reviewAction,
        adminUsername,
        actionNote,
        selectedReport.collection || "userReports"
      );

      // Log admin activity
      try {
        const { auth } = await import("@/lib/firebase/config");
        if (auth && auth.currentUser) {
          await logAdminActivity({
            adminId: auth.currentUser.uid,
            adminEmail: auth.currentUser.email || adminUsername,
            adminName: auth.currentUser.displayName || adminUsername,
            action: reviewAction === "resolved" ? "resolve_report" : "dismiss_report",
            targetType: "report",
            targetId: selectedReport.id,
            targetName: `Report by ${selectedReport.reporterName} against ${selectedReport.reportedUserName}`,
            details: `${reviewAction === "resolved" ? "Resolved" : "Dismissed"} report: ${selectedReport.reason}`,
            metadata: {
              reportId: selectedReport.id,
              reportReason: selectedReport.reason,
              actionNote: actionNote,
              reportedUserId: selectedReport.reportedUserId,
              reporterId: selectedReport.reportedBy,
            },
          });
        }
      } catch (logError) {
        handleError(logError, "Failed to log activity");
      }

      toast({
        title: "Success",
        description: `Report ${reviewAction} successfully`,
      });

      setSelectedReport(null);
      setReviewAction(null);
      setActionNote("");
      loadReports();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update report",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "resolved":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "dismissed":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getAvatarColor = (index: number) => {
    const colors = [
      "bg-pink-500",
      "bg-yellow-500",
      "bg-purple-500",
      "bg-green-500",
      "bg-blue-500",
      "bg-orange-500",
      "bg-cyan-500",
      "bg-red-500",
    ];
    return colors[index % colors.length];
  };

  const getUserInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : "U";
  };

  // Pagination helpers
  const totalPages = Math.ceil(filteredReports.length / pageSize);
  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, filteredReports.length);
  const paginatedReports = filteredReports.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  // Export handler
  const handleExport = () => {
    try {
      const exportData = prepareReportsExport(filteredReports);
      const timestamp = new Date().toISOString().split('T')[0];
      downloadCSV(
        exportData,
        [
          { key: 'id', label: 'ID' },
          { key: 'reportedUserName', label: 'Reported User' },
          { key: 'reportedByName', label: 'Reported By' },
          { key: 'reason', label: 'Reason' },
          { key: 'status', label: 'Status' },
          { key: 'createdAt', label: 'Report Date' },
        ],
        `reports-${timestamp}`
      );
      toast({
        title: "Export Successful",
        description: `Exported ${exportData.length} reports`,
      });
    } catch (error) {
      handleError(error, "Export failed");
      toast({
        title: "Export Failed",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  const pendingReports = reports.filter(r => r.status === "pending");
  const resolvedReports = reports.filter(r => r.status === "resolved");
  const dismissedReports = reports.filter(r => r.status === "dismissed");

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/admin">
              <Button variant="outline" size="icon" className="bg-[#1a1f2e] border-gray-800 text-white hover:bg-gray-800">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">User Reports</h1>
              <p className="text-gray-400 text-sm">Manage and review user reports</p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by user name or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#1a1f2e] border-gray-800 text-white pl-10"
            />
          </div>
          <Button variant="outline" className="bg-[#1a1f2e] border-gray-800 text-white hover:bg-gray-800">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button 
            onClick={handleExport}
            variant="outline" 
            className="bg-[#1a1f2e] border-gray-800 text-white hover:bg-gray-800"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-[#1a1f2e] border-gray-800 p-4">
            <div className="text-sm text-gray-400 mb-1">Total Reports</div>
            <div className="text-2xl font-bold text-white">{reports.length}</div>
          </Card>
          <Card className="bg-[#1a1f2e] border-gray-800 p-4">
            <div className="text-sm text-gray-400 mb-1">Pending</div>
            <div className="text-2xl font-bold text-yellow-400">{pendingReports.length}</div>
          </Card>
          <Card className="bg-[#1a1f2e] border-gray-800 p-4">
            <div className="text-sm text-gray-400 mb-1">Resolved</div>
            <div className="text-2xl font-bold text-green-400">{resolvedReports.length}</div>
          </Card>
          <Card className="bg-[#1a1f2e] border-gray-800 p-4">
            <div className="text-sm text-gray-400 mb-1">Dismissed</div>
            <div className="text-2xl font-bold text-gray-400">{dismissedReports.length}</div>
          </Card>
        </div>

        {/* Reports Table */}
        <Card className="bg-[#1a1f2e] border-gray-800">
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-4 px-4 text-sm font-medium text-gray-400">Reported User</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-gray-400">Reported By</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-gray-400">Reason</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-gray-400">Date</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-gray-400">Status</th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No reports found</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedReports.map((report, index) => (
                      <tr key={report.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 ${getAvatarColor(index)} rounded-full flex items-center justify-center text-white font-semibold`}>
                              {getUserInitial(report.reportedUserName)}
                            </div>
                            <div>
                              <div className="text-white font-medium">{report.reportedUserName}</div>
                              <div className="text-gray-400 text-xs">ID: {report.reportedUserId.slice(0, 8)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-white">{report.reporterName}</div>
                          <div className="text-gray-400 text-xs">{report.reportedBy.slice(0, 8)}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-white font-medium">{report.reason}</div>
                          <div className="text-gray-400 text-xs line-clamp-1">{report.description}</div>
                          {report.type === "chat" && (
                            <Badge variant="outline" className="mt-1 text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                              From Chat
                            </Badge>
                          )}
                        </td>
                        <td className="py-4 px-4 text-gray-300 text-sm">
                          {formatDate(report.createdAt)}
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant="outline" className={getStatusBadgeColor(report.status)}>
                            {report.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-right">
                          {report.status === "pending" && (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReview(report, "resolved")}
                                className="bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Resolve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReview(report, "dismissed")}
                                className="bg-gray-500/10 border-gray-500/30 text-gray-400 hover:bg-gray-500/20"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Dismiss
                              </Button>
                            </div>
                          )}
                          {report.status !== "pending" && (
                            <span className="text-gray-500 text-sm">{report.reviewedBy}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredReports.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-gray-400">
                    Showing {startRecord} to {endRecord} of {filteredReports.length} reports
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                      className="bg-[#0f1419] border border-gray-800 text-white rounded px-2 py-1 text-sm"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-gray-400 hover:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-3 py-1 text-gray-400">...</span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page as number)}
                        className={`px-3 py-1 rounded text-sm ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  ))}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-gray-400 hover:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="bg-[#1a1f2e] border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {reviewAction === "resolved" ? "Resolve" : "Dismiss"} Report
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {reviewAction === "resolved"
                ? "Mark this report as resolved and provide action taken"
                : "Dismiss this report and provide a reason"}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Reported User:</span>
                  <span className="text-white font-medium">{selectedReport.reportedUserName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Reported By:</span>
                  <span className="text-white">{selectedReport.reporterName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Reason:</span>
                  <span className="text-white">{selectedReport.reason}</span>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-2">Description:</p>
                <p className="text-white text-sm bg-gray-800/30 rounded p-3">
                  {selectedReport.description}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Action Notes *</Label>
                <Textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Provide details about the action taken..."
                  rows={4}
                  className="bg-[#0f1419] border-gray-800 text-white"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedReport(null);
                setReviewAction(null);
              }}
              disabled={submitting}
              className="bg-[#0f1419] border-gray-800 text-white hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={submitting}
              className={reviewAction === "resolved" 
                ? "bg-green-500 hover:bg-green-600 text-white" 
                : "bg-gray-600 hover:bg-gray-700 text-white"}
            >
              {submitting ? (
                <div className="flex items-center">
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Submitting...</span>
                </div>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  {reviewAction === "resolved" ? "Resolve Report" : "Dismiss Report"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
