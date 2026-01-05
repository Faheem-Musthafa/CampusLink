"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionButton } from "@/components/ui/action-button";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { RoleBasedGradient, RoleBadge } from "@/components/ui/role-based-gradient";
import { StatusBadge } from "@/components/ui/status-badge";
import { useVerificationGuard } from "@/hooks/use-verification-guard";
import { getUserData } from "@/lib/firebase/auth";
import { getUserProfile } from "@/lib/firebase/profiles";
import { getDocuments, queryDocuments } from "@/lib/firebase/firestore-helpers";
import { handleError } from "@/lib/utils/error-handling";
import { formatDate, formatRelativeTime } from "@/lib/utils/date";
import { FIRESTORE_COLLECTIONS, ROUTES } from "@/lib/constants";
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
  Sparkles,
  Zap,
  Calendar,
  Clock,
  Star,
  Award,
  Activity,
  GraduationCap,
  Plus
} from "lucide-react";
import { collection, query, where, getDocs, orderBy, limit, Firestore, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useRouter } from "next/navigation";
import { calculateProfileCompletion, getCompletionColor, getCompletionBgColor } from "@/lib/utils/profileCompletion";
import { subscribeToUnreadCount } from "@/lib/firebase/chat";

// Helper to get db
const getDb = (): Firestore => {
  if (!db) {
    throw new Error("Firestore is not initialized");
  }
  return db;
};

export default function DashboardPage() {
  const { user, loading } = useVerificationGuard();
  const router = useRouter();
  const [userData, setUserData] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({
    jobsCount: 0,
    applicationsCount: 0,
    connectionsCount: 0,
  });
  const [recentJobs, setRecentJobs] = useState<JobPosting[]>([]);
  const [recentApplications, setRecentApplications] = useState<(JobApplication & { jobData?: JobPosting })[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [mentorshipStats, setMentorshipStats] = useState({
    activeMentorships: 0,
    pendingRequests: 0,
    totalMentored: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      Promise.all([
        getUserData(user.uid),
        getUserProfile(user.uid)
      ])
        .then(([data, profileData]) => {
          setUserData(data);
          setProfile(profileData);
          if (data) {
            loadDashboardData(data);
          }
        })
        .catch((error) => {
          handleError(error, "Failed to fetch user data");
          setLoadingData(false);
        });
    }
  }, [user]);

  // Real-time unread messages subscription
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToUnreadCount(user.uid, (count) => {
      setUnreadMessages(count);
    });

    return () => unsubscribe();
  }, [user]);

  const loadDashboardData = async (userData: User) => {
    try {
      const firestore = getDb();
      
      // Load mentorship data for all roles
      await loadMentorshipData(firestore, userData);

      if (userData.role === "student") {
        // Load student-specific data
        await loadStudentData(firestore);
      } else if (userData.role === "alumni" || userData.role === "mentor") {
        // Load alumni/mentor data
        await loadAlumniData(firestore);
      } else if (userData.role === "aspirant") {
        // Load aspirant data
        await loadAspirantData(firestore);
      }
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
        // Run queries in parallel for better performance
        const [activeMentorshipsSnapshot, pendingRequestsSnapshot] = await Promise.all([
          getDocs(query(
            mentorshipsRef,
            where("menteeId", "==", user!.uid),
            where("status", "==", "active")
          )),
          getDocs(query(
            mentorshipsRef,
            where("menteeId", "==", user!.uid),
            where("status", "==", "pending")
          ))
        ]);

        setMentorshipStats({
          activeMentorships: activeMentorshipsSnapshot.size,
          pendingRequests: pendingRequestsSnapshot.size,
          totalMentored: 0,
        });
      } else if (userData.role === "alumni" || userData.role === "mentor") {
        // Run queries in parallel for better performance
        const [activeMentorshipsSnapshot, pendingRequestsSnapshot, allMentorshipsSnapshot] = await Promise.all([
          getDocs(query(
            mentorshipsRef,
            where("mentorId", "==", user!.uid),
            where("status", "==", "active")
          )),
          getDocs(query(
            mentorshipsRef,
            where("mentorId", "==", user!.uid),
            where("status", "==", "pending")
          )),
          getDocs(query(
            mentorshipsRef,
            where("mentorId", "==", user!.uid)
          ))
        ]);

        setMentorshipStats({
          activeMentorships: activeMentorshipsSnapshot.size,
          pendingRequests: pendingRequestsSnapshot.size,
          totalMentored: allMentorshipsSnapshot.size,
        });
      }
    } catch (error: any) {
      console.error("Error loading mentorship data:", error);
    }
  };

  const loadStudentData = async (firestore: Firestore) => {
    try {
      const applicationsRef = collection(firestore, "jobApplications");
      const jobsRef = collection(firestore, "jobPostings");

      // Run all main queries in parallel for better performance
      const [applicationsSnapshot, allApplicationsSnapshot, jobsSnapshot, recentJobsSnapshot] = await Promise.all([
        // Recent applications
        getDocs(query(
          applicationsRef,
          where("applicantId", "==", user!.uid),
          orderBy("createdAt", "desc"),
          limit(5)
        )),
        // Count all applications
        getDocs(query(
          applicationsRef,
          where("applicantId", "==", user!.uid)
        )),
        // Count available jobs
        getDocs(query(
          jobsRef, 
          where("status", "==", "active"),
          orderBy("createdAt", "desc"),
          limit(100)
        )),
        // Recent jobs for display
        getDocs(query(
          jobsRef, 
          where("status", "==", "active"),
          orderBy("createdAt", "desc"),
          limit(3)
        ))
      ]);
      
      // Process applications with job details (fetch in parallel)
      const apps: (JobApplication & { jobData?: JobPosting })[] = applicationsSnapshot.docs.map((doc) => ({
        ...doc.data(), 
        id: doc.id
      })) as (JobApplication & { jobData?: JobPosting })[];
      
      // Fetch job details in parallel
      const jobDetailsPromises = apps.map(async (appData) => {
        try {
          const jobQuery = query(jobsRef, where("__name__", "==", appData.jobId));
          const jobSnapshot = await getDocs(jobQuery);
          if (!jobSnapshot.empty) {
            const jobData = jobSnapshot.docs[0].data() as JobPosting;
            jobData.id = jobSnapshot.docs[0].id;
            appData.jobData = jobData;
          }
        } catch (error) {
          // Silently handle individual job fetch errors
        }
        return appData;
      });
      
      const appsWithJobs = await Promise.all(jobDetailsPromises);
      setRecentApplications(appsWithJobs);
      
      // Set stats
      setStats((prev) => ({
        ...prev,
        applicationsCount: allApplicationsSnapshot.size,
        jobsCount: jobsSnapshot.size,
      }));

      // Process recent jobs
      const jobs: JobPosting[] = recentJobsSnapshot.docs.map((doc) => {
        const data = doc.data() as JobPosting;
        data.id = doc.id;
        return data;
      });
      setRecentJobs(jobs);
    } catch (error: any) {
      handleError(error, "Error loading student data");
    }
  };

  const loadAlumniData = async (firestore: Firestore) => {
    try {
      const jobsRef = collection(firestore, "jobPostings");
      const applicationsRef = collection(firestore, "jobApplications");
      
      // Run queries in parallel
      const [myJobsSnapshot, allJobsSnapshot] = await Promise.all([
        getDocs(query(
          jobsRef, 
          where("postedBy", "==", user!.uid),
          orderBy("createdAt", "desc"),
          limit(3)
        )),
        getDocs(query(
          jobsRef,
          where("postedBy", "==", user!.uid)
        ))
      ]);
      
      const jobs: JobPosting[] = myJobsSnapshot.docs.map((doc) => {
        const data = doc.data() as JobPosting;
        data.id = doc.id;
        return data;
      });
      setRecentJobs(jobs);
      
      // Count total applications received (fetch in parallel)
      const applicationPromises = jobs.map((job) => 
        getDocs(query(applicationsRef, where("jobId", "==", job.id)))
      );
      const applicationSnapshots = await Promise.all(applicationPromises);
      const totalApplications = applicationSnapshots.reduce((sum, snap) => sum + snap.size, 0);
      
      setStats((prev) => ({
        ...prev,
        jobsCount: allJobsSnapshot.size,
        applicationsCount: totalApplications,
      }));
    } catch (error: any) {
      handleError(error, "Error loading alumni data");
    }
  };

  const loadAspirantData = async (firestore: Firestore) => {
    try {
      // Aspirants don't have jobs, just connections
      setStats({
        jobsCount: 0,
        applicationsCount: 0,
        connectionsCount: 0,
      });
    } catch (error: any) {
      handleError(error, "Error loading aspirant data");
    }
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

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Hero Welcome Section */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-blue-600 via-indigo-600 to-purple-600 p-8 md:p-12 text-white shadow-2xl">
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse delay-700"></div>
          </div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">Welcome to your workspace</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold">
                Hello, {user?.displayName || "there"}! 👋
              </h1>
              
              <p className="text-lg text-blue-100 max-w-2xl leading-relaxed">
                {userData?.role === "student" && "Discover amazing opportunities, connect with mentors, and take your career to the next level."}
                {userData?.role === "alumni" && "Share your expertise, post opportunities, and help the next generation succeed."}
                {userData?.role === "aspirant" && "Get personalized guidance and mentorship to achieve your academic goals."}
              </p>
              
              <div className="flex items-center gap-4 pt-2">
                <ActionButton 
                  size="lg" 
                  variant="primary"
                  className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg hover:shadow-xl transition-all"
                  onClick={() => router.push("/profile")}
                  icon={<Zap />}
                >
                  Get Started
                </ActionButton>
                <ActionButton 
                  size="lg" 
                  variant="outline" 
                  className="border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
                  onClick={() => router.push("/jobs")}
                  icon={<ArrowRight />}
                  iconPosition="right"
                >
                  Explore Jobs
                </ActionButton>
              </div>
            </div>
            
            {/* Illustration */}
            <div className="hidden lg:block">
              <div className="relative w-64 h-64">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-3xl rotate-6 animate-pulse"></div>
                <div className="absolute inset-0 bg-white/20 backdrop-blur-sm rounded-3xl -rotate-6"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Award className="h-32 w-32 text-white opacity-90" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Alerts */}
        {verificationStatus === "pending" && (
          <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-500 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <div className="h-10 w-10 rounded-full bg-yellow-500 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900">Verification Pending</h3>
                <p className="text-sm text-yellow-800 mt-1">
                  Your verification is being reviewed by our team. You'll have full access once approved.
                </p>
              </div>
              <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">Pending</Badge>
            </div>
          </div>
        )}

        {verificationStatus === "rejected" && (
          <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-red-50 to-rose-50 border-l-4 border-red-500 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900">Verification Rejected</h3>
                <p className="text-sm text-red-800 mt-1">
                  Your verification was not approved. Please resubmit with valid documents.
                </p>
              </div>
              <ActionButton 
                size="sm" 
                variant="danger"
                onClick={() => router.push("/onboarding")}
              >
                Resubmit Now
              </ActionButton>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Mentorship Card */}
          <Card className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-blue-500/20 to-transparent rounded-bl-full"></div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6 text-white" />
                </div>
                {mentorshipStats.activeMentorships > 0 && (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-gray-900">
                  {loadingData ? "..." : mentorshipStats.activeMentorships}
                </p>
                <p className="text-sm text-gray-500">
                  {userData?.role === "student" || userData?.role === "aspirant" ? "Active Mentorships" : "Students Mentoring"}
                </p>
                {mentorshipStats.pendingRequests > 0 && (
                  <Badge className="bg-orange-500 text-white text-xs mt-2">
                    {mentorshipStats.pendingRequests} pending
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Messages Card */}
          <Card className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer"
            onClick={() => router.push("/chat")}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-purple-500/20 to-transparent rounded-bl-full"></div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                {unreadMessages > 0 && (
                  <div className="h-6 w-6 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                    <span className="text-xs text-white font-bold">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-gray-900">{unreadMessages}</p>
                <p className="text-sm text-gray-500">Unread Messages</p>
              </div>
            </CardContent>
          </Card>

          {/* Jobs Card */}
          <Card 
            className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer"
            onClick={() => router.push(userData?.role === "student" ? "/jobs" : "/jobs/my-posts")}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-green-500/20 to-transparent rounded-bl-full"></div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Briefcase className="h-6 w-6 text-white" />
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-gray-900">
                  {loadingData ? "..." : stats.jobsCount}
                </p>
                <p className="text-sm text-gray-500">
                  {userData?.role === "student" ? "Available Jobs" : "Posted Jobs"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Applications Card */}
          <Card 
            className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer"
            onClick={() => router.push(userData?.role === "student" ? "/jobs/my-applications" : "/jobs/my-posts")}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-orange-500/20 to-transparent rounded-bl-full"></div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-gray-900">
                  {loadingData ? "..." : stats.applicationsCount}
                </p>
                <p className="text-sm text-gray-500">
                  {userData?.role === "student" ? "Applications" : "Received"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Completion */}
        {completion.percentage < 100 && (
          <Card 
            className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all cursor-pointer bg-linear-to-r from-blue-50 to-indigo-50"
            onClick={() => router.push("/profile")}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                {/* Circular Progress */}
                <div className="relative h-20 w-20 shrink-0">
                  <svg className="h-20 w-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="none"
                      className="text-gray-200"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 36}`}
                      strokeDashoffset={`${2 * Math.PI * 36 * (1 - completion.percentage / 100)}`}
                      className="text-blue-600"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-blue-600">
                      {completion.percentage}%
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-6 w-6 text-blue-600" />
                    <h3 className="text-xl font-bold text-gray-900">Complete Your Profile</h3>
                  </div>
                  <p className="text-gray-600 mb-2">
                    A complete profile increases your visibility and opens up more opportunities
                  </p>
                  {completion.missingFields.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {completion.missingFields.slice(0, 4).map((field) => (
                        <Badge key={field} variant="outline" className="bg-white">
                          {field}
                        </Badge>
                      ))}
                      {completion.missingFields.length > 4 && (
                        <Badge variant="outline" className="bg-white">
                          +{completion.missingFields.length - 4} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <ActionButton className="bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all">
                  Update Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </ActionButton>
              </div>
            </CardContent>
          </Card>
        )}

        {/* NEW FEATURES: CampusLink Core Widgets */}
        
        {/* 1. Mentorship Dashboard Widget */}
        <Card className="border-none shadow-lg bg-linear-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <Users className="h-6 w-6 text-purple-600" />
                  Your Mentorship Network
                </CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  Connect with verified alumni from your college
                </CardDescription>
              </div>
              <ActionButton 
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-full"
                onClick={() => router.push("/mentorship")}
              >
                Find Mentors
                <ArrowRight className="ml-2 h-4 w-4" />
              </ActionButton>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {/* Active Mentors */}
              <div className="p-6 rounded-2xl bg-white shadow-md hover:shadow-lg transition-all">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-linear-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Users className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">
                      {loadingData ? "..." : mentorshipStats.activeMentorships}
                    </p>
                    <p className="text-sm text-gray-600">Active Mentors</p>
                  </div>
                </div>
              </div>

              {/* Pending Requests */}
              <div className="p-6 rounded-2xl bg-white shadow-md hover:shadow-lg transition-all">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                    <Clock className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">
                      {loadingData ? "..." : mentorshipStats.pendingRequests}
                    </p>
                    <p className="text-sm text-gray-600">Pending Requests</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Featured Mentors Preview */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Featured Mentors from Your College
              </h4>
              
              {/* Empty State - No Mock Data */}
              <EmptyState
                icon={Users}
                title="No mentors available yet"
                description=""
                action={
                  <ActionButton 
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-full"
                    onClick={() => router.push("/mentorship")}
                  >
                    Browse All Mentors
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </ActionButton>
                }
                iconClassName="text-purple-600"
              />
            </div>
          </CardContent>
        </Card>

        {/* Role-Specific Sections */}
        
        {/* ALUMNI DASHBOARD - Impact & Mentorship Section */}
        {userData?.role === "alumni" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Alumni Impact Dashboard */}
            <Card className="border-none shadow-lg bg-linear-to-br from-emerald-50 to-teal-50">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Award className="h-5 w-5 text-emerald-600" />
                  Your Impact
                </CardTitle>
                <CardDescription>See how you're helping students succeed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {loadingData ? "..." : mentorshipStats.totalMentored}
                        </p>
                        <p className="text-xs text-gray-500">Students Mentored</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-white shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Briefcase className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {loadingData ? "..." : stats.jobsCount}
                        </p>
                        <p className="text-xs text-gray-500">Jobs Posted</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-white shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {loadingData ? "..." : stats.applicationsCount}
                        </p>
                        <p className="text-xs text-gray-500">Applications Received</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-white shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                        <Star className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">5.0</p>
                        <p className="text-xs text-gray-500">Rating</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-3">Quick Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <ActionButton 
                      variant="outline" 
                      size="sm" 
                      className="rounded-lg justify-start"
                      onClick={() => router.push("/jobs/create")}
                    >
                      <Briefcase className="h-4 w-4 mr-2" />
                      Post Job
                    </ActionButton>
                    <ActionButton 
                      variant="outline" 
                      size="sm" 
                      className="rounded-lg justify-start"
                      onClick={() => router.push("/mentorship")}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Mentorship
                    </ActionButton>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Mentorship Requests */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Mentorship Requests
                </CardTitle>
                <CardDescription>Students waiting for your guidance</CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  icon={Users}
                  title="No pending requests"
                  description="New mentorship requests will appear here"
                  action={
                    <ActionButton 
                      variant="outline" 
                      className="rounded-xl"
                      onClick={() => router.push("/mentorship")}
                    >
                      View All Requests
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </ActionButton>
                  }
                  iconClassName="text-purple-600"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* ASPIRANT DASHBOARD - Guidance & College Info Section */}
        {userData?.role === "aspirant" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* College Preparation Roadmap */}
            <Card className="border-none shadow-lg bg-linear-to-br from-violet-50 to-purple-50">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Target className="h-5 w-5 text-violet-600" />
                  Your Preparation Journey
                </CardTitle>
                <CardDescription>Track your college admission progress</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Steps */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Profile Created</p>
                      <p className="text-xs text-gray-500">Great start! Your profile is set up</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">2</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Find Mentors</p>
                      <p className="text-xs text-gray-500">Connect with college students and alumni</p>
                      <ActionButton 
                        size="sm" 
                        className="mt-2 h-7 text-xs rounded-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => router.push("/mentorship")}
                      >
                        Explore Mentors
                      </ActionButton>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <span className="text-gray-500 text-xs font-bold">3</span>
                    </div>
                    <div className="flex-1 opacity-50">
                      <p className="font-semibold text-gray-900">Explore Colleges</p>
                      <p className="text-xs text-gray-500">Research and shortlist your dream colleges</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <span className="text-gray-500 text-xs font-bold">4</span>
                    </div>
                    <div className="flex-1 opacity-50">
                      <p className="font-semibold text-gray-900">Admission Guidance</p>
                      <p className="text-xs text-gray-500">Get help with applications and exams</p>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">Overall Progress</p>
                    <span className="text-sm font-bold text-violet-600">25%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-linear-to-r from-violet-500 to-purple-600 rounded-full" style={{ width: '25%' }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommended Mentors/Resources */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Connect with Students
                </CardTitle>
                <CardDescription>Get guidance from current college students</CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  icon={Users}
                  title="Discover Mentors"
                  description="Connect with students and alumni who can guide you through college admissions"
                  action={
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <ActionButton 
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                        onClick={() => router.push("/mentorship")}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Find Mentors
                      </ActionButton>
                      <ActionButton 
                        variant="outline" 
                        className="rounded-xl"
                        onClick={() => router.push("/chat")}
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Messages
                      </ActionButton>
                    </div>
                  }
                  iconClassName="text-blue-600"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* STUDENT DASHBOARD - Default sections */}
        {userData?.role === "student" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* College Network Activity Feed */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Campus Network Activity
                </CardTitle>
                <CardDescription>What's happening in your college community</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <EmptyState
                  icon={Activity}
                  title="No recent activity"
                  description="Activity from your college network will appear here"
                  iconClassName="text-blue-600"
                />
              </CardContent>
            </Card>

            {/* Referral & Job Board from Alumni */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-green-600" />
                  Alumni Referrals
                </CardTitle>
                <CardDescription>Opportunities from verified college alumni</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <EmptyState
                  icon={Briefcase}
                  title="No referral opportunities yet"
                  description="Alumni job postings will appear here"
                  action={
                    <ActionButton 
                      variant="outline" 
                      className="rounded-xl"
                      onClick={() => router.push("/jobs")}
                    >
                      Browse All Jobs
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </ActionButton>
                  }
                  iconClassName="text-green-600"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* My Activities */}
          <Card className="lg:col-span-2 border-none shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    <Activity className="h-6 w-6 text-blue-600" />
                    {userData?.role === "student" ? "My Applications" : "My Job Posts"}
                  </CardTitle>
                  <CardDescription className="text-gray-500 mt-1">
                    {userData?.role === "student" ? "Track your application status" : "Manage your posted opportunities"}
                  </CardDescription>
                </div>
                <ActionButton 
                  variant="outline" 
                  size="sm"
                  className="rounded-full"
                  onClick={() => router.push(userData?.role === "student" ? "/jobs/my-applications" : "/jobs/my-posts")}
                >
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </ActionButton>
              </div>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : userData?.role === "student" ? (
                recentApplications.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="No Applications Yet"
                    description="Start applying to jobs and track your applications here"
                    action={
                      <ActionButton className="bg-blue-600 hover:bg-blue-700 text-white rounded-full" onClick={() => router.push("/jobs")}>
                        <Briefcase className="mr-2 h-4 w-4" />
                        Browse Jobs
                      </ActionButton>
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {recentApplications.slice(0, 3).map((app) => (
                      <div 
                        key={app.id} 
                        className="flex items-center justify-between p-4 rounded-2xl bg-linear-to-r from-gray-50 to-blue-50 hover:shadow-md transition-all group cursor-pointer"
                        onClick={() => router.push("/jobs/my-applications")}
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="h-14 w-14 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform shrink-0">
                            <Briefcase className="h-7 w-7 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 truncate">
                              {app.jobData?.title || "Application Submitted"}
                            </p>
                            <p className="text-sm text-gray-500 flex items-center gap-2">
                              {app.jobData?.company && (
                                <>
                                  <Building2 className="h-3.5 w-3.5" />
                                  {app.jobData.company} •
                                </>
                              )}
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(app.createdAt)}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          className={`capitalize shrink-0 ml-2 ${
                            app.status === "accepted" ? "bg-green-600 text-white" :
                            app.status === "rejected" ? "bg-red-600 text-white" :
                            app.status === "pending" ? "bg-yellow-600 text-white" :
                            "bg-blue-600 text-white"
                          }`}
                        >
                          {app.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                recentJobs.length === 0 ? (
                  <EmptyState
                    icon={Briefcase}
                    title="No Job Posts Yet"
                    description="Start posting opportunities and help students grow their careers"
                    action={
                      <ActionButton className="bg-green-600 hover:bg-green-700 text-white rounded-full" onClick={() => router.push("/jobs/create")}>
                        <Briefcase className="mr-2 h-4 w-4" />
                        Post a Job
                      </ActionButton>
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {recentJobs.slice(0, 3).map((job) => (
                      <div 
                        key={job.id} 
                        className="flex items-center justify-between p-4 rounded-2xl bg-linear-to-r from-gray-50 to-green-50 hover:shadow-md transition-all group cursor-pointer"
                        onClick={() => router.push(`/jobs/my-posts`)}
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="h-14 w-14 rounded-2xl bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform shrink-0">
                            <Building2 className="h-7 w-7 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 truncate">{job.title}</p>
                            <p className="text-sm text-gray-500 flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5" />
                              {job.company}
                              {job.location && (
                                <>
                                  • <MapPin className="h-3.5 w-3.5" />
                                  {job.location}
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-green-600 text-white hover:bg-green-700 shrink-0 ml-2">
                          {job.applicationsCount || 0} applicants
                        </Badge>
                      </div>
                    ))}
                  </div>
                )
              )}
            </CardContent>
          </Card>

          {/* Quick Actions & Recent Activity */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="border-none shadow-lg bg-linear-to-br from-indigo-500 to-purple-600 text-white">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ActionButton 
                  className="w-full justify-start bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white rounded-xl"
                  onClick={() => router.push("/profile")}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Update Profile
                </ActionButton>
                {userData?.role === "student" ? (
                  <>
                    <ActionButton 
                      className="w-full justify-start bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white rounded-xl"
                      onClick={() => router.push("/jobs")}
                    >
                      <Briefcase className="mr-2 h-4 w-4" />
                      Browse Jobs
                    </ActionButton>
                    <ActionButton 
                      className="w-full justify-start bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white rounded-xl"
                      onClick={() => router.push("/mentorship")}
                    >
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Find Mentor
                    </ActionButton>
                  </>
                ) : (
                  <>
                    <ActionButton 
                      className="w-full justify-start bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white rounded-xl"
                      onClick={() => router.push("/jobs/create")}
                    >
                      <Briefcase className="mr-2 h-4 w-4" />
                      Post Job
                    </ActionButton>
                    <ActionButton 
                      className="w-full justify-start bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white rounded-xl"
                      onClick={() => router.push("/jobs/my-posts")}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      View Applications
                    </ActionButton>
                  </>
                )}
                <ActionButton 
                  className="w-full justify-start bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white rounded-xl"
                  onClick={() => router.push("/chat")}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Messages
                </ActionButton>
              </CardContent>
            </Card>

         
            
          </div>
        </div>

        {/* Recommended Jobs (for students) */}
       
      </div>
    </MainLayout>
  );
}
