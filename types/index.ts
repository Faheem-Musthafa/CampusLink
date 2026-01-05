export type UserRole = "student" | "alumni" | "aspirant" | "mentor" | "admin";

export type VerificationStatus = "unverified" | "pending" | "approved" | "rejected";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  emailVerified: boolean;
  
  // Verification
  verificationStatus?: VerificationStatus;
  verificationMethod?: 'id_card' | 'email' | 'phone';
  verificationSubmittedAt?: Date;
  verificationApprovedAt?: Date;
  
  // Onboarding
  onboardingComplete?: boolean;
  onboardingStep?: number; // 1-4 (which step user is on)
  onboardingStartedAt?: Date;
  onboardingCompletedAt?: Date;
  
  // Account Status
  accountStatus?: 'active' | 'suspended' | 'deleted';
  
  // Contact
  phoneNumber?: string;
  phoneVerified?: boolean;
  
  // Activity Tracking
  lastLoginAt?: Date;
  loginCount?: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  userId: string;
  photoURL?: string;
  college?: string;
  collegeEmail?: string;
  graduationYear?: number;
  course?: string;
  specialization?: string;
  currentCompany?: string;
  jobTitle?: string;
  experience?: number;
  location?: string;
  bio?: string;
  skills?: string[];
  interests?: string[];
  linkedIn?: string;
  github?: string;
  portfolio?: string;
  instagram?: string;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MentorshipRequest {
  id: string;
  studentId: string;
  mentorId: string;
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled";
  message?: string;
  requestedDate: Date;
  scheduledDate?: Date;
  completedDate?: Date;
  feedback?: {
    rating: number;
    comment: string;
    createdAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  read: boolean;
  messageType: "text" | "file" | "voice" | "image" | "video" | "document" | "system";
  
  // Delivery status
  status?: "sending" | "sent" | "delivered" | "read" | "failed";
  deliveredAt?: Date;
  readAt?: Date;
  
  // Media
  mediaUrl?: string;
  mediaType?: string;
  mediaSize?: number;
  thumbnailUrl?: string;
  duration?: number; // for voice/video messages in seconds
  
  // Link Preview
  linkPreview?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
    favicon?: string;
  };
  
  // Interactions
  reactions?: Record<string, { count: number; users: Array<{ userId: string; userName: string; timestamp: Date }> }>; // emoji: {count, users}
  replyTo?: string; // messageId of replied message
  forwarded?: boolean;
  forwardedFrom?: string; // userId who originally sent the message
  originalMessageId?: string; // original message ID for forwards
  edited?: boolean;
  editedAt?: Date;
  
  // Metadata
  deleted?: boolean;
  starred?: string[]; // userIds who starred this message
  lastStarredAt?: Date; // last time starred
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: {
    content: string;
    timestamp: Date;
    senderId: string;
  };
  createdAt: Date;
  updatedAt: Date;
  pinnedBy?: string[];
  archivedBy?: string[];
  mutedBy?: string[];
  clearedBy?: Record<string, any>;
}

export interface JobPosting {
  id: string;
  postedBy: string;
  title: string;
  company: string;
  location: string;
  type: "full-time" | "part-time" | "internship" | "contract";
  description: string;
  requirements?: string[];
  skills?: string[];
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
  deadline?: {
    seconds: number;
    nanoseconds: number;
  };
  applicationLink?: string;
  isReferral: boolean;
  referralDetails?: string;
  status: "active" | "closed" | "filled";
  applicationsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobApplication {
  id: string;
  jobId: string;
  applicantId: string;
  resumeUrl?: string;
  coverLetter?: string;
  status: "pending" | "reviewed" | "shortlisted" | "rejected" | "accepted";
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: "mentorship_request" | "mentorship_accepted" | "mentorship_rejected" | "new_message" | "job_application" | "profile_update";
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: Date;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  verificationType: "id_card" | "phone_otp";
  status: VerificationStatus;
  idCardUrl?: string;
  phoneNumber?: string;
  additionalInfo?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserReport {
  id: string;
  reportedUserId: string;
  reportedUserName: string;
  reportedBy: string;
  reporterName: string;
  reason: string;
  description: string;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  type?: "user" | "chat"; // Type of report (from profile or chat)
  collection?: "userReports" | "chatReports"; // Which Firestore collection
  conversationId?: string; // Only for chat reports
  action?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

