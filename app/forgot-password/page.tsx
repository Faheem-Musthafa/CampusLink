"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendPasswordReset } from "@/lib/firebase/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await sendPasswordReset(email.trim());
      setSent(true);
      toast({
        title: "Reset link sent",
        description: "Check your email for password reset instructions.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-8 space-y-6">
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-black text-white shadow-md">
              <Mail className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold">Forgot password</h1>
            <p className="text-sm text-muted-foreground">
              Enter your account email and we&apos;ll send you a reset link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || sent}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || sent}>
              {loading ? "Sending..." : sent ? "Link sent" : "Send reset link"}
            </Button>
          </form>

          {sent && (
            <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
              <CheckCircle2 className="h-5 w-5 mt-0.5" />
              <div>
                <p className="font-medium">Email sent</p>
                <p>Check your inbox and follow the link to set a new password.</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <Link href="/login" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
            <button
              type="button"
              onClick={() => router.push("/signup")}
              className="text-foreground font-medium hover:underline"
            >
              Create account
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
