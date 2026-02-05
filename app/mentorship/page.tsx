"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { UserAvatar } from "@/components/ui/user-avatar";
import { MentorCard, MentorCardGrid } from "@/components/ui/mentor-card";
import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useVerificationGuard } from "@/hooks/use-verification-guard";
import { getUserData } from "@/lib/firebase/auth";
import { getUserProfile } from "@/lib/firebase/profiles";
import { 
  getMentorshipRequestsByStudent, 
  getMentorshipRequestsByMentor, 
  getAvailableMentors,
  createMentorshipRequest,
  updateMentorshipRequest
} from "@/lib/firebase/mentorship";
import { getConversationBetweenUsers, createConversation, sendMessage } from "@/lib/firebase/chat";
import { handleError } from "@/lib/utils/error-handling";
import { formatDate } from "@/lib/utils/date";
import { useEffect, useState } from "react";
import { User, MentorshipRequest, UserProfile } from "@/types";
import { Users, CheckCircle, XCircle, MessageSquare, Search } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MentorshipPage() {
  const { user, loading: authLoading } = useVerificationGuard();
  const router = useRouter();
  const [userData, setUserData] = useState<User | null>(null);
  const [requests, setRequests] = useState<MentorshipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBrowse, setShowBrowse] = useState(false);
  const [mentors, setMentors] = useState<any[]>([]);
  const [mentorProfiles, setMentorProfiles] = useState<Record<string, UserProfile>>({});
  const [loadingMentors, setLoadingMentors] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<any>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [appliedMentors, setAppliedMentors] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      getUserData(user.uid).then((data) => {
        setUserData(data);
        if (data) {
          if (data.role === "student" || data.role === "aspirant") {
            getMentorshipRequestsByStudent(user.uid).then((reqs) => {
              setRequests(reqs);
              // Track which mentors already have requests
              const mentorIds = new Set(reqs.map(r => r.mentorId));
              setAppliedMentors(mentorIds);
            }).finally(() => setLoading(false));
          } else if (data.role === "alumni") {
            getMentorshipRequestsByMentor(user.uid).then(setRequests).finally(() => setLoading(false));
          }
        }
      });
    }
  }, [user]);

  const loadMentors = async () => {
    setLoadingMentors(true);
    try {
      const availableMentors = await getAvailableMentors();
      setMentors(availableMentors);
      
      // Load profiles for all mentors
      const profiles: Record<string, UserProfile> = {};
      for (const mentor of availableMentors) {
        const profile = await getUserProfile(mentor.id);
        if (profile) {
          profiles[mentor.id] = profile;
        }
      }
      setMentorProfiles(profiles);
    } catch (error) {
      console.error("Error loading mentors:", error);
    } finally {
      setLoadingMentors(false);
    }
  };

  const handleBrowseMentors = () => {
    setShowBrowse(true);
    if (mentors.length === 0) {
      loadMentors();
    }
  };

  const handleRequestMentorship = async () => {
    if (!user || !selectedMentor) return;

    setSubmitting(true);
    try {
      await createMentorshipRequest(
        user.uid,
        selectedMentor.id,
        requestMessage.trim() || undefined
      );

      setAppliedMentors(prev => new Set(prev).add(selectedMentor.id));
      alert("Mentorship request sent successfully!");
      setSelectedMentor(null);
      setRequestMessage("");
      
      // Reload requests
      const reqs = await getMentorshipRequestsByStudent(user.uid);
      setRequests(reqs);
    } catch (error) {
      console.error("Error sending request:", error);
      alert("Failed to send request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptRequest = async (requestId: string, studentId: string) => {
    try {
      await updateMentorshipRequest(requestId, { status: "accepted" });
      
      // Create or get conversation between mentor and student
      try {
        const conversation = await getConversationBetweenUsers(user!.uid, studentId);
        
        if (!conversation) {
          // Create new conversation
          const conversationId = await createConversation([user!.uid, studentId]);
          
          // Send initial system message
          await sendMessage(
            conversationId,
            user!.uid,
            studentId,
            "Hi! I've accepted your mentorship request. Feel free to ask me anything!",
            "text"
          );
        }
      } catch (convError) {
        console.error("Error creating conversation:", convError);
        // Continue even if conversation creation fails
      }
      
      const reqs = await getMentorshipRequestsByMentor(user!.uid);
      setRequests(reqs);
      alert("Request accepted! You can now message the student.");
    } catch (error) {
      console.error("Error accepting request:", error);
      alert("Failed to accept request.");
    }
  };

  const handleMessageMentor = async (mentorId: string) => {
    try {
      // Check if conversation exists
      const conversation = await getConversationBetweenUsers(user!.uid, mentorId);
      
      if (!conversation) {
        // Create new conversation
        const conversationId = await createConversation([user!.uid, mentorId]);
        
        // Send initial message
        await sendMessage(
          conversationId,
          user!.uid,
          mentorId,
          "Hi! Thanks for accepting my mentorship request. I'm looking forward to learning from you!",
          "text"
        );
      }
      
      // Navigate to chat page
      router.push("/chat");
    } catch (error) {
      console.error("Error starting conversation:", error);
      alert("Failed to start conversation. Please try again.");
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await updateMentorshipRequest(requestId, { status: "rejected" });
      const reqs = await getMentorshipRequestsByMentor(user!.uid);
      setRequests(reqs);
      alert("Request rejected.");
    } catch (error) {
      console.error("Error rejecting request:", error);
      alert("Failed to reject request.");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, any> = {
      pending: "pending",
      accepted: "approved",
      rejected: "rejected",
      completed: "success",
      cancelled: "inactive",
    };
    return (
      <StatusBadge variant={statusMap[status] || "pending"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </StatusBadge>
    );
  };

  if (loading || authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" message="Loading mentorship requests..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Mentorship"
          description={
            userData?.role === "student" || userData?.role === "aspirant"
              ? "Connect with experienced alumni for personalized guidance and career advice"
              : "Review and manage mentorship requests from aspiring students"
          }
          actions={
            (userData?.role === "student" || userData?.role === "aspirant") ? (
              <div className="flex gap-2">
                <ActionButton 
                  variant={showBrowse ? "outline" : "primary"}
                  onClick={() => setShowBrowse(false)}
                >
                  My Requests
                </ActionButton>
                <ActionButton 
                  variant={showBrowse ? "primary" : "outline"}
                  onClick={handleBrowseMentors}
                  icon={<Search />}
                >
                  Find Mentors
                </ActionButton>
              </div>
            ) : undefined
          }
        />

        {/* Browse Mentors View */}
        {showBrowse && (userData?.role === "student" || userData?.role === "aspirant") ? (
          <>
            {loadingMentors ? (
              <div className="flex items-center justify-center py-16">
                <LoadingSpinner size="lg" message="Loading mentors..." />
              </div>
            ) : mentors.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <EmptyState
                    icon={Users}
                    title="No mentors available yet"
                    description="Check back later for available alumni mentors"
                  />
                </CardContent>
              </Card>
            ) : (
              <MentorCardGrid>
                {mentors.map((mentor) => {
                  const profile = mentorProfiles[mentor.id];
                  const hasRequested = appliedMentors.has(mentor.id);
                  
                  return (
                    <MentorCard
                      key={mentor.id}
                      mentor={{
                        id: mentor.id,
                        name: mentor.displayName,
                        photoURL: mentor.photoURL,
                        role: "alumni",
                        verified: mentor.verificationStatus === "approved",
                        title: profile?.jobTitle,
                        company: profile?.currentCompany,
                        location: profile?.location,
                        education: profile?.college,
                        bio: profile?.bio,
                        skills: profile?.skills,
                        availability: "available"
                      }}
                      onConnect={hasRequested ? undefined : () => setSelectedMentor(mentor)}
                      isConnected={hasRequested}
                    />
                  );
                })}
              </MentorCardGrid>
            )}
          </>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <EmptyState
                icon={Users}
                title={userData?.role === "student" || userData?.role === "aspirant"
                  ? "No mentorship requests yet"
                  : "No pending requests"}
                description={userData?.role === "student" || userData?.role === "aspirant"
                  ? "Find a mentor to help guide your career journey"
                  : "Mentorship requests from students will appear here"}
                action={(userData?.role === "student" || userData?.role === "aspirant") ? (
                  <ActionButton onClick={handleBrowseMentors}>
                    <Users className="mr-2 h-4 w-4" />
                    Browse Mentors
                  </ActionButton>
                ) : undefined}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <UserAvatar
                        name={userData?.role === "student" || userData?.role === "aspirant" ? "Mentor" : "Student"}
                        size="lg"
                      />
                      <div>
                        <CardTitle className="text-lg">
                          {userData?.role === "student" || userData?.role === "aspirant"
                            ? "Mentor Request"
                            : "Student Request"}
                        </CardTitle>
                        <CardDescription>
                          Requested on {formatDate(request.requestedDate)}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardHeader>
                {request.message && (
                  <CardContent className="pt-0 pb-4">
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm text-muted-foreground italic">&quot;{request.message}&quot;</p>
                    </div>
                  </CardContent>
                )}
                {request.status === "pending" && userData?.role === "alumni" && (
                  <CardContent className="flex gap-2 pt-0">
                    <ActionButton 
                      size="sm" 
                      onClick={() => handleAcceptRequest(request.id, request.studentId)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1.5" />
                      Accept
                    </ActionButton>
                    <ActionButton 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleRejectRequest(request.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1.5" />
                      Decline
                    </ActionButton>
                  </CardContent>
                )}
                {request.status === "accepted" && (
                  <CardContent className="pt-0">
                    <ActionButton 
                      size="sm"
                      onClick={() => handleMessageMentor(
                        userData?.role === "student" || userData?.role === "aspirant" 
                          ? request.mentorId 
                          : request.studentId
                      )}
                    >
                      <MessageSquare className="h-4 w-4 mr-1.5" />
                      Message
                    </ActionButton>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Request Mentorship Dialog */}
        <Dialog open={selectedMentor !== null} onOpenChange={(open) => !open && setSelectedMentor(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                Request Mentorship
              </DialogTitle>
              <DialogDescription>
                Send a mentorship request to {selectedMentor?.displayName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedMentor && (
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                  <UserAvatar
                    src={selectedMentor.photoURL}
                    name={selectedMentor.displayName}
                    size="lg"
                    verified={selectedMentor.verificationStatus === "approved"}
                  />
                  <div>
                    <p className="font-medium">{selectedMentor.displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      {mentorProfiles[selectedMentor.id]?.jobTitle || "Alumni"}
                      {mentorProfiles[selectedMentor.id]?.currentCompany && (
                        <> at {mentorProfiles[selectedMentor.id]?.currentCompany}</>
                      )}
                    </p>
                  </div>
                </div>
              )}

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
                <p className="text-xs text-muted-foreground mt-1">
                  {requestMessage.length}/500 characters
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <ActionButton 
                  variant="outline" 
                  onClick={() => setSelectedMentor(null)}
                  disabled={submitting}
                >
                  Cancel
                </ActionButton>
                <ActionButton 
                  onClick={handleRequestMentorship}
                  loading={submitting}
                  loadingText="Sending..."
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Request
                </ActionButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

