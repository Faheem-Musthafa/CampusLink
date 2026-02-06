"use client";

import { useState, useEffect, useMemo } from "react";
import { GraduationCap, Plus, Upload, Download, Edit2, Trash2 } from "lucide-react";
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase/config";
import { PageHeader, DataTable, SearchFilter, StatsCard, StatsGrid, ConfirmDialog } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { logAdminActivity } from "@/lib/firebase/adminLogs";
import { useAdminAuth } from "@/hooks/use-admin-auth";

interface AlumniRecord {
  id: string;
  admissionNumber: string;
  name: string;
  graduationYear?: string;
  department?: string;
  claimed: boolean;
  claimedBy?: string;
  createdAt: Date;
}

export default function AlumniDatabasePage() {
  const { user: adminUser, isAuthReady } = useAdminAuth();
  const [records, setRecords] = useState<AlumniRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Add/Edit dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AlumniRecord | null>(null);
  const [formData, setFormData] = useState({
    admissionNumber: "",
    name: "",
    graduationYear: "",
    department: "",
  });
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteRecord, setDeleteRecord] = useState<AlumniRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk import
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [csvData, setCsvData] = useState("");
  const [importPreview, setImportPreview] = useState<{ admissionNumber: string; name: string; graduationYear?: string }[]>([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!isAuthReady) return;
    fetchRecords();
  }, [isAuthReady]);

  async function fetchRecords() {
    try {
      const db = getDb();
      const snapshot = await getDocs(collection(db, "verifiedAlumni"));
      const data = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          admissionNumber: doc.id,
          name: d.name || d.fullName || "",
          graduationYear: d.graduationYear,
          department: d.department || d.course,
          // Map isUsed to claimed for UI consistency
          claimed: d.isUsed === true,
          claimedBy: d.claimedBy,
          createdAt: d.createdAt?.toDate?.() || new Date(),
        } as AlumniRecord;
      });
      setRecords(data);
    } catch (error) {
      console.error("Error fetching records:", error);
    } finally {
      setLoading(false);
    }
  }

  // Stats
  const stats = useMemo(() => {
    const claimed = records.filter((r) => r.claimed).length;
    const available = records.filter((r) => !r.claimed).length;
    return { total: records.length, claimed, available };
  }, [records]);

  // Filter
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const matchesSearch =
        !search ||
        rec.name?.toLowerCase().includes(search.toLowerCase()) ||
        rec.admissionNumber?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "claimed" && rec.claimed) ||
        (statusFilter === "available" && !rec.claimed);
      return matchesSearch && matchesStatus;
    });
  }, [records, search, statusFilter]);

  // Paginate
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;

  // Handle save
  async function handleSave() {
    if (!formData.admissionNumber || !formData.name) return;
    setSaving(true);

    try {
      const db = getDb();
      const admissionNo = formData.admissionNumber.toUpperCase().trim();

      if (editingRecord) {
        // Update existing - use fullName for consistency with types
        await updateDoc(doc(db, "verifiedAlumni", editingRecord.id), {
          fullName: formData.name.trim(),
          name: formData.name.trim(), // Keep for backward compatibility
          graduationYear: formData.graduationYear || null,
          department: formData.department || null,
          updatedAt: serverTimestamp(),
        });

        await logAdminActivity({
          adminId: adminUser?.uid || "",
          adminEmail: adminUser?.email || "",
          action: "update_verified_alumni",
          targetType: "verified_alumni",
          targetId: editingRecord.id,
          details: `Updated alumni record: ${formData.name}`,
        });

        setRecords((prev) =>
          prev.map((r) =>
            r.id === editingRecord.id
              ? { ...r, name: formData.name, graduationYear: formData.graduationYear, department: formData.department }
              : r
          )
        );
      } else {
        // Create new - use fullName for consistency with types
        await setDoc(doc(db, "verifiedAlumni", admissionNo), {
          fullName: formData.name.trim(),
          name: formData.name.trim(), // Keep for backward compatibility
          graduationYear: formData.graduationYear || null,
          department: formData.department || null,
          claimed: false,
          createdAt: serverTimestamp(),
        });

        await logAdminActivity({
          adminId: adminUser?.uid || "",
          adminEmail: adminUser?.email || "",
          action: "add_verified_alumni",
          targetType: "verified_alumni",
          targetId: admissionNo,
          details: `Added alumni record: ${formData.name} (${admissionNo})`,
        });

        setRecords((prev) => [
          ...prev,
          {
            id: admissionNo,
            admissionNumber: admissionNo,
            name: formData.name,
            graduationYear: formData.graduationYear,
            department: formData.department,
            claimed: false,
            createdAt: new Date(),
          },
        ]);
      }

      setShowAddDialog(false);
      setEditingRecord(null);
      setFormData({ admissionNumber: "", name: "", graduationYear: "", department: "" });
    } catch (error) {
      console.error("Error saving record:", error);
    } finally {
      setSaving(false);
    }
  }

  // Handle delete
  async function handleDelete() {
    if (!deleteRecord) return;
    setDeleting(true);

    try {
      const db = getDb();
      await deleteDoc(doc(db, "verifiedAlumni", deleteRecord.id));

      await logAdminActivity({
        adminId: adminUser?.uid || "",
        adminEmail: adminUser?.email || "",
        action: "delete_verified_alumni",
        targetType: "verified_alumni",
        targetId: deleteRecord.id,
        details: `Deleted alumni record: ${deleteRecord.name}`,
      });

      setRecords((prev) => prev.filter((r) => r.id !== deleteRecord.id));
      setDeleteRecord(null);
    } catch (error) {
      console.error("Error deleting record:", error);
    } finally {
      setDeleting(false);
    }
  }

  // Parse CSV
  function handleCsvChange(value: string) {
    setCsvData(value);
    const lines = value.trim().split("\n").filter((l) => l.trim());
    const preview = lines.slice(0, 10).map((line) => {
      const [admissionNumber, name, graduationYear] = line.split(",").map((s) => s.trim());
      return { admissionNumber, name, graduationYear };
    }).filter((r) => r.admissionNumber && r.name);
    setImportPreview(preview);
  }

  // Bulk import
  async function handleBulkImport() {
    if (!csvData.trim()) return;
    setImporting(true);

    try {
      const db = getDb();
      const lines = csvData.trim().split("\n").filter((l) => l.trim());
      let count = 0;

      for (const line of lines) {
        const [admissionNumber, name, graduationYear] = line.split(",").map((s) => s.trim());
        if (!admissionNumber || !name) continue;

        const admissionNo = admissionNumber.toUpperCase();
        await setDoc(doc(db, "verifiedAlumni", admissionNo), {
          name,
          graduationYear: graduationYear || null,
          claimed: false,
          createdAt: serverTimestamp(),
        });
        count++;
      }

      await logAdminActivity({
        adminId: adminUser?.uid || "",
        adminEmail: adminUser?.email || "",
        action: "bulk_import_verified_alumni",
        targetType: "verified_alumni",
        targetId: "bulk",
        details: `Imported ${count} alumni records`,
      });

      setShowImportDialog(false);
      setCsvData("");
      setImportPreview([]);
      fetchRecords();
    } catch (error) {
      console.error("Error importing:", error);
    } finally {
      setImporting(false);
    }
  }

  // Download template
  function downloadTemplate() {
    const csv = "Admission Number,Name,Graduation Year\n2020CS001,John Doe,2024\n2020CS002,Jane Smith,2024";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "alumni_template.csv";
    a.click();
  }

  const columns = [
    {
      key: "admissionNumber",
      label: "Admission No.",
      render: (rec: AlumniRecord) => (
        <span className="font-mono text-cyan-400">{rec.admissionNumber}</span>
      ),
    },
    {
      key: "name",
      label: "Name",
      render: (rec: AlumniRecord) => (
        <span className="text-slate-200">{rec.name}</span>
      ),
    },
    {
      key: "graduationYear",
      label: "Year",
      render: (rec: AlumniRecord) => (
        <span className="text-slate-400">{rec.graduationYear || "-"}</span>
      ),
    },
    {
      key: "department",
      label: "Department",
      render: (rec: AlumniRecord) => (
        <span className="text-slate-400">{rec.department || "-"}</span>
      ),
    },
    {
      key: "claimed",
      label: "Status",
      render: (rec: AlumniRecord) => (
        <Badge
          className={
            rec.claimed
              ? "bg-green-500/20 text-green-400 border-green-500/30"
              : "bg-slate-500/20 text-slate-400 border-slate-500/30"
          }
        >
          {rec.claimed ? "Claimed" : "Available"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (rec: AlumniRecord) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setEditingRecord(rec);
              setFormData({
                admissionNumber: rec.admissionNumber,
                name: rec.name,
                graduationYear: rec.graduationYear || "",
                department: rec.department || "",
              });
              setShowAddDialog(true);
            }}
            className="text-slate-400 hover:text-cyan-400"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteRecord(rec);
            }}
            disabled={rec.claimed}
            className="text-slate-400 hover:text-red-400 disabled:opacity-30"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={GraduationCap}
        title="Alumni Database"
        description="Manage verified alumni admission numbers"
        iconColor="purple"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(true)}
              className="bg-slate-800 border-slate-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button
              onClick={() => {
                setEditingRecord(null);
                setFormData({ admissionNumber: "", name: "", graduationYear: "", department: "" });
                setShowAddDialog(true);
              }}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Record
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <StatsGrid columns={3}>
        <StatsCard title="Total Records" value={stats.total} icon={GraduationCap} color="purple" />
        <StatsCard title="Claimed" value={stats.claimed} icon={GraduationCap} color="green" />
        <StatsCard title="Available" value={stats.available} icon={GraduationCap} color="cyan" />
      </StatsGrid>

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or admission number..."
        filters={[
          {
            key: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "all", label: "All" },
              { value: "available", label: "Available" },
              { value: "claimed", label: "Claimed" },
            ],
          },
        ]}
        onClear={() => {
          setSearch("");
          setStatusFilter("all");
        }}
      />

      <DataTable
        columns={columns}
        data={paginatedRecords}
        loading={loading}
        emptyMessage="No alumni records found"
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={filteredRecords.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-100">
              {editingRecord ? "Edit Record" : "Add Alumni Record"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Admission Number *
              </label>
              <Input
                value={formData.admissionNumber}
                onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
                placeholder="e.g., 2020CS001"
                disabled={!!editingRecord}
                className="bg-slate-800 border-slate-700 uppercase"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Full Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., John Doe"
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Graduation Year
                </label>
                <Input
                  value={formData.graduationYear}
                  onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                  placeholder="e.g., 2024"
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Department
                </label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g., Computer Science"
                  className="bg-slate-800 border-slate-700"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                className="bg-slate-800 border-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !formData.admissionNumber || !formData.name}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                {saving ? "Saving..." : editingRecord ? "Update" : "Add Record"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Bulk Import Alumni</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="bg-slate-800 border-slate-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                CSV Data (Admission Number, Name, Graduation Year)
              </label>
              <textarea
                value={csvData}
                onChange={(e) => handleCsvChange(e.target.value)}
                placeholder="2020CS001,John Doe,2024&#10;2020CS002,Jane Smith,2024"
                rows={6}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm font-mono"
              />
            </div>
            {importPreview.length > 0 && (
              <div>
                <p className="text-sm text-slate-400 mb-2">Preview (first 10):</p>
                <div className="bg-slate-800 rounded-lg p-3 text-sm max-h-40 overflow-y-auto">
                  {importPreview.map((item, i) => (
                    <div key={i} className="text-slate-300">
                      {item.admissionNumber} - {item.name} ({item.graduationYear || "N/A"})
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowImportDialog(false)}
                className="bg-slate-800 border-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkImport}
                disabled={importing || !csvData.trim()}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                {importing ? "Importing..." : "Import Records"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteRecord}
        onOpenChange={() => setDeleteRecord(null)}
        title="Delete Record"
        description={`Are you sure you want to delete the record for "${deleteRecord?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="destructive"
        loading={deleting}
      />
    </div>
  );
}
