"use client";

import { useState, useEffect, useMemo } from "react";
import { Users, Download, Edit2, ExternalLink } from "lucide-react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/config";
import { PageHeader, DataTable, SearchFilter, ConfirmDialog } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logAdminActivity } from "@/lib/firebase/adminLogs";
import { useAdminAuth } from "@/hooks/use-admin-auth";

interface User {
  id: string;
  displayName: string;
  email: string;
  role: string;
  verificationStatus: string;
  createdAt: Date;
  photoURL?: string;
}

const roleColors: Record<string, string> = {
  admin: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  alumni: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  student: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  aspirant: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

const statusColors: Record<string, string> = {
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  unverified: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export default function UsersPage() {
  const { user: adminUser, isAuthReady } = useAdminAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Edit dialog
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthReady) return;

    async function fetchUsers() {
      try {
        const db = getDb();
        const snapshot = await getDocs(collection(db, "users"));
        const userData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        })) as User[];
        setUsers(userData);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [isAuthReady]);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        !search ||
        user.displayName?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" || user.verificationStatus === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  // Paginate
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;

  // Handle role update
  const handleUpdateRole = async () => {
    if (!editingUser || !newRole) return;
    setSaving(true);

    try {
      const db = getDb();
      await updateDoc(doc(db, "users", editingUser.id), {
        role: newRole,
        updatedAt: new Date(),
      });

      // Log activity
      await logAdminActivity({
        adminId: adminUser?.uid || "",
        adminEmail: adminUser?.email || "",
        action: "update_user_role",
        targetType: "user",
        targetId: editingUser.id,
        details: `Changed role from ${editingUser.role} to ${newRole}`,
        metadata: { oldRole: editingUser.role, newRole },
      });

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id ? { ...u, role: newRole } : u
        )
      );
      setEditingUser(null);
    } catch (error) {
      console.error("Error updating role:", error);
    } finally {
      setSaving(false);
    }
  };

  // Export to CSV
  const handleExport = () => {
    const headers = ["Name", "Email", "Role", "Status", "Created"];
    const rows = filteredUsers.map((u) => [
      u.displayName || "",
      u.email || "",
      u.role || "",
      u.verificationStatus || "",
      u.createdAt.toISOString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
  };

  const columns = [
    {
      key: "displayName",
      label: "User",
      render: (user: User) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <span className="text-sm font-medium text-slate-300">
                {user.displayName?.[0] || "?"}
              </span>
            )}
          </div>
          <div>
            <p className="font-medium text-slate-200">{user.displayName || "No Name"}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (user: User) => (
        <Badge className={roleColors[user.role] || roleColors.student}>
          {user.role || "student"}
        </Badge>
      ),
    },
    {
      key: "verificationStatus",
      label: "Status",
      render: (user: User) => (
        <Badge className={statusColors[user.verificationStatus] || statusColors.unverified}>
          {user.verificationStatus || "unverified"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Joined",
      render: (user: User) => (
        <span className="text-slate-400">
          {user.createdAt.toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (user: User) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setEditingUser(user);
              setNewRole(user.role);
            }}
            className="text-slate-400 hover:text-cyan-400"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <a
            href={`/profile/${user.id}`}
            target="_blank"
            onClick={(e) => e.stopPropagation()}
            className="p-2 text-slate-400 hover:text-cyan-400"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="Users"
        description={`${users.length} total users`}
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
        searchPlaceholder="Search users..."
        filters={[
          {
            key: "role",
            label: "Role",
            value: roleFilter,
            onChange: setRoleFilter,
            options: [
              { value: "all", label: "All Roles" },
              { value: "admin", label: "Admin" },
              { value: "alumni", label: "Alumni" },
              { value: "student", label: "Student" },
              { value: "aspirant", label: "Aspirant" },
            ],
          },
          {
            key: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "all", label: "All Status" },
              { value: "approved", label: "Approved" },
              { value: "pending", label: "Pending" },
              { value: "rejected", label: "Rejected" },
              { value: "unverified", label: "Unverified" },
            ],
          },
        ]}
        onClear={() => {
          setSearch("");
          setRoleFilter("all");
          setStatusFilter("all");
        }}
      />

      <DataTable
        columns={columns}
        data={paginatedUsers}
        loading={loading}
        emptyMessage="No users found"
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={filteredUsers.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
      />

      {/* Edit Role Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Edit User Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <p className="text-sm text-slate-400 mb-1">User</p>
              <p className="text-slate-200">{editingUser?.displayName}</p>
              <p className="text-sm text-slate-500">{editingUser?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Role
              </label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="alumni">Alumni</SelectItem>
                  <SelectItem value="aspirant">Aspirant</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setEditingUser(null)}
                className="bg-slate-800 border-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateRole}
                disabled={saving || newRole === editingUser?.role}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
