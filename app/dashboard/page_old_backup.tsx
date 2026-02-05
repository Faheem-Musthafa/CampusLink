"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVerificationGuard } from "@/hooks/use-verification-guard";
import { getUserData } from "@/lib/firebase/auth";
import { getUserProfile } from "@/lib/firebase/profiles";
import { useEffect, useState } from "react";
import { User, JobPosting, JobApplication, UserProfile } from "@/types";
import { Users, MessageSquare, Briefcase, Clock, AlertCircle, ArrowRight, TrendingUp, FileText, Building2, MapPin, CheckCircle, Target } from "lucide-react";
import { collection, query, where, getDocs, orderBy, limit, Firestore } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useRouter } from "next/navigation";
import { calculateProfileCompletion, getCompletionColor, getCompletionBgColor } from "@/lib/utils/profileCompletion";

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
          console.error("Failed to fetch user data:", error);
          setLoadingData(false);
        });
    }
  }, [user]);

  const loadDashboardData = async (userData: User) => {
    try {
      const firestore = getDb();
      
      if (userData.role === "student") {
        // Load student data: applications, available jobs
        try {
          const applicationsRef = collection(firestore, "jobApplications");
          const applicationsQuery = query(
            applicationsRef,
            where("applicantId", "==", user!.uid),
            orderBy("createdAt", "desc"),
            limit(5)
          );
          const applicationsSnapshot = await getDocs(applicationsQuery);
          
          const apps: (JobApplication & { jobData?: JobPosting })[] = [];
          for (const doc of applicationsSnapshot.docs) {
            const appData = doc.data() as JobApplication;
            appData.id = doc.id;
            apps.push(appData);
          }
          setRecentApplications(apps);
          setStats((prev) => ({
            ...prev,
            applicationsCount: applicationsSnapshot.size,
          }));
        } catch (error: any) {
          if (error.code === "failed-precondition" || error.message?.includes("index")) {
            console.warn("Firestore index required for applications query. Please create the index.");
          } else {
            throw error;
          }
        }

        // Load available jobs count
        try {
          const jobsRef = collection(firestore, "jobPostings");
          const jobsQuery = query(jobsRef, where("status", "==", "active"), limit(100));
          const jobsSnapshot = await getDocs(jobsQuery);
          setStats((prev) => ({
            ...prev,
            jobsCount: jobsSnapshot.size,
          }));

          // Load recent jobs
          const recentJobsQuery = query(
            jobsRef,
            where("status", "==", "active"),
            orderBy("createdAt", "desc"),
            limit(3)
          );
          const recentJobsSnapshot = await getDocs(recentJobsQuery);
          const jobs: JobPosting[] = recentJobsSnapshot.docs.map((doc) => {
            const data = doc.data() as JobPosting;
            data.id = doc.id;
            return data;
          });
          setRecentJobs(jobs);
        } catch (error: any) {
          if (error.code === "failed-precondition" || error.message?.includes("index")) {
            console.warn("Firestore index required for job postings query. Please create the index.");
          } else {
            throw error;
          }
        }
      } else if (userData.role === "alumni") {
        // Load alumni data: posted jobs, applications received
        try {
          const jobsRef = collection(firestore, "jobPostings");
          const myJobsQuery = query(
            jobsRef,
            where("postedBy", "==", user!.uid),
            orderBy("createdAt", "desc"),
            limit(3)
          );
          const myJobsSnapshot = await getDocs(myJobsQuery);
          const jobs: JobPosting[] = myJobsSnapshot.docs.map((doc) => {
            const data = doc.data() as JobPosting;
            data.id = doc.id;
            return data;
          });
          setRecentJobs(jobs);
          setStats((prev) => ({
            ...prev,
            jobsCount: myJobsSnapshot.size,
          }));

          // Count total applications received
          const applicationsRef = collection(firestore, "jobApplications");
          let totalApplications = 0;
          for (const job of jobs) {
            const appQuery = query(applicationsRef, where("jobId", "==", job.id));
            const appSnapshot = await getDocs(appQuery);
            totalApplications += appSnapshot.size;
          }
          setStats((prev) => ({
            ...prev,
            applicationsCount: totalApplications,
          }));
        } catch (error: any) {
          if (error.code === "failed-precondition" || error.message?.includes("index")) {
            console.warn("Firestore index required for alumni queries. Please create the index.");
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const verificationStatus = user?.verificationStatus || "unverified";

  return (
    <MainLayout>
      <div className="space-y-8 max-w-7xl">
        {/* Welcome Section with Actions */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Welcome Card */}
          <Card className="lg:col-span-2 bg-linear-to-br from-blue-50 to-indigo-50 border-none shadow-md">
            <CardContent className="pt-8 pb-8">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <h1 className="text-3xl font-bold text-gray-900">
                    Welcome back<br />{user?.displayName || "User"} !
                  </h1>
                  <p className="text-gray-600 text-base max-w-lg leading-relaxed">
                    {userData?.role === "student" && "From here you will be able to see your purchase details, download the plugins, get the license key, manage your profile and payment methods."}
                    {userData?.role === "alumni" && "From here you will be able to post jobs, review applications, connect with students, and help them grow in their careers."}
                    {userData?.role === "aspirant" && "From here you will be able to get guidance for your college journey and connect with mentors."}
                  </p>
                  <Button className="mt-2 bg-blue-600 hover:bg-blue-700 text-white">
                    Get Started
                  </Button>
                </div>
                <div className="hidden md:block">
                  <div className="h-24 w-24 bg-blue-100 rounded-2xl flex items-center justify-center">
                    <FileText className="h-12 w-12 text-blue-600" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upgrade/Premium Card */}
          <Card className="bg-linear-to-br from-gray-800 to-gray-900 border-none shadow-md text-white">
            <CardContent className="pt-8 pb-8 space-y-4">
              <h3 className="text-xl font-bold">Unlock more features</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span>Unlimited Domain</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span>1 Year Plugin Update</span>
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Upgrade to Custom
                </Button>
                <Button variant="outline" className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20">
                  View Pricing
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Banners */}
        {verificationStatus === "pending" && (
          <Card className="border-l-4 border-l-yellow-500 bg-yellow-50/50">
            <CardContent className="flex items-start gap-4 pt-6">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-1">Verification Pending</h3>
                <p className="text-sm text-yellow-800">
                  Your verification is being reviewed by our team. You have limited access until approved.
                </p>
              </div>
              <Badge variant="outline" className="border-yellow-600 text-yellow-700 bg-white">
                Pending
              </Badge>
            </CardContent>
          </Card>
        )}

        {verificationStatus === "rejected" && (
          <Card className="border-l-4 border-l-red-500 bg-red-50/50">
            <CardContent className="flex items-start gap-4 pt-6">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">Verification Rejected</h3>
                <p className="text-sm text-red-800">
                  Your verification was not approved. Please go to onboarding to resubmit with valid documents.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="/onboarding">Resubmit</a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards - Hidden on Mobile, Visible on Desktop */}
        <div className="hidden lg:grid gap-4 lg:grid-cols-4">
          <Card className="hover:shadow-md transition-shadow border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Mentorship Requests</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">0</div>
              <p className="text-xs text-gray-500">
                {userData?.role === "student" ? "Active requests" : "Pending requests"}
              </p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Messages</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">0</div>
              <p className="text-xs text-gray-500">Unread messages</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-gray-200" onClick={() => router.push(userData?.role === "student" ? "/jobs" : "/jobs/my-posts")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Jobs</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center">
                <Briefcase className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">
                {loadingData ? "..." : stats.jobsCount}
              </div>
              <p className="text-xs text-gray-500">
                {userData?.role === "student" ? "Available positions" : "Posted jobs"}
              </p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-gray-200" onClick={() => router.push(userData?.role === "student" ? "/jobs/my-applications" : "/jobs/my-posts")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {userData?.role === "student" ? "Applications" : "Applications Received"}
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
                <FileText className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">
                {loadingData ? "..." : stats.applicationsCount}
              </div>
              <p className="text-xs text-gray-500">
                {userData?.role === "student" ? "Total submitted" : "From candidates"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Profile Completion Banner */}
        {(() => {
          const completion = calculateProfileCompletion(profile);
          if (completion.percentage < 100) {
            return (
              <Card className="border-l-4 border-l-primary hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/profile")}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    {/* Progress Circle */}
                    <div className="relative h-16 w-16 shrink-0">
                      <svg className="h-16 w-16 transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="currentColor"
                          strokeWidth="5"
                          fill="none"
                          className="text-gray-200"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="currentColor"
                          strokeWidth="5"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 28}`}
                          strokeDashoffset={`${2 * Math.PI * 28 * (1 - completion.percentage / 100)}`}
                          className={getCompletionBgColor(completion.percentage)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-base font-bold ${getCompletionColor(completion.percentage)}`}>
                          {completion.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Message */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-lg">Complete Your Profile</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        A complete profile helps you connect better with mentors and opportunities
                      </p>
                      {completion.missingFields.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Missing: {completion.missingFields.slice(0, 4).join(", ")}
                          {completion.missingFields.length > 4 && ` and ${completion.missingFields.length - 4} more`}
                        </p>
                      )}
                    </div>

                    {/* Action Button */}
                    <Button variant="default" size="sm" className="shrink-0">
                      Update Profile <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          }
          return null;
        })()}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* My Products/Applications - 2 columns on desktop */}
          <Card className="lg:col-span-2 hover:shadow-md transition-shadow border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">
                    {userData?.role === "student" ? "My Applications" : "My Products"}
                  </CardTitle>
                  <CardDescription className="text-gray-500">
                    {userData?.role === "student" ? "Track your job applications" : "Jobs you've posted"}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900"
                  onClick={() => router.push(userData?.role === "student" ? "/jobs/my-applications" : "/jobs/my-posts")}
                >
                  View Sites
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : userData?.role === "student" ? (
                recentApplications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                      <FileText className="h-8 w-8 text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-600 text-center mb-3">
                      You haven&apos;t applied to any jobs yet
                    </p>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => router.push("/jobs")}>
                      Browse Jobs
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentApplications.slice(0, 3).map((app, index) => (
                      <div key={app.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                            <Briefcase className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-gray-900">Product</p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="shrink-0 bg-white hover:bg-gray-50"
                          onClick={() => router.push("/jobs/my-applications")}
                        >
                          View Sites
                        </Button>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                recentJobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="h-16 w-16 rounded-2xl bg-green-50 flex items-center justify-center mb-4">
                      <Briefcase className="h-8 w-8 text-green-600" />
                    </div>
                    <p className="text-sm text-gray-600 text-center mb-3">
                      You haven&apos;t posted any jobs yet
                    </p>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => router.push("/jobs/create")}>
                      Post a Job
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentJobs.slice(0, 3).map((job, index) => (
                      <div key={job.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => router.push("/jobs/my-posts")}>
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                            <Briefcase className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-gray-900">Product</p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="shrink-0 bg-white hover:bg-gray-50"
                        >
                          View Sites
                        </Button>
                      </div>
                    ))}
                  </div>
                )
              )}
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="hover:shadow-md transition-shadow border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">Activity</CardTitle>
              <CardDescription className="text-gray-500">All recent activities will appear here</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="text-xs text-gray-500 w-20 shrink-0">
                    Oct 15, 4:40 PM
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600">
                      Lorem ipsum dolor sit amet consectetur.
                    </p>
                  </div>
                </div>
              ))}
              <Button 
                variant="outline" 
                className="w-full mt-4 bg-white hover:bg-gray-50"
                onClick={() => router.push("/profile")}
              >
                View All
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recommended Jobs (for students) */}
        {userData?.role === "student" && recentJobs.length > 0 && (
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Recommended Jobs
                  </CardTitle>
                  <CardDescription>Jobs that match your profile</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/jobs")}
                >
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {recentJobs.map((job) => (
                  <Card key={job.id} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => router.push("/jobs")}>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold line-clamp-1">{job.title}</h4>
                          {job.isReferral && (
                            <Badge className="bg-green-500 text-white shrink-0">Referral</Badge>
                          )}
                        </div>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 shrink-0" />
                            <span className="truncate">{job.company}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 shrink-0" />
                            <span className="truncate">{job.location}</span>
                          </div>
                        </div>
                        <Button size="sm" className="w-full" onClick={() => router.push("/jobs")}>
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

