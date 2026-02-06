"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Shield, Clock, Users, Bell } from "lucide-react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase/config";
import { PageHeader } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { logAdminActivity } from "@/lib/firebase/adminLogs";
import { useAdminAuth } from "@/hooks/use-admin-auth";

interface PlatformSettings {
  // Verification settings
  verificationDeadlineDays: number;
  autoDeactivateUnverified: boolean;
  requireAdmissionNumber: boolean;
  
  // Feature toggles
  allowJobPosting: boolean;
  allowMentorship: boolean;
  allowChat: boolean;
  allowFeedPosts: boolean;
  
  // Moderation
  requirePostApproval: boolean;
  requireJobApproval: boolean;
  
  // Notifications
  emailNotifications: boolean;
  adminAlertOnReport: boolean;
}

const defaultSettings: PlatformSettings = {
  verificationDeadlineDays: 2,
  autoDeactivateUnverified: true,
  requireAdmissionNumber: true,
  allowJobPosting: true,
  allowMentorship: true,
  allowChat: true,
  allowFeedPosts: true,
  requirePostApproval: false,
  requireJobApproval: false,
  emailNotifications: false,
  adminAlertOnReport: true,
};

export default function SettingsPage() {
  const { user: adminUser, isAuthReady } = useAdminAuth();
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!isAuthReady) return;
    fetchSettings();
  }, [isAuthReady]);

  async function fetchSettings() {
    try {
      const db = getDb();
      const docRef = doc(db, "config", "platformSettings");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setSettings({ ...defaultSettings, ...docSnap.data() });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  }

  function updateSetting<K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }

  async function handleSave() {
    setSaving(true);

    try {
      const db = getDb();
      await setDoc(doc(db, "config", "platformSettings"), {
        ...settings,
        updatedAt: serverTimestamp(),
        updatedBy: adminUser?.uid,
      });

      await logAdminActivity({
        adminId: adminUser?.uid || "",
        adminEmail: adminUser?.email || "",
        action: "update_settings",
        targetType: "setting",
        targetId: "platformSettings",
        details: "Updated platform settings",
        metadata: settings,
      });

      setHasChanges(false);
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Settings}
        title="Settings"
        description="Configure platform settings"
        actions={
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Verification Settings */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-medium text-slate-100">Verification</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Verification Deadline (days)
              </label>
              <Input
                type="number"
                min={1}
                max={30}
                value={settings.verificationDeadlineDays}
                onChange={(e) =>
                  updateSetting("verificationDeadlineDays", parseInt(e.target.value) || 2)
                }
                className="bg-slate-800 border-slate-700 w-32"
              />
              <p className="text-xs text-slate-500 mt-1">
                Days before unverified accounts are deactivated
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Auto-deactivate Unverified</p>
                <p className="text-xs text-slate-500">
                  Automatically deactivate accounts after deadline
                </p>
              </div>
              <Switch
                checked={settings.autoDeactivateUnverified}
                onCheckedChange={(v) => updateSetting("autoDeactivateUnverified", v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Require Admission Number</p>
                <p className="text-xs text-slate-500">
                  Users must verify admission number during onboarding
                </p>
              </div>
              <Switch
                checked={settings.requireAdmissionNumber}
                onCheckedChange={(v) => updateSetting("requireAdmissionNumber", v)}
              />
            </div>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-medium text-slate-100">Features</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Job Posting</p>
                <p className="text-xs text-slate-500">Allow users to post jobs</p>
              </div>
              <Switch
                checked={settings.allowJobPosting}
                onCheckedChange={(v) => updateSetting("allowJobPosting", v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Mentorship</p>
                <p className="text-xs text-slate-500">Enable mentorship requests</p>
              </div>
              <Switch
                checked={settings.allowMentorship}
                onCheckedChange={(v) => updateSetting("allowMentorship", v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Chat</p>
                <p className="text-xs text-slate-500">Allow direct messaging</p>
              </div>
              <Switch
                checked={settings.allowChat}
                onCheckedChange={(v) => updateSetting("allowChat", v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Feed Posts</p>
                <p className="text-xs text-slate-500">Allow social feed posts</p>
              </div>
              <Switch
                checked={settings.allowFeedPosts}
                onCheckedChange={(v) => updateSetting("allowFeedPosts", v)}
              />
            </div>
          </div>
        </div>

        {/* Moderation */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-medium text-slate-100">Moderation</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Require Post Approval</p>
                <p className="text-xs text-slate-500">
                  Posts need admin approval before publishing
                </p>
              </div>
              <Switch
                checked={settings.requirePostApproval}
                onCheckedChange={(v) => updateSetting("requirePostApproval", v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Require Job Approval</p>
                <p className="text-xs text-slate-500">
                  Jobs need admin approval before publishing
                </p>
              </div>
              <Switch
                checked={settings.requireJobApproval}
                onCheckedChange={(v) => updateSetting("requireJobApproval", v)}
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-medium text-slate-100">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Email Notifications</p>
                <p className="text-xs text-slate-500">
                  Send email notifications for important events
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(v) => updateSetting("emailNotifications", v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Admin Alert on Report</p>
                <p className="text-xs text-slate-500">
                  Notify admins when a new report is submitted
                </p>
              </div>
              <Switch
                checked={settings.adminAlertOnReport}
                onCheckedChange={(v) => updateSetting("adminAlertOnReport", v)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save indicator */}
      {hasChanges && (
        <div className="fixed bottom-4 right-4 bg-cyan-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Unsaved changes
        </div>
      )}
    </div>
  );
}
