"use client";

import React, { useState, useEffect } from 'react';
import { User, Shield, Bell, Save, ChevronRight, Globe, Lock, Mail, MapPin, Linkedin, X } from 'lucide-react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ActionButton } from '@/components/ui/action-button';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useVerificationGuard } from '@/hooks/use-verification-guard';
import { getUserData } from '@/lib/firebase/auth';
import { getUserProfile, updateUserProfile } from '@/lib/firebase/profiles';
import { handleError } from '@/lib/utils/error-handling';
import { UserProfile } from '@/types';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user, loading: authLoading } = useVerificationGuard();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  const [settings, setSettings] = useState({
    displayName: '',
    email: '',
    bio: '',
    location: '',
    linkedIn: '',
    college: '',
    specialization: '',
    graduationYear: '',
    
    // Notifications
    email_notifications: true,
    push_notifications: true,
    mentorship_notifications: true,
    job_notifications: true,
    
    // Privacy
    profile_public: true,
    show_email: false,
    show_phone: false,
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      try {
        const userData = await getUserData(user.uid);
        const userProfile = await getUserProfile(user.uid);
        if (userProfile) {
          setProfile(userProfile);
          setSettings({
            displayName: userData?.displayName || '',
            email: userData?.email || '',
            bio: userProfile.bio || '',
            location: userProfile.location || '',
            linkedIn: userProfile.linkedIn || '',
            college: userProfile.college || '',
            specialization: userProfile.specialization || '',
            graduationYear: userProfile.graduationYear?.toString() || '',
            
            email_notifications: true,
            push_notifications: true,
            mentorship_notifications: true,
            job_notifications: true,
            
            profile_public: true,
            show_email: false,
            show_phone: false,
          });
        }
      } catch (err) {
        handleError(err, 'Error loading profile');
      }
    };

    loadProfile();
  }, [user]);



  const tabs = [
    { id: 'notifications', icon: Bell, label: 'Notifications', description: 'Configure alerts' },
    { id: 'privacy', icon: Shield, label: 'Privacy', description: 'Control your data' }
  ];

  const toggleSetting = (key: keyof typeof settings) => {
    if (typeof settings[key] === 'boolean') {
      setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };



  const handleSubmit = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await updateUserProfile(user.uid, {
        bio: settings.bio,
        location: settings.location,
        linkedIn: settings.linkedIn,
        college: settings.college,
        specialization: settings.specialization,
        graduationYear: settings.graduationYear ? parseInt(settings.graduationYear) : undefined,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Notification Preferences</h2>
              <p className="text-gray-600">Choose what updates you want to receive</p>
            </div>
            
            <div className="space-y-4">
              {/* Email Notifications */}
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Email Notifications</h4>
                      <p className="text-sm text-gray-600">Receive updates via email</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSetting('email_notifications')}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      settings.email_notifications ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow-md ${
                      settings.email_notifications ? 'translate-x-7' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Push Notifications */}
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-linear-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                      <Bell className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Push Notifications</h4>
                      <p className="text-sm text-gray-600">Get instant browser notifications</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSetting('push_notifications')}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      settings.push_notifications ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow-md ${
                      settings.push_notifications ? 'translate-x-7' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Mentorship Notifications */}
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-linear-to-br from-green-500 to-green-600 flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Mentorship Updates</h4>
                      <p className="text-sm text-gray-600">New requests and messages from mentors</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSetting('mentorship_notifications')}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      settings.mentorship_notifications ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow-md ${
                      settings.mentorship_notifications ? 'translate-x-7' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Job Notifications */}
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Job & Referral Alerts</h4>
                      <p className="text-sm text-gray-600">New job postings from alumni</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSetting('job_notifications')}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      settings.job_notifications ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow-md ${
                      settings.job_notifications ? 'translate-x-7' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Privacy & Security</h2>
              <p className="text-gray-600">Control who can see your information</p>
            </div>
            
            <div className="space-y-4">
              {/* Public Profile */}
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Globe className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Public Profile</h4>
                      <p className="text-sm text-gray-600">Make your profile visible to everyone on CampusLink</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSetting('profile_public')}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      settings.profile_public ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow-md ${
                      settings.profile_public ? 'translate-x-7' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Show Email */}
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-linear-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Display Email Address</h4>
                      <p className="text-sm text-gray-600">Show your email on your public profile</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSetting('show_email')}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      settings.show_email ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow-md ${
                      settings.show_email ? 'translate-x-7' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Show Phone */}
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-linear-to-br from-green-500 to-green-600 flex items-center justify-center">
                      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Display Phone Number</h4>
                      <p className="text-sm text-gray-600">Show your phone number on your profile</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSetting('show_phone')}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      settings.show_phone ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow-md ${
                      settings.show_phone ? 'translate-x-7' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Security Info */}
              <div className="mt-6 p-6 rounded-2xl bg-blue-50 border-2 border-blue-200">
                <div className="flex gap-3">
                  <Lock className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">Your data is secure</h4>
                    <p className="text-sm text-blue-700">
                      All information is encrypted and stored securely. Your privacy settings only affect what other users can see on your profile.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="Settings"
            description="Manage your account preferences and settings"
          />

          <div className="grid lg:grid-cols-4 gap-6 mt-6">
            {/* Sidebar - Tabs */}
            <div className="lg:col-span-1">
              <Card className="border-none shadow-lg sticky top-24">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                            isActive 
                              ? 'bg-linear-to-r from-blue-500 to-indigo-500 text-white shadow-lg' 
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="font-medium text-sm">{tab.label}</span>
                          {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <Card className="border-none shadow-lg">
                <CardContent className="p-6 md:p-8">
                  <ScrollArea className="h-[calc(100vh-250px)]">
                    <div className="pr-4">
                      {renderContent()}

                      {/* Success/Error Messages */}
                      {error && (
                        <div className="mt-6 p-4 rounded-xl bg-red-50 border-2 border-red-200 text-red-700">
                          <p className="font-medium">{error}</p>
                        </div>
                      )}

                      {success && (
                        <div className="mt-6 p-4 rounded-xl bg-green-50 border-2 border-green-200 text-green-700">
                          <p className="font-medium">✓ Settings saved successfully!</p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
                        <ActionButton
                          variant="outline"
                          onClick={() => router.push('/dashboard')}
                          icon={<X className="h-4 w-4" />}
                        >
                          Cancel
                        </ActionButton>
                        <ActionButton
                          onClick={handleSubmit}
                          variant="primary"
                          icon={<Save className="h-4 w-4" />}
                          loading={loading}
                          loadingText="Saving..."
                        >
                          Save Changes
                        </ActionButton>
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
