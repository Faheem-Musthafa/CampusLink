"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ActionButton } from "@/components/ui/action-button";
import { RoleBasedGradient, RoleBadge } from "@/components/ui/role-based-gradient";
import { useToast } from "@/hooks/use-toast";
import { handleError } from "@/lib/utils/error-handling";
import { 
  GraduationCap, 
  Upload, 
  Phone, 
  CheckCircle2, 
  AlertCircle,
  Briefcase,
  Target,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Search,
  ShieldCheck,
  Loader2
} from "lucide-react";
import { submitVerificationRequest } from "@/lib/firebase/verification";
import { updateUserProfile } from "@/lib/firebase/profiles";
import { validateAdmissionNumber, claimAdmissionNumber } from "@/lib/firebase/alumni-verification";
import { sendOTPEmail, verifyEmailOTP } from "@/lib/firebase/email-otp";
import { UserRole, ValidationResult } from "@/types";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

type Role = "student" | "alumni" | "aspirant";

interface FormData {
  role: Role | "";
  fullName: string;
  email: string;
  location: string;
  college: string;
  degree: string;
  branch: string;
  passingYear: string;
  company: string;
  designation: string;
  entranceExam: string;
  targetCollege: string;
  linkedin: string;
  skills: string[];
  bio: string;
  yearsOfExperience: number;
  interests: string[];
  lookingFor: string[];
  phoneNumber: string;
  admissionNumber: string; // NEW: For student/alumni verification
  idCardFront?: File;
  idCardBack?: File;
  additionalDocuments?: File[];
}

const initialFormData: FormData = {
  role: "",
  fullName: "",
  email: "",
  location: "",
  college: "",
  degree: "",
  branch: "",
  passingYear: "",
  company: "",
  designation: "",
  entranceExam: "",
  targetCollege: "",
  linkedin: "",
  skills: [],
  bio: "",
  yearsOfExperience: 0,
  interests: [],
  lookingFor: [],
  phoneNumber: "",
  admissionNumber: "", // NEW
};

export default function OnboardingPage() {
  const { user, firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [skillInput, setSkillInput] = useState("");
  const [idCardPreview, setIdCardPreview] = useState<string>("");
  
  // NEW: Admission number verification state
  const [admissionValidation, setAdmissionValidation] = useState<ValidationResult | null>(null);
  const [validatingAdmission, setValidatingAdmission] = useState(false);
  const [admissionVerified, setAdmissionVerified] = useState(false);

  // NEW: Email OTP verification state for aspirants
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState<Date | null>(null);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    // Auto-fill user data and show welcome message
    if (user) {
      setFormData((prev) => ({
        ...prev,
        role: "", // Explicitly ensure no default role
        fullName: user.displayName || "",
        email: user.email || "",
      }));

      // Show welcome message only once
      const hasShownWelcome = sessionStorage.getItem('onboarding_welcome');
      if (!hasShownWelcome) {
        setTimeout(() => {
          toast({
            title: `Welcome, ${user.displayName || 'there'}! 👋`,
            description: "Let's set up your profile in just a few steps",
          });
          sessionStorage.setItem('onboarding_welcome', 'true');
        }, 500);
      }
    }

    // If user is already approved, redirect to dashboard
    if (user && user.verificationStatus === "approved") {
      toast({
        title: "Already Verified! ✅",
        description: "Taking you to your dashboard...",
      });
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
      return;
    }
  }, [user, authLoading, router, toast]);

  // Calculate progress
  const totalSteps = formData.role === "student" ? 4 : formData.role === "alumni" ? 5 : formData.role === "aspirant" ? 5 : 1;
  const progress = (currentStep / totalSteps) * 100;

  // Update form field
  const updateField = (field: keyof FormData, value: FormData[keyof FormData]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // Auto-save progress (debounced)
  useEffect(() => {
    if (currentStep === 1 || !formData.role) return;
    
    const timer = setTimeout(async () => {
      try {
        setSaveStatus("saving");
        // Add your auto-save API call here
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("idle");
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [formData, currentStep]);

  // Validate current step with friendly messages
  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.role) {
        newErrors.role = "👆 Pick your role to continue!";
        toast({
          title: "Just one more thing! 😊",
          description: "Please select your role to get started",
        });
      }
    }

    if (currentStep === 2) {
      if (!formData.fullName.trim()) {
        newErrors.fullName = "We'd love to know your name!";
      }
      
      if (formData.role === "student" || formData.role === "alumni") {
        if (!formData.college.trim()) {
          newErrors.college = "Which college are you from?";
        }
        if (!formData.passingYear.trim()) {
          newErrors.passingYear = "What year did/will you graduate?";
        }
      }
      
      if (formData.role === "aspirant") {
        if (!formData.entranceExam.trim()) {
          newErrors.entranceExam = "Which exam are you preparing for?";
        }
      }

      if (Object.keys(newErrors).length > 0) {
        toast({
          title: "Almost there! 📝",
          description: "Please fill in the required fields",
        });
      }
    }

    if (currentStep === 3 && formData.role === "alumni") {
      const missingCompany = !formData.company.trim();
      const missingDesignation = !formData.designation.trim();
      const missingExperience = !formData.yearsOfExperience || formData.yearsOfExperience <= 0;

      if (missingCompany || missingDesignation || missingExperience) {
        if (missingCompany) newErrors.company = "Where do you work?";
        if (missingDesignation) newErrors.designation = "What's your job title?";
        if (missingExperience) newErrors.yearsOfExperience = "How many years have you worked?";

        toast({
          title: "Tell us about your work! 💼",
          description: "Company, title, and experience help students understand career paths",
        });
      }
    }

    // Verification step validation
    if ((currentStep === 4 && formData.role === "student") || (currentStep === 5 && (formData.role === "alumni" || formData.role === "aspirant"))) {
      if (formData.role === "student" || formData.role === "alumni") {
        if (!formData.idCardFront) {
          newErrors.idCardFront = "Please upload your ID card";
          toast({
            title: "ID Card Required 📸",
            description: "We need your ID card to verify your profile",
          });
        }
      }
      
      if (formData.role === "aspirant") {
        // Check email verification instead of phone
        if (!emailVerified) {
          newErrors.email = "Please verify your email";
          toast({
            title: "Email Verification Required 📧",
            description: "Please verify your email to continue",
            variant: "destructive",
          });
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigate steps with encouraging messages
  const nextStep = () => {
    if (validateStep()) {
      const nextStepNum = Math.min(currentStep + 1, totalSteps);
      setCurrentStep(nextStepNum);
      
      // Encouraging messages based on progress
      const progress = (nextStepNum / totalSteps) * 100;
      
      if (progress === 100) {
        toast({
          title: "Final Step! 🎯",
          description: "You're almost done! Just verification left.",
        });
      } else if (progress >= 75) {
        toast({
          title: "Almost There! 🌟",
          description: "Great progress! Keep going.",
        });
      } else if (progress >= 50) {
        toast({
          title: "Halfway There! 🚀",
          description: "You're doing great!",
        });
      } else if (nextStepNum === 2) {
        toast({
          title: "Nice Choice! ✨",
          description: "Now let's get to know you better",
        });
      }
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Handle file upload with friendly feedback
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large 📦",
          description: "Please choose an image under 5MB. Try compressing it!",
          variant: "destructive",
        });
        return;
      }

      // Check file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type 🤔",
          description: "Please upload a JPG, PNG, or PDF file",
          variant: "destructive",
        });
        return;
      }

      // Success feedback
      toast({
        title: "Image Uploaded! ✅",
        description: `${file.name} loaded successfully`,
      });

      updateField("idCardFront", file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdCardPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validateStep()) return;

    // Use firebaseUser as fallback if user data isn't loaded yet
    const currentUser = user || firebaseUser;
    const userId = user?.uid || firebaseUser?.uid;
    
    // Check if user is available
    if (!currentUser || !userId) {
      toast({
        title: "Oops! 😅",
        description: "Please wait a moment while we load your information...",
        variant: "destructive",
      });
      return;
    }

    // Validate required data based on role
    if (formData.role === "student" || formData.role === "alumni") {
      if (!admissionVerified) {
        toast({
          title: "Admission Not Verified",
          description: "Please verify your admission number to continue",
          variant: "destructive",
        });
        return;
      }
      if (!formData.idCardFront) {
        toast({
          title: "Missing ID Card",
          description: "Please upload your ID card to continue",
          variant: "destructive",
        });
        return;
      }
    }

    if (formData.role === "aspirant") {
      if (!emailVerified) {
        toast({
          title: "Email Not Verified",
          description: "Please verify your email to continue",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    
    try {
      // Show friendly loading message
      toast({
        title: "Processing... 🚀",
        description: "Submitting your information securely...",
      });

      // Claim admission number if verified (for students/alumni)
      if ((formData.role === "student" || formData.role === "alumni") && admissionVerified && formData.admissionNumber) {
        await claimAdmissionNumber(formData.admissionNumber.toUpperCase(), userId);
      }

      // Submit verification request with validated data
      // For aspirants with email verification, they are auto-approved
      const isAspirantAutoApproved = formData.role === "aspirant" && emailVerified;
      
      await submitVerificationRequest({
        userId: userId,
        userName: currentUser.displayName || formData.fullName || "User",
        userEmail: currentUser.email || formData.email || "",
        userRole: formData.role as UserRole,
        verificationType: formData.role === "aspirant" ? "email_otp" : "id_card",
        file: formData.idCardFront,
        phoneNumber: formData.phoneNumber || "",
        // Include direct fields for admin display
        admissionNumber: formData.admissionNumber?.toUpperCase() || "",
        college: formData.college || "",
        department: formData.branch || "",
        graduationYear: formData.passingYear || "",
        additionalInfo: JSON.stringify(formData),
      });

      // Update user profile with onboarding data
      const profileData: any = {
        verified: false, // Will be set to true when admin approves
        bio: formData.bio || "",
        skills: formData.skills || [],
        location: formData.location || "",
        linkedIn: formData.linkedin || "",
      };

      // Add role-specific data
      if (formData.role === "student" || formData.role === "alumni") {
        profileData.college = formData.college || "";
        profileData.course = formData.degree || "";
        profileData.specialization = formData.branch || "";
        
        if (formData.passingYear) {
          const year = parseInt(formData.passingYear);
          if (!isNaN(year)) {
            profileData.graduationYear = year;
          }
        }
      }

      // Add alumni-specific professional data
      if (formData.role === "alumni") {
        profileData.currentCompany = formData.company || "";
        profileData.jobTitle = formData.designation || "";
        profileData.experience = formData.yearsOfExperience || 0;
      }

      // Save profile data to Firestore
      await updateUserProfile(userId, profileData);

      // Update user document with onboarding completion (include admission verification)
      if (db) {
        const userRef = doc(db, "users", userId);
        const userUpdate: Record<string, unknown> = {
          onboardingComplete: true,
          onboardingCompletedAt: serverTimestamp(),
          phoneNumber: formData.phoneNumber || "",
          updatedAt: serverTimestamp(),
        };
        
        // Add admission verification data for students/alumni
        // Two-stage verification: admission verified = limited access, admin approval = full access
        if ((formData.role === "student" || formData.role === "alumni") && admissionVerified) {
          userUpdate.admissionNumber = formData.admissionNumber.toUpperCase();
          userUpdate.admissionVerified = true;
          userUpdate.admissionVerifiedAt = serverTimestamp();
          // Stage 1: Pending admin review - limited access (view-only)
          userUpdate.verificationStatus = "pending";
          userUpdate.verificationSubmittedAt = serverTimestamp();
          // Limited access flags - can only view content, no posting/messaging
          userUpdate.canPostJobs = false;
          userUpdate.canPostFeed = false;
          userUpdate.canMessage = false;
          userUpdate.canAcceptMentorship = false;
        }

        // Auto-approve aspirants who verified their email
        if (formData.role === "aspirant" && emailVerified) {
          userUpdate.emailVerified = true;
          userUpdate.emailVerifiedAt = serverTimestamp();
          userUpdate.verificationStatus = "approved"; // Auto-approve
          userUpdate.verified = true;
          // Full access for verified aspirants
          userUpdate.canPostJobs = false; // Aspirants typically don't post jobs
          userUpdate.canPostFeed = true;
          userUpdate.canMessage = true;
          userUpdate.canAcceptMentorship = false; // Can request, not accept
        }
        
        await setDoc(userRef, userUpdate, { merge: true });
      }

      // Success message based on verification stage
      let successMessage: string;
      if (formData.role === "aspirant" && emailVerified) {
        successMessage = "Welcome to CampusLink! Your profile is ready.";
      } else if ((formData.role === "student" || formData.role === "alumni") && admissionVerified) {
        successMessage = "Your admission number is verified! You have limited access while we review your uploaded documents for full access.";
      } else {
        successMessage = "Your profile is being reviewed. You'll hear from us soon!";
      }
      
      toast({
        title: "Success! 🎉",
        description: successMessage,
      });

      // Small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirect to dashboard
      window.location.href = "/dashboard";
    } catch (error: unknown) {
      handleError(error, "Submission failed");
      
      const errorMessage = error instanceof Error ? error.message : "Something went wrong";
      
      toast({
        title: "Submission Failed 😔",
        description: errorMessage.includes("Firebase") 
          ? "We're having trouble connecting. Please try again in a moment."
          : errorMessage,
        variant: "destructive",
      });
      
      setIsSubmitting(false);
    }
  };

  // Skills management with friendly feedback
  const addSkill = () => {
    const trimmed = skillInput.trim();
    
    if (!trimmed) return;
    
    if (formData.skills.includes(trimmed)) {
      toast({
        title: "Already Added! 🎯",
        description: `"${trimmed}" is already in your skills`,
      });
      setSkillInput("");
      return;
    }
    
    if (formData.skills.length >= 20) {
      toast({
        title: "That's Impressive! 🌟",
        description: "You can add up to 20 skills. Consider removing some first.",
        variant: "destructive",
      });
      return;
    }
    
    updateField("skills", [...formData.skills, trimmed]);
    setSkillInput("");
    
    // Encouraging message
    if (formData.skills.length === 0) {
      toast({
        title: "Great Start! 🚀",
        description: "Keep adding skills that make you unique",
      });
    }
  };

  const removeSkill = (skillToRemove: string) => {
    updateField("skills", formData.skills.filter(skill => skill !== skillToRemove));
  };

  const handleSkillKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill();
    }
  };

  // NEW: Validate admission number
  const handleValidateAdmission = async () => {
    if (!formData.admissionNumber.trim()) {
      toast({
        title: "Enter Admission Number",
        description: "Please enter your admission number to verify",
        variant: "destructive",
      });
      return;
    }

    setValidatingAdmission(true);
    setAdmissionValidation(null);
    setAdmissionVerified(false);

    try {
      const result = await validateAdmissionNumber(
        formData.admissionNumber.trim().toUpperCase(),
        formData.fullName,
        formData.passingYear ? parseInt(formData.passingYear) : undefined
      );

      setAdmissionValidation(result);

      if (result.isValid) {
        setAdmissionVerified(true);
        toast({
          title: "Verified! ✅",
          description: result.message || "Your admission number has been verified successfully",
        });
        
        // Auto-fill name if suggested
        if (result.suggestedName && result.suggestedName !== formData.fullName) {
          updateField("fullName", result.suggestedName);
        }
        
        // Auto-correct graduation year if needed
        if (result.correctedYear) {
          updateField("passingYear", String(result.correctedYear));
        }
      } else {
        toast({
          title: "Verification Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Admission validation error:", error);
      toast({
        title: "Verification Error",
        description: "Failed to verify admission number. Please try again.",
        variant: "destructive",
      });
    } finally {
      setValidatingAdmission(false);
    }
  };

  // NEW: Send email OTP for aspirant verification
  const handleSendOTP = async () => {
    const email = formData.email || user?.email;
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setOtpSending(true);
    try {
      const result = await sendOTPEmail(
        email,
        user?.uid || "",
        formData.fullName || user?.displayName || "User"
      );

      if (result.success) {
        setOtpSent(true);
        setOtpExpiresAt(result.expiresAt || null);
        setOtpCountdown(60); // 60 second cooldown before resend
        toast({
          title: "OTP Sent! 📧",
          description: `Verification code sent to ${email}`,
        });
      } else {
        toast({
          title: "Failed to Send OTP",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast({
        title: "Error",
        description: "Failed to send verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setOtpSending(false);
    }
  };

  // NEW: Verify email OTP
  const handleVerifyOTP = async () => {
    const email = formData.email || user?.email;
    if (!email || !otpValue.trim()) {
      toast({
        title: "Enter OTP",
        description: "Please enter the verification code",
        variant: "destructive",
      });
      return;
    }

    setOtpVerifying(true);
    try {
      const result = await verifyEmailOTP(email, otpValue.trim());

      if (result.success) {
        setEmailVerified(true);
        toast({
          title: "Email Verified! ✅",
          description: "Your email has been verified successfully",
        });
      } else {
        toast({
          title: "Verification Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast({
        title: "Error",
        description: "Failed to verify code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setOtpVerifying(false);
    }
  };

  // OTP countdown effect
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  // Render role selection with enhanced UI
  const renderRoleSelection = () => (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold text-foreground">
          Choose Your Role
        </h2>
        <p className="text-muted-foreground">
          Select what best describes you to personalize your experience
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {[
          {
            role: "student" as Role,
            icon: GraduationCap,
            title: "Student",
            description: "Currently pursuing your degree",
            features: ["Connect with alumni", "Find mentors", "Explore opportunities"]
          },
          {
            role: "alumni" as Role,
            icon: Briefcase,
            title: "Alumni",
            description: "Graduated and working professional",
            features: ["Mentor students", "Share experiences", "Give back to community"]
          },
          {
            role: "aspirant" as Role,
            icon: Target,
            title: "Aspirant",
            description: "Preparing for entrance exams",
            features: ["Get guidance", "Study resources", "Preparation tips"]
          },
        ].map((option) => {
          const isSelected = formData.role === option.role;
          return (
            <div
              key={option.role}
              className={`cursor-pointer transition-all ${
                isSelected ? "scale-[1.02]" : "hover:scale-[1.01]"
              }`}
              onClick={() => updateField("role", option.role)}
            >
              <Card
                className={`h-full transition-all ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/20"
                    : "hover:border-muted-foreground/30 hover:shadow-md"
                }`}
              >
                <CardContent className="p-5 space-y-3 relative">
                  <div className={`w-12 h-12 mx-auto rounded-lg flex items-center justify-center ${
                    isSelected ? "bg-primary/10" : "bg-muted"
                  }`}>
                    <option.icon className={`h-6 w-6 ${
                      isSelected ? "text-primary" : "text-muted-foreground"
                    }`} />
                  </div>
                  
                  <div className="text-center space-y-1">
                    <h3 className="font-semibold text-lg text-foreground">
                      {option.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>

                  <ul className="space-y-1.5">
                    {option.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary" : ""}`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {errors.role && (
        <div className="flex items-center justify-center gap-2 text-destructive text-sm bg-red-50 dark:bg-red-900/20 p-4 rounded-lg max-w-md mx-auto border border-red-200">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">{errors.role}</span>
        </div>
      )}
    </div>
  );

  // Render basic info - Minimal
  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">
          Basic Information
        </h2>
        <p className="text-sm text-muted-foreground">
          Tell us about yourself
        </p>
      </div>

      <Card className="max-w-3xl mx-auto">
        <CardContent className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                placeholder="John Doe"
                className={errors.fullName ? "border-red-500" : ""}
              />
              {errors.fullName && (
                <p className="text-destructive text-xs">{errors.fullName}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="john@example.com"
                disabled
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => updateField("location", e.target.value)}
                placeholder="New York, USA"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="linkedin">LinkedIn Profile</Label>
              <Input
                id="linkedin"
                value={formData.linkedin}
                onChange={(e) => updateField("linkedin", e.target.value)}
                placeholder="https://linkedin.com/in/johndoe"
              />
            </div>
          </div>

          {(formData.role === "student" || formData.role === "alumni") && (
            <div className="pt-4 border-t space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Academic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="college">College/University *</Label>
                  <Input
                    id="college"
                    value={formData.college}
                    onChange={(e) => updateField("college", e.target.value)}
                    placeholder="MIT, Stanford, IIT..."
                    className={errors.college ? "border-red-500" : ""}
                  />
                  {errors.college && (
                    <p className="text-destructive text-xs">{errors.college}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="degree">Degree</Label>
                  <Select
                    value={formData.degree}
                    onValueChange={(value) => updateField("degree", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select degree" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bachelor's">Bachelor&apos;s</SelectItem>
                      <SelectItem value="Master's">Master&apos;s</SelectItem>
                      <SelectItem value="PhD">PhD</SelectItem>
                      <SelectItem value="Diploma">Diploma</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="branch">Branch/Major</Label>
                  <Input
                    id="branch"
                    value={formData.branch}
                    onChange={(e) => updateField("branch", e.target.value)}
                    placeholder="Computer Science, MBA..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="passingYear">
                    {formData.role === "student" ? "Expected Graduation" : "Passing Year"} *
                  </Label>
                  <Input
                    id="passingYear"
                    value={formData.passingYear}
                    onChange={(e) => updateField("passingYear", e.target.value)}
                    placeholder="2025"
                    className={errors.passingYear ? "border-red-500" : ""}
                  />
                  {errors.passingYear && (
                    <p className="text-destructive text-xs">{errors.passingYear}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {formData.role === "aspirant" && (
            <div className="pt-4 border-t space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Aspirant Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="entranceExam">Target Entrance Exam *</Label>
                  <Input
                    id="entranceExam"
                    value={formData.entranceExam}
                    onChange={(e) => updateField("entranceExam", e.target.value)}
                    placeholder="JEE, NEET, CAT..."
                    className={errors.entranceExam ? "border-red-500" : ""}
                  />
                  {errors.entranceExam && (
                    <p className="text-destructive text-xs">{errors.entranceExam}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="targetCollege">Target College</Label>
                  <Input
                    id="targetCollege"
                    value={formData.targetCollege}
                    onChange={(e) => updateField("targetCollege", e.target.value)}
                    placeholder="IIT Bombay, AIIMS..."
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Render professional info - Minimal
  const renderProfessionalInfo = () => (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">
          Professional Information
        </h2>
        <p className="text-sm text-muted-foreground">
          Share your work experience
        </p>
      </div>

      <Card className="max-w-3xl mx-auto">
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="company">Current Company *</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => updateField("company", e.target.value)}
                placeholder="Google, Microsoft..."
                className={errors.company ? "border-red-500" : ""}
              />
              {errors.company && (
                <p className="text-destructive text-xs">{errors.company}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="designation">Job Title *</Label>
              <Input
                id="designation"
                value={formData.designation}
                onChange={(e) => updateField("designation", e.target.value)}
                placeholder="Software Engineer..."
                className={errors.designation ? "border-red-500" : ""}
              />
              {errors.designation && (
                <p className="text-destructive text-xs">{errors.designation}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="yearsOfExperience">Years of Experience *</Label>
              <Input
                id="yearsOfExperience"
                type="number"
                min="0"
                value={formData.yearsOfExperience || ""}
                onChange={(e) => updateField("yearsOfExperience", parseInt(e.target.value) || 0)}
                placeholder="3"
                className={errors.yearsOfExperience ? "border-red-500" : ""}
              />
              {errors.yearsOfExperience && (
                <p className="text-destructive text-xs">{errors.yearsOfExperience}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render additional info - Minimal
  const renderAdditionalInfo = () => (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">
          Skills & Bio
        </h2>
        <p className="text-sm text-muted-foreground">
          Tell us about your expertise
        </p>
      </div>

      <Card className="max-w-3xl mx-auto">
        <CardContent className="p-6 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="skills">
              Skills & Expertise
            </Label>
            <div className="flex gap-2">
              <Input
                id="skills"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyPress}
                placeholder="Type a skill and press Enter"
              />
              <ActionButton type="button" onClick={addSkill} variant="outline" size="sm">
                Add
              </ActionButton>
            </div>
            {formData.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.skills.map((skill, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => removeSkill(skill)}
                  >
                    {skill} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">
              Brief Bio
            </Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => updateField("bio", e.target.value)}
              placeholder="Tell us about yourself"
              rows={4}
              className="resize-none"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render verification step - Enhanced with admission number
  const renderVerification = () => (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">
          Verification
        </h2>
        <p className="text-sm text-muted-foreground">
          Help us verify your identity
        </p>
      </div>

      <Card className="max-w-3xl mx-auto">
        <CardContent className="p-6 space-y-5">
          {(formData.role === "student" || formData.role === "alumni") && (
            <>
              {/* Step 1: Admission Number Verification */}
              <div className="space-y-4 pb-5 border-b">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    admissionVerified 
                      ? "bg-green-100 text-green-700" 
                      : "bg-blue-100 text-blue-700"
                  }`}>
                    {admissionVerified ? <CheckCircle2 className="w-5 h-5" /> : "1"}
                  </div>
                  <div>
                    <Label className="text-base font-semibold">
                      Admission Number Verification *
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enter your admission/enrollment number to verify your identity
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    id="admissionNumber"
                    value={formData.admissionNumber}
                    onChange={(e) => {
                      updateField("admissionNumber", e.target.value.toUpperCase());
                      setAdmissionValidation(null);
                      setAdmissionVerified(false);
                    }}
                    placeholder="e.g., 2021CSE001"
                    className={`flex-1 uppercase ${
                      admissionValidation?.isValid === false ? "border-red-500" : 
                      admissionVerified ? "border-green-500" : ""
                    }`}
                    disabled={admissionVerified}
                  />
                  <ActionButton
                    type="button"
                    onClick={handleValidateAdmission}
                    disabled={validatingAdmission || admissionVerified || !formData.admissionNumber.trim()}
                    variant={admissionVerified ? "outline" : "primary"}
                    size="sm"
                  >
                    {validatingAdmission ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        Verifying...
                      </>
                    ) : admissionVerified ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Verified
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-1" />
                        Verify
                      </>
                    )}
                  </ActionButton>
                </div>

                {/* Validation feedback */}
                {admissionValidation && (
                  <div className={`p-3 rounded-lg text-sm ${
                    admissionValidation.isValid 
                      ? "bg-green-50 text-green-800 border border-green-200" 
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}>
                    <div className="flex items-start gap-2">
                      {admissionValidation.isValid ? (
                        <ShieldCheck className="w-5 h-5 mt-0.5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 mt-0.5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium">{admissionValidation.message}</p>
                        {admissionValidation.alumniData && (
                          <p className="text-xs mt-1 opacity-75">
                            Name: {admissionValidation.alumniData.fullName} | 
                            Year: {admissionValidation.alumniData.graduationYear} | 
                            Course: {admissionValidation.alumniData.course}
                          </p>
                        )}
                        {admissionValidation.status === "name_mismatch" && admissionValidation.suggestedName && (
                          <p className="text-xs mt-1">
                            Expected name: <strong>{admissionValidation.suggestedName}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {admissionVerified && (
                  <button
                    type="button"
                    onClick={() => {
                      setAdmissionVerified(false);
                      setAdmissionValidation(null);
                    }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Change admission number
                  </button>
                )}

                {errors.admissionNumber && (
                  <p className="text-destructive text-xs">{errors.admissionNumber}</p>
                )}
              </div>

              {/* Step 2: ID Card Upload */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    idCardPreview 
                      ? "bg-green-100 text-green-700" 
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {idCardPreview ? <CheckCircle2 className="w-5 h-5" /> : "2"}
                  </div>
                  <div>
                    <Label className="text-base font-semibold">
                      Upload ID Card *
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Upload your student/alumni ID card for manual verification
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                
                {idCardPreview ? (
                  <div className="relative group">
                    <img
                      src={idCardPreview}
                      alt="ID Card Preview"
                      className="w-full max-h-64 object-contain rounded-lg border"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <ActionButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          updateField("idCardFront", undefined);
                          setIdCardPreview("");
                        }}
                      >
                        Change Image
                      </ActionButton>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="idCardFront"
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2 p-6">
                      <p className="text-sm text-muted-foreground">
                        Click to upload (PNG, JPG or PDF, max 5MB)
                      </p>
                    </div>
                    <input
                      id="idCardFront"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
                
                {errors.idCardFront && (
                  <p className="text-destructive text-xs">{errors.idCardFront}</p>
                )}
              </div>
              </div>
            </>
          )}

          {formData.role === "aspirant" && (
            <div className="space-y-6">
              {/* Email Verification Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                    emailVerified 
                      ? "bg-green-100 text-green-700" 
                      : "bg-primary/10 text-primary"
                  }`}>
                    {emailVerified ? <CheckCircle2 className="h-4 w-4" /> : "1"}
                  </div>
                  <Label className="text-base font-medium">
                    Email Verification *
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Verify your email to continue with the registration
                </p>

                {/* Email Display */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{formData.email || user?.email || "No email"}</p>
                </div>

                {emailVerified ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">Email Verified</p>
                      <p className="text-xs text-green-600">Your email has been verified successfully</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {!otpSent ? (
                      <ActionButton
                        onClick={handleSendOTP}
                        loading={otpSending}
                        loadingText="Sending..."
                        className="w-full"
                      >
                        Send Verification Code
                      </ActionButton>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="otp">Enter 6-digit OTP</Label>
                          <div className="flex gap-2">
                            <Input
                              id="otp"
                              type="text"
                              value={otpValue}
                              onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="000000"
                              maxLength={6}
                              className="text-center text-lg font-mono tracking-widest"
                            />
                            <ActionButton
                              onClick={handleVerifyOTP}
                              loading={otpVerifying}
                              loadingText="Verifying..."
                              disabled={otpValue.length !== 6}
                            >
                              Verify
                            </ActionButton>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Check your email for the verification code
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Didn&apos;t receive the code?
                          </span>
                          {otpCountdown > 0 ? (
                            <span className="text-muted-foreground">
                              Resend in {otpCountdown}s
                            </span>
                          ) : (
                            <button
                              onClick={handleSendOTP}
                              disabled={otpSending}
                              className="text-primary hover:underline"
                            >
                              Resend OTP
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Phone Number Section */}
              <div className="space-y-3 pt-4 border-t">
                <div className="space-y-1.5">
                  <Label htmlFor="phoneNumber">
                    Phone Number (Optional)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    For additional contact purposes
                  </p>
                </div>

                <Input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => updateField("phoneNumber", e.target.value)}
                  placeholder="+91 9876543210"
                />
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1 p-4 border rounded-lg">
            <p className="font-medium">Privacy Notice</p>
            <p>All documents are encrypted and securely stored. Only authorized administrators can review verification requests.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render current step
  const renderStep = () => {
    if (currentStep === 1) return renderRoleSelection();
    if (currentStep === 2) return renderBasicInfo();
    if (currentStep === 3 && formData.role === "alumni") return renderProfessionalInfo();
    if (currentStep === 3 && formData.role !== "alumni") return renderAdditionalInfo();
    if (currentStep === 4 && formData.role === "alumni") return renderAdditionalInfo();
    if ((currentStep === 4 && formData.role === "student") || (currentStep === 5)) return renderVerification();
    return renderAdditionalInfo();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="xl" message="Loading your profile..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              Welcome to CampusLink
            </span>
          </div>
          <h1 className="text-3xl font-semibold text-foreground">
            Complete Your Profile
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Just a few steps to unlock your personalized experience
          </p>
        </div>

        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  Step {currentStep} of {totalSteps}
                </span>
                {formData.role && (
                  <RoleBadge role={formData.role} size="sm" />
                )}
              </div>
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  Saved
                </span>
              )}
              {saveStatus === "saving" && (
                <span className="text-sm text-muted-foreground">Saving...</span>
              )}
            </div>
            <Progress value={progress} className="h-2" />
            <div className="mt-1.5 text-xs text-muted-foreground text-center">
              {Math.round(progress)}% complete
            </div>
          </CardContent>
        </Card>

        {/* Form Content */}
        <div className="mb-5">{renderStep()}</div>

        {/* Error Message */}
        {errors.submit && (
          <Card className="mb-4 border-destructive/50 bg-destructive/5">
            <CardContent className="p-3">
              <p className="text-sm text-destructive">{errors.submit}</p>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <ActionButton
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1 || isSubmitting}
                icon={<ArrowLeft />}
                iconPosition="left"
              >
                Back
              </ActionButton>

              {currentStep < totalSteps ? (
                <ActionButton 
                  onClick={nextStep}
                  icon={<ArrowRight />}
                  iconPosition="right"
                >
                  Next
                </ActionButton>
              ) : (
                <ActionButton
                  onClick={handleSubmit}
                  loading={isSubmitting}
                  loadingText="Submitting..."
                  icon={<Sparkles />}
                >
                  Complete Setup
                </ActionButton>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Your information is secure and will only be used for verification purposes.
        </p>
      </div>
    </div>
  );
}
