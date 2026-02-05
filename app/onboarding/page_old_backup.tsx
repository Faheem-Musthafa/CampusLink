"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  GraduationCap, 
  Upload, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Users, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  Briefcase,
  Target,
  Mail,
  MapPin,
  Calendar,
  Award,
  Building,
  Book,
  Shield,
  Star,
  Rocket
} from "lucide-react";
import { submitVerificationRequest } from "@/lib/firebase/verification";
import { UserRole } from "@/types";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Step 1: Role Selection
  const [selectedRole, setSelectedRole] = useState<UserRole>(user?.role || "student");

  // Verification Form Fields
  const [formData, setFormData] = useState({
    fullName: "",
    department: "",
    collegeName: "",
    collegeEmail: "",
    enrollmentNumber: "",
    graduationYear: "",
    course: "",
    phoneNumber: "",
  });

  // ID Card Upload (Students & Alumni)
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [idCardPreview, setIdCardPreview] = useState<string>("");
  const [additionalInfo, setAdditionalInfo] = useState("");

  // Phone OTP (Aspirants)
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    // If user is already approved, redirect to dashboard
    if (!authLoading && user && user.verificationStatus === "approved") {
      router.push("/dashboard");
      return;
    }
  }, [user, authLoading, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      setIdCardFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdCardPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIdCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.fullName || !formData.department || !formData.collegeName || !formData.collegeEmail) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!idCardFile) {
      toast({
        title: "Error",
        description: "Please upload your ID card",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await submitVerificationRequest({
        userId: user!.id,
        userName: formData.fullName,
        userEmail: formData.collegeEmail,
        userRole: user!.role,
        verificationType: "id_card",
        file: idCardFile,
        additionalInfo: JSON.stringify({
          department: formData.department,
          collegeName: formData.collegeName,
          enrollmentNumber: formData.enrollmentNumber,
          graduationYear: formData.graduationYear,
          course: formData.course,
          phoneNumber: formData.phoneNumber,
          notes: additionalInfo,
        }),
      });

      toast({
        title: "Success",
        description: "Your ID card has been submitted for verification. You'll receive an email once it's reviewed.",
      });

      // Wait a moment for Firestore to update, then redirect
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit verification request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement Firebase Phone Auth or SMS service
      // For now, simulate sending OTP
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setOtpSent(true);
      toast({
        title: "Success",
        description: "OTP sent to your phone number",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await submitVerificationRequest({
        userId: user!.id,
        userName: user!.displayName,
        userEmail: user!.email,
        userRole: user!.role,
        verificationType: "phone_otp",
        phoneNumber,
        otp,
      });

      toast({
        title: "Success",
        description: "Phone number verified successfully!",
      });

      // Wait a moment for Firestore to update, then redirect
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to verify OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle role selection and update
  const handleRoleSelection = async () => {
    if (!user || !db) return;
    
    setLoading(true);
    try {
      const userRef = doc(db, "users", user.id);
      await updateDoc(userRef, {
        role: selectedRole,
        onboardingStep: 2,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Role Updated",
        description: `You're now registered as ${selectedRole}`,
      });
      
      setStep(2);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    );
  }

  const isAspirant = selectedRole === "aspirant" || user.role === "aspirant";

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 bg-black rounded-2xl mb-4 shadow-lg">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to CampusLink!
          </h1>
          <p className="text-lg text-gray-600">
            {step === 1 
              ? "Let's set up your profile"
              : isAspirant 
                ? "Verify your phone number to get started"
                : "Upload your ID card to verify your identity"
            }
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold ${
                step >= 1 ? "bg-black text-white" : "bg-gray-200 text-gray-600"
              }`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium text-gray-700">Role</span>
            </div>
            <div className="w-16 h-1 bg-gray-200">
              <div className={`h-full bg-black transition-all ${step >= 2 ? "w-full" : "w-0"}`} />
            </div>
            <div className="flex items-center">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold ${
                step >= 2 ? "bg-black text-white" : "bg-gray-200 text-gray-600"
              }`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium text-gray-700">Verification</span>
            </div>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {step === 1 ? (
            // Step 1: Role Selection
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">Choose Your Role</h2>
                <p className="text-gray-600">
                  Select the role that best describes you. This helps us personalize your experience.
                </p>
              </div>

              <div className="space-y-4 pt-4">
                {/* Student Option */}
                <button
                  type="button"
                  onClick={() => setSelectedRole("student")}
                  className={`w-full p-6 border-2 rounded-xl transition-all text-left ${
                    selectedRole === "student"
                      ? "border-black bg-black text-white"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                      selectedRole === "student" ? "bg-white text-black" : "bg-gray-100"
                    }`}>
                      <GraduationCap className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1">Student</h3>
                      <p className={`text-sm ${selectedRole === "student" ? "text-gray-200" : "text-gray-600"}`}>
                        I&apos;m currently enrolled in a college or university
                      </p>
                    </div>
                    {selectedRole === "student" && (
                      <CheckCircle2 className="h-6 w-6 shrink-0" />
                    )}
                  </div>
                </button>

                {/* Alumni Option */}
                <button
                  type="button"
                  onClick={() => setSelectedRole("alumni")}
                  className={`w-full p-6 border-2 rounded-xl transition-all text-left ${
                    selectedRole === "alumni"
                      ? "border-black bg-black text-white"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                      selectedRole === "alumni" ? "bg-white text-black" : "bg-gray-100"
                    }`}>
                      <Users className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1">Alumni</h3>
                      <p className={`text-sm ${selectedRole === "alumni" ? "text-gray-200" : "text-gray-600"}`}>
                        I've graduated and want to give back to the community
                      </p>
                    </div>
                    {selectedRole === "alumni" && (
                      <CheckCircle2 className="h-6 w-6 shrink-0" />
                    )}
                  </div>
                </button>

                {/* Aspirant Option */}
                <button
                  type="button"
                  onClick={() => setSelectedRole("aspirant")}
                  className={`w-full p-6 border-2 rounded-xl transition-all text-left ${
                    selectedRole === "aspirant"
                      ? "border-black bg-black text-white"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                      selectedRole === "aspirant" ? "bg-white text-black" : "bg-gray-100"
                    }`}>
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1">Aspirant</h3>
                      <p className={`text-sm ${selectedRole === "aspirant" ? "text-gray-200" : "text-gray-600"}`}>
                        I&apos;m preparing for college entrance exams
                      </p>
                    </div>
                    {selectedRole === "aspirant" && (
                      <CheckCircle2 className="h-6 w-6 shrink-0" />
                    )}
                  </div>
                </button>
              </div>

              <Button
                type="button"
                onClick={handleRoleSelection}
                disabled={loading}
                className="w-full h-12 text-base bg-black hover:bg-gray-800"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          ) : isAspirant ? (
            // Phone OTP Verification for Aspirants
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-base font-semibold">
                  Phone Number
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 1234567890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={otpSent || loading}
                    className="flex-1 h-12 text-base"
                    required
                  />
                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpSent || loading}
                    className="h-12 px-6"
                  >
                    {loading ? "Sending..." : otpSent ? "Sent" : "Send OTP"}
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  Enter your phone number to receive a verification code
                </p>
              </div>

              {otpSent && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-4">
                  <Label htmlFor="otp" className="text-base font-semibold">
                    Enter OTP
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    disabled={loading}
                    className="h-12 tracking-widest text-center text-2xl font-bold"
                    maxLength={6}
                    required
                  />
                  <p className="text-sm text-gray-600">
                    Enter the 6-digit code sent to your phone
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={!otpSent || loading}
                className="w-full h-12 text-base bg-black hover:bg-gray-800"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Verify & Continue
                  </>
                )}
              </Button>
            </form>
          ) : (
            // ID Card Upload for Students & Alumni
            <form onSubmit={handleIdCardSubmit} className="space-y-6">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      disabled={loading}
                      className="h-11"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber" className="text-sm font-medium">
                      Phone Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="+91 1234567890"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      disabled={loading}
                      className="h-11"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Academic Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Academic Information
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="collegeName" className="text-sm font-medium">
                    College/University Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="collegeName"
                    type="text"
                    placeholder="Indian Institute of Technology, Delhi"
                    value={formData.collegeName}
                    onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                    disabled={loading}
                    className="h-11"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="collegeEmail" className="text-sm font-medium">
                    College Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="collegeEmail"
                    type="email"
                    placeholder="john.doe@college.edu"
                    value={formData.collegeEmail}
                    onChange={(e) => setFormData({ ...formData, collegeEmail: e.target.value })}
                    disabled={loading}
                    className="h-11"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Use your official college email address for verification
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-sm font-medium">
                      Department <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="department"
                      type="text"
                      placeholder="Computer Science & Engineering"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      disabled={loading}
                      className="h-11"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="course" className="text-sm font-medium">
                      Course
                    </Label>
                    <Input
                      id="course"
                      type="text"
                      placeholder="B.Tech, M.Tech, MBA, etc."
                      value={formData.course}
                      onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                      disabled={loading}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="enrollmentNumber" className="text-sm font-medium">
                      Enrollment/Roll Number
                    </Label>
                    <Input
                      id="enrollmentNumber"
                      type="text"
                      placeholder="2021CS001"
                      value={formData.enrollmentNumber}
                      onChange={(e) => setFormData({ ...formData, enrollmentNumber: e.target.value })}
                      disabled={loading}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="graduationYear" className="text-sm font-medium">
                      {user?.role === "alumni" ? "Graduation Year" : "Expected Graduation Year"}
                    </Label>
                    <Input
                      id="graduationYear"
                      type="number"
                      placeholder="2025"
                      value={formData.graduationYear}
                      onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                      disabled={loading}
                      className="h-11"
                      min="1950"
                      max="2050"
                    />
                  </div>
                </div>
              </div>

              {/* ID Card Upload Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  ID Card Verification
                </h3>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Upload College ID Card <span className="text-red-500">*</span>
                  </Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-gray-400 transition-colors">
                    {idCardPreview ? (
                      <div className="space-y-4">
                        <img
                          src={idCardPreview}
                          alt="ID Card Preview"
                          className="max-h-64 mx-auto rounded-lg shadow-md"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIdCardFile(null);
                            setIdCardPreview("");
                          }}
                          className="mt-4"
                        >
                          Remove & Upload Different
                        </Button>
                      </div>
                    ) : (
                      <label htmlFor="idCard" className="cursor-pointer">
                        <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                        <p className="text-base font-medium text-gray-700 mb-1">
                          Click to upload your College ID Card
                        </p>
                        <p className="text-sm text-gray-500">
                          PNG, JPG or PDF (max. 5MB)
                        </p>
                        <input
                          id="idCard"
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleFileChange}
                          className="hidden"
                          required
                        />
                      </label>
                    )}
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-900">
                      Please ensure your ID card is clearly visible with your photo, name, enrollment number, and college details.
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Notes Section */}
              <div className="space-y-2">
                <Label htmlFor="additionalInfo" className="text-sm font-medium">
                  Additional Notes (Optional)
                </Label>
                <Textarea
                  id="additionalInfo"
                  placeholder="Any additional information you'd like to provide for verification..."
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  disabled={loading}
                  className="min-h-20 text-sm"
                />
              </div>

              <Button
                type="submit"
                disabled={!idCardFile || loading}
                className="w-full h-12 text-base bg-black hover:bg-gray-800"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Submit for Verification
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Info Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Why do we need this?</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <span>Ensures genuine students and alumni community</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <span>Protects against fake profiles and scams</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <span>Builds trust within the mentorship network</span>
              </li>
            </ul>
          </div>
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          Your information is secure and will only be used for verification purposes.
        </p>
      </div>
    </div>
  );
}
