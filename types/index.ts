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
  accountStatus?: 'active' | 'suspended' | 'deleted' | 'auto_deactivated';

  // Contact
  phoneNumber?: string;
  phoneVerified?: boolean;

  // Activity Tracking
  lastLoginAt?: Date;
  loginCount?: number;

  // Admission Verification (NEW)
  admissionNumber?: string;
  admissionVerified?: boolean;
  admissionVerifiedAt?: Date;

  // Feature Access Flags (NEW)
  canPostJobs?: boolean;
  canPostFeed?: boolean;
  canMessage?: boolean;
  canAcceptMentorship?: boolean;

  // Auto-Deactivation Tracking (NEW)
  autoDeactivatedAt?: Date;
  deactivationReason?: string;
  verificationDeadline?: Date;
  deactivationWarningEmailSent?: boolean;

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
  verificationType: "id_card" | "phone_otp" | "email_otp";
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

// Post Types for Achievement Sharing (LinkedIn-style)
export type PostType = "achievement" | "announcement" | "article" | "milestone" | "general";

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  authorRole?: UserRole;
  authorJobTitle?: string;
  authorCompany?: string;

  // Content
  content: string;
  postType: PostType;

  // Media
  images?: string[];
  thumbnails?: string[];

  // Tags & Hashtags
  hashtags?: string[];
  mentions?: string[]; // userIds mentioned

  // Engagement
  likesCount: number;
  commentsCount: number;
  sharesCount: number;

  // Visibility
  visibility: "public" | "connections" | "college";
  college?: string; // For college-specific posts

  // Status
  status: "active" | "hidden" | "deleted";
  isPinned?: boolean;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface PostLike {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  reaction: "like" | "celebrate" | "support" | "love" | "insightful" | "curious";
  createdAt: Date;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  authorRole?: UserRole;

  content: string;
  parentCommentId?: string; // For nested replies

  likesCount: number;
  repliesCount: number;

  isEdited?: boolean;
  editedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface CommentLike {
  id: string;
  commentId: string;
  userId: string;
  userName: string;
  createdAt: Date;
}

// NEW: Alumni Verification Types
export interface VerifiedAlumni {
  admissionNumber: string;
  fullName: string;
  graduationYear: number;
  course: string;
  specialization?: string;
  department?: string;
  college: string;

  isUsed: boolean;
  claimedBy?: string;
  claimedAt?: Date;

  addedBy: string;
  addedAt: Date;
  updatedAt: Date;
  notes?: string;
}

export interface AlumniFilters {
  graduationYear?: number;
  course?: string;
  isUsed?: boolean;
  searchQuery?: string;
}

export type AdmissionVerificationStatus =
  | "not_found"
  | "already_used"
  | "valid"
  | "name_mismatch"
  | "year_mismatch"
  | "year_corrected";

export interface ValidationResult {
  isValid: boolean;
  status: AdmissionVerificationStatus;
  message: string;
  alumniData?: VerifiedAlumni;
  suggestedName?: string;
  correctedYear?: number;
}

export interface BulkImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ admissionNo: string; reason: string }>;
}
