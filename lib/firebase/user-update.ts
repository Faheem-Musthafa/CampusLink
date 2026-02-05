import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./config";
import type { User } from "@/types";

/**
 * Update user with admission number and verification status
 */
export async function updateUserAdmissionInfo(
    userId: string,
    admissionNumber: string,
    isVerified: boolean
): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
        admissionNumber: admissionNumber.toUpperCase(),
        admissionVerified: isVerified,
        admissionVerifiedAt: isVerified ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
    });

    // Update feature access flags
    await updateUserFeatureAccess(userId);
}

/**
 * Automatically update feature access flags based on verification status
 */
export async function updateUserFeatureAccess(userId: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
        throw new Error("User not found");
    }

    const userData = userDoc.data() as User;

    const isFullyVerified =
        userData.verificationStatus === "approved" &&
        userData.admissionVerified === true;

    // Admins always have full access
    const isAdmin = userData.role === "admin";

    await updateDoc(userRef, {
        canPostJobs: isAdmin || (userData.role === "alumni" && isFullyVerified),
        canPostFeed: isAdmin || isFullyVerified,
        canMessage: isAdmin || isFullyVerified,
        canAcceptMentorship: isAdmin || (userData.role === "alumni" && isFullyVerified),
        updatedAt: serverTimestamp(),
    });
}

/**
 * Set verification deadline when user completes signup
 */
export async function setVerificationDeadline(userId: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 2); // 2 days from now

    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
        verificationDeadline: deadline,
        accountStatus: "active",
        deactivationWarningEmailSent: false,
        updatedAt: serverTimestamp(),
    });
}
