"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle2, XCircle, Info, Clock } from "lucide-react";
import Link from "next/link";
import type { User } from "@/types";
import { getVerificationMessage } from "@/lib/utils/verification-guards";

interface VerificationPromptProps {
    feature: string;
    user: User;
}

export function VerificationPrompt({ feature, user }: VerificationPromptProps) {
    const { message, type, action } = getVerificationMessage(user);

    // Role-specific verification approach
    const isAspirant = user.role === "aspirant";
    
    // Two-stage verification for students/alumni:
    // Stage 1: Admission verified (auto) = limited access (view-only)
    // Stage 2: Admin approval (manual) = full access
    // 
    // Single-stage verification for aspirants:
    // Email verified + Admin approval = full access (no admission number needed)
    
    const hasAdmissionVerification = user.admissionVerified === true;
    const isPendingAdminReview = user.verificationStatus === "pending";
    const hasFullAccess = user.verificationStatus === "approved";
    const hasEmailVerified = user.emailVerified === true;

    // For aspirants, render a simpler verification flow
    if (isAspirant) {
        return (
            <Card className="max-w-2xl mx-auto mt-8">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {isPendingAdminReview ? (
                            <Clock className="w-6 h-6 text-amber-500" />
                        ) : (
                            <AlertCircle className="w-6 h-6 text-amber-500" />
                        )}
                        {isPendingAdminReview ? "Pending Admin Approval" : "Verification Required"}
                    </CardTitle>
                    <CardDescription>
                        {isPendingAdminReview 
                            ? "Your profile is being reviewed by admin. You have view-only access."
                            : `Complete email verification to ${feature}`
                        }
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    <Alert variant={type === "error" ? "destructive" : "default"}>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{message}</AlertDescription>
                    </Alert>

                    {/* Aspirant Verification Checklist */}
                    <div className="space-y-4">
                        {/* Step 1: Email Verification */}
                        <div className="flex items-start gap-3">
                            {hasEmailVerified || isPendingAdminReview ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                            ) : (
                                <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                                <p className="font-medium">Step 1: Email Verification</p>
                                <p className="text-sm text-muted-foreground">
                                    {hasEmailVerified || isPendingAdminReview
                                        ? "✓ Your email has been verified"
                                        : "Verify your email address during onboarding"}
                                </p>
                            </div>
                        </div>

                        <Separator />

                        {/* Step 2: Admin Approval */}
                        <div className="flex items-start gap-3">
                            {hasFullAccess ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                            ) : isPendingAdminReview ? (
                                <Clock className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0 animate-pulse" />
                            ) : (
                                <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                                <p className="font-medium">Step 2: Admin Approval</p>
                                <p className="text-sm text-muted-foreground">
                                    {hasFullAccess
                                        ? "✓ Your profile has been approved by admin"
                                        : isPendingAdminReview
                                        ? "⏳ Your profile is pending admin review"
                                        : "Complete email verification to submit for review"}
                                </p>
                                {hasFullAccess && (
                                    <p className="text-xs text-green-600 mt-1">
                                        Grants: Full access to all features
                                    </p>
                                )}
                                {isPendingAdminReview && (
                                    <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-md">
                                        <p className="text-xs text-amber-600">
                                            Your profile is being reviewed. You currently have <strong>view-only access</strong>. 
                                            Full access will be granted after admin approval.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Help */}
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            {isPendingAdminReview 
                                ? "As an aspirant, you don't need an admission number. Admin will review your profile soon (usually 24-48 hours)."
                                : "Complete email verification to join the community. Admin will review your profile."}
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    // For students and alumni - two-stage verification with admission number
    return (
        <Card className="max-w-2xl mx-auto mt-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-6 h-6 text-amber-500" />
                    {isPendingAdminReview && hasAdmissionVerification ? "Pending Admin Review" : "Verification Required"}
                </CardTitle>
                <CardDescription>
                    {isPendingAdminReview && hasAdmissionVerification
                        ? `You have limited access while your documents are being reviewed`
                        : `Complete verification to ${feature}`
                    }
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                <Alert variant={type === "error" ? "destructive" : "default"}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{message}</AlertDescription>
                </Alert>

                {/* Two-Stage Verification Checklist for Students/Alumni */}
                <div className="space-y-4">
                    {/* Stage 1: Admission Verification (Auto) */}
                    <div className="flex items-start gap-3">
                        {hasAdmissionVerification ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                            <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                            <p className="font-medium">Stage 1: Admission Number Verification</p>
                            <p className="text-sm text-muted-foreground">
                                {hasAdmissionVerification
                                    ? "✓ Your admission number has been verified"
                                    : "Add and verify your admission number during onboarding"}
                            </p>
                            {hasAdmissionVerification && (
                                <p className="text-xs text-green-600 mt-1">
                                    Grants: Limited access (view content only)
                                </p>
                            )}
                            {!hasAdmissionVerification && (
                                <Link href="/onboarding">
                                    <Button variant="outline" size="sm" className="mt-2">
                                        Add Admission Number
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* Stage 2: Admin Review (Manual) */}
                    <div className="flex items-start gap-3">
                        {hasFullAccess ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : isPendingAdminReview && hasAdmissionVerification ? (
                            <Clock className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0 animate-pulse" />
                        ) : (
                            <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                            <p className="font-medium">Stage 2: Admin Document Review</p>
                            <p className="text-sm text-muted-foreground">
                                {hasFullAccess
                                    ? "✓ Your documents have been verified by admin"
                                    : isPendingAdminReview && hasAdmissionVerification
                                    ? "⏳ Your uploaded ID card is being reviewed by admin"
                                    : "Upload your ID card for admin verification"}
                            </p>
                            {hasFullAccess && (
                                <p className="text-xs text-green-600 mt-1">
                                    Grants: Full access (post jobs, messages, mentorship, feed)
                                </p>
                            )}
                            {isPendingAdminReview && hasAdmissionVerification && (
                                <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-md">
                                    <p className="text-xs text-amber-600">
                                        Your uploaded documents are pending admin review. 
                                        You currently have <strong>view-only access</strong>. 
                                        Full access will be granted after approval.
                                    </p>
                                </div>
                            )}
                            {!hasAdmissionVerification && !isPendingAdminReview && (
                                <Link href="/profile/edit?tab=verification">
                                    <Button variant="outline" size="sm" className="mt-2">
                                        Upload ID Card
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Help */}
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                        {isPendingAdminReview && hasAdmissionVerification
                            ? "Your documents are being reviewed. This usually takes 24-48 hours."
                            : "Having trouble? Contact admin for assistance."
                        }
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
}
