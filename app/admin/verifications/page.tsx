"use client";

import { useState, useEffect, useMemo } from "react";
import { ShieldCheck, Check, X, Eye, Image } from "lucide-react";
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
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

interface VerificationRequest {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  status: string;
  idCardUrl: string;
  admissionNumber?: string;
  college?: string;
  department?: string;
  graduationYear?: string;
  createdAt: Date;
  additionalInfo?: string;
}

const statusColors: Record<string, string> = {
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function VerificationsPage() {
  const { user: adminUser, isAuthReady } = useAdminAuth();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // View/Action dialog
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isAuthReady) return;
    fetchRequests();
  }, [isAuthReady]);

  async function fetchRequests() {
    try {
      const db = getDb();
      const snapshot = await getDocs(collection(db, "verificationRequests"));
      const data = snapshot.docs.map((doc) => {
        const d = doc.data();
        let additionalData: Record<string, string | undefined> = {};
        if (d.additionalInfo) {
          try {
            additionalData = JSON.parse(d.additionalInfo);
          } catch {}
        }
        return {
          id: doc.id,
          userId: d.userId,
          displayName: d.displayName || "",
          email: d.email || "",
          status: d.status || "pending",
          idCardUrl: d.idCardUrl || "",
          admissionNumber: d.admissionNumber || additionalData.admissionNumber,
          college: d.college || additionalData.college,
          department: d.department || additionalData.department,
          graduationYear: d.graduationYear || additionalData.graduationYear,
          createdAt: d.createdAt?.toDate?.() || new Date(),
          additionalInfo: d.additionalInfo,
        } as VerificationRequest;
      });
      setRequests(data);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  }

  // Stats
  const stats = useMemo(() => {
    const pending = requests.filter((r) => r.status === "pending").length;
    const approved = requests.filter((r) => r.status === "approved").length;
    const rejected = requests.filter((r) => r.status === "rejected").length;
    return { pending, approved, rejected, total: requests.length };
  }, [requests]);

  // Filter
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const matchesSearch =
        !search ||
        req.displayName?.toLowerCase().includes(search.toLowerCase()) ||
        req.email?.toLowerCase().includes(search.toLowerCase()) ||
        req.admissionNumber?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || req.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requests, search, statusFilter]);

  // Paginate
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;

  // Handle approval/rejection
  async function handleDecision(approved: boolean) {
    if (!selectedRequest) return;
    setProcessing(true);

    try {
      const db = getDb();
      const status = approved ? "approved" : "rejected";

      // Update verification request
      await updateDoc(doc(db, "verificationRequests", selectedRequest.id), {
        status,
        reviewedBy: adminUser?.uid,
        reviewedAt: serverTimestamp(),
        rejectionReason: approved ? null : rejectionReason,
        updatedAt: serverTimestamp(),
      });

      // Update user document
      const userUpdateData: Record<string, unknown> = {
        verificationStatus: status,
        updatedAt: serverTimestamp(),
      };

      // If approved, reactivate account
      if (approved) {
        userUpdateData.accountStatus = "active";
        userUpdateData.deactivatedAt = null;
        userUpdateData.canPostJobs = true;
        userUpdateData.canPostFeed = true;
        userUpdateData.canMessage = true;
        userUpdateData.canAcceptMentorship = true;
      }

      await updateDoc(doc(db, "users", selectedRequest.userId), userUpdateData);

      // Update profile
      try {
        const profileDoc = await getDoc(doc(db, "profiles", selectedRequest.userId));
        if (profileDoc.exists()) {
          await updateDoc(doc(db, "profiles", selectedRequest.userId), {
            verified: approved,
            updatedAt: serverTimestamp(),
          });
        }
      } catch {}

      // Log activity
      await logAdminActivity({
        adminId: adminUser?.uid || "",
        adminEmail: adminUser?.email || "",
        action: approved ? "approve_verification" : "reject_verification",
        targetType: "verification",
        targetId: selectedRequest.id,
        details: approved
          ? `Approved verification for ${selectedRequest.displayName}`
          : `Rejected verification for ${selectedRequest.displayName}: ${rejectionReason}`,
      });

      // Update local state
      setRequests((prev) =>
        prev.map((r) =>
          r.id === selectedRequest.id ? { ...r, status } : r
        )
      );
      setSelectedRequest(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Error processing request:", error);
    } finally {
      setProcessing(false);
    }
  }

  const columns = [
    {
      key: "displayName",
      label: "User",
      render: (req: VerificationRequest) => (
        <div>
          <p className="font-medium text-slate-200">{req.displayName || "No Name"}</p>
          <p className="text-xs text-slate-500">{req.email}</p>
        </div>
      ),
    },
    {
      key: "admissionNumber",
      label: "Admission No.",
      render: (req: VerificationRequest) => (
        <span className="text-slate-300">{req.admissionNumber || "-"}</span>
      ),
    },
    {
      key: "college",
      label: "Details",
      render: (req: VerificationRequest) => (
        <div className="text-sm">
          <p className="text-slate-300">{req.college || "-"}</p>
          <p className="text-xs text-slate-500">{req.department}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (req: VerificationRequest) => (
        <Badge className={statusColors[req.status] || statusColors.pending}>
          {req.status}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Submitted",
      render: (req: VerificationRequest) => (
        <span className="text-slate-400">
          {req.createdAt.toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (req: VerificationRequest) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedRequest(req);
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
        icon={ShieldCheck}
        title="Verifications"
        description="Review and approve user verification requests"
        iconColor="green"
      />

      {/* Stats */}
      <StatsGrid columns={4}>
        <StatsCard title="Total" value={stats.total} icon={ShieldCheck} color="cyan" />
        <StatsCard title="Pending" value={stats.pending} icon={ShieldCheck} color="orange" />
        <StatsCard title="Approved" value={stats.approved} icon={Check} color="green" />
        <StatsCard title="Rejected" value={stats.rejected} icon={X} color="red" />
      </StatsGrid>

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, email, or admission number..."
        filters={[
          {
            key: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "all", label: "All Status" },
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ],
          },
        ]}
        onClear={() => {
          setSearch("");
          setStatusFilter("pending");
        }}
      />

      <DataTable
        columns={columns}
        data={paginatedRequests}
        loading={loading}
        emptyMessage="No verification requests found"
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={filteredRequests.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
      />

      {/* View Request Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Verification Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 pt-4">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Name</p>
                  <p className="text-slate-200">{selectedRequest.displayName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Email</p>
                  <p className="text-slate-200">{selectedRequest.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Admission Number</p>
                  <p className="text-slate-200">{selectedRequest.admissionNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Graduation Year</p>
                  <p className="text-slate-200">{selectedRequest.graduationYear || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">College</p>
                  <p className="text-slate-200">{selectedRequest.college || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Department</p>
                  <p className="text-slate-200">{selectedRequest.department || "-"}</p>
                </div>
              </div>

              {/* ID Card */}
              <div>
                <p className="text-sm text-slate-400 mb-2">ID Card</p>
                {selectedRequest.idCardUrl ? (
                  <a
                    href={selectedRequest.idCardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg text-cyan-400 hover:bg-slate-700"
                  >
                    <Image className="w-4 h-4" />
                    View ID Card
                  </a>
                ) : (
                  <p className="text-slate-500">No ID card uploaded</p>
                )}
              </div>

              {/* Actions for pending requests */}
              {selectedRequest.status === "pending" && (
                <div className="border-t border-slate-800 pt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Rejection Reason (required if rejecting)
                    </label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter reason for rejection..."
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleDecision(false)}
                      disabled={processing || !rejectionReason.trim()}
                      className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleDecision(true)}
                      disabled={processing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
              )}

              {/* Status for non-pending */}
              {selectedRequest.status !== "pending" && (
                <div className="border-t border-slate-800 pt-4">
                  <Badge className={statusColors[selectedRequest.status]}>
                    {selectedRequest.status === "approved" ? "✓ Approved" : "✕ Rejected"}
                  </Badge>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
