"use client";

import { useState, useEffect, useMemo } from "react";
import { ShieldCheck, Check, X, Eye, Image, GraduationCap, Users, BookOpen } from "lucide-react";
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
import { claimAdmissionNumber } from "@/lib/firebase/alumni-verification";
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
  // New fields for better display
  role?: string;
  userRole?: string;
  verificationType?: string;
}

const statusColors: Record<string, string> = {
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
};

// Role colors and labels for easy identification
const roleConfig: Record<string, { color: string; label: string; icon: string }> = {
  student: { 
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30", 
    label: "Student",
    icon: "🎓"
  },
  alumni: { 
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30", 
    label: "Alumni",
    icon: "👨‍🎓"
  },
  aspirant: { 
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30", 
    label: "Aspirant",
    icon: "📚"
  },
};

// Verification type descriptions
const verificationTypeLabels: Record<string, string> = {
  id_card: "ID Card Upload",
  email_otp: "Email OTP",
  phone_otp: "Phone OTP",
};

export default function VerificationsPage() {
  const { user: adminUser, isAuthReady } = useAdminAuth();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [roleFilter, setRoleFilter] = useState("all");
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
        const role = d.role || d.userRole || additionalData.role || "";
        return {
          id: doc.id,
          userId: d.userId,
          // Support both old field names (displayName/email) and new (userName/userEmail)
          displayName: d.displayName || d.userName || additionalData.fullName || "",
          email: d.email || d.userEmail || "",
          status: d.status || "pending",
          idCardUrl: d.idCardUrl || "",
          admissionNumber: d.admissionNumber || additionalData.admissionNumber,
          college: d.college || additionalData.college,
          department: d.department || additionalData.department || additionalData.branch,
          graduationYear: d.graduationYear || additionalData.graduationYear || additionalData.passingYear,
          createdAt: d.createdAt?.toDate?.() || new Date(),
          additionalInfo: d.additionalInfo,
          // New fields for role and verification type
          role: role,
          userRole: role,
          verificationType: d.verificationType || "",
        } as VerificationRequest;
      });
      setRequests(data);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  }

  // Stats with recent people for each status
  const stats = useMemo(() => {
    const pendingList = requests.filter((r) => r.status === "pending");
    const approvedList = requests.filter((r) => r.status === "approved");
    const rejectedList = requests.filter((r) => r.status === "rejected");
    const students = requests.filter((r) => r.role === "student").length;
    const alumni = requests.filter((r) => r.role === "alumni").length;
    const aspirants = requests.filter((r) => r.role === "aspirant").length;
    
    // Get recent 3 people for each status
    const recentPending = pendingList.slice(0, 3).map(r => r.displayName || r.email?.split('@')[0] || 'User');
    const recentApproved = approvedList.slice(0, 3).map(r => r.displayName || r.email?.split('@')[0] || 'User');
    const recentRejected = rejectedList.slice(0, 3).map(r => r.displayName || r.email?.split('@')[0] || 'User');
    
    return { 
      pending: pendingList.length, 
      approved: approvedList.length, 
      rejected: rejectedList.length, 
      total: requests.length, 
      students, 
      alumni, 
      aspirants,
      recentPending,
      recentApproved,
      recentRejected
    };
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
      const matchesRole = roleFilter === "all" || req.role === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [requests, search, statusFilter, roleFilter]);

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

      // If approved, grant full access (Stage 2 of two-stage verification)
      if (approved) {
        userUpdateData.accountStatus = "active";
        userUpdateData.deactivatedAt = null;
        userUpdateData.verificationApprovedAt = serverTimestamp();
        // Grant full access
        userUpdateData.canPostJobs = true;
        userUpdateData.canPostFeed = true;
        userUpdateData.canMessage = true;
        userUpdateData.canAcceptMentorship = true;

        // Mark admission number as used (if applicable) to prevent reuse
        if (selectedRequest.admissionNumber && (selectedRequest.role === "student" || selectedRequest.role === "alumni")) {
          try {
            await claimAdmissionNumber(selectedRequest.admissionNumber.toUpperCase(), selectedRequest.userId);
          } catch (claimError) {
            // Admission number may already be claimed during onboarding - that's OK
            console.log("Admission number already claimed or not found:", claimError);
          }
        }
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
      key: "userRole",
      label: "Type",
      render: (req: VerificationRequest) => {
        const role = req.userRole?.toLowerCase() || "unknown";
        const config = roleConfig[role] || { color: "bg-slate-500/20 text-slate-400 border-slate-500/30", label: role, icon: "👤" };
        return (
          <Badge className={config.color}>
            {config.icon} {config.label}
          </Badge>
        );
      },
    },
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
          <p className="text-xs text-slate-500">{req.department} {req.graduationYear ? `(${req.graduationYear})` : ""}</p>
        </div>
      ),
    },
    {
      key: "verificationType",
      label: "Method",
      render: (req: VerificationRequest) => (
        <span className="text-xs text-slate-400">
          {verificationTypeLabels[req.verificationType || ""] || req.verificationType || "ID Card"}
        </span>
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

      {/* Stats - Status (Clickable) */}
      <div className="grid grid-cols-4 gap-4">
        {/* Total */}
        <button
          onClick={() => setStatusFilter("all")}
          className={`p-4 rounded-lg border transition-all text-left ${
            statusFilter === "all"
              ? "bg-cyan-500/20 border-cyan-500"
              : "bg-slate-900/50 border-slate-800 hover:bg-slate-800"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span className="text-sm text-slate-400">Total Requests</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </button>

        {/* Pending */}
        <button
          onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}
          className={`p-4 rounded-lg border transition-all text-left ${
            statusFilter === "pending"
              ? "bg-orange-500/20 border-orange-500"
              : "bg-slate-900/50 border-slate-800 hover:bg-slate-800"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-orange-400" />
            <span className="text-sm text-slate-400">Pending Review</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.pending}</p>
          {stats.recentPending.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-700">
              <p className="text-xs text-slate-500 mb-1">Recent:</p>
              {stats.recentPending.map((name, i) => (
                <p key={i} className="text-xs text-orange-300 truncate">• {name}</p>
              ))}
            </div>
          )}
        </button>

        {/* Approved */}
        <button
          onClick={() => setStatusFilter(statusFilter === "approved" ? "all" : "approved")}
          className={`p-4 rounded-lg border transition-all text-left ${
            statusFilter === "approved"
              ? "bg-green-500/20 border-green-500"
              : "bg-slate-900/50 border-slate-800 hover:bg-slate-800"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-5 h-5 text-green-400" />
            <span className="text-sm text-slate-400">Approved</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.approved}</p>
          {stats.recentApproved.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-700">
              <p className="text-xs text-slate-500 mb-1">Recent:</p>
              {stats.recentApproved.map((name, i) => (
                <p key={i} className="text-xs text-green-300 truncate">• {name}</p>
              ))}
            </div>
          )}
        </button>

        {/* Rejected */}
        <button
          onClick={() => setStatusFilter(statusFilter === "rejected" ? "all" : "rejected")}
          className={`p-4 rounded-lg border transition-all text-left ${
            statusFilter === "rejected"
              ? "bg-red-500/20 border-red-500"
              : "bg-slate-900/50 border-slate-800 hover:bg-slate-800"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <X className="w-5 h-5 text-red-400" />
            <span className="text-sm text-slate-400">Rejected</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.rejected}</p>
          {stats.recentRejected.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-700">
              <p className="text-xs text-slate-500 mb-1">Recent:</p>
              {stats.recentRejected.map((name, i) => (
                <p key={i} className="text-xs text-red-300 truncate">• {name}</p>
              ))}
            </div>
          )}
        </button>
      </div>

      {/* Stats - User Types */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-slate-400 mb-3">Requests by User Type</h3>
        <div className="grid grid-cols-3 gap-4">
          <button 
            onClick={() => setRoleFilter(roleFilter === "student" ? "all" : "student")}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              roleFilter === "student" 
                ? "bg-blue-500/20 border-2 border-blue-500" 
                : "bg-slate-800/50 border border-slate-700 hover:bg-slate-800"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold text-white">{stats.students}</p>
              <p className="text-xs text-slate-400">Students</p>
            </div>
          </button>
          <button 
            onClick={() => setRoleFilter(roleFilter === "alumni" ? "all" : "alumni")}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              roleFilter === "alumni" 
                ? "bg-purple-500/20 border-2 border-purple-500" 
                : "bg-slate-800/50 border border-slate-700 hover:bg-slate-800"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold text-white">{stats.alumni}</p>
              <p className="text-xs text-slate-400">Alumni</p>
            </div>
          </button>
          <button 
            onClick={() => setRoleFilter(roleFilter === "aspirant" ? "all" : "aspirant")}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              roleFilter === "aspirant" 
                ? "bg-orange-500/20 border-2 border-orange-500" 
                : "bg-slate-800/50 border border-slate-700 hover:bg-slate-800"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-orange-400" />
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold text-white">{stats.aspirants}</p>
              <p className="text-xs text-slate-400">Aspirants</p>
            </div>
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          💡 <span className="text-blue-400">Students</span> & <span className="text-purple-400">Alumni</span> verify via admission number + ID card | <span className="text-orange-400">Aspirants</span> join directly (no verification needed)
        </p>
      </div>

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, email, or admission number..."
        filters={[
          {
            key: "role",
            label: "User Type",
            value: roleFilter,
            onChange: setRoleFilter,
            options: [
              { value: "all", label: "All Types" },
              { value: "student", label: "🎓 Student" },
              { value: "alumni", label: "👨‍🎓 Alumni" },
              { value: "aspirant", label: "📚 Aspirant" },
            ],
          },
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
          setRoleFilter("all");
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
              {/* User Role Badge */}
              <div className="flex items-center gap-3">
                {(() => {
                  const role = selectedRequest.userRole?.toLowerCase() || "unknown";
                  const config = roleConfig[role] || { color: "bg-slate-500/20 text-slate-400 border-slate-500/30", label: role, icon: "👤" };
                  return (
                    <Badge className={`${config.color} text-base px-3 py-1`}>
                      {config.icon} {config.label}
                    </Badge>
                  );
                })()}
                <span className="text-slate-400 text-sm">
                  {verificationTypeLabels[selectedRequest.verificationType || ""] || "ID Card Verification"}
                </span>
              </div>

              {/* Verification Flow Explanation */}
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <p className="text-xs text-slate-400">
                  {selectedRequest.userRole === "student" && (
                    <>🎓 <strong>Student:</strong> Verified admission number + ID card upload. Review the ID card to grant full access.</>
                  )}
                  {selectedRequest.userRole === "alumni" && (
                    <>👨‍🎓 <strong>Alumni:</strong> Verified admission number + ID card upload. Review the ID card to grant full access.</>
                  )}
                  {selectedRequest.userRole === "aspirant" && (
                    <>📚 <strong>Aspirant:</strong> Email OTP verified. Auto-approved with limited access (no job posting).</>
                  )}
                  {!selectedRequest.userRole && (
                    <>Review the submitted documents and approve or reject this verification request.</>
                  )}
                </p>
              </div>

              {/* User Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Name</p>
                  <p className="text-slate-200">{selectedRequest.displayName || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Email</p>
                  <p className="text-slate-200">{selectedRequest.email || "-"}</p>
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
                <p className="text-sm text-slate-400 mb-2">ID Card Document</p>
                {selectedRequest.idCardUrl ? (
                  <a
                    href={selectedRequest.idCardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white font-medium"
                  >
                    <Image className="w-4 h-4" />
                    View Uploaded ID Card
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
