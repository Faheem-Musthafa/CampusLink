"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/action-button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useVerificationGuard } from "@/hooks/use-verification-guard";
import { getUserData } from "@/lib/firebase/auth";
import { handleError } from "@/lib/utils/error-handling";
import { useEffect, useState } from "react";
import { User, JobPosting, JobApplication } from "@/types";
import { getJobPostings, updateJobApplication } from "@/lib/firebase/jobs";
import { getConversationBetweenUsers, createConversation, sendMessage } from "@/lib/firebase/chat";
import { collection, query, where, getDocs, Firestore } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Briefcase, MapPin, Users, Eye, Trash2, FileText, Mail, ExternalLink, Calendar, CheckCircle, XCircle, Clock, Plus, TrendingUp, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";

// Helper to get db
const getDb = (): Firestore => {
  if (!db) {
    throw new Error("Firestore is not initialized");
  }
  return db;
};

export default function MyPostsPage() {
  const { user, loading: authLoading } = useVerificationGuard();
  const router = useRouter();
  const [userData, setUserData] = useState<User | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  // Applicants dialog state
  const [showApplicantsDialog, setShowApplicantsDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [applicants, setApplicants] = useState<(JobApplication & { applicantData?: User })[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  useEffect(() => {
    if (user) {
      getUserData(user.uid).then((data) => {
        setUserData(data);
        
        // Only load jobs if user is alumni
        if (data?.role === "alumni") {
          loadMyJobs();
        } else {
          setLoading(false);
        }
      });
    }
  }, [user]);

  const loadMyJobs = async () => {
    if (!user) return;
    
    try {
      const allJobs = await getJobPostings({});
      const myJobs = allJobs.filter((job) => job.postedBy === user.uid);
      setJobs(myJobs);
    } catch (error) {
      handleError(error, "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  const loadApplicants = async (jobId: string) => {
    setLoadingApplicants(true);
    try {
      const firestore = getDb();
      const applicationsRef = collection(firestore, "jobApplications");
      const q = query(applicationsRef, where("jobId", "==", jobId));
      const snapshot = await getDocs(q);
      
      const applications: (JobApplication & { applicantData?: User })[] = [];
      
      for (const doc of snapshot.docs) {
        const appData = doc.data() as JobApplication;
        appData.id = doc.id;
        
        // Fetch applicant user data
        try {
          const applicantData = await getUserData(appData.applicantId);
          applications.push({ ...appData, applicantData: applicantData || undefined });
        } catch (error) {
          handleError(error, "Failed to load applicant data");
          applications.push(appData);
        }
      }
      
      setApplicants(applications);
    } catch (error) {
      handleError(error, "Failed to load applicants");
      setApplicants([]);
    } finally {
      setLoadingApplicants(false);
    }
  };

  const handleViewApplicants = (job: JobPosting) => {
    setSelectedJob(job);
    setShowApplicantsDialog(true);
    loadApplicants(job.id);
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job posting?")) return;
    
    try {
      const firestore = getDb();
      const { doc, deleteDoc } = await import("firebase/firestore");
      await deleteDoc(doc(firestore, "jobPostings", jobId));
      
      // Remove from local state
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      alert("Job posting deleted successfully!");
    } catch (error) {
      handleError(error, "Failed to delete job");
      alert("Failed to delete job posting.");
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

  const handleAcceptApplication = async (application: JobApplication & { applicantData?: User }) => {
    if (!user || !selectedJob) return;
    
    try {
      // Update application status
      await updateJobApplication(application.id, { status: "accepted" });
      
      // Create or get conversation
      const conversation = await getConversationBetweenUsers(user.uid, application.applicantId);
      
      if (!conversation) {
        const conversationId = await createConversation([user.uid, application.applicantId]);
        
        // Send initial message
        await sendMessage(
          conversationId,
          user.uid,
          application.applicantId,
          `Congratulations! Your application for "${selectedJob.title}" at ${selectedJob.company} has been accepted! Let's discuss the next steps.`,
          "text"
        );
      } else {
        // Send message in existing conversation
        await sendMessage(
          conversation.id,
          user.uid,
          application.applicantId,
          `Congratulations! Your application for "${selectedJob.title}" at ${selectedJob.company} has been accepted! Let's discuss the next steps.`,
          "text"
        );
      }
      
      // Update local state
      setApplicants(prev => prev.map(app => 
        app.id === application.id ? { ...app, status: "accepted" } : app
      ));
      
      alert("Application accepted! A message has been sent to the applicant.");
    } catch (error) {
      handleError(error, "Failed to accept application");
      alert("Failed to accept application. Please try again.");
    }
  };

  const handleRejectApplication = async (applicationId: string) => {
    if (!confirm("Are you sure you want to reject this application?")) return;
    
    try {
      await updateJobApplication(applicationId, { status: "rejected" });
      
      // Update local state
      setApplicants(prev => prev.map(app => 
        app.id === applicationId ? { ...app, status: "rejected" } : app
      ));
      
      alert("Application rejected.");
    } catch (error) {
      handleError(error, "Failed to reject application");
      alert("Failed to reject application. Please try again.");
    }
  };

  const handleMessageApplicant = async (applicantId: string) => {
    if (!user) return;
    
    try {
      // Check if conversation exists
      const conversation = await getConversationBetweenUsers(user.uid, applicantId);
      
      if (!conversation) {
        // Create new conversation
        await createConversation([user.uid, applicantId]);
      }
      
      // Navigate to chat page
      router.push("/chat");
    } catch (error) {
      handleError(error, "Failed to start conversation");
      alert("Failed to start conversation. Please try again.");
    }
  };

  const filteredJobs = jobs.filter((job) => {
    if (filterStatus === "all") return true;
    return job.status === filterStatus;
  });

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" message="Loading your job postings..." />
        </div>
      </MainLayout>
    );
  }

  if (userData?.role !== "alumni") {
    return (
      <MainLayout>
        <Card className="max-w-2xl mx-auto mt-20">
          <CardContent className="py-16 text-center">
            <Briefcase className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h2 className="text-2xl font-bold mb-2">Alumni Only</h2>
            <p className="text-muted-foreground mb-4">
              This page is only accessible to alumni members.
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
          title="My Job Postings"
          description="Manage your posted jobs and review applications"
          breadcrumbs={[
            { label: "Jobs", href: "/jobs" },
            { label: "My Posts" },
          ]}
          actions={
            <ActionButton 
              onClick={() => router.push("/jobs/create")}
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
            >
              Post New Job
            </ActionButton>
          }
        />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            icon={Briefcase}
            title="Total Jobs"
            value={jobs.length}
            iconColor="text-blue-500"
          />
          <StatCard
            icon={CheckCircle}
            title="Active Jobs"
            value={jobs.filter((j) => j.status === "active").length}
            iconColor="text-green-500"
          />
          <StatCard
            icon={Users}
            title="Filled Positions"
            value={jobs.filter((j) => j.status === "filled").length}
            iconColor="text-purple-500"
          />
          <StatCard
            icon={TrendingUp}
            title="Total Applications"
            value={jobs.reduce((sum, j) => sum + (j.applicationsCount || 0), 0)}
            iconColor="text-orange-500"
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
              All Jobs
            </ActionButton>
            <ActionButton
              variant={filterStatus === "active" ? "primary" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("active")}
            >
              Active
            </ActionButton>
            <ActionButton
              variant={filterStatus === "filled" ? "primary" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("filled")}
            >
              Filled
            </ActionButton>
            <ActionButton
              variant={filterStatus === "closed" ? "primary" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("closed")}
            >
              Closed
            </ActionButton>
          </div>
        </Card>

        {/* Job Listings */}
        {filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Briefcase className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-2 text-lg">
                {filterStatus === "all" 
                  ? "You haven't posted any jobs yet"
                  : `No ${filterStatus} jobs found`}
              </p>
              {filterStatus === "all" ? (
                <ActionButton 
                  onClick={() => router.push("/jobs/create")}
                  variant="primary"
                  icon={<Plus className="h-4 w-4" />}
                >
                  Post Your First Job
                </ActionButton>
              ) : (
                <ActionButton variant="outline" onClick={() => setFilterStatus("all")}>
                  View All Jobs
                </ActionButton>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredJobs.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{job.title}</CardTitle>
                        <Badge variant={job.status === "active" ? "default" : "secondary"}>
                          {job.status}
                        </Badge>
                        {job.isReferral && (
                          <Badge className="bg-green-500 text-white">Referral</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {job.company}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {job.applicationsCount || 0} applicants
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {job.description}
                  </p>
                  <div className="flex gap-2">
                    <ActionButton
                      size="sm"
                      onClick={() => handleViewApplicants(job)}
                      variant="primary"
                      icon={<Eye className="h-4 w-4" />}
                    >
                      View Applicants ({job.applicationsCount || 0})
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteJob(job.id)}
                      icon={<Trash2 className="h-4 w-4" />}
                      className="text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </ActionButton>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Applicants Dialog */}
        <Dialog open={showApplicantsDialog} onOpenChange={setShowApplicantsDialog}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Applicants for {selectedJob?.title}
              </DialogTitle>
              <DialogDescription>
                Review applications and manage candidates
              </DialogDescription>
            </DialogHeader>

            {loadingApplicants ? (
              <div className="py-12 text-center">
                <LoadingSpinner size="md" message="Loading applicants..." />
              </div>
            ) : applicants.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No applications received yet"
                description="Applications will appear here when candidates apply"
              />
            ) : (
              <div className="space-y-4 py-4">
                {applicants.map((application) => (
                  <Card key={application.id} className="border-2">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                            {application.applicantData?.displayName?.charAt(0).toUpperCase() || "?"}
                          </div>
                          <div>
                            <h4 className="font-semibold text-lg">
                              {application.applicantData?.displayName || "Unknown"}
                            </h4>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {application.applicantData?.email || "No email"}
                            </p>
                          </div>
                        </div>
                        <StatusBadge variant={getApplicationStatusVariant(application.status)}>
                          {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                        </StatusBadge>
                      </div>

                      {application.resumeUrl && (
                        <div className="mb-3">
                          <ActionButton
                            size="sm"
                            variant="outline"
                            icon={<FileText className="h-4 w-4" />}
                            onClick={() => window.open(application.resumeUrl, '_blank')}
                            className="w-full"
                          >
                            View Resume
                            <ExternalLink className="h-3 w-3 ml-2" />
                          </ActionButton>
                        </div>
                      )}

                      {application.coverLetter && (
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            Cover Letter:
                          </p>
                          <p className="text-sm whitespace-pre-wrap">
                            {application.coverLetter}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Applied on {new Date(application.createdAt).toLocaleDateString()}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                        {application.status === "pending" && (
                          <>
                            <ActionButton
                              size="sm"
                              variant="success"
                              icon={<CheckCircle className="h-4 w-4" />}
                              onClick={() => handleAcceptApplication(application)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              Accept
                            </ActionButton>
                            <ActionButton
                              size="sm"
                              variant="outline"
                              icon={<XCircle className="h-4 w-4" />}
                              onClick={() => handleRejectApplication(application.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              Reject
                            </ActionButton>
                          </>
                        )}
                        {application.status === "accepted" && (
                          <ActionButton
                            size="sm"
                            variant="primary"
                            icon={<MessageSquare className="h-4 w-4" />}
                            onClick={() => handleMessageApplicant(application.applicantId)}
                          >
                            Message Applicant
                          </ActionButton>
                        )}
                        {application.status === "rejected" && (
                          <span className="text-sm text-muted-foreground italic">
                            This application has been rejected
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
