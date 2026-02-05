# CampusLink - Code Architecture Documentation

## Table of Contents
- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Architecture Patterns](#architecture-patterns)
- [Core Systems](#core-systems)
- [Data Flow](#data-flow)
- [Security Implementation](#security-implementation)
- [UI/UX Architecture](#uiux-architecture)

---

## Overview

CampusLink is a Next.js 14+ role-based SaaS platform built with the App Router architecture, providing mentorship and career guidance services for Indian colleges. The application connects students, alumni, aspirants, and admins in a verified ecosystem.

### Architectural Philosophy
- **Client-First Architecture**: Primary logic runs on the client with Firebase as the backend
- **Real-time Data Synchronization**: Firestore listeners for live updates
- **Role-Based Access Control**: Granular permissions at every level
- **Component-Driven Design**: Reusable, composable UI components
- **Type-Safe Development**: Full TypeScript coverage across the codebase

---

## Technology Stack

### Frontend
- **Framework**: Next.js 16.1.1 (App Router)
- **Language**: TypeScript 5+
- **UI Library**: React 19.2.0
- **Styling**: Tailwind CSS 4 (with @tailwindcss/postcss)
- **Component System**: Shadcn/UI (Radix UI primitives)
- **Animations**: Framer Motion 12.23.24
- **Form Management**: React Hook Form 7.66.0 + Zod 4.1.12 validation
- **Charts/Visualization**: Recharts 3.3.0
- **Icons**: Lucide React 0.552.0

### Backend & Services
- **Backend**: Firebase 12.5.0
  - Firestore (Database)
  - Firebase Auth (Authentication)
  - Firebase Storage (File storage)
- **Date Utilities**: date-fns 4.1.0
- **Image Compression**: browser-image-compression 2.0.2

### Development Tools
- **Linting**: ESLint 9
- **Build**: Next.js compiler with production optimizations
- **Code Quality**: TypeScript strict mode

---

## Project Structure

```
alumni-link/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                   # Authentication route group
│   │   ├── login/               # Login page
│   │   └── signup/              # Signup page
│   ├── admin/                    # Admin dashboard & management
│   │   ├── activity-logs/       # Activity log viewer
│   │   ├── login/              # Admin login
│   │   ├── posts/              # Post moderation
│   │   ├── reports/            # User report management
│   │   ├── users/              # User management
│   │   ├── verifications/      # ID verification approval
│   │   └── page.tsx            # Admin dashboard
│   ├── api/                     # API routes
│   │   └── notifications/      # Notification endpoints
│   ├── chat/                    # Real-time messaging
│   ├── dashboard/               # User dashboards (role-specific)
│   ├── forgot-password/         # Password reset flow
│   ├── jobs/                    # Job postings & applications
│   │   ├── create/             # Create job posting
│   │   ├── my-applications/    # User's job applications
│   │   └── my-posts/           # User's posted jobs
│   ├── mentorship/              # Mentorship request system
│   ├── onboarding/              # Multi-step onboarding flow
│   ├── posts/                   # Social posts (LinkedIn-style)
│   ├── profile/                 # User profile pages
│   │   ├── [userId]/           # Public profile view
│   │   ├── edit/               # Profile editing
│   │   └── page.tsx            # Own profile view
│   ├── settings/                # User settings
│   ├── users/                   # User directory/search
│   ├── layout.tsx               # Root layout with AuthProvider
│   ├── page.tsx                 # Landing page
│   └── globals.css              # Global styles
│
├── components/                   # React components
│   ├── admin/                   # Admin-specific components
│   ├── chat/                    # Chat UI components (10 files)
│   │   ├── chat-header.tsx
│   │   ├── chat-input.tsx
│   │   ├── conversation-list.tsx
│   │   ├── emoji-picker.tsx
│   │   ├── link-preview.tsx
│   │   ├── message-actions.tsx
│   │   ├── message-item.tsx
│   │   ├── message-list.tsx
│   │   ├── reaction-picker.tsx
│   │   └── voice-recorder.tsx
│   ├── layout/                  # Layout components
│   │   ├── admin-layout.tsx    # Admin dashboard layout
│   │   ├── main-layout.tsx     # Main app layout with sidebar
│   │   └── sidebar.tsx         # Navigation sidebar
│   ├── posts/                   # Post-related components
│   ├── shared/                  # Shared components
│   └── ui/                      # Shadcn/UI components (28 files)
│       ├── action-button.tsx
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── empty-state.tsx
│       ├── form.tsx
│       ├── input.tsx
│       ├── job-card.tsx
│       ├── label.tsx
│       ├── loading-spinner.tsx
│       ├── mentor-card.tsx
│       ├── page-header.tsx
│       ├── post-card.tsx
│       ├── progress.tsx
│       ├── role-based-gradient.tsx
│       ├── scroll-area.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── stat-card.tsx
│       ├── status-badge.tsx
│       ├── tabs.tsx
│       ├── textarea.tsx
│       ├── toast.tsx
│       ├── toaster.tsx
│       └── user-avatar.tsx
│
├── context/                      # React Context providers
│   └── auth-context.tsx         # Authentication context
│
├── hooks/                        # Custom React hooks
│   ├── use-async.ts             # Async operation handler
│   ├── use-auth.tsx             # Auth hook wrapper
│   ├── use-firestore-collection.ts  # Firestore real-time subscription
│   ├── use-toast.ts             # Toast notification hook
│   └── use-verification-guard.ts    # Verification status guard
│
├── lib/                          # Utility libraries
│   ├── firebase/                # Firebase services (19 files)
│   │   ├── adminLogs.ts         # Admin activity logging
│   │   ├── auth.ts              # Authentication services
│   │   ├── chat-media.ts        # Media uploads for chat
│   │   ├── chat-presence.ts     # User online/offline status
│   │   ├── chat.ts              # Chat messaging services
│   │   ├── config.ts            # Firebase initialization
│   │   ├── firestore-helpers.ts # Firestore utilities
│   │   ├── index.ts             # Exports
│   │   ├── jobs.ts              # Job posting services
│   │   ├── link-preview.ts      # URL link preview generation
│   │   ├── mentorship.ts        # Mentorship request services
│   │   ├── message-actions.ts   # Message reactions, replies
│   │   ├── message-edit.ts      # Message editing
│   │   ├── posts.ts             # Social post services
│   │   ├── profiles.ts          # User profile services
│   │   ├── reactions.ts         # Reaction services
│   │   ├── replies.ts           # Reply services
│   │   ├── reports.ts           # User reporting services
│   │   └── verification.ts      # Verification request services
│   ├── services/                # External services
│   │   ├── resend.ts            # Email notifications
│   │   └── twilio.ts            # WhatsApp notifications
│   ├── upload/                  # Image upload utilities
│   │   └── imgbb.ts             # ImgBB image hosting
│   ├── utils/                   # Utility functions (7 files)
│   ├── constants.ts             # App constants & routes
│   ├── design-system.ts         # Design tokens & theme
│   └── utils.ts                 # Utility functions
│
├── types/                        # TypeScript type definitions
│   └── index.ts                 # All type definitions (14 entities)
│
├── docs/                         # Documentation
│   ├── UI.md                    # UI/UX guidelines
│   ├── admin.md                 # Admin features
│   ├── context.md               # Project context
│   └── refactor.md              # Refactoring notes
│
├── firestore.rules              # Firestore security rules
├── firestore.indexes.json       # Firestore composite indexes
├── storage.rules                # Firebase Storage rules
├── next.config.ts               # Next.js configuration
├── tsconfig.json                # TypeScript configuration
└── package.json                 # Dependencies
```

---

## Architecture Patterns

### 1. **Client-Side Architecture**

CampusLink follows a **client-first architecture** where:
- All business logic runs in the browser
- Firebase provides backend services (auth, database, storage)
- No custom backend API layer
- Server components used sparingly for SEO & initial renders

### 2. **Routing Architecture**

Uses Next.js App Router with:
- **Route Groups**: `(auth)` for authentication pages
- **Dynamic Routes**: `profile/[userId]` for user profiles
- **Nested Layouts**: Role-specific layouts (MainLayout, AdminLayout)
- **File-based routing**: Each folder represents a URL segment

### 3. **State Management**

Multi-layered state approach:
- **Global State**: React Context for authentication (`AuthContext`)
- **Server State**: Firestore real-time listeners via custom hooks
- **Local State**: React useState for component-level state
- **Form State**: React Hook Form for complex forms
- **Cache**: localStorage for user role caching

### 4. **Component Architecture**

```
Components follow a clear hierarchy:

┌─────────────────────────────────────┐
│         Layout Components           │
│  (AdminLayout, MainLayout, Sidebar) │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│         Page Components             │
│   (Dashboard, Profile, Jobs, etc.)  │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│      Feature Components             │
│  (ChatInput, JobCard, PostCard)     │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│         UI Components               │
│   (Button, Card, Dialog, etc.)      │
└─────────────────────────────────────┘
```

### 5. **Data Layer Architecture**

```
┌──────────────┐
│ React        │
│ Components   │
└──────┬───────┘
       │
       │ uses
       ▼
┌──────────────┐
│ Custom Hooks │  (useAuth, useFirestoreCollection)
└──────┬───────┘
       │
       │ calls
       ▼
┌──────────────┐
│ Firebase     │  (auth.ts, chat.ts, jobs.ts, etc.)
│ Services     │
└──────┬───────┘
       │
       │ interacts
       ▼
┌──────────────┐
│ Firebase     │  (Firestore, Auth, Storage)
│ SDK          │
└──────────────┘
```

---

## Core Systems

### 1. **Authentication System**

**Location**: `lib/firebase/auth.ts`, `context/auth-context.tsx`, `hooks/use-auth.tsx`

**Key Features**:
- Email/password authentication
- OAuth (Google, GitHub) with popup/redirect fallback
- Email verification flow
- Password reset
- Role assignment during signup
- Session persistence

**Flow**:
```
User Signup → Firebase Auth → Create User Document → Assign Role → Onboarding
                                     ↓
                            userId, email, role stored in /users/{userId}
```

**Authentication Functions**:
- `signUp()` - Create account with role
- `signIn()` - Email/password login
- `signInWithGoogle()` - OAuth Google
- `signInWithGithub()` - OAuth GitHub
- `signOut()` - Logout
- `sendPasswordReset()` - Password reset email
- `getCurrentUser()` - Get current Firebase user
- `getUserData()` - Fetch user data from Firestore

**AuthContext Provider**:
- Wraps entire app in `app/layout.tsx`
- Provides `user`, `firebaseUser`, `loading`, `refreshUser()`
- Automatically syncs auth state with Firestore user data
- Caches user role in localStorage

### 2. **Role-Based Access Control (RBAC)**

**Roles**: Student, Alumni, Aspirant, Admin

**Implementation**:
- User role stored in `/users/{userId}` document
- `useRequireAuth(role)` hook for route protection
- Layout components check role for conditional rendering
- Firestore security rules enforce backend permissions

**Role-Specific Features**:
| Role | Dashboard | Features |
|------|-----------|----------|
| **Student** | Stats, mentorship requests, job applications | Request mentorship, apply to jobs, chat with alumni |
| **Alumni** | Mentorship stats, job postings | Post jobs, accept mentorship requests, share posts |
| **Aspirant** | Pre-admission guidance | Connect with students, ask questions |
| **Admin** | User management, verification, reports | Approve verifications, manage users, view activity logs |

### 3. **Verification System**

**Location**: `lib/firebase/verification.ts`, `app/admin/verifications/`

**Flow**:
```
User uploads ID card → Verification request created → Admin reviews → 
Approve/Reject → Update user status → Notification sent
```

**Firestore Collections**:
- `verificationRequests/` - Pending verifications
- `users/{userId}` - Verification status field

**States**: `unverified`, `pending`, `approved`, `rejected`

### 4. **Onboarding System**

**Location**: `app/onboarding/`

**Multi-step process**:
1. **Step 1**: Basic info (college, course, graduation year)
2. **Step 2**: Skills and interests
3. **Step 3**: Social links (LinkedIn, GitHub, portfolio)
4. **Step 4**: Profile photo upload

**State tracking**: `onboardingStep`, `onboardingComplete` in user document

### 5. **Mentorship System**

**Location**: `lib/firebase/mentorship.ts`, `app/mentorship/`

**Workflow**:
```
Student requests mentorship → Alumni receives notification → 
Accept/Reject → Schedule session → Complete → Feedback
```

**Firestore Structure**:
```
mentorshipRequests/{requestId}
  - studentId
  - mentorId
  - status (pending, accepted, rejected, completed, cancelled)
  - message
  - scheduledDate
  - feedback { rating, comment }
```

**Status Lifecycle**: `pending` → `accepted` → `completed` (with feedback)

### 6. **Job Posting System**

**Location**: `lib/firebase/jobs.ts`, `app/jobs/`

**Features**:
- Alumni can post jobs/internships
- Students can browse and apply
- Referral marking
- Application tracking

**Firestore Structure**:
```
jobPostings/{jobId}
  - postedBy (userId)
  - title, company, location
  - type (full-time, part-time, internship, contract)
  - description, requirements, skills
  - salary { min, max, currency }
  - deadline
  - isReferral
  - applicationsCount
  - status (active, closed, filled)

jobApplications/{applicationId}
  - jobId
  - applicantId
  - resumeUrl
  - coverLetter
  - status (pending, reviewed, shortlisted, rejected, accepted)
```

### 7. **Real-Time Chat System**

**Location**: `lib/firebase/chat.ts`, `components/chat/`, `app/chat/`

**Features**:
- One-on-one messaging
- Real-time message delivery
- Read receipts
- Message reactions (like, celebrate, support, love, insightful, curious)
- Message replies/threading
- Message editing & deletion
- Voice messages
- Image/video/document sharing
- Link previews
- User presence (online/offline)
- Message forwarding
- Starred messages

**Firestore Structure**:
```
conversations/{conversationId}
  - participants [userId1, userId2]
  - lastMessage { content, timestamp, senderId }
  - pinnedBy, archivedBy, mutedBy

conversations/{conversationId}/messages/{messageId}
  - senderId, receiverId
  - content
  - messageType (text, image, video, document, voice, system)
  - status (sending, sent, delivered, read)
  - timestamp
  - reactions { emoji: { count, users } }
  - replyTo (messageId)
  - edited, editedAt
  - linkPreview { url, title, description, image }
```

**Real-time Subscriptions**:
- `onSnapshot()` listeners for live message updates
- Presence system tracks user online status
- Unread count updates in real-time

### 8. **Social Posts System**

**Location**: `lib/firebase/posts.ts`, `app/posts/`, `components/ui/post-card.tsx`

**Features**:
- LinkedIn-style achievement sharing
- Image uploads (up to 10 per post)
- Hashtags and mentions
- Reactions (6 types)
- Nested comments
- Visibility controls (public, connections, college)

**Firestore Structure**:
```
posts/{postId}
  - authorId, authorName, authorRole
  - content
  - postType (achievement, announcement, article, milestone, general)
  - images, thumbnails
  - hashtags, mentions
  - likesCount, commentsCount, sharesCount
  - visibility (public, connections, college)
  - status (active, hidden, deleted)

posts/{postId}/likes/{likeId}
  - userId, userName
  - reaction (like, celebrate, support, love, insightful, curious)

posts/{postId}/comments/{commentId}
  - authorId, authorName
  - content
  - parentCommentId (for nested replies)
  - likesCount, repliesCount
```

### 9. **Admin Panel**

**Location**: `app/admin/`, `components/admin/`, `components/layout/admin-layout.tsx`

**Features**:
- Dashboard with stats
- User management (view, suspend, delete)
- Verification approval workflow
- Report management (user reports, chat reports)
- Post moderation
- Activity logs
- Database health monitoring

**Admin Routes**:
- `/admin` - Dashboard
- `/admin/users` - User management
- `/admin/verifications` - Approve ID cards
- `/admin/reports` - Handle user reports
- `/admin/posts` - Content moderation
- `/admin/activity-logs` - Audit trail

**Activity Logging**: All admin actions logged to `adminActivityLogs/` collection

---

## Data Flow

### Example: Sending a Chat Message

```
1. User types message in ChatInput component
   ↓
2. Component calls sendMessage() from lib/firebase/chat.ts
   ↓
3. Service function:
   - Creates message document in Firestore
   - Updates conversation lastMessage
   - Increments unread count
   - Detects URLs and generates link preview (async)
   ↓
4. Firestore triggers onSnapshot listener
   ↓
5. useFirestoreCollection hook receives update
   ↓
6. MessageList component re-renders with new message
   ↓
7. Receiver sees message in real-time
```

### Example: Requesting Mentorship

```
1. Student clicks "Request Mentorship" on MentorCard
   ↓
2. Dialog opens with form (react-hook-form + zod validation)
   ↓
3. Submit calls createMentorshipRequest() from lib/firebase/mentorship.ts
   ↓
4. Service creates document in mentorshipRequests/ collection
   {
     studentId, mentorId,
     status: "pending",
     message: "...",
     createdAt: serverTimestamp()
   }
   ↓
5. Trigger notification to alumni (email/WhatsApp)
   ↓
6. Alumni sees request in dashboard
   ↓
7. Alumni accepts → updateMentorshipStatus() → status: "accepted"
   ↓
8. Student receives notification
```

---

## Security Implementation

### 1. **Firestore Security Rules**

**Location**: `firestore.rules`

**Key Principles**:
- All reads/writes require authentication
- Users can only modify their own data
- Role-based read permissions
- Admin-only access for user management, reports, verifications

**Example Rules**:
```javascript
// Users can read own data, admins can read all
match /users/{userId} {
  allow read: if request.auth.uid == userId || isAdmin();
  allow write: if request.auth.uid == userId;
}

// Only admins can approve verifications
match /verificationRequests/{requestId} {
  allow read: if request.auth != null;
  allow create: if request.auth.uid == request.resource.data.userId;
  allow update: if isAdmin();
}

// Chat messages readable only by participants
match /conversations/{convId}/messages/{messageId} {
  allow read: if isParticipant(convId);
  allow create: if request.auth != null && isParticipant(convId);
}
```

### 2. **Firebase Storage Rules**

**Location**: `storage.rules`

**Rules**:
- Users can upload to `/users/{userId}/` path
- File size limits enforced
- Only authenticated users can upload
- Public read for verified uploads

### 3. **Client-Side Guards**

**Hooks**:
- `useRequireAuth(role)` - Redirects if not authenticated or wrong role
- `useVerificationGuard()` - Blocks unverified users

**Route Protection**:
```typescript
// In protected pages
const { user, loading } = useRequireAuth("admin");
if (loading) return <LoadingSpinner />;
if (!user) return null; // Will redirect
```

### 4. **Input Validation**

**Zod Schemas**: All forms use Zod for runtime validation
- Email format validation
- Required field checks
- Min/max length enforcement
- Type safety

**Example**:
```typescript
const signupSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
  displayName: z.string().min(2, "Min 2 characters"),
  role: z.enum(["student", "alumni", "aspirant"]),
});
```

---

## UI/UX Architecture

### 1. **Design System**

**Location**: `lib/design-system.ts`

**Design Tokens**:
- **Colors**: Role-based color palette (student=green, alumni=purple, aspirant=amber, admin=red)
- **Typography**: Font sizes, weights, line heights
- **Spacing**: 8px grid system
- **Shadows**: 7 elevation levels
- **Border Radius**: Consistent rounding (sm, base, md, lg, xl, 2xl, full)
- **Transitions**: Consistent timing functions

**Role-Based Theming**:
```typescript
colors.roles = {
  student: { main: '#10b981', gradient: 'from-emerald-500 to-teal-600' },
  alumni: { main: '#8b5cf6', gradient: 'from-purple-500 to-indigo-600' },
  aspirant: { main: '#f59e0b', gradient: 'from-amber-500 to-orange-600' },
  admin: { main: '#ef4444', gradient: 'from-red-500 to-rose-600' },
}
```

### 2. **Component Library**

**Shadcn/UI**: Radix UI primitives + Tailwind
- Fully accessible (ARIA compliant)
- Keyboard navigation
- Customizable via design tokens
- 28 UI components

**Custom Components**:
- `RoleBasedGradient` - Dynamic gradients per role
- `StatusBadge` - Status visualization
- `StatCard` - Dashboard statistics
- `JobCard` - Job posting display
- `MentorCard` - Mentor profile card
- `PostCard` - Social post display
- `ActionButton` - Multi-state action buttons

### 3. **Responsive Design**

**Breakpoints**:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

**Mobile-First**: All layouts use Tailwind's responsive utilities

### 4. **Loading States**

- **Global**: `LoadingSpinner` component
- **Skeleton Loaders**: For list items (jobs, posts, users)
- **Suspense Boundaries**: React Suspense for async components
- **Optimistic UI**: Immediate feedback before server confirmation

### 5. **Error Handling**

- **Toast Notifications**: Success, error, warning, info
- **Form Errors**: Inline validation with react-hook-form
- **Empty States**: Custom EmptyState component
- **Error Boundaries**: Catch React errors

---

## Performance Optimizations

### 1. **Next.js Optimizations**

**next.config.ts**:
- React Strict Mode enabled
- Console logs removed in production (except errors/warnings)
- Image optimization with AVIF/WebP formats
- Remote image patterns configured (Firebase, ImgBB, Google)

### 2. **Firebase Optimizations**

- **Firestore Indexes**: Composite indexes for complex queries (`firestore.indexes.json`)
- **Query Limits**: Paginated queries (limit 20-50 items)
- **Listener Cleanup**: Unsubscribe from Firestore listeners on unmount
- **Caching**: User role cached in localStorage

### 3. **Image Optimization**

- **Client-side compression**: `browser-image-compression` before upload
- **Next.js Image component**: Automatic optimization
- **Lazy loading**: Images below fold lazy-loaded
- **Responsive images**: Multiple sizes served

### 4. **Code Splitting**

- **Dynamic imports**: Used for heavy components (charts, editor)
- **Route-based splitting**: Automatic with App Router
- **Component lazy loading**: React.lazy() for modals, dialogs

---

## Key Firestore Collections

```
/users/{userId}
  - User account data, role, verification status, onboarding state

/profiles/{userId}
  - Extended profile data, skills, bio, social links

/conversations/{conversationId}
  - Chat conversation metadata
  /messages/{messageId} - Individual messages

/mentorshipRequests/{requestId}
  - Mentorship request records

/jobPostings/{jobId}
  - Job/internship listings

/jobApplications/{applicationId}
  - Job applications

/posts/{postId}
  - Social posts
  /likes/{likeId} - Post reactions
  /comments/{commentId} - Post comments

/verificationRequests/{requestId}
  - ID card verification requests

/userReports/{reportId}
  - User reports for abuse/spam

/adminActivityLogs/{logId}
  - Admin action audit trail
```

---

## Constants & Configuration

**Location**: `lib/constants.ts`

### Routes
All application routes defined as constants for type safety:
- Authentication: `/login`, `/signup`
- Main: `/dashboard`, `/profile`, `/jobs`, `/chat`, `/mentorship`
- Admin: `/admin`, `/admin/users`, `/admin/verifications`, `/admin/reports`

### Collections
Firestore collection names:
- `USERS`, `PROFILES`, `MENTORSHIP_REQUESTS`, `JOB_POSTINGS`, etc.

### File Limits
- Max file size: 5MB
- Allowed image types: JPEG, PNG
- Allowed document types: PDF, JPEG, PNG

---

## Development Workflow

### Running the App
```bash
npm run dev          # Development server (localhost:3000)
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
```

### Firebase Deployment
```bash
firebase deploy --only firestore:rules   # Deploy security rules
firebase deploy --only storage           # Deploy storage rules
firebase deploy --only hosting           # Deploy to Firebase Hosting
```

### Environment Setup
Required `.env.local` variables:
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_IMGBB_API_KEY=
```

Optional (notifications):
```
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
```

---

## Type System

**Location**: `types/index.ts`

**14 Core Types**:
1. `User` - User account data
2. `UserProfile` - Extended profile
3. `UserRole` - Role enum
4. `VerificationStatus` - Verification state
5. `MentorshipRequest` - Mentorship records
6. `ChatMessage` - Chat messages
7. `Conversation` - Chat conversations
8. `JobPosting` - Job listings
9. `JobApplication` - Job applications
10. `Notification` - In-app notifications
11. `VerificationRequest` - Verification submissions
12. `UserReport` - User reports
13. `Post` - Social posts
14. `PostLike`, `PostComment`, `CommentLike` - Post interactions

All types use TypeScript interfaces with full type safety across the app.

---

## Future Architecture Considerations

### Potential Improvements
1. **SSR for SEO**: Convert more pages to Server Components for better SEO
2. **Edge Functions**: Move API routes to edge for lower latency
3. **Redis Cache**: Add Redis for frequently accessed data
4. **CDN**: Cloudflare CDN for static assets
5. **Monitoring**: Add Sentry for error tracking, analytics
6. **Testing**: Add Jest + React Testing Library
7. **E2E Tests**: Playwright for critical user flows
8. **PWA**: Add service worker for offline support
9. **Push Notifications**: Firebase Cloud Messaging
10. **Search**: Algolia/Typesense for advanced search

### Scalability Notes
- Firestore scales automatically to millions of documents
- Consider pagination for large datasets (>10k items)
- Use Cloud Functions for background tasks (email batches, analytics)
- Monitor Firebase quota limits in production

---

## Conclusion

CampusLink is built on a modern, scalable architecture leveraging Next.js App Router and Firebase. The codebase follows best practices for:
- **Type Safety**: Full TypeScript coverage
- **Security**: Role-based access control at every layer
- **Performance**: Optimized builds, lazy loading, caching
- **Maintainability**: Clear file structure, reusable components
- **Real-time**: Firestore listeners for live updates
- **User Experience**: Consistent design system, accessible UI

The architecture supports rapid feature development while maintaining code quality and security.
