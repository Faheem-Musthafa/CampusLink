import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";
import { User } from "@/types";

/**
 * Check and deactivate expired accounts
 * Called by Cloud Function daily or manually by admin
 */
export async function checkAndDeactivateExpiredAccounts(): Promise<{
  deactivated: number;
  warned: number;
  errors: string[];
}> {
  if (!db) throw new Error("Firestore not initialized");

  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  let deactivated = 0;
  let warned = 0;
  const errors: string[] = [];

  try {
    // DEACTIVATE: Accounts past deadline that are not fully verified
    const expiredQuery = query(
      collection(db, "users"),
      where("verificationDeadline", "<=", Timestamp.fromDate(now)),
      where("accountStatus", "==", "active")
    );

    const expiredDocs = await getDocs(expiredQuery);

    for (const userDoc of expiredDocs.docs) {
      const userData = userDoc.data() as User;
      
      // Check if user is fully verified (skip if already verified)
      const isVerified = 
        userData.verificationStatus === "approved" && 
        userData.admissionVerified === true;
      
      // Admin accounts are never deactivated
      if (userData.role === "admin") continue;
      
      if (!isVerified) {
        try {
          await deactivateAccount(userDoc.id);
          deactivated++;
        } catch (error) {
          errors.push(`Failed to deactivate ${userDoc.id}: ${error}`);
        }
      }
    }

    // WARN: Accounts with 1 day remaining
    const warningQuery = query(
      collection(db, "users"),
      where("verificationDeadline", "<=", Timestamp.fromDate(tomorrow)),
      where("verificationDeadline", ">", Timestamp.fromDate(now)),
      where("accountStatus", "==", "active"),
      where("deactivationWarningEmailSent", "!=", true)
    );

    const warningDocs = await getDocs(warningQuery);

    for (const userDoc of warningDocs.docs) {
      const userData = userDoc.data() as User;
      
      // Check if user is fully verified (skip if already verified)
      const isVerified = 
        userData.verificationStatus === "approved" && 
        userData.admissionVerified === true;
      
      // Admin accounts don't need warnings
      if (userData.role === "admin") continue;
      
      if (!isVerified) {
        try {
          await sendWarningEmail(userDoc.id, userData);
          warned++;
        } catch (error) {
          errors.push(`Failed to warn ${userDoc.id}: ${error}`);
        }
      }
    }
  } catch (error) {
    errors.push(`Query error: ${error}`);
  }

  return { deactivated, warned, errors };
}

/**
 * Deactivate a user account
 */
async function deactivateAccount(userId: string): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");
  
  const userRef = doc(db, "users", userId);

  await updateDoc(userRef, {
    accountStatus: "auto_deactivated",
    deactivationReason: "Verification not completed within 2 days of registration",
    autoDeactivatedAt: serverTimestamp(),
    // Block all features
    canPostJobs: false,
    canPostFeed: false,
    canMessage: false,
    canAcceptMentorship: false,
    updatedAt: serverTimestamp(),
  });

  console.log(`Account ${userId} has been auto-deactivated`);
  
  // TODO: Send deactivation email via Resend
  // await sendDeactivationEmail(userId);
}

/**
 * Send warning email to user
 */
async function sendWarningEmail(userId: string, user: User): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");
  
  const userRef = doc(db, "users", userId);

  // Mark warning as sent
  await updateDoc(userRef, {
    deactivationWarningEmailSent: true,
    updatedAt: serverTimestamp(),
  });

  console.log(`Warning sent to ${user.email} for account ${userId}`);
  
  // TODO: Send actual email via Resend
  // await sendEmail({
  //   to: user.email,
  //   subject: "⚠️ Action Required: Verify Your CampusLink Account",
  //   template: "deactivation-warning",
  //   data: {
  //     name: user.displayName,
  //     deadline: user.verificationDeadline,
  //   }
  // });
}

/**
 * Reactivate account when user completes verification
 */
export async function reactivateAccount(userId: string): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");
  
  const userRef = doc(db, "users", userId);

  await updateDoc(userRef, {
    accountStatus: "active",
    autoDeactivatedAt: null,
    deactivationReason: null,
    // Restore feature access
    canPostJobs: true,
    canPostFeed: true,
    canMessage: true,
    canAcceptMentorship: true,
    updatedAt: serverTimestamp(),
  });

  console.log(`Account ${userId} has been reactivated`);
}

/**
 * Manually trigger deactivation check (for admin use)
 */
export async function runDeactivationCheck(): Promise<{
  deactivated: number;
  warned: number;
  errors: string[];
}> {
  console.log("Running manual deactivation check...");
  const result = await checkAndDeactivateExpiredAccounts();
  console.log(`Deactivation check complete: ${result.deactivated} deactivated, ${result.warned} warned`);
  return result;
}

/**
 * Get all accounts pending deactivation (for admin dashboard)
 */
export async function getAccountsPendingDeactivation(): Promise<{
  expiring24h: number;
  expiring48h: number;
  alreadyDeactivated: number;
}> {
  if (!db) throw new Error("Firestore not initialized");

  const now = new Date();
  const in24h = new Date();
  in24h.setDate(in24h.getDate() + 1);
  const in48h = new Date();
  in48h.setDate(in48h.getDate() + 2);

  // Accounts expiring in next 24 hours
  const expiring24hQuery = query(
    collection(db, "users"),
    where("verificationDeadline", "<=", Timestamp.fromDate(in24h)),
    where("verificationDeadline", ">", Timestamp.fromDate(now)),
    where("accountStatus", "==", "active")
  );
  const expiring24hDocs = await getDocs(expiring24hQuery);

  // Accounts expiring in 24-48 hours
  const expiring48hQuery = query(
    collection(db, "users"),
    where("verificationDeadline", "<=", Timestamp.fromDate(in48h)),
    where("verificationDeadline", ">", Timestamp.fromDate(in24h)),
    where("accountStatus", "==", "active")
  );
  const expiring48hDocs = await getDocs(expiring48hQuery);

  // Already deactivated accounts
  const deactivatedQuery = query(
    collection(db, "users"),
    where("accountStatus", "==", "auto_deactivated")
  );
  const deactivatedDocs = await getDocs(deactivatedQuery);

  return {
    expiring24h: expiring24hDocs.size,
    expiring48h: expiring48hDocs.size,
    alreadyDeactivated: deactivatedDocs.size,
  };
}

/**
 * Extend verification deadline for a user (admin action)
 */
export async function extendVerificationDeadline(
  userId: string, 
  additionalDays: number = 2
): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");
  
  const userRef = doc(db, "users", userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    throw new Error("User not found");
  }

  const userData = userDoc.data();
  const currentDeadline = userData.verificationDeadline?.toDate() || new Date();
  const newDeadline = new Date(Math.max(currentDeadline.getTime(), Date.now()));
  newDeadline.setDate(newDeadline.getDate() + additionalDays);

  await updateDoc(userRef, {
    verificationDeadline: Timestamp.fromDate(newDeadline),
    deactivationWarningEmailSent: false, // Reset warning flag
    updatedAt: serverTimestamp(),
  });

  console.log(`Deadline extended for ${userId} to ${newDeadline.toISOString()}`);
}
