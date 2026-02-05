"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionButton } from "@/components/ui/action-button";
import { useVerificationGuard } from "@/hooks/use-verification-guard";
import { getUserData } from "@/lib/firebase/auth";
import { getUserProfile } from "@/lib/firebase/profiles";
import { handleError } from "@/lib/utils/error-handling";
import { formatDate } from "@/lib/utils/date";
import { useEffect, useState } from "react";
import { User, JobPosting, JobApplication, UserProfile } from "@/types";
import {
  Users,
  MessageSquare,
  Briefcase,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  FileText,
  Building2,
  MapPin,
  CheckCircle,
  Target,
  Calendar,
  Clock,
  Star,
  Activity,
  GraduationCap,
  Plus,
  ChevronRight
} from "lucide-react";
import { collection, query, where, getDocs, orderBy, limit, Firestore } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useRouter } from "next/navigation";
import { calculateProfileCompletion } from "@/lib/utils/profileCompletion";
import { subscribeToUnreadCount } from "@/lib/firebase/chat";
import { isFullyVerified, isAccountDeactivated, getVerificationMessage, getDaysUntilDeactivation } from "@/lib/utils/verification-guards";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Shield, XCircle } from "lucide-react";

const getDb = (): Firestore => {
  if (!db) throw new Error("Firestore is not initialized");
  return db;
};

export default function DashboardPage() {
  const { user, loading } = useVerificationGuard();
  const router = useRouter();
  const [userData, setUserData] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({ jobsCount: 0, applicationsCount: 0, connectionsCount: 0 });
  const [recentJobs, setRecentJobs] = useState<JobPosting[]>([]);
  const [recentApplications, setRecentApplications] = useState<(JobApplication & { jobData?: JobPosting })[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [mentorshipStats, setMentorshipStats] = useState({ activeMentorships: 0, pendingRequests: 0, totalMentored: 0 });

  useEffect(() => {
    if (user) {
      Promise.all([getUserData(user.uid), getUserProfile(user.uid)])
        .then(([data, profileData]) => {
          setUserData(data);
          setProfile(profileData);
          if (data) loadDashboardData(data);
        })
        .catch((error) => {
          handleError(error, "Failed to fetch user data");
          setLoadingData(false);
        });
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToUnreadCount(user.uid, (count) => setUnreadMessages(count));
    return () => unsubscribe();
  }, [user]);

  const loadDashboardData = async (userData: User) => {
    try {
      const firestore = getDb();
      await loadMentorshipData(firestore, userData);
      if (userData.role === "student") await loadStudentData(firestore);
      else if (userData.role === "alumni" || userData.role === "mentor") await loadAlumniData(firestore);
      else if (userData.role === "aspirant") await loadAspirantData();
    } catch (error) {
      handleError(error, "Error loading dashboard data");
    } finally {
      setLoadingData(false);
    }
  };

  const loadMentorshipData = async (firestore: Firestore, userData: User) => {
    try {
      const mentorshipsRef = collection(firestore, "mentorships");
      if (userData.role === "student" || userData.role === "aspirant") {
        const [active, pending] = await Promise.all([
          getDocs(query(mentorshipsRef, where("menteeId", "==", user!.uid), where("status", "==", "active"))),
          getDocs(query(mentorshipsRef, where("menteeId", "==", user!.uid), where("status", "==", "pending")))
        ]);
        setMentorshipStats({ activeMentorships: active.size, pendingRequests: pending.size, totalMentored: 0 });
      } else if (userData.role === "alumni" || userData.role === "mentor") {
        const [active, pending, all] = await Promise.all([
          getDocs(query(mentorshipsRef, where("mentorId", "==", user!.uid), where("status", "==", "active"))),
          getDocs(query(mentorshipsRef, where("mentorId", "==", user!.uid), where("status", "==", "pending"))),
          getDocs(query(mentorshipsRef, where("mentorId", "==", user!.uid)))
        ]);
        setMentorshipStats({ activeMentorships: active.size, pendingRequests: pending.size, totalMentored: all.size });
      }
    } catch (error) {
      console.error("Error loading mentorship data:", error);
    }
  };

  const loadStudentData = async (firestore: Firestore) => {
    try {
      const applicationsRef = collection(firestore, "jobApplications");
      const jobsRef = collection(firestore, "jobPostings");
      const [applicationsSnapshot, allApplicationsSnapshot, jobsSnapshot, recentJobsSnapshot] = await Promise.all([
        getDocs(query(applicationsRef, where("applicantId", "==", user!.uid), orderBy("createdAt", "desc"), limit(5))),
        getDocs(query(applicationsRef, where("applicantId", "==", user!.uid))),
        getDocs(query(jobsRef, where("status", "==", "active"), orderBy("createdAt", "desc"), limit(100))),
        getDocs(query(jobsRef, where("status", "==", "active"), orderBy("createdAt", "desc"), limit(3)))
      ]);

      const apps: (JobApplication & { jobData?: JobPosting })[] = applicationsSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })) as (JobApplication & { jobData?: JobPosting })[];
      const appsWithJobs = await Promise.all(apps.map(async (appData) => {
        try {
          const jobQuery = query(jobsRef, where("__name__", "==", appData.jobId));
          const jobSnapshot = await getDocs(jobQuery);
          if (!jobSnapshot.empty) {
            const jobData = jobSnapshot.docs[0].data() as JobPosting;
            jobData.id = jobSnapshot.docs[0].id;
            appData.jobData = jobData;
          }
        } catch { /* ignore */ }
        return appData;
      }));
      setRecentApplications(appsWithJobs);
      setStats(prev => ({ ...prev, applicationsCount: allApplicationsSnapshot.size, jobsCount: jobsSnapshot.size }));
      const jobs: JobPosting[] = recentJobsSnapshot.docs.map(doc => ({ ...doc.data() as JobPosting, id: doc.id }));
      setRecentJobs(jobs);
    } catch (error) {
      handleError(error, "Error loading student data");
    }
  };

  const loadAlumniData = async (firestore: Firestore) => {
    try {
      const jobsRef = collection(firestore, "jobPostings");
      const applicationsRef = collection(firestore, "jobApplications");
      const [myJobsSnapshot, allJobsSnapshot] = await Promise.all([
        getDocs(query(jobsRef, where("postedBy", "==", user!.uid), orderBy("createdAt", "desc"), limit(3))),
        getDocs(query(jobsRef, where("postedBy", "==", user!.uid)))
      ]);

      const jobs: JobPosting[] = myJobsSnapshot.docs.map(doc => ({ ...doc.data() as JobPosting, id: doc.id }));
      setRecentJobs(jobs);

      const applicationSnapshots = await Promise.all(jobs.map(job => getDocs(query(applicationsRef, where("jobId", "==", job.id)))));
      const totalApplications = applicationSnapshots.reduce((sum, snap) => sum + snap.size, 0);
      setStats(prev => ({ ...prev, jobsCount: allJobsSnapshot.size, applicationsCount: totalApplications }));
    } catch (error) {
      handleError(error, "Error loading alumni data");
    }
  };

  const loadAspirantData = async () => {
    setStats({ jobsCount: 0, applicationsCount: 0, connectionsCount: 0 });
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="xl" message="Loading your dashboard..." />
        </div>
      </MainLayout>
    );
  }

  const verificationStatus = user?.verificationStatus || "unverified";
  const completion = calculateProfileCompletion(profile);

  const getQuickActions = () => {
    const baseActions = [
      { icon: MessageSquare, label: "Messages", href: "/chat", count: unreadMessages },
      { icon: Users, label: "Profile", href: "/profile" },
    ];
    if (userData?.role === "student") {
      return [
        { icon: Briefcase, label: "Browse Jobs", href: "/jobs" },
        { icon: Target, label: "Find Mentor", href: "/mentorship" },
        ...baseActions
      ];
    } else if (userData?.role === "alumni") {
      return [
        { icon: Plus, label: "Post Job", href: "/jobs/create" },
        { icon: FileText, label: "My Posts", href: "/jobs/my-posts" },
        ...baseActions
      ];
    } else if (userData?.role === "aspirant") {
      return [
        { icon: Target, label: "Find Mentor", href: "/mentorship" },
        { icon: GraduationCap, label: "Browse Students", href: "/users" },
        ...baseActions
      ];
    }
    return baseActions;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Admin Indicator */}
        {userData?.role === "admin" && (
          <Alert className="border-primary/20 bg-primary/5">
            <Shield className="h-4 w-4 text-primary" />
            <AlertTitle className="text-foreground font-medium">Admin Account</AlertTitle>
            <AlertDescription className="text-muted-foreground">Full platform access enabled</AlertDescription>
          </Alert>
        )}

        {/* Deactivation Notice */}
        {userData && isAccountDeactivated(userData) && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Account Deactivated</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Complete verification to reactivate your account.</span>
              <ActionButton size="sm" variant="outline" onClick={() => router.push("/onboarding")}>
                Complete Verification
              </ActionButton>
            </AlertDescription>
          </Alert>
        )}

        {/* Verification Warning */}
        {userData && !isAccountDeactivated(userData) && userData.role !== "admin" && !isFullyVerified(userData) && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-900">Limited Access</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <div>
                <p className="text-amber-800">{getVerificationMessage(userData).message}</p>
                {userData.verificationDeadline && getDaysUntilDeactivation(userData) !== null && getDaysUntilDeactivation(userData)! <= 1 && (
                  <p className="text-sm text-amber-700 mt-1 font-medium">
                    ⚠️ Account will be deactivated in {getDaysUntilDeactivation(userData)} day(s)
                  </p>
                )}
              </div>
              <ActionButton size="sm" variant="outline" className="ml-4" onClick={() => router.push("/onboarding")}>
                Verify Now
              </ActionButton>
            </AlertDescription>
          </Alert>
        )}

        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Welcome back, {user?.displayName?.split(' ')[0] || "there"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {userData?.role === "student" && "Discover opportunities and connect with mentors"}
              {userData?.role === "alumni" && "Share opportunities and guide the next generation"}
              {userData?.role === "aspirant" && "Get guidance for your dream college admission"}
            </p>
          </div>
          <Badge variant="outline" className="capitalize">
            {userData?.role || "User"}
          </Badge>
        </div>

        {/* Verification Status Alerts */}
        {verificationStatus === "pending" && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <Clock className="h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <p className="font-medium text-amber-900">Verification Pending</p>
              <p className="text-sm text-amber-700">Your documents are being reviewed</p>
            </div>
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>
          </div>
        )}

        {verificationStatus === "rejected" && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div className="flex-1">
              <p className="font-medium text-red-900">Verification Rejected</p>
              <p className="text-sm text-red-700">Please resubmit with valid documents</p>
            </div>
            <ActionButton size="sm" variant="outline" onClick={() => router.push("/onboarding")}>
              Resubmit
            </ActionButton>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/mentorship")}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                {mentorshipStats.pendingRequests > 0 && (
                  <Badge className="bg-amber-100 text-amber-800">{mentorshipStats.pendingRequests} pending</Badge>
                )}
              </div>
              <p className="text-2xl font-semibold mt-3">{loadingData ? "..." : mentorshipStats.activeMentorships}</p>
              <p className="text-sm text-muted-foreground">
                {userData?.role === "student" || userData?.role === "aspirant" ? "Active Mentors" : "Mentees"}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/chat")}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                </div>
                {unreadMessages > 0 && (
                  <Badge className="bg-red-100 text-red-700">{unreadMessages > 9 ? "9+" : unreadMessages}</Badge>
                )}
              </div>
              <p className="text-2xl font-semibold mt-3">{unreadMessages}</p>
              <p className="text-sm text-muted-foreground">Unread Messages</p>
            </CardContent>
          </Card>

          {userData?.role !== "aspirant" && (
            <Card className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(userData?.role === "student" ? "/jobs" : "/jobs/my-posts")}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-green-600" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-semibold mt-3">{loadingData ? "..." : stats.jobsCount}</p>
                <p className="text-sm text-muted-foreground">
                  {userData?.role === "student" ? "Available Jobs" : "Posted Jobs"}
                </p>
              </CardContent>
            </Card>
          )}

          {userData?.role === "aspirant" && (
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/users")}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-green-600" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-semibold mt-3">Connect</p>
                <p className="text-sm text-muted-foreground">Browse Students</p>
              </CardContent>
            </Card>
          )}

          {userData?.role !== "aspirant" && (
            <Card className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(userData?.role === "student" ? "/jobs/my-applications" : "/jobs/my-posts")}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-orange-600" />
                  </div>
                  <Star className="h-4 w-4 text-amber-400" />
                </div>
                <p className="text-2xl font-semibold mt-3">{loadingData ? "..." : stats.applicationsCount}</p>
                <p className="text-sm text-muted-foreground">
                  {userData?.role === "student" ? "Applications" : "Received"}
                </p>
              </CardContent>
            </Card>
          )}

          {userData?.role === "aspirant" && (
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/mentorship")}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Target className="h-5 w-5 text-orange-600" />
                  </div>
                  <Star className="h-4 w-4 text-amber-400" />
                </div>
                <p className="text-2xl font-semibold mt-3">Guidance</p>
                <p className="text-sm text-muted-foreground">Pre-Admission Help</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Profile Completion */}
        {completion.percentage < 100 && (
          <Card className="border-l-4 border-l-primary hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push("/profile")}>
            <CardContent className="p-5">
              <div className="flex items-center gap-5">
                <div className="relative h-14 w-14 shrink-0">
                  <svg className="h-14 w-14 transform -rotate-90">
                    <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="none" className="text-muted" />
                    <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="none"
                      strokeDasharray={`${2 * Math.PI * 24}`}
                      strokeDashoffset={`${2 * Math.PI * 24 * (1 - completion.percentage / 100)}`}
                      className="text-primary" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">{completion.percentage}%</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground">Complete your profile</h3>
                  <p className="text-sm text-muted-foreground">Increase visibility and unlock more opportunities</p>
                  {completion.missingFields.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {completion.missingFields.slice(0, 3).map((field) => (
                        <Badge key={field} variant="secondary" className="text-xs">{field}</Badge>
                      ))}
                      {completion.missingFields.length > 3 && (
                        <Badge variant="secondary" className="text-xs">+{completion.missingFields.length - 3}</Badge>
                      )}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {getQuickActions().map((action) => (
            <button
              key={action.label}
              onClick={() => router.push(action.href)}
              className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <action.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm text-foreground">{action.label}</p>
                {action.count !== undefined && action.count > 0 && (
                  <p className="text-xs text-muted-foreground">{action.count} new</p>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Activities */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  {userData?.role === "student" ? "Recent Applications" : userData?.role === "aspirant" ? "Your Journey" : "Job Posts"}
                </CardTitle>
                {userData?.role !== "aspirant" && (
                  <ActionButton variant="ghost" size="sm"
                    onClick={() => router.push(userData?.role === "student" ? "/jobs/my-applications" : "/jobs/my-posts")}>
                    View All <ArrowRight className="ml-1 h-4 w-4" />
                  </ActionButton>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : userData?.role === "aspirant" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Profile Created</p>
                      <p className="text-xs text-muted-foreground">Your profile is set up</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${mentorshipStats.activeMentorships > 0 ? 'bg-green-500' : 'bg-primary'}`}>
                      {mentorshipStats.activeMentorships > 0 ? <CheckCircle className="h-4 w-4 text-white" /> : <span className="text-white text-xs font-bold">2</span>}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Connect with Mentors</p>
                      <p className="text-xs text-muted-foreground">
                        {mentorshipStats.activeMentorships > 0 ? `${mentorshipStats.activeMentorships} mentor(s) connected` : "Find guidance from students & alumni"}
                      </p>
                    </div>
                    {mentorshipStats.activeMentorships === 0 && (
                      <ActionButton size="sm" onClick={() => router.push("/mentorship")}>Find Mentors</ActionButton>
                    )}
                  </div>
                  <div className="flex items-center gap-3 opacity-50">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-muted-foreground text-xs font-bold">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Ask Questions</p>
                      <p className="text-xs text-muted-foreground">Chat about campus life & admissions</p>
                    </div>
                  </div>
                </div>
              ) : userData?.role === "student" ? (
                recentApplications.length === 0 ? (
                  <EmptyState icon={FileText} title="No Applications Yet"
                    description="Start applying to jobs posted by alumni"
                    action={<ActionButton onClick={() => router.push("/jobs")}><Briefcase className="mr-2 h-4 w-4" />Browse Jobs</ActionButton>} />
                ) : (
                  <div className="space-y-3">
                    {recentApplications.slice(0, 4).map((app) => (
                      <div key={app.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => router.push("/jobs/my-applications")}>
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Briefcase className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{app.jobData?.title || "Application"}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {app.jobData?.company && <><Building2 className="h-3 w-3" />{app.jobData.company}</>}
                            <span>•</span>
                            <Calendar className="h-3 w-3" />{formatDate(app.createdAt)}
                          </div>
                        </div>
                        <Badge className={`capitalize ${app.status === "accepted" ? "bg-green-100 text-green-800" : app.status === "rejected" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                          {app.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                recentJobs.length === 0 ? (
                  <EmptyState icon={Briefcase} title="No Job Posts Yet"
                    description="Post opportunities to help students"
                    action={<ActionButton onClick={() => router.push("/jobs/create")}><Plus className="mr-2 h-4 w-4" />Post a Job</ActionButton>} />
                ) : (
                  <div className="space-y-3">
                    {recentJobs.slice(0, 4).map((job) => (
                      <div key={job.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => router.push("/jobs/my-posts")}>
                        <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{job.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3" />{job.company}
                            {job.location && <><span>•</span><MapPin className="h-3 w-3" />{job.location}</>}
                          </div>
                        </div>
                        <Badge variant="secondary">{job.applicationsCount || 0} applicants</Badge>
                      </div>
                    ))}
                  </div>
                )
              )}
            </CardContent>
          </Card>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Mentorship */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Mentorship
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xl font-semibold">{loadingData ? "..." : mentorshipStats.activeMentorships}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xl font-semibold">{loadingData ? "..." : mentorshipStats.pendingRequests}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
                <ActionButton variant="outline" className="w-full" onClick={() => router.push("/mentorship")}>
                  {userData?.role === "student" || userData?.role === "aspirant" ? "Find Mentors" : "View Requests"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </ActionButton>
              </CardContent>
            </Card>

            {/* Alumni Impact */}
            {userData?.role === "alumni" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Your Impact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Students Mentored</span>
                    <span className="font-semibold">{mentorshipStats.totalMentored}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Jobs Posted</span>
                    <span className="font-semibold">{stats.jobsCount}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">Applications Received</span>
                    <span className="font-semibold">{stats.applicationsCount}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
