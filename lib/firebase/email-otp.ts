/**
 * Email OTP Verification System
 * For aspirant verification using email-based OTP
 */

import { db } from "./config";
import {
    doc,
    setDoc,
    getDoc,
    deleteDoc,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";

// OTP Configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;

interface OTPRecord {
    otp: string;
    email: string;
    userId: string;
    createdAt: Date | Timestamp;
    expiresAt: Date | Timestamp;
    verified: boolean;
    attempts: number;
}

/**
 * Generate a random numeric OTP
 */
export function generateOTP(): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < OTP_LENGTH; i++) {
        otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
}

/**
 * Create and store an OTP for email verification
 */
export async function createEmailOTP(
    userId: string,
    email: string
): Promise<{ otp: string; expiresAt: Date }> {
    if (!db) throw new Error("Firestore not initialized");

    const otp = generateOTP();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store OTP in Firestore (keyed by email to prevent multiple OTPs)
    const otpRef = doc(db, "emailOTPs", email.toLowerCase());
    
    await setDoc(otpRef, {
        otp,
        email: email.toLowerCase(),
        userId,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
        verified: false,
        attempts: 0,
    });

    return { otp, expiresAt };
}

/**
 * Verify an OTP entered by the user
 */
export async function verifyEmailOTP(
    email: string,
    enteredOTP: string
): Promise<{ 
    success: boolean; 
    message: string;
    userId?: string;
}> {
    if (!db) throw new Error("Firestore not initialized");

    const otpRef = doc(db, "emailOTPs", email.toLowerCase());
    const otpDoc = await getDoc(otpRef);

    if (!otpDoc.exists()) {
        return {
            success: false,
            message: "No OTP found. Please request a new one.",
        };
    }

    const otpData = otpDoc.data() as OTPRecord;

    // Check if already verified
    if (otpData.verified) {
        return {
            success: false,
            message: "This OTP has already been used.",
        };
    }

    // Check expiry
    const expiresAt = otpData.expiresAt instanceof Timestamp 
        ? otpData.expiresAt.toDate() 
        : new Date(otpData.expiresAt);
    
    if (new Date() > expiresAt) {
        // Delete expired OTP
        await deleteDoc(otpRef);
        return {
            success: false,
            message: "OTP has expired. Please request a new one.",
        };
    }

    // Check attempts (max 5)
    if (otpData.attempts >= 5) {
        await deleteDoc(otpRef);
        return {
            success: false,
            message: "Too many failed attempts. Please request a new OTP.",
        };
    }

    // Verify OTP
    if (enteredOTP !== otpData.otp) {
        // Increment attempts
        await setDoc(otpRef, { 
            ...otpData, 
            attempts: otpData.attempts + 1 
        }, { merge: true });
        
        return {
            success: false,
            message: `Incorrect OTP. ${4 - otpData.attempts} attempts remaining.`,
        };
    }

    // OTP is correct - mark as verified
    await setDoc(otpRef, { 
        ...otpData, 
        verified: true,
        verifiedAt: serverTimestamp(),
    }, { merge: true });

    return {
        success: true,
        message: "Email verified successfully!",
        userId: otpData.userId,
    };
}

/**
 * Send OTP via API route
 */
export async function sendOTPEmail(
    email: string,
    userId: string,
    userName: string
): Promise<{ success: boolean; message: string; expiresAt?: Date }> {
    try {
        // Create OTP in Firestore first
        const { otp, expiresAt } = await createEmailOTP(userId, email);

        // Send via API route
        const response = await fetch('/api/send-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                otp,
                userName,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to send OTP');
        }

        return {
            success: true,
            message: `OTP sent to ${email}`,
            expiresAt,
        };
    } catch (error) {
        console.error('Error sending OTP:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to send OTP',
        };
    }
}

/**
 * Check if an email has a valid pending OTP
 */
export async function hasPendingOTP(email: string): Promise<boolean> {
    if (!db) return false;

    const otpRef = doc(db, "emailOTPs", email.toLowerCase());
    const otpDoc = await getDoc(otpRef);

    if (!otpDoc.exists()) return false;

    const otpData = otpDoc.data() as OTPRecord;
    
    // Check if not verified and not expired
    const expiresAt = otpData.expiresAt instanceof Timestamp 
        ? otpData.expiresAt.toDate() 
        : new Date(otpData.expiresAt);
    
    return !otpData.verified && new Date() < expiresAt;
}

/**
 * Delete OTP record (cleanup)
 */
export async function deleteOTP(email: string): Promise<void> {
    if (!db) return;
    
    const otpRef = doc(db, "emailOTPs", email.toLowerCase());
    await deleteDoc(otpRef);
}
