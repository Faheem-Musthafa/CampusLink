/**
 * Admin Activity Logging System
 * Tracks all admin actions for audit trail
 */

import { collection, addDoc, getDocs, query, orderBy, limit, where, Timestamp } from "firebase/firestore";
import { db } from "./config";

export interface AdminActivityLog {
  id?: string;
  adminId: string;
  adminEmail: string;
  adminName?: string;
  action: AdminAction;
  targetType: TargetType;
  targetId: string;
  targetName?: string;
  details: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date | Timestamp;
}

export type AdminAction =
  | "approve_verification"
  | "reject_verification"
  | "update_user_role"
  | "delete_user"
  | "resolve_report"
  | "dismiss_report"
  | "delete_job_post"
  | "ban_user"
  | "unban_user"
  | "update_settings"
  | "send_campaign"
  | "bulk_action"
  | "export_data"
  | "login"
  | "logout"
  | "add_verified_alumni"
  | "update_verified_alumni"
  | "delete_verified_alumni"
  | "bulk_import_verified_alumni";

export type TargetType =
  | "verification"
  | "user"
  | "report"
  | "job"
  | "setting"
  | "campaign"
  | "system"
  | "verified_alumni";

/**
 * Log an admin action
 */
export async function logAdminActivity(log: Omit<AdminActivityLog, "id" | "timestamp">) {
  try {
    if (!db) throw new Error("Firestore not initialized");

    const activityLog: AdminActivityLog = {
      ...log,
      timestamp: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, "adminActivityLogs"), activityLog);
    
    console.log("Admin activity logged:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error logging admin activity:", error);
    throw error;
  }
}

/**
 * Get recent admin activity logs
 */
export async function getRecentAdminLogs(limitCount: number = 50) {
  try {
    if (!db) throw new Error("Firestore not initialized");

    const logsQuery = query(
      collection(db, "adminActivityLogs"),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    const snapshot = await getDocs(logsQuery);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date(),
    })) as AdminActivityLog[];
  } catch (error) {
    console.error("Error fetching admin logs:", error);
    throw error;
  }
}

/**
 * Get admin activity logs by admin user
 */
export async function getAdminLogsByUser(adminId: string, limitCount: number = 50) {
  try {
    if (!db) throw new Error("Firestore not initialized");

    const logsQuery = query(
      collection(db, "adminActivityLogs"),
      where("adminId", "==", adminId),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    const snapshot = await getDocs(logsQuery);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date(),
    })) as AdminActivityLog[];
  } catch (error) {
    console.error("Error fetching admin logs by user:", error);
    throw error;
  }
}

/**
 * Get admin activity logs by action type
 */
export async function getAdminLogsByAction(action: AdminAction, limitCount: number = 50) {
  try {
    if (!db) throw new Error("Firestore not initialized");

    const logsQuery = query(
      collection(db, "adminActivityLogs"),
      where("action", "==", action),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    const snapshot = await getDocs(logsQuery);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date(),
    })) as AdminActivityLog[];
  } catch (error) {
    console.error("Error fetching admin logs by action:", error);
    throw error;
  }
}

/**
 * Get admin activity logs by date range
 */
export async function getAdminLogsByDateRange(startDate: Date, endDate: Date, limitCount: number = 100) {
  try {
    if (!db) throw new Error("Firestore not initialized");

    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    const logsQuery = query(
      collection(db, "adminActivityLogs"),
      where("timestamp", ">=", startTimestamp),
      where("timestamp", "<=", endTimestamp),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    const snapshot = await getDocs(logsQuery);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date(),
    })) as AdminActivityLog[];
  } catch (error) {
    console.error("Error fetching admin logs by date range:", error);
    throw error;
  }
}

/**
 * Get action description for display
 */
export function getActionDescription(action: AdminAction): string {
  const descriptions: Record<AdminAction, string> = {
    approve_verification: "Approved verification request",
    reject_verification: "Rejected verification request",
    update_user_role: "Updated user role",
    delete_user: "Deleted user account",
    resolve_report: "Resolved user report",
    dismiss_report: "Dismissed user report",
    delete_job_post: "Deleted job posting",
    ban_user: "Banned user",
    unban_user: "Unbanned user",
    update_settings: "Updated system settings",
    send_campaign: "Sent email campaign",
    bulk_action: "Performed bulk action",
    export_data: "Exported data",
    login: "Logged in",
    logout: "Logged out",
    add_verified_alumni: "Added verified alumni record",
    update_verified_alumni: "Updated verified alumni record",
    delete_verified_alumni: "Deleted verified alumni record",
    bulk_import_verified_alumni: "Bulk imported verified alumni",
  };

  return descriptions[action] || action;
}

/**
 * Get action color for UI
 */
export function getActionColor(action: AdminAction): string {
  const colors: Record<AdminAction, string> = {
    approve_verification: "text-green-400",
    reject_verification: "text-red-400",
    update_user_role: "text-blue-400",
    delete_user: "text-red-500",
    resolve_report: "text-green-400",
    dismiss_report: "text-gray-400",
    delete_job_post: "text-orange-400",
    ban_user: "text-red-500",
    unban_user: "text-green-400",
    update_settings: "text-purple-400",
    send_campaign: "text-cyan-400",
    bulk_action: "text-yellow-400",
    export_data: "text-blue-300",
    login: "text-gray-400",
    logout: "text-gray-400",
    add_verified_alumni: "text-green-400",
    update_verified_alumni: "text-blue-400",
    delete_verified_alumni: "text-red-400",
    bulk_import_verified_alumni: "text-yellow-400",
  };

  return colors[action] || "text-gray-400";
}
