"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useVerificationGuard } from "@/hooks/use-verification-guard";
import { getUserData } from "@/lib/firebase/auth";
import { getUserProfile } from "@/lib/firebase/profiles";
import { createMentorshipRequest, checkExistingRequest } from "@/lib/firebase/mentorship";
import { createUserReport } from "@/lib/firebase/reports";
import { useEffect, useState } from "react";
import { User, UserProfile } from "@/types";
import { useParams, useRouter } from "next/navigation";
import {
  MapPin,
  Briefcase,
  GraduationCap,
  Mail,
  Linkedin,
  Github,
  Globe,
  Calendar,
  Award,
  Users,
  MessageSquare,
  Star,
  CheckCircle,
  Building2,
  BookOpen,
  Instagram,
  ExternalLink,
  ArrowLeft,
  UserPlus,
  Flag,
  AlertTriangle,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const userId = params.userId as string;
  const { user: currentUser, loading: authLoading } = useVerificationGuard();
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasExistingRequest, setHasExistingRequest] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // Report user state
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const reportReasons = [
    "Harassment or bullying",
    "Spam or misleading",
    "Inappropriate content",
    "Fake account",
    "Impersonation",
    "Other",
  ];

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) return;

      try {
        const [userData, userProfile] = await Promise.all([
          getUserData(userId),
          getUserProfile(userId),
        ]);

        setProfileUser(userData);
        setProfileData(userProfile);

        // Load current user data
        if (currentUser) {
          const currentData = await getUserData(currentUser.uid);
          setCurrentUserData(currentData);

          // Check if already requested mentorship (only if viewing alumni as student)
          if (currentData?.role === "student" && userData?.role === "alumni") {
            const exists = await checkExistingRequest(currentUser.uid, userId);
            setHasExistingRequest(exists);
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId, currentUser]);

  const handleRequestMentorship = async () => {
    if (!currentUser || !profileUser) return;

    setSubmitting(true);
    try {
      await createMentorshipRequest(
        currentUser.uid,
        profileUser.id,
        requestMessage.trim() || undefined
      );

      setHasExistingRequest(true);
      alert("Mentorship request sent successfully!");
      setShowRequestDialog(false);
      setRequestMessage("");
    } catch (error) {
      console.error("Error sending request:", error);
      alert("Failed to send request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = () => {
    router.push(`/chat?userId=${userId}`);
  };

  // Helper function to ensure URLs have https:// prefix
  const formatUrl = (url: string, defaultDomain?: string): string => {
    if (!url) return "";
    // If it's just a username (no dots or slashes), construct full URL
    if (defaultDomain && !url.includes('.') && !url.includes('/')) {
      return `https://${defaultDomain}/${url}`;
    }
    // If URL doesn't start with http:// or https://, add https://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  };

  const handleReportUser = async () => {
    if (!currentUser || !currentUserData || !profileUser || !reportReason) return;

    setReportSubmitting(true);
    try {
      await createUserReport({
        reportedUserId: profileUser.id,
        reportedUserName: profileUser.displayName || "Unknown",
        reportedBy: currentUser.uid,
        reporterName: currentUserData.displayName || "Unknown",
        reason: reportReason,
        description: reportDescription.trim(),
      });

      toast({
        title: "Report Submitted",
        description: "Thank you for reporting. Our team will review this.",
      });
      setShowReportDialog(false);
      setReportReason("");
      setReportDescription("");
    } catch (error) {
      console.error("Error reporting user:", error);
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setReportSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!profileUser || !profileData) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Users className="h-10 w-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
            <p className="text-gray-600 mb-6">This user profile doesn&apos;t exist or has been removed.</p>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const isOwnProfile = currentUser?.uid === userId;
  const canRequestMentorship = currentUserData?.role === "student" && profileUser.role === "alumni";

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Profile Header Card */}
        <Card className="border-none shadow-lg overflow-hidden">
          {/* Cover Background */}
          <div className="h-32 bg-linear-to-r from-blue-500 via-indigo-500 to-purple-600 relative">
            <div className="absolute inset-0 bg-black/10"></div>
          </div>

          <CardContent className="relative pt-0 pb-8 px-8">
            {/* Avatar */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between -mt-16 gap-4">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
                <Avatar className="h-32 w-32 ring-4 ring-white shadow-xl">
                  <AvatarImage src={profileUser.photoURL || undefined} />
                  <AvatarFallback className="bg-linear-to-br from-blue-500 to-indigo-600 text-white text-3xl font-bold">
                    {profileUser.displayName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>

                <div className="text-center md:text-left mb-4 md:mb-0">
                  <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                    <h1 className="text-3xl font-bold text-gray-900">{profileUser.displayName}</h1>
                    {profileUser.verificationStatus === "approved" && (
                      <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>

                  {profileData.jobTitle && (
                    <p className="text-lg text-gray-700 font-medium flex items-center gap-2 justify-center md:justify-start">
                      <Briefcase className="h-4 w-4" />
                      {profileData.jobTitle}
                      {profileData.currentCompany && ` at ${profileData.currentCompany}`}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-600 flex-wrap justify-center md:justify-start">
                    {profileData.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{profileData.location}</span>
                      </div>
                    )}
                    {profileData.college && (
                      <div className="flex items-center gap-1">
                        <GraduationCap className="h-4 w-4" />
                        <span>{profileData.college}</span>
                      </div>
                    )}
                    <Badge variant="outline" className="capitalize">
                      {profileUser.role}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {!isOwnProfile && (
                <div className="flex gap-2 justify-center md:justify-end flex-wrap">
                  <Button
                    variant="outline"
                    onClick={handleSendMessage}
                    className="rounded-full"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Message
                  </Button>

                  {canRequestMentorship && (
                    <Button
                      onClick={() => setShowRequestDialog(true)}
                      disabled={hasExistingRequest}
                      className="rounded-full bg-blue-600 hover:bg-blue-700"
                    >
                      {hasExistingRequest ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Request Sent
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Request Mentorship
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => setShowReportDialog(true)}
                    className="rounded-full text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <Flag className="mr-2 h-4 w-4" />
                    Report
                  </Button>
                </div>
              )}

              {isOwnProfile && (
                <Button onClick={() => router.push("/profile")} className="rounded-full">
                  Edit Profile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - About & Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            {profileData.bio && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    About
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {profileData.bio}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Experience */}
            {profileData.currentCompany && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-blue-600" />
                    Experience
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{profileData.jobTitle}</h3>
                      <p className="text-gray-600">{profileData.currentCompany}</p>
                      {profileData.experience && (
                        <p className="text-sm text-gray-500 mt-1">
                          {profileData.experience} {profileData.experience === 1 ? "year" : "years"} of experience
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Education */}
            {profileData.college && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                    Education
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                      <GraduationCap className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{profileData.college}</h3>
                      {profileData.course && (
                        <p className="text-gray-600">{profileData.course}</p>
                      )}
                      {profileData.specialization && (
                        <p className="text-sm text-gray-500">{profileData.specialization}</p>
                      )}
                      {profileData.graduationYear && (
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Class of {profileData.graduationYear}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Skills */}
            {profileData.skills && profileData.skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-blue-600" />
                    Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profileData.skills.map((skill, idx) => (
                      <Badge key={idx} variant="secondary" className="text-sm py-1 px-3">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Interests */}
            {profileData.interests && profileData.interests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-blue-600" />
                    Interests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profileData.interests.map((interest, idx) => (
                      <Badge key={idx} variant="outline" className="text-sm py-1 px-3">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Contact & Links */}
          <div className="space-y-6">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-gray-900 break-all">{profileUser.email}</p>
                  </div>
                </div>

                {profileData.collegeEmail && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <GraduationCap className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">College Email</p>
                      <p className="text-gray-900 break-all">{profileData.collegeEmail}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Social Links */}
            {(profileData.linkedIn || profileData.github || profileData.portfolio || profileData.instagram) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Social Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {profileData.linkedIn && (
                    <a
                      href={formatUrl(profileData.linkedIn, 'linkedin.com/in')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors group"
                    >
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Linkedin className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">LinkedIn</p>
                        <p className="text-xs text-gray-500">View profile</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                    </a>
                  )}

                  {profileData.github && (
                    <a
                      href={formatUrl(profileData.github, 'github.com')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Github className="h-5 w-5 text-gray-700" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">GitHub</p>
                        <p className="text-xs text-gray-500">View repositories</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-700" />
                    </a>
                  )}

                  {profileData.portfolio && (
                    <a
                      href={formatUrl(profileData.portfolio)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50 transition-colors group"
                    >
                      <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Globe className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Portfolio</p>
                        <p className="text-xs text-gray-500">Visit website</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-purple-600" />
                    </a>
                  )}

                  {profileData.instagram && (
                    <a
                      href={formatUrl(profileData.instagram, 'instagram.com')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-pink-50 transition-colors group"
                    >
                      <div className="h-10 w-10 rounded-lg bg-pink-100 flex items-center justify-center">
                        <Instagram className="h-5 w-5 text-pink-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Instagram</p>
                        <p className="text-xs text-gray-500">Follow</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-pink-600" />
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Stats Card (for alumni) */}
            {profileUser.role === "alumni" && (
              <Card className="bg-linear-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg">Mentor Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Students Mentored</span>
                    <span className="text-lg font-bold text-blue-600">0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Jobs Posted</span>
                    <span className="text-lg font-bold text-blue-600">0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Rating</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-lg font-bold text-blue-600">5.0</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Request Mentorship Dialog */}
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Request Mentorship</DialogTitle>
              <DialogDescription>
                Send a mentorship request to {profileUser.displayName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={profileUser.photoURL || undefined} />
                  <AvatarFallback className="bg-blue-600 text-white font-bold">
                    {profileUser.displayName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{profileUser.displayName}</p>
                  <p className="text-sm text-gray-600">
                    {profileData.jobTitle || "Alumni"}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Message (Optional)
                </label>
                <Textarea
                  placeholder="Introduce yourself and explain why you'd like this mentor's guidance..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {requestMessage.length}/500 characters
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowRequestDialog(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRequestMentorship}
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Send Request
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Report User Dialog */}
        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Report User
              </DialogTitle>
              <DialogDescription>
                Report {profileUser.displayName} for violating community guidelines
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={profileUser.photoURL || undefined} />
                  <AvatarFallback className="bg-red-100 text-red-600 font-bold">
                    {profileUser.displayName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{profileUser.displayName}</p>
                  <p className="text-sm text-gray-600">
                    {profileUser.email}
                  </p>
                </div>
              </div>

              <div>
                <Label className="block text-sm font-medium mb-2">
                  Reason for reporting *
                </Label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select a reason</option>
                  {reportReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="block text-sm font-medium mb-2">
                  Additional details (optional)
                </Label>
                <Textarea
                  placeholder="Provide more context about your report..."
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={4}
                  maxLength={1000}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {reportDescription.length}/1000 characters
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReportDialog(false);
                    setReportReason("");
                    setReportDescription("");
                  }}
                  disabled={reportSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReportUser}
                  disabled={reportSubmitting || !reportReason}
                  variant="destructive"
                >
                  {reportSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Flag className="mr-2 h-4 w-4" />
                      Submit Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
