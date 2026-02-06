"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";

export default function AdminLogin() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if already logged in as admin
  useEffect(() => {
    if (!authLoading && user?.role === "admin") {
      router.push("/admin");
    }
  }, [user, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import("firebase/auth");
      const { getAuth } = await import("firebase/auth");
      const { doc, getDoc, setDoc, serverTimestamp } = await import("firebase/firestore");
      const { getDb } = await import("@/lib/firebase/config");
      const auth = getAuth();
      const db = getDb();

      // Check for environment variable fallback admin credentials
      const envAdminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      const envAdminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
      
      if (envAdminEmail && envAdminPassword && email === envAdminEmail && password === envAdminPassword) {
        // Fallback admin login via env vars - also sign in to Firebase Auth
        let userCredential;
        
        try {
          // Try to sign in first
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (signInError: unknown) {
          // If user doesn't exist, create them
          const signInMessage = signInError instanceof Error ? signInError.message : "";
          if (signInMessage.includes("user-not-found") || signInMessage.includes("invalid-credential")) {
            try {
              userCredential = await createUserWithEmailAndPassword(auth, email, password);
            } catch (createError: unknown) {
              const createMessage = createError instanceof Error ? createError.message : "";
              // If email already in use but wrong password, throw original error
              if (createMessage.includes("email-already-in-use")) {
                setError("Invalid password for admin account");
                setLoading(false);
                return;
              }
              throw createError;
            }
          } else {
            throw signInError;
          }
        }

        // Ensure admin user document exists with admin role
        const userDocRef = doc(db, "users", userCredential.user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          // Create admin user document
          await setDoc(userDocRef, {
            uid: userCredential.user.uid,
            email: email,
            name: "System Administrator",
            role: "admin",
            verificationStatus: "approved",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else if (userDoc.data()?.role !== "admin") {
          // Update role to admin if not already
          await setDoc(userDocRef, { role: "admin", updatedAt: serverTimestamp() }, { merge: true });
        }

        sessionStorage.setItem("adminAuthenticated", "true");
        sessionStorage.setItem("adminFallback", "true");
        router.push("/admin");
        return;
      }

      // Use Firebase Auth to login for regular admin accounts
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if user has admin role
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      
      if (!userDoc.exists() || userDoc.data()?.role !== "admin") {
        setError("Access denied. Admin privileges required.");
        await auth.signOut();
        setLoading(false);
        return;
      }

      // Store session for quick checks
      sessionStorage.setItem("adminAuthenticated", "true");
      
      router.push("/admin");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      if (message.includes("invalid-credential")) {
        setError("Invalid email or password");
      } else if (message.includes("user-not-found")) {
        setError("No account found with this email");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-500 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Admin Login</h1>
          <p className="text-slate-400 mt-1">Sign in to access the admin panel</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="bg-slate-800 border-slate-700 focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-slate-800 border-slate-700 focus:border-cyan-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
            >
              {loading ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Back Link */}
        <p className="text-center mt-6 text-slate-500 text-sm">
          Not an admin?{" "}
          <a href="/dashboard" className="text-cyan-400 hover:underline">
            Go to Dashboard
          </a>
        </p>
      </div>
    </div>
  );
}
