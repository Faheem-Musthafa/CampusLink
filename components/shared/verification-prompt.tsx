"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle2, XCircle, Info } from "lucide-react";
import Link from "next/link";
import type { User } from "@/types";
import { getVerificationMessage } from "@/lib/utils/verification-guards";

interface VerificationPromptProps {
    feature: string;
    user: User;
}

export function VerificationPrompt({ feature, user }: VerificationPromptProps) {
    const { message, type, action } = getVerificationMessage(user);

    const hasIdVerification = user.verificationStatus === "approved";
    const hasAdmissionVerification = user.admissionVerified === true;

    return (
        <Card className="max-w-2xl mx-auto mt-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-6 h-6 text-amber-500" />
                    Verification Required
                </CardTitle>
                <CardDescription>
                    Complete verification to {feature}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                <Alert variant={type === "error" ? "destructive" : "default"}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{message}</AlertDescription>
                </Alert>

                {/* Verification Checklist */}
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        {hasIdVerification ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                            <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                            <p className="font-medium">ID Card Verification</p>
                            <p className="text-sm text-muted-foreground">
                                {hasIdVerification
                                    ? "✓ Verified by admin"
                                    : "Upload and get your ID card verified"}
                            </p>
                            {!hasIdVerification && (
                                <Link href="/profile/edit?tab=verification">
                                    <Button variant="outline" size="sm" className="mt-2">
                                        Upload ID Card
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>

                    <Separator />

                    <div className="flex items-start gap-3">
                        {hasAdmissionVerification ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                            <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                            <p className="font-medium">Admission Number Verification</p>
                            <p className="text-sm text-muted-foreground">
                                {hasAdmissionVerification
                                    ? "✓ Verified admission number"
                                    : "Add and verify your admission number"}
                            </p>
                            {!hasAdmissionVerification && (
                                <Link href="/onboarding">
                                    <Button variant="outline" size="sm" className="mt-2">
                                        Add Admission Number
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
                        Having trouble? Contact admin for assistance.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
}
