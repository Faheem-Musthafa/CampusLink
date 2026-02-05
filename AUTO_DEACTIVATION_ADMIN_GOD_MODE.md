# Auto-Deactivation & Admin God Mode - Supplementary Implementation

## Auto-Deactivation System (2-Day Rule)

### Overview
Accounts that are not fully verified (ID card + admission number) within 2 days of creation will be automatically deactivated.

### Database Changes

Already added to `users/{userId}`:
```typescript
accountStatus?: "active" | "suspended" | "auto_deactivated";
autoDeactivatedAt?: Date;
deactivationReason?: string;
verificationDeadline?: Date;        // Set to createdAt + 2 days
deactivationWarningEmailSent?: boolean;
```

### Implementation Components

#### 1. Set Deadline on Account Creation

**Location**: [lib/firebase/auth.ts](file:///c:/Users/fahee/OneDrive/Desktop/Web/alumni-link/lib/firebase/auth.ts)

Modify `signUp` function:
```typescript
export async function signUp(...): Promise<FirebaseUser> {
  // ... existing signup logic
  
  // NEW: Set verification deadline (2 days from now)
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 2);
  
  await setDoc(doc(db, "users", userCredential.user.uid), {
    // ... existing fields
    verificationDeadline: deadline,
    accountStatus: "active",
    deactivationWarningEmailSent: false,
  });
}
```

#### 2. Auto-Deactivation Service

**[NEW] File**: `lib/firebase/auto-deactivation.ts`

```typescript
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "./config";
import { User } from "@/types";

/**
 * Check and deactivate expired accounts
 * Called by Cloud Function daily
 */
export async function checkAndDeactivateExpiredAccounts(): Promise<{
  deactivated: number;
  warned: number;
}> {
  if (!db) throw new Error("Firestore not initialized");
  
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  let deactivated = 0;
  let warned = 0;
  
  // DEACTIVATE: Accounts past deadline
  const expiredQuery = query(
    collection(db, "users"),
    where("verificationDeadline", "<=", now),
    where("verificationStatus", "!=", "approved"),
    where("accountStatus", "==", "active")
  );
  
  const expiredDocs = await getDocs(expiredQuery);
  
  for (const userDoc of expiredDocs.docs) {
    await deactivateAccount(userDoc.id);
    deactivated++;
  }
  
  // WARN: Accounts with 1 day remaining
  const warningQuery = query(
    collection(db, "users"),
    where("verificationDeadline", "<=", tomorrow),
    where("verificationDeadline", ">", now),
    where("verificationStatus", "!=", "approved"),
    where("accountStatus", "==", "active"),
    where("deactivationWarningEmailSent", "!=", true)
  );
  
  const warningDocs = await getDocs(warningQuery);
  
  for (const userDoc of warningDocs.docs) {
    await sendWarningEmail(userDoc.id, userDoc.data() as User);
    warned++;
  }
  
  return { deactivated, warned };
}

async function deactivateAccount(userId: string): Promise<void> {
  const userRef = doc(db!, "users", userId);
  
  await updateDoc(userRef, {
    accountStatus: "auto_deactivated",
    deactivationReason: "Verification not completed within 2 days",
    autoDeactivatedAt: new Date(),
    // Block all features
    canPostJobs: false,
    canPostFeed: false,
    canMessage: false,
    canAcceptMentorship: false,
  });
  
  // Send deactivation email
  // TODO: Implement with Resend
}

async function sendWarningEmail(userId: string, user: User): Promise<void> {
  const userRef = doc(db!, "users", userId);
  
  // TODO: Send email with Resend
  // "Complete verification within 24 hours or account will be deactivated"
  
  await updateDoc(userRef, {
    deactivationWarningEmailSent: true,
  });
}

/**
 * Reactivate account when user completes verification
 */
export async function reactivateAccount(userId: string): Promise<void> {
  const userRef = doc(db!, "users", userId);
  
  await updateDoc(userRef, {
    accountStatus: "active",
    autoDeactivatedAt: null,
    deactivationReason: null,
    verificationDeadline: null,
  });
}
```

#### 3. Cloud Function (Daily Cron Job)

**[NEW] File**: `functions/src/scheduled/checkDeactivations.ts`

```typescript
import * as functions from "firebase-functions";
import { checkAndDeactivateExpiredAccounts } from "../lib/auto-deactivation";

// Run daily at 2:00 AM IST
export const dailyAccountDeactivationCheck = functions
  .region("asia-south1")
  .pubsub
  .schedule("0 2 * * *")
  .timeZone("Asia/Kolkata")
  .onRun(async (context) => {
    console.log("Running daily account deactivation check...");
    
    const result = await checkAndDeactivateExpiredAccounts();
    
    console.log(`Accounts deactivated: ${result.deactivated}`);
    console.log(`Warning emails sent: ${result.warned}`);
    
    return { success: true, ...result };
  });
```

**Deploy**:
```bash
firebase deploy --only functions:dailyAccountDeactivationCheck
```

#### 4. Reactivation on Verification Approval

**Modify**: `lib/firebase/verification.ts`

```typescript
export async function approveVerification(
  requestId: string,
  adminId: string
): Promise<void> {
  // ... existing approval logic
  
  const userRef = doc(db, "users", request.userId);
  const userData = (await getDoc(userRef)).data() as User;
  
  // Update verification status
  await updateDoc(userRef, {
    verificationStatus: "approved",
    verificationApprovedAt: serverTimestamp(),
    // ... other fields
  });
  
  // NEW: Reactivate if auto-deactivated
  if (userData.accountStatus === "auto_deactivated") {
    await reactivateAccount(userData.id);
  }
  
  // Update feature access
  await updateUserFeatureAccess(userData.id);
}
```

#### 5. UI: Deactivation Notice

**[MODIFY]**: `app/dashboard/page.tsx`

```typescript
import { isAccountDeactivated } from "@/lib/utils/verification-guards";

export default function DashboardPage() {
  const { user } = useAuth();
  
  // Show deactivation banner
  if (user && isAccountDeactivated(user)) {
    return (
      <MainLayout>
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-5 w-5" />
          <AlertTitle>Account Deactivated</AlertTitle>
          <AlertDescription>
            Your account was deactivated on {formatDate(user.autoDeactivatedAt)} 
            because verification was not completed within 2 days.
            Complete verification to reactivate your account.
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardHeader>
            <CardTitle>Account Reactivation Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">To reactivate your account:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Upload your ID card</li>
              <li>Provide your admission number</li>
              <li>Wait for admin approval</li>
            </ol>
            
            <Link href="/profile/edit?tab=verification">
              <Button className="mt-4">
                Complete Verification
              </Button>
            </Link>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }
  
  // ... rest of dashboard
}
```

---

## Admin God Mode

### Overview
Admin accounts bypass ALL verification requirements and have unrestricted access to every feature.

### Implementation

#### Update Verification Guards

**Location**: `lib/utils/verification-guards.ts`

All guard functions updated to check admin role first:

```typescript
/**
 * Admins bypass all verification checks
 */
export function isFullyVerified(user: User): boolean {
  // ADMIN GOD MODE
  if (user.role === "admin") return true;
  
  // Check deactivation
  if (isAccountDeactivated(user)) return false;
  
  // Normal verification check
  return (
    user.verificationStatus === "approved" &&
    user.admissionVerified === true
  );
}

export function canPostJobs(user: User): boolean {
  if (user.role === "admin") return true;
  return user.role === "alumni" && isFullyVerified(user);
}

export function canPostFeed(user: User): boolean {
  if (user.role === "admin") return true;
  return isFullyVerified(user);
}

export function canMessage(user: User): boolean {
  if (user.role === "admin") return true;
  return isFullyVerified(user);
}

export function canAcceptMentorship(user: User): boolean {
  if (user.role === "admin") return true;
  return user.role === "alumni" && isFullyVerified(user);
}

export function isAccountDeactivated(user: User): boolean {
  // Admins cannot be deactivated
  if (user.role === "admin") return false;
  
  return (
    user.accountStatus === "auto_deactivated" ||
    user.accountStatus === "suspended"
  );
}
```

#### Admin Indicator in UI

**Add to Dashboard**:
```typescript
{user && user.role === "admin" && (
  <Alert className="mb-6 border-purple-500 bg-purple-50">
    <Shield className="h-4 w-4 text-purple-600" />
    <AlertTitle className="text-purple-900">
      Admin Account - God Mode Active
    </AlertTitle>
    <AlertDescription className="text-purple-700">
      You have unrestricted access to all platform features
    </AlertDescription>
  </Alert>
)}
```

---

## Testing Checklist

### Auto-Deactivation
- [ ] Create test account, verify deadline is set (createdAt + 2 days)
- [ ] Manually trigger Cloud Function to test warning email (1 day before)
- [ ] Manually trigger Cloud Function to test deactivation (after 2 days)
- [ ] Verify deactivated user cannot access features
- [ ] Complete verification, verify account is reactivated
- [ ] Verify feature access restored after reactivation

### Admin God Mode
- [ ] Create admin account
- [ ] Skip verification entirely
- [ ] Verify admin can post jobs
- [ ] Verify admin can create feed posts
- [ ] Verify admin can send messages
- [ ] Verify admin can accept mentorship requests
- [ ] Verify admin account cannot be deactivated
- [ ] Verify admin sees "God Mode" indicator in UI

---

## Deployment Checklist

1. Update Firestore indexes for new queries
2. Deploy Cloud Function for daily deactivation check
3. Test Cloud Function manually before production
4. Set up monitoring/alerts for deactivation function
5. Prepare customer support docs for deactivation scenarios
6. Configure email templates in Resend for warnings/deactivations

---

## Email Templates

### Warning Email (24 hours before)
```
Subject: ⚠️ Action Required: Verify Your CampusLink Account

Hi [Name],

Your CampusLink account will be deactivated in 24 hours if verification is not completed.

To keep your account active, please:
1. Upload your ID card
2. Provide your admission number
3. Wait for admin approval

Complete verification now: [link]

Thanks,
CampusLink Team
```

### Deactivation Email
```
Subject: Account Deactivated - CampusLink

Hi [Name],

Your CampusLink account has been deactivated because verification was not completed within 2 days of registration.

To reactivate your account, please complete verification:
[link]

Need help? Contact us at support@campuslink.com

Thanks,
CampusLink Team
```
