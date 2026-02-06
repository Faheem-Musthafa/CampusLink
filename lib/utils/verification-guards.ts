import type { User } from "@/types";

/**
 * Check if user has full verification
 * Different requirements for different roles:
 * - Students/Alumni: Need admission verification + admin approval
 * - Aspirants: Just need email verification + admin approval (no admission number)
 * ADMINS ALWAYS RETURN TRUE (God Mode)
 */
export function isFullyVerified(user: User): boolean {
    // ADMIN GOD MODE: Admins bypass verification
    if (user.role === "admin") return true;

    // Check account status
    if (isAccountDeactivated(user)) {
        return false;
    }

    // Aspirants don't need admission verification
    if (user.role === "aspirant") {
        return user.verificationStatus === "approved";
    }

    // Students and Alumni need both admission verification and admin approval
    return (
        user.verificationStatus === "approved" &&
        user.admissionVerified === true
    );
}

/**
 * Check if user can post jobs (alumni only + fully verified)
 * ADMINS CAN ALWAYS POST
 */
export function canPostJobs(user: User): boolean {
    // ADMIN GOD MODE
    if (user.role === "admin") return true;

    return user.role === "alumni" && isFullyVerified(user);
}

/**
 * Check if user can post to feed
 * ADMINS CAN ALWAYS POST
 */
export function canPostFeed(user: User): boolean {
    // ADMIN GOD MODE
    if (user.role === "admin") return true;

    return isFullyVerified(user);
}

/**
 * Check if user can send messages
 * ADMINS CAN ALWAYS MESSAGE
 */
export function canMessage(user: User): boolean {
    // ADMIN GOD MODE
    if (user.role === "admin") return true;

    return isFullyVerified(user);
}

/**
 * Check if user can accept mentorship requests (alumni only)
 * ADMINS CAN ALWAYS ACCEPT
 */
export function canAcceptMentorship(user: User): boolean {
    // ADMIN GOD MODE
    if (user.role === "admin") return true;

    return user.role === "alumni" && isFullyVerified(user);
}

/**
 * Check if account is deactivated
 */
export function isAccountDeactivated(user: User): boolean {
    // Admins cannot be deactivated
    if (user.role === "admin") return false;

    return (
        user.accountStatus === "auto_deactivated" ||
        user.accountStatus === "suspended"
    );
}

/**
 * Get verification status message for UI
 */
export function getVerificationMessage(user: User): {
    message: string;
    type: "warning" | "error" | "info";
    action?: string;
} {
    // ADMIN ALWAYS VERIFIED
    if (user.role === "admin") {
        return {
            message: "Admin account - Full access enabled",
            type: "info"
        };
    }

    // Check if account is deactivated
    if (user.accountStatus === "auto_deactivated") {
        return {
            message: "Your account has been deactivated due to incomplete verification. Complete verification to reactivate.",
            type: "error",
            action: "Complete Verification"
        };
    }

    if (user.accountStatus === "suspended") {
        return {
            message: "Your account has been suspended. Contact admin for assistance.",
            type: "error"
        };
    }

    const hasFullAccess = user.verificationStatus === "approved";
    const hasAdmissionVerification = user.admissionVerified === true;
    const isPendingAdminReview = user.verificationStatus === "pending";
    const isAspirant = user.role === "aspirant";

    // Stage 2 complete: Full access
    if (isAspirant && hasFullAccess) {
        return {
            message: "Your account is fully verified!",
            type: "info"
        };
    }

    if (hasFullAccess && hasAdmissionVerification) {
        return {
            message: "Your account is fully verified!",
            type: "info"
        };
    }

    // Aspirant pending admin review
    if (isAspirant && isPendingAdminReview) {
        return {
            message: "Your email is verified! Waiting for admin approval. You have view-only access until approved.",
            type: "warning",
            action: "View Status"
        };
    }

    // Aspirant not yet verified
    if (isAspirant && !hasFullAccess) {
        return {
            message: "Complete email verification to unlock all features. Admin will review your profile.",
            type: "warning",
            action: "Verify Email"
        };
    }

    // Stage 1 complete for students/alumni: Pending admin review (limited access)
    if (isPendingAdminReview && hasAdmissionVerification) {
        return {
            message: "Your admission is verified! Documents pending admin review. You have view-only access until approved.",
            type: "warning",
            action: "View Status"
        };
    }

    // Calculate days remaining
    if (user.verificationDeadline) {
        const daysRemaining = Math.ceil(
            (new Date(user.verificationDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        if (daysRemaining <= 1 && daysRemaining > 0) {
            return {
                message: `⚠️ Urgent: Complete verification within ${daysRemaining} day(s) or your account will be deactivated`,
                type: "warning",
                action: "Verify Now"
            };
        }
    }

    if (!hasFullAccess && !hasAdmissionVerification) {
        return {
            message: "Complete ID card and admission number verification to unlock all features",
            type: "warning",
            action: "Verify Now"
        };
    }

    if (!hasFullAccess) {
        return {
            message: "ID card verification pending. Your documents are being reviewed by admin.",
            type: "warning",
            action: "View Status"
        };
    }

    // Only admission verification missing
    return {
        message: "Add your admission number to unlock all features",
        type: "warning",
        action: "Add Admission Number"
    };
}

/**
 * Get days remaining until deactivation
 */
export function getDaysUntilDeactivation(user: User): number | null {
    if (!user.verificationDeadline) return null;

    const daysRemaining = Math.ceil(
        (new Date(user.verificationDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return Math.max(0, daysRemaining);
}
