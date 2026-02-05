"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { useVerificationGuard } from "@/hooks/use-verification-guard";
import { getUserProfile, updateUserProfile } from "@/lib/firebase/profiles";
import { getUserData } from "@/lib/firebase/auth";
import { handleError } from "@/lib/utils/error-handling";
import { useEffect, useState } from "react";
import { User, UserProfile } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Building, Save, Camera, Upload as UploadIcon, Key, Edit, Calendar, Clock, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { uploadToImgBB } from "@/lib/upload/imgbb";

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
        
        // Set profile photo preview - prioritize userData.photoURL as it's most up-to-date
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

  const getVerificationStatus = () => {
    const status = userData?.verificationStatus;
    return status === "approved" ? "active" : status === "pending" ? "pending" : status === "rejected" ? "rejected" : "inactive";
  };

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image size should be less than 5MB", variant: "destructive" });
      return;
    }

    setUploadingPhoto(true);
    try {
      // Upload to ImgBB
      const imageUrl = await uploadToImgBB(file);
      
      // Update user photoURL in Firebase Auth and Firestore
      if (user) {
        const { auth, db } = await import("@/lib/firebase/config");
        const { updateProfile } = await import("firebase/auth");
        const { doc, updateDoc } = await import("firebase/firestore");
        
        // Update Firebase Auth photoURL
        if (auth && auth.currentUser) {
          await updateProfile(auth.currentUser, { photoURL: imageUrl });
        }
        
        // Save photoURL to users collection (for getUserData)
        if (db) {
          await updateDoc(doc(db, "users", user.uid), { photoURL: imageUrl });
        }
        
        // Save photoURL to profile collection
        await updateUserProfile(user.uid, { photoURL: imageUrl });
        
        // Update local state
        setProfilePhotoPreview(imageUrl);
        
        // Refresh user data and profile
        const [updatedUserData, updatedProfile] = await Promise.all([
          getUserData(user.uid),
          getUserProfile(user.uid)
        ]);
        setUserData(updatedUserData);
        setProfile(updatedProfile);
        
        toast({ title: "Success!", description: "Profile photo updated successfully" });
      }
    } catch (error) {
      handleError(error, "Failed to upload photo");
      toast({ title: "Error", description: "Failed to upload photo. Please try again.", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({ title: "Error", description: "Please fill in all password fields", variant: "destructive" });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({ title: "Error", description: "New password must be at least 6 characters", variant: "destructive" });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: "Error", description: "New passwords do not match", variant: "destructive" });
      return;
    }

    if (!user?.email) {
      toast({ title: "Error", description: "User email not found", variant: "destructive" });
      return;
    }

    setChangingPassword(true);
    try {
      const { auth } = await import("@/lib/firebase/config");
      const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import("firebase/auth");
      
      if (!auth || !auth.currentUser) {
        throw new Error("User not authenticated");
      }

      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password
      await updatePassword(auth.currentUser, passwordData.newPassword);

      // Reset form and close dialog
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setIsPasswordDialogOpen(false);
      
      toast({ title: "Success!", description: "Password changed successfully" });
    } catch (error: any) {
      handleError(error, "Failed to change password");
      let errorMessage = "Failed to change password. ";
      if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        errorMessage += "Current password is incorrect.";
      } else if (error.code === "auth/weak-password") {
        errorMessage += "New password is too weak.";
      } else if (error.code === "auth/requires-recent-login") {
        errorMessage += "Please sign out and sign in again before changing your password.";
      } else {
        errorMessage += error.message || "Please try again.";
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
      toast({ title: "Success!", description: "Your profile has been updated successfully." });
      setIsEditDialogOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update profile. Please try again.", variant: "destructive" });
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

  const formatDate = (date: Date | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const calculateProfileCompletion = () => {
    if (!profile) return 0;
    let completed = 0;
    const total = 6;
    if (profile.college) completed++;
    if (profile.bio) completed++;
    if (profile.skills && profile.skills.length > 0) completed++;
    if (profile.location) completed++;
    if (profile.linkedIn) completed++;
    if (profile.course) completed++;
    return Math.round((completed / total) * 100);
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Your Profile"
          description="Manage your personal information and settings"
          actions={
            <div className="flex gap-3">
              <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogTrigger asChild>
                  <ActionButton variant="outline" icon={<Key className="h-4 w-4" />}>
                    Change Password
                  </ActionButton>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>Enter your current password and new password</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleChangePassword} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input 
                      id="currentPassword"
                      type="password" 
                      placeholder="Enter current password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input 
                      id="newPassword"
                      type="password" 
                      placeholder="Enter new password (min 6 characters)"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input 
                      id="confirmPassword"
                      type="password" 
                      placeholder="Confirm new password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                  <ActionButton 
                    type="submit" 
                    className="w-full" 
                    loading={changingPassword}
                    loadingText="Updating..."
                  >
                    Update Password
                  </ActionButton>
                </form>
              </DialogContent>
            </Dialog>

              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <ActionButton variant="primary" icon={<Edit className="h-4 w-4" />}>
                    Edit Profile
                  </ActionButton>
                </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                  <DialogDescription>Update your profile information</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                  {/* Profile Picture Section */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Profile Picture</h3>
                    <div className="flex items-center gap-4">
                      <div className="relative group">
                        {userData?.photoURL || profilePhotoPreview || profile?.photoURL ? (
                          <img 
                            src={userData?.photoURL || profilePhotoPreview || profile?.photoURL || ""} 
                            alt="Profile" 
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                            {userData?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="profile-photo-dialog" className="cursor-pointer">
                          <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 w-fit">
                            <UploadIcon className="h-4 w-4" />
                            <span className="text-sm">Upload Photo</span>
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
                        <p className="text-xs text-muted-foreground mt-2">Max size: 5MB. Supports: JPG, PNG, GIF</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input id="location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="City, Country" />
                      </div>
                    </div>
                  </div>

                  {(userData?.role === "student" || userData?.role === "alumni") && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm">Academic Information</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="college">College/University</Label>
                          <Input id="college" value={formData.college} onChange={(e) => setFormData({ ...formData, college: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="course">Degree/Course</Label>
                          <Input id="course" value={formData.course} onChange={(e) => setFormData({ ...formData, course: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="specialization">Branch/Major</Label>
                          <Input id="specialization" value={formData.specialization} onChange={(e) => setFormData({ ...formData, specialization: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="graduationYear">Graduation Year</Label>
                          <Input id="graduationYear" type="number" value={formData.graduationYear} onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  )}

                  {userData?.role === "alumni" && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm">Professional Information</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="currentCompany">Current Company</Label>
                          <Input id="currentCompany" value={formData.currentCompany} onChange={(e) => setFormData({ ...formData, currentCompany: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="jobTitle">Job Title</Label>
                          <Input id="jobTitle" value={formData.jobTitle} onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="experience">Years of Experience</Label>
                          <Input id="experience" type="number" step="0.5" value={formData.experience} onChange={(e) => setFormData({ ...formData, experience: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">About & Skills</h3>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea id="bio" rows={3} value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder="Tell us about yourself..." />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="skills">Skills (comma-separated)</Label>
                        <Input id="skills" value={formData.skills} onChange={(e) => setFormData({ ...formData, skills: e.target.value })} placeholder="React, Node.js, Python" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Social Links</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="linkedin">LinkedIn</Label>
                        <Input id="linkedin" type="url" value={formData.linkedIn} onChange={(e) => setFormData({ ...formData, linkedIn: e.target.value })} placeholder="https://linkedin.com/in/..." />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="github">GitHub</Label>
                        <Input id="github" type="url" value={formData.github} onChange={(e) => setFormData({ ...formData, github: e.target.value })} placeholder="https://github.com/..." />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="instagram">Instagram</Label>
                        <Input id="instagram" type="url" value={formData.instagram} onChange={(e) => setFormData({ ...formData, instagram: e.target.value })} placeholder="https://instagram.com/..." />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="portfolio">Portfolio Website</Label>
                        <Input id="portfolio" type="url" value={formData.portfolio} onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })} placeholder="https://yourwebsite.com" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <ActionButton type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Cancel
                    </ActionButton>
                    <ActionButton 
                      type="submit" 
                      variant="primary"
                      icon={<Save className="h-4 w-4" />}
                      loading={saving}
                      loadingText="Saving..."
                    >
                      Save Changes
                    </ActionButton>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          }
        />

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            icon={Calendar}
            title="Member Since"
            value={formatDate(userData?.createdAt)}
            description={`${userData?.createdAt ? Math.floor((Date.now() - new Date(userData.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)) : 0} months ago`}
          />
          <StatCard
            icon={Clock}
            title="Last Updated"
            value={formatDate(profile?.updatedAt)}
            description={`${profile?.updatedAt ? Math.floor((Date.now() - new Date(profile.updatedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0} days ago`}
          />
          <StatCard
            icon={TrendingUp}
            title="Profile Completion"
            value={`${calculateProfileCompletion()}%`}
            trend={{
              value: calculateProfileCompletion(),
              direction: calculateProfileCompletion() >= 80 ? "up" : calculateProfileCompletion() >= 50 ? "neutral" : "down",
            }}
            description={calculateProfileCompletion() >= 80 ? "Great job!" : "Keep going!"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="relative group">
                    {userData?.photoURL || profilePhotoPreview || profile?.photoURL ? (
                      <img 
                        src={userData?.photoURL || profilePhotoPreview || profile?.photoURL || ""} 
                        alt="Profile" 
                        className="w-32 h-32 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-lg bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
                        {userData?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                    <label 
                      htmlFor="profile-photo-upload" 
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg"
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
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                        <LoadingSpinner size="md" />
                      </div>
                    )}
                  </div>
                  <h2 className="text-xl font-bold mb-1 mt-4">{userData?.displayName || "User"}</h2>
                  <p className="text-sm text-muted-foreground mb-3">{userData?.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : "Student"}</p>
                </div>
                <div className="mb-6">
                  <Label className="text-xs text-muted-foreground uppercase mb-2 block">Verification Status</Label>
                  <StatusBadge variant={getVerificationStatus() as any}>
                    {getVerificationStatus().toUpperCase()}
                  </StatusBadge>
                </div>
                <div className="space-y-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase">Email</Label>
                    <p className="font-medium text-sm break-all">{user?.email || "Not set"}</p>
                  </div>
                  {userData?.phoneNumber && (
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase">Phone Number</Label>
                      <p className="font-medium">{userData.phoneNumber}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase">Full Name</Label>
                    <p className="font-semibold text-lg">{userData?.displayName || "Not set"}</p>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase">Home Address</Label>
                    <p className="font-medium">{profile?.location || "Not set"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 mt-6">
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase">Contact Information</Label>
                    <p className="font-medium">{user?.email || "Not set"}</p>
                    <p className="font-medium">{userData?.phoneNumber || "Not set"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {(userData?.role === "student" || userData?.role === "alumni") && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Academic Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase">College</Label>
                      <p className="font-medium">{profile?.college || "Not set"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase">Degree</Label>
                      <p className="font-medium">{profile?.course || "Not set"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase">Graduation</Label>
                      <p className="font-medium">{profile?.graduationYear || "Not set"}</p>
                    </div>
                  </div>
                  {profile?.specialization && (
                    <div className="mt-4">
                      <Label className="text-xs text-muted-foreground uppercase">Specialization</Label>
                      <p className="font-medium">{profile.specialization}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {userData?.role === "alumni" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Professional Experience</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase">Company</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Building className="h-4 w-4 text-primary" />
                          <p className="font-medium">{profile?.currentCompany || "Not set"}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase">Position</Label>
                        <p className="font-medium">{profile?.jobTitle || "Not set"}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase">Experience</Label>
                        <p className="font-medium">{profile?.experience ? `${profile.experience} years` : "Not set"}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About & Skills</CardTitle>
              </CardHeader>
              <CardContent>
                {profile?.bio ? <p className="text-sm text-muted-foreground mb-4">{profile.bio}</p> : <p className="text-sm text-muted-foreground italic mb-4">No bio added yet</p>}
                {profile?.skills && profile.skills.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase mb-2 block">Skills</Label>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="px-3 py-1">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Social Links */}
            {(profile?.linkedIn || profile?.github || profile?.instagram || profile?.portfolio) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Social Links</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {profile.linkedIn && (
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase">LinkedIn</Label>
                        <a 
                          href={profile.linkedIn} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-sm text-blue-600 hover:underline block"
                        >
                          {profile.linkedIn}
                        </a>
                      </div>
                    )}
                    {profile.github && (
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase">GitHub</Label>
                        <a 
                          href={profile.github} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-sm hover:underline block"
                        >
                          {profile.github}
                        </a>
                      </div>
                    )}
                    {profile.instagram && (
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase">Instagram</Label>
                        <a 
                          href={profile.instagram} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-sm text-pink-600 hover:underline block"
                        >
                          {profile.instagram}
                        </a>
                      </div>
                    )}
                    {profile.portfolio && (
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase">Portfolio Website</Label>
                        <a 
                          href={profile.portfolio} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-sm text-primary hover:underline block"
                        >
                          {profile.portfolio}
                        </a>
                      </div>
                    )}
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
