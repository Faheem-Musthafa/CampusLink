"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionButton } from "@/components/ui/action-button";
import { JobCard, JobCardGrid } from "@/components/ui/job-card";
import { PageHeader } from "@/components/ui/page-header";
import { useVerificationGuard } from "@/hooks/use-verification-guard";
import { getUserData } from "@/lib/firebase/auth";
import { handleError } from "@/lib/utils/error-handling";
import { useEffect, useState } from "react";
import { User, JobPosting } from "@/types";
import { getJobPostings, createJobApplication } from "@/lib/firebase/jobs";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Search, Filter, Send, Plus, MapPin, DollarSign, ExternalLink, FileText, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function JobsPage() {
  const { user, loading: authLoading } = useVerificationGuard();
  const router = useRouter();
  const [userData, setUserData] = useState<User | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  
  // Application dialog state
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [resumeUrl, setResumeUrl] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      getUserData(user.uid).then((data) => {
        setUserData(data);
        getJobPostings({ status: "active" })
          .then((jobList) => {
            setJobs(jobList);
            setFilteredJobs(jobList);
          })
          .finally(() => setLoading(false));
      });
    }
  }, [user]);

  useEffect(() => {
    let filtered = jobs;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((job) => job.type === filterType || (filterType === "referral" && job.isReferral));
    }

    setFilteredJobs(filtered);
  }, [searchQuery, filterType, jobs]);

  const handleApplyClick = (job: JobPosting) => {
    setSelectedJob(job);
    setShowApplicationDialog(true);
    setResumeUrl("");
    setCoverLetter("");
  };

  const handleSubmitApplication = async () => {
    if (!user || !selectedJob) return;

    setSubmitting(true);
    try {
      await createJobApplication(
        selectedJob.id,
        user.uid,
        resumeUrl.trim() || undefined,
        coverLetter.trim() || undefined
      );

      // Add to applied jobs set
      setAppliedJobs((prev) => new Set(prev).add(selectedJob.id));

      // Show success message
      alert("Application submitted successfully!");
      setShowApplicationDialog(false);
    } catch (error) {
      handleError(error, "Failed to submit application");
      alert("Failed to submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" message="Loading job postings..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Jobs & Opportunities"
          description={
            userData?.role === "alumni"
              ? "Post job opportunities and help students find their dream careers"
              : "Discover exciting career opportunities and internships from verified alumni"
          }
          actions={
            userData?.role === "alumni" ? (
              <ActionButton 
                variant="primary"
                onClick={() => router.push("/jobs/create")}
                icon={<Plus />}
              >
                Post a Job
              </ActionButton>
            ) : undefined
          }
        />

        {/* Search and Filters */}
        {userData?.role !== "alumni" && (
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[250px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search jobs, companies, locations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: "all", label: "All" },
                    { key: "full-time", label: "Full-time" },
                    { key: "part-time", label: "Part-time" },
                    { key: "internship", label: "Internship" },
                    { key: "referral", label: "Referral" },
                  ].map((filter) => (
                    <ActionButton
                      key={filter.key}
                      variant={filterType === filter.key ? "primary" : "outline"}
                      size="sm"
                      onClick={() => setFilterType(filter.key)}
                    >
                      {filter.label}
                    </ActionButton>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-3">
                  <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-full mb-2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={searchQuery || filterType !== "all" ? "No jobs match your filters" : "No job postings available"}
            description={searchQuery || filterType !== "all" ? "Try adjusting your search criteria" : "Check back later for new opportunities"}
            action={
              searchQuery || filterType !== "all" ? (
                <ActionButton variant="outline" onClick={() => {
                  setSearchQuery("");
                  setFilterType("all");
                }}>
                  Clear Filters
                </ActionButton>
              ) : userData?.role === "alumni" ? (
                <ActionButton onClick={() => router.push("/jobs/create")}>Post the first job</ActionButton>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredJobs.map((job) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                        {job.isReferral && (
                          <Badge className="bg-green-100 text-green-800">Referral</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span className="font-medium text-foreground">{job.company}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-4 w-4" />
                        <span>{job.location}</span>
                      </div>
                    </div>
                    {!job.isReferral && (
                      <Badge variant="secondary" className="capitalize">{job.type}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                  {job.salary && (
                    <div className="flex items-center gap-2 text-sm font-medium text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                      <DollarSign className="h-4 w-4" />
                      {job.salary.currency} {job.salary.min.toLocaleString()} - {job.salary.max.toLocaleString()}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-xs text-muted-foreground">
                      {job.applicationsCount || 0} application{job.applicationsCount !== 1 ? "s" : ""}
                    </span>
                    <div className="flex gap-2">
                      {userData?.role === "student" && (
                        <ActionButton 
                          size="sm" 
                          onClick={() => handleApplyClick(job)}
                          disabled={appliedJobs.has(job.id)}
                        >
                          {appliedJobs.has(job.id) ? "Applied ✓" : (
                            <><Send className="h-3.5 w-3.5 mr-1.5" />Apply</>
                          )}
                        </ActionButton>
                      )}
                      {job.applicationLink && (
                        <ActionButton 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(job.applicationLink, '_blank')}
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />External
                        </ActionButton>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Application Dialog */}
        <Dialog open={showApplicationDialog} onOpenChange={setShowApplicationDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                Apply for {selectedJob?.title}
              </DialogTitle>
              <DialogDescription>
                Submit your application for {selectedJob?.company}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Job Info */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedJob?.company}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{selectedJob?.location}</span>
                </div>
              </div>

              {/* Resume URL */}
              <div className="space-y-2">
                <Label htmlFor="resumeUrl">Resume URL</Label>
                <Input
                  id="resumeUrl"
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={resumeUrl}
                  onChange={(e) => setResumeUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Share a public link to your resume (Google Drive, Dropbox, etc.)
                </p>
              </div>

              {/* Cover Letter */}
              <div className="space-y-2">
                <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
                <Textarea
                  id="coverLetter"
                  placeholder="Tell us why you're interested in this position..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <ActionButton
                variant="outline"
                onClick={() => setShowApplicationDialog(false)}
                disabled={submitting}
              >
                Cancel
              </ActionButton>
              <ActionButton
                onClick={handleSubmitApplication}
                disabled={submitting || !resumeUrl.trim()}
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Application
                  </>
                )}
              </ActionButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}




