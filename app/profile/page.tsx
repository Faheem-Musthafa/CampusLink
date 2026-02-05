"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { useVerificationGuard } from "@/hooks/use-verification-guard";
import { getUserProfile, updateUserProfile } from "@/lib/firebase/profiles";
import { getUserData } from "@/lib/firebase/auth";
import { handleError } from "@/lib/utils/error-handling";
import { useEffect, useState } from "react";
import { User, UserProfile } from "@/types";
import { 
  Camera, Upload as UploadIcon, Key, Edit2, MapPin, Briefcase, 
  GraduationCap, Mail, Phone, Calendar, Github, Linkedin, 
  Instagram, Globe, CheckCircle2, Award, User as UserIcon 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { uploadToImgBB } from "@/lib/upload/imgbb";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth } from "@/lib/firebase/config";

export default function ProfilePage() {
  const { user, loading: authLoading } = useVerificationGuard();
  const { toast } = useToast();
  const [userData, setUserData] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string>("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [formData, setFormData] = useState({
    college: "",
    graduationYear: "",
    course: "",
    specialization: "",
    currentCompany: "",
    jobTitle: "",
    experience: "",
    location: "",
    bio: "",
    skills: "",
    linkedIn: "",
    github: "",
    instagram: "",
    portfolio: "",
  });

  useEffect(() => {
    if (user) {
      Promise.all([getUserData(user.uid), getUserProfile(user.uid)]).then(([userDataResult, profileData]) => {
        setUserData(userDataResult);
        setProfile(profileData);
        
        const photoURL = userDataResult?.photoURL || profileData?.photoURL || "";
        setProfilePhotoPreview(photoURL);
        
        if (profileData) {
          setFormData({
            college: profileData.college || "",
            graduationYear: profileData.graduationYear?.toString() || "",
            course: profileData.course || "",
            specialization: profileData.specialization || "",
            currentCompany: profileData.currentCompany || "",
            jobTitle: profileData.jobTitle || "",
            experience: profileData.experience?.toString() || "",
            location: profileData.location || "",
            bio: profileData.bio || "",
            skills: profileData.skills?.join(", ") || "",
            linkedIn: profileData.linkedIn || "",
            github: profileData.github || "",
            instagram: profileData.instagram || "",
            portfolio: profileData.portfolio || "",
          });
        }
        setLoading(false);
      });
    }
  }, [user]);

  const calculateProfileStrength = () => {
    if (!profile || !userData) return { percentage: 0, completed: 0, total: 0, sections: [] };

    const role = userData.role || 'student';
    
    // Helper function to check if a value is filled
    const isFilled = (value: unknown): boolean => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim() !== '';
      if (typeof value === 'number') return value > 0;
      if (Array.isArray(value)) return value.length > 0;
      return Boolean(value);
    };

    type FieldItem = { value: unknown; label: string };
    type Section = { name: string; fields: FieldItem[]; weight: number };
    
    // Define sections based on user role
    const baseSections: Section[] = [
      { 
        name: "Basic Info", 
        fields: [
          { value: userData.displayName, label: "Name" },
          { value: userData.email, label: "Email" },
          { value: profile.location, label: "Location" },
          { value: userData.photoURL || profile.photoURL, label: "Photo" }
        ], 
        weight: 20 
      },
      { 
        name: "About", 
        fields: [
          { value: profile.bio, label: "Bio" }
        ], 
        weight: 15 
      },
      { 
        name: "Skills", 
        fields: [
          { value: profile.skills, label: "Skills" }
        ], 
        weight: 15 
      },
      { 
        name: "Social Links", 
        fields: [
          { value: profile.linkedIn, label: "LinkedIn" },
          { value: profile.github, label: "GitHub" },
          { value: profile.portfolio || profile.instagram, label: "Portfolio/Instagram" }
        ], 
        weight: 10 
      },
    ];

    // Add role-specific sections
    const sections: Section[] = [...baseSections];

    if (role === 'student' || role === 'alumni') {
      sections.push({ 
        name: "Academic", 
        fields: [
          { value: profile.college, label: "College" },
          { value: profile.course, label: "Degree/Course" },
          { value: profile.graduationYear, label: "Graduation Year" },
          { value: profile.specialization, label: "Specialization" }
        ], 
        weight: 25 
      });
    }

    if (role === 'alumni' || role === 'mentor') {
      sections.push({ 
        name: "Professional", 
        fields: [
          { value: profile.currentCompany, label: "Company" },
          { value: profile.jobTitle, label: "Job Title" },
          { value: profile.experience, label: "Experience" }
        ], 
        weight: 15 
      });
    }

    if (role === 'aspirant') {
      // Aspirants have lighter requirements - college info optional
      sections.push({ 
        name: "Interests", 
        fields: [
          { value: profile.interests, label: "Interests" },
          { value: profile.college, label: "Target College (Optional)" }
        ], 
        weight: 15 
      });
    }

    // Calculate weights dynamically to ensure they sum to 100
    const totalConfiguredWeight = sections.reduce((sum, s) => sum + s.weight, 0);
    const weightMultiplier = 100 / totalConfiguredWeight;

    let completedWeight = 0;
    let completedCount = 0;
    let totalCount = 0;

    const sectionDetails = sections.map(section => {
      const filledFields = section.fields.filter(f => isFilled(f.value)).length;
      const totalFields = section.fields.length;
      const adjustedWeight = section.weight * weightMultiplier;
      
      totalCount += totalFields;
      completedCount += filledFields;
      
      // Calculate weighted completion for this section
      const sectionCompletion = totalFields > 0 ? (filledFields / totalFields) : 0;
      completedWeight += sectionCompletion * adjustedWeight;

      return {
        name: section.name,
        completed: filledFields,
        total: totalFields,
        percentage: Math.round(sectionCompletion * 100),
        weight: Math.round(adjustedWeight),
        isComplete: filledFields === totalFields
      };
    });

    return {
      percentage: Math.round(completedWeight),
      completed: completedCount,
      total: totalCount,
      sections: sectionDetails
    };
  };

  const getStrengthColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 50) return "text-blue-600";
    if (percentage >= 30) return "text-yellow-600";
    return "text-red-600";
  };

  // Helper function to ensure URLs have https:// prefix
  const formatUrl = (url: string, defaultDomain?: string): string => {
    if (!url) return "";
    // If it's just a username (no dots or slashes), construct full URL
    if (defaultDomain && !url.includes('.') && !url.includes('/')) {
      return `https://${defaultDomain}/${url}`;
    }
    // If URL doesn't start with http:// or https://, add https://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  };

  const getStrengthBgColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-100";
    if (percentage >= 50) return "bg-blue-100";
    if (percentage >= 30) return "bg-yellow-100";
    return "bg-red-100";
  };

  const getStrengthLabel = (percentage: number) => {
    if (percentage >= 90) return "Excellent";
    if (percentage >= 75) return "Strong";
    if (percentage >= 50) return "Good";
    if (percentage >= 25) return "Fair";
    return "Weak";
  };

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please choose an image under 5MB", variant: "destructive" });
      return;
    }

    setUploadingPhoto(true);
    try {
      const imageUrl = await uploadToImgBB(file);
      
      // Update profile collection
      await updateUserProfile(user!.uid, { photoURL: imageUrl });
      
      // Also update the users collection
      const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase/config");
      const { updateProfile } = await import("firebase/auth");
      
      if (db) {
        await updateDoc(doc(db, "users", user!.uid), {
          photoURL: imageUrl,
          updatedAt: serverTimestamp(),
        });
      }
      
      // Update Firebase Auth profile
      if (auth?.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: imageUrl });
      }
      
      setProfilePhotoPreview(imageUrl);
      
      // Refresh user data from both collections
      const [updatedUser, updatedProfile] = await Promise.all([
        getUserData(user!.uid),
        getUserProfile(user!.uid)
      ]);
      setUserData(updatedUser);
      setProfile(updatedProfile);
      
      toast({ title: "Success!", description: "Profile photo updated successfully" });
    } catch (error) {
      handleError(error, "Failed to upload photo");
      toast({ title: "Error", description: "Failed to upload photo. Please try again.", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUser = auth?.currentUser;
    if (!user || !currentUser) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: "Error", description: "Passwords don't match", variant: "destructive" });
      return;
    }

    setChangingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email!, passwordData.currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, passwordData.newPassword);
      
      setIsPasswordDialogOpen(false);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Success!", description: "Password changed successfully" });
    } catch (error: any) {
      let errorMessage = "Failed to change password. ";
      if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        errorMessage += "Current password is incorrect.";
      } else if (error.code === "auth/weak-password") {
        errorMessage += "New password is too weak.";
      } else {
        errorMessage += "Please try again.";
      }
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateUserProfile(user.uid, {
        college: formData.college || undefined,
        graduationYear: formData.graduationYear ? parseInt(formData.graduationYear) : undefined,
        course: formData.course || undefined,
        specialization: formData.specialization || undefined,
        currentCompany: formData.currentCompany || undefined,
        jobTitle: formData.jobTitle || undefined,
        experience: formData.experience ? parseFloat(formData.experience) : undefined,
        location: formData.location || undefined,
        bio: formData.bio || undefined,
        skills: formData.skills ? formData.skills.split(",").map((s) => s.trim()).filter(s => s) : undefined,
        linkedIn: formData.linkedIn || undefined,
        github: formData.github || undefined,
        instagram: formData.instagram || undefined,
        portfolio: formData.portfolio || undefined,
      });
      const updatedProfile = await getUserProfile(user.uid);
      setProfile(updatedProfile);
      toast({ title: "Success!", description: "Profile updated successfully" });
      setIsEditDialogOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" message="Loading profile..." />
        </div>
      </MainLayout>
    );
  }

  const profileStrength = calculateProfileStrength();

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">My Profile</h1>
            <p className="text-muted-foreground mt-1">Manage your personal information</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
              <DialogTrigger asChild>
                <ActionButton variant="outline" icon={<Key className="h-4 w-4" />}>
                  Change Password
                </ActionButton>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Key className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>Update your account password</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <form onSubmit={handleChangePassword} className="space-y-4 py-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input 
                      id="currentPassword"
                      type="password" 
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input 
                      id="newPassword"
                      type="password" 
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input 
                      id="confirmPassword"
                      type="password" 
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                  <ActionButton 
                    type="submit" 
                    className="w-full" 
                    loading={changingPassword}
                  >
                    Update Password
                  </ActionButton>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <ActionButton variant="primary" icon={<Edit2 className="h-4 w-4" />}>
                  Edit Profile
                </ActionButton>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Edit2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <DialogTitle>Edit Profile</DialogTitle>
                      <DialogDescription>Update your information</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-5 py-3">
                  {/* Profile Photo */}
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="relative group">
                      {userData?.photoURL || profilePhotoPreview ? (
                        <img 
                          src={userData?.photoURL || profilePhotoPreview} 
                          alt="Profile" 
                          className="w-16 h-16 rounded-full object-cover ring-2 ring-border"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-semibold">
                          {userData?.displayName?.charAt(0).toUpperCase() || "U"}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="profile-photo-dialog" className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 w-fit transition-colors">
                          <UploadIcon className="h-4 w-4" />
                          <span className="text-sm font-medium">Upload Photo</span>
                        </div>
                      </Label>
                      <input
                        id="profile-photo-dialog"
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePhotoChange}
                        className="hidden"
                        disabled={uploadingPhoto}
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">JPG, PNG or GIF. Max 5MB</p>
                    </div>
                  </div>


                  {/* Basic Info */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-foreground">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Location</Label>
                        <Input 
                          value={formData.location} 
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
                          placeholder="City, Country" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Bio</Label>
                        <Textarea 
                          value={formData.bio} 
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })} 
                          placeholder="Tell us about yourself"
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Academic Info */}
                  {(userData?.role === "student" || userData?.role === "alumni") && (
                    <div className="space-y-3">
                      <h3 className="font-medium text-foreground">Academic Information</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>College/University</Label>
                          <Input 
                            value={formData.college} 
                            onChange={(e) => setFormData({ ...formData, college: e.target.value })} 
                            placeholder="Your institution"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Degree/Course</Label>
                          <Input 
                            value={formData.course} 
                            onChange={(e) => setFormData({ ...formData, course: e.target.value })} 
                            placeholder="B.Tech, MBA, etc."
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Specialization</Label>
                          <Input 
                            value={formData.specialization} 
                            onChange={(e) => setFormData({ ...formData, specialization: e.target.value })} 
                            placeholder="Computer Science, etc."
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Graduation Year</Label>
                          <Input 
                            value={formData.graduationYear} 
                            onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })} 
                            placeholder="2025"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Professional Info */}
                  {userData?.role === "alumni" && (
                    <div className="space-y-3">
                      <h3 className="font-medium text-foreground">Professional Information</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Company</Label>
                          <Input 
                            value={formData.currentCompany} 
                            onChange={(e) => setFormData({ ...formData, currentCompany: e.target.value })} 
                            placeholder="Current company"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Job Title</Label>
                          <Input 
                            value={formData.jobTitle} 
                            onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })} 
                            placeholder="Your position"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Experience (years)</Label>
                          <Input 
                            type="number"
                            value={formData.experience} 
                            onChange={(e) => setFormData({ ...formData, experience: e.target.value })} 
                            placeholder="3"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  <div className="space-y-1.5">
                    <Label>Skills</Label>
                    <Input 
                      value={formData.skills} 
                      onChange={(e) => setFormData({ ...formData, skills: e.target.value })} 
                      placeholder="JavaScript, React, Node.js (comma separated)"
                    />
                  </div>

                  {/* Social Links */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-foreground">Social Links</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>LinkedIn</Label>
                        <Input 
                          value={formData.linkedIn} 
                          onChange={(e) => setFormData({ ...formData, linkedIn: e.target.value })} 
                          placeholder="linkedin.com/in/username"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>GitHub</Label>
                        <Input 
                          value={formData.github} 
                          onChange={(e) => setFormData({ ...formData, github: e.target.value })} 
                          placeholder="github.com/username"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Portfolio</Label>
                        <Input 
                          value={formData.portfolio} 
                          onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })} 
                          placeholder="yourwebsite.com"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Instagram</Label>
                        <Input 
                          value={formData.instagram} 
                          onChange={(e) => setFormData({ ...formData, instagram: e.target.value })} 
                          placeholder="instagram.com/username"
                        />
                      </div>
                    </div>
                  </div>

                  <ActionButton type="submit" className="w-full" loading={saving}>
                    Save Changes
                  </ActionButton>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Profile Strength Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Profile Strength</h2>
                <p className="text-sm text-muted-foreground">Complete your profile to improve visibility</p>
              </div>
              <div className={`px-3 py-1.5 rounded-full ${getStrengthBgColor(profileStrength.percentage)}`}>
                <span className={`text-sm font-medium ${getStrengthColor(profileStrength.percentage)}`}>
                  {getStrengthLabel(profileStrength.percentage)}
                </span>
              </div>
            </div>

            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-semibold text-foreground">{profileStrength.percentage}%</span>
                <span className="text-sm text-muted-foreground">
                  {profileStrength.completed} of {profileStrength.total} fields completed
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500" 
                  style={{ width: `${profileStrength.percentage}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {profileStrength.sections.map((section, index) => (
                <div key={index} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">{section.name}</span>
                    {section.isComplete && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all" 
                        style={{ width: `${section.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{section.percentage}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {section.completed}/{section.total} filled
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Profile Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Profile Card */}
          <div className="lg:col-span-1">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6 pb-5">
                <div className="flex flex-col items-center text-center">
                  <div className="relative group mb-4">
                    {userData?.photoURL || profilePhotoPreview ? (
                      <img 
                        src={userData?.photoURL || profilePhotoPreview} 
                        alt="Profile" 
                        className="w-28 h-28 rounded-full object-cover ring-2 ring-border"
                      />
                    ) : (
                      <div className="w-28 h-28 rounded-full bg-primary flex items-center justify-center text-white text-4xl font-semibold">
                        {userData?.displayName?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                    <label 
                      htmlFor="profile-photo-upload" 
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full"
                    >
                      <Camera className="h-8 w-8 text-white" />
                      <input
                        id="profile-photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePhotoChange}
                        className="hidden"
                        disabled={uploadingPhoto}
                      />
                    </label>
                    {uploadingPhoto && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                        <LoadingSpinner size="md" />
                      </div>
                    )}
                  </div>
                  
                  <h2 className="text-xl font-semibold text-foreground mb-0.5">
                    {userData?.displayName || "User"}
                  </h2>
                  <p className="text-muted-foreground mb-3">
                    {userData?.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : "Student"}
                  </p>
                  
                  <Badge 
                    variant={
                      userData?.verificationStatus === "approved" ? "default" : 
                      userData?.verificationStatus === "pending" ? "secondary" : 
                      "destructive"
                    }
                    className="mb-4"
                  >
                    {userData?.verificationStatus === "approved" ? "✓ Verified" : 
                     userData?.verificationStatus === "pending" ? "⏳ Pending" : 
                     "✗ Unverified"}
                  </Badge>
                </div>

                <div className="space-y-3 mt-5">
                  {user?.email && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground break-all">{user.email}</span>
                    </div>
                  )}
                  {userData?.phoneNumber && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{userData.phoneNumber}</span>
                    </div>
                  )}
                  {profile?.location && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{profile.location}</span>
                    </div>
                  )}
                  {userData?.createdAt && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">
                        Joined {new Date(userData.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Social Links */}
                {(profile?.linkedIn || profile?.github || profile?.portfolio || profile?.instagram) && (
                  <div className="mt-5 pt-5 border-t border-border">
                    <h3 className="text-sm font-medium text-foreground mb-3">Connect</h3>
                    <div className="flex gap-2 flex-wrap">
                      {profile.linkedIn && (
                        <a href={formatUrl(profile.linkedIn, 'linkedin.com/in')} target="_blank" rel="noopener noreferrer" 
                           className="p-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                          <Linkedin className="h-4 w-4 text-blue-600" />
                        </a>
                      )}
                      {profile.github && (
                        <a href={formatUrl(profile.github, 'github.com')} target="_blank" rel="noopener noreferrer"
                           className="p-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                          <Github className="h-4 w-4 text-foreground" />
                        </a>
                      )}
                      {profile.portfolio && (
                        <a href={formatUrl(profile.portfolio)} target="_blank" rel="noopener noreferrer"
                           className="p-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                          <Globe className="h-4 w-4 text-purple-600" />
                        </a>
                      )}
                      {profile.instagram && (
                        <a href={formatUrl(profile.instagram, 'instagram.com')} target="_blank" rel="noopener noreferrer"
                           className="p-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                          <Instagram className="h-4 w-4 text-pink-600" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Content - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            {profile?.bio && (
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <UserIcon className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">About</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{profile.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Academic Info */}
            {(userData?.role === "student" || userData?.role === "alumni") && (
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">Academic Information</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {profile?.college && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-0.5">College</p>
                        <p className="font-medium text-foreground">{profile.college}</p>
                      </div>
                    )}
                    {profile?.course && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-0.5">Degree</p>
                        <p className="font-medium text-foreground">{profile.course}</p>
                      </div>
                    )}
                    {profile?.specialization && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-0.5">Specialization</p>
                        <p className="font-medium text-foreground">{profile.specialization}</p>
                      </div>
                    )}
                    {profile?.graduationYear && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-0.5">Graduation Year</p>
                        <p className="font-medium text-foreground">{profile.graduationYear}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Professional Info */}
            {userData?.role === "alumni" && (
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Briefcase className="h-4 w-4 text-green-600" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">Professional Information</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {profile?.currentCompany && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-0.5">Company</p>
                        <p className="font-medium text-foreground">{profile.currentCompany}</p>
                      </div>
                    )}
                    {profile?.jobTitle && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-0.5">Job Title</p>
                        <p className="font-medium text-foreground">{profile.jobTitle}</p>
                      </div>
                    )}
                    {profile?.experience && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-0.5">Experience</p>
                        <p className="font-medium text-foreground">{profile.experience} years</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Skills */}
            {profile?.skills && profile.skills.length > 0 && (
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Award className="h-4 w-4 text-purple-600" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">Skills</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
