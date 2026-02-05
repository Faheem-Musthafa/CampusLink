"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/action-button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { useVerificationGuard } from "@/hooks/use-verification-guard";
import { getUserData } from "@/lib/firebase/auth";
import { handleError } from "@/lib/utils/error-handling";
import { useEffect, useState } from "react";
import { User, JobPosting, JobApplication } from "@/types";
import { collection, query, where, getDocs, doc, getDoc, Firestore } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Briefcase, MapPin, Building2, Calendar, CheckCircle, XCircle, Clock, Users, Eye, FileText, ExternalLink, Search } from "lucide-react";
import { useRouter } from "next/navigation";

// Helper to get db
const getDb = (): Firestore => {
  if (!db) {
    throw new Error("Firestore is not initialized");
  }
  return db;
};

export default function MyApplicationsPage() {
  const { user, loading: authLoading } = useVerificationGuard();
  const router = useRouter();
  const [userData, setUserData] = useState<User | null>(null);
  const [applications, setApplications] = useState<(JobApplication & { jobData?: JobPosting })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    if (user) {
      getUserData(user.uid).then((data) => {
        setUserData(data);
        
        // Only load applications if user is student
        if (data?.role === "student") {
          loadMyApplications();
        } else {
          setLoading(false);
        }
      });
    }
  }, [user]);

  const loadMyApplications = async () => {
    if (!user) return;
    
    try {
      const firestore = getDb();
      const applicationsRef = collection(firestore, "jobApplications");
      const q = query(applicationsRef, where("applicantId", "==", user.uid));
      const snapshot = await getDocs(q);
      
      const apps: (JobApplication & { jobData?: JobPosting })[] = [];
      
      for (const docSnap of snapshot.docs) {
        const appData = docSnap.data() as JobApplication;
        appData.id = docSnap.id;
        
        // Fetch job data
        try {
          const jobRef = doc(firestore, "jobPostings", appData.jobId);
          const jobSnap = await getDoc(jobRef);
          if (jobSnap.exists()) {
            const jobData = jobSnap.data() as JobPosting;
            jobData.id = jobSnap.id;
            apps.push({ ...appData, jobData });
          } else {
            apps.push(appData);
          }
        } catch (error) {
          handleError(error, "Failed to load job data");
          apps.push(appData);
        }
      }
      
      // Sort by created date (newest first)
      apps.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return dateB - dateA;
      });
      
      setApplications(apps);
    } catch (error) {
      handleError(error, "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const getApplicationStatusVariant = (status: JobApplication["status"]): any => {
    switch (status) {
      case "accepted":
        return "approved";
      case "rejected":
        return "rejected";
      case "shortlisted":
        return "info";
      case "reviewed":
        return "warning";
      default:
        return "pending";
    }
  };

  const filteredApplications = applications.filter((app) => {
    if (filterStatus === "all") return true;
    return app.status === filterStatus;
  });

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" message="Loading your applications..." />
        </div>
      </MainLayout>
    );
  }

  if (userData?.role !== "student") {
    return (
      <MainLayout>
        <Card className="max-w-2xl mx-auto mt-20">
          <CardContent className="py-16 text-center">
            <Briefcase className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h2 className="text-2xl font-bold mb-2">Students Only</h2>
            <p className="text-muted-foreground mb-4">
              This page is only accessible to student members.
            </p>
            <ActionButton onClick={() => router.push("/jobs")} variant="primary">Browse Jobs</ActionButton>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="My Applications"
          description="Track the status of your job applications"
          breadcrumbs={[
            { label: "Jobs", href: "/jobs" },
            { label: "My Applications" },
          ]}
          actions={
            <ActionButton 
              onClick={() => router.push("/jobs")}
              variant="primary"
              icon={<Search className="h-4 w-4" />}
            >
              Browse More Jobs
            </ActionButton>
          }
        />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <StatCard
            icon={FileText}
            title="Total"
            value={applications.length}
            iconColor="text-blue-500"
          />
          <StatCard
            icon={Clock}
            title="Pending"
            value={applications.filter((a) => a.status === "pending").length}
            iconColor="text-yellow-500"
          />
          <StatCard
            icon={Eye}
            title="Reviewed"
            value={applications.filter((a) => a.status === "reviewed").length}
            iconColor="text-purple-500"
          />
          <StatCard
            icon={Users}
            title="Shortlisted"
            value={applications.filter((a) => a.status === "shortlisted").length}
            iconColor="text-blue-600"
          />
          <StatCard
            icon={CheckCircle}
            title="Accepted"
            value={applications.filter((a) => a.status === "accepted").length}
            iconColor="text-green-500"
          />
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex gap-2 flex-wrap">
            <ActionButton
              variant={filterStatus === "all" ? "primary" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("all")}
            >
              All
            </ActionButton>
            <ActionButton
              variant={filterStatus === "pending" ? "primary" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("pending")}
            >
              Pending
            </ActionButton>
            <ActionButton
              variant={filterStatus === "reviewed" ? "primary" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("reviewed")}
            >
              Reviewed
            </ActionButton>
            <ActionButton
              variant={filterStatus === "shortlisted" ? "primary" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("shortlisted")}
            >
              Shortlisted
            </ActionButton>
            <ActionButton
              variant={filterStatus === "accepted" ? "primary" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("accepted")}
            >
              Accepted
            </ActionButton>
            <ActionButton
              variant={filterStatus === "rejected" ? "primary" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("rejected")}
            >
              Rejected
            </ActionButton>
          </div>
        </Card>

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-2 text-lg">
                {filterStatus === "all" 
                  ? "You haven't applied to any jobs yet"
                  : `No ${filterStatus} applications found`}
              </p>
              {filterStatus === "all" ? (
                <ActionButton 
                  onClick={() => router.push("/jobs")}
                  variant="primary"
                  icon={<Search className="h-4 w-4" />}
                >
                  Browse Available Jobs
                </ActionButton>
              ) : (
                <ActionButton variant="outline" onClick={() => setFilterStatus("all")}>
                  View All Applications
                </ActionButton>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredApplications.map((application) => (
              <Card key={application.id} className="hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <CardTitle className="text-xl">
                          {application.jobData?.title || "Job Title Unavailable"}
                        </CardTitle>
                        <StatusBadge variant={getApplicationStatusVariant(application.status)}>
                          {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                        </StatusBadge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {application.jobData?.company || "Unknown"}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {application.jobData?.location || "Unknown"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Applied {new Date(application.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {application.jobData?.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {application.jobData.description}
                    </p>
                  )}
                  
                  <div className="flex gap-2 flex-wrap">
                    {application.resumeUrl && (
                      <ActionButton
                        size="sm"
                        variant="outline"
                        icon={<FileText className="h-4 w-4" />}
                        onClick={() => window.open(application.resumeUrl, '_blank')}
                      >
                        View My Resume
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </ActionButton>
                    )}
                    {application.coverLetter && (
                      <ActionButton
                        size="sm"
                        variant="outline"
                        icon={<FileText className="h-4 w-4" />}
                        onClick={() => alert(application.coverLetter)}
                      >
                        View Cover Letter
                      </ActionButton>
                    )}
                  </div>

                  {application.status === "accepted" && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800 font-medium">
                        🎉 Congratulations! Your application has been accepted. The employer should contact you soon.
                      </p>
                    </div>
                  )}
                  {application.status === "rejected" && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-800">
                        Unfortunately, your application was not selected. Keep applying!
                      </p>
                    </div>
                  )}
                  {application.status === "shortlisted" && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800 font-medium">
                        ✨ You&apos;ve been shortlisted! The employer is reviewing your profile.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
