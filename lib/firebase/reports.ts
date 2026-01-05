import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp,
  orderBy,
  Firestore
} from "firebase/firestore";
import { db } from "./config";
import { UserReport } from "@/types";

// Helper function to ensure db is initialized
const getDb = (): Firestore => {
  if (!db) {
    throw new Error("Firestore is not initialized. Please check your Firebase configuration.");
  }
  return db;
};

interface CreateReportParams {
  reportedUserId: string;
  reportedUserName: string;
  reportedBy: string;
  reporterName: string;
  reason: string;
  description: string;
}

export const createUserReport = async (params: CreateReportParams): Promise<string> => {
  const firestore = getDb();

  try {
    const reportData = {
      ...params,
      type: "user", // Mark as user report type
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(firestore, "userReports"), reportData);
    return docRef.id;
  } catch (error: any) {
    console.error("Error creating user report:", error);
    throw new Error(error.message || "Failed to create user report");
  }
};

// Helper to get user name by ID
const getUserName = async (userId: string): Promise<string> => {
  const firestore = getDb();
  try {
    const userDoc = await getDoc(doc(firestore, "users", userId));
    if (userDoc.exists()) {
      return userDoc.data().displayName || "Unknown User";
    }
    return "Unknown User";
  } catch {
    return "Unknown User";
  }
};

export const getUserReports = async (status?: string): Promise<UserReport[]> => {
  const firestore = getDb();

  try {
    // Fetch from userReports collection
    let userReportsQuery;
    if (status) {
      userReportsQuery = query(
        collection(firestore, "userReports"),
        where("status", "==", status),
        orderBy("createdAt", "desc")
      );
    } else {
      userReportsQuery = query(collection(firestore, "userReports"), orderBy("createdAt", "desc"));
    }

    const userReportsSnapshot = await getDocs(userReportsQuery);
    const userReports = userReportsSnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      collection: "userReports" as const,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
      updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
      reviewedAt: docSnap.data().reviewedAt?.toDate(),
    }));

    // Fetch from chatReports collection (reports made from chat)
    let chatReportsQuery;
    if (status) {
      chatReportsQuery = query(
        collection(firestore, "chatReports"),
        where("status", "==", status),
        orderBy("createdAt", "desc")
      );
    } else {
      chatReportsQuery = query(collection(firestore, "chatReports"), orderBy("createdAt", "desc"));
    }

    const chatReportsSnapshot = await getDocs(chatReportsQuery);
    
    // Convert chat reports to match userReports format
    const chatReportsPromises = chatReportsSnapshot.docs.map(async docSnap => {
      const data = docSnap.data();
      // Get user names if not already present
      const reportedUserName = data.reportedUserName || await getUserName(data.reportedUserId);
      const reporterName = data.reporterName || await getUserName(data.reporterId);
      
      return {
        id: docSnap.id,
        collection: "chatReports" as const,
        reportedUserId: data.reportedUserId,
        reportedUserName,
        reportedBy: data.reporterId,
        reporterName,
        reason: data.reason,
        description: data.description || "",
        status: data.status || "pending",
        type: "chat", // Mark as chat report type
        conversationId: data.conversationId,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || data.createdAt?.toDate() || new Date(),
        reviewedAt: data.reviewedAt?.toDate(),
      };
    });

    const chatReports = await Promise.all(chatReportsPromises);

    // Merge and sort by date
    const allReports = [...userReports, ...chatReports].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    return allReports as UserReport[];
  } catch (error: any) {
    console.error("Error fetching user reports:", error);
    throw new Error(error.message || "Failed to fetch user reports");
  }
};

export const updateReportStatus = async (
  reportId: string,
  status: "pending" | "reviewed" | "resolved" | "dismissed",
  reviewedBy: string,
  action?: string,
  collectionName: "userReports" | "chatReports" = "userReports"
): Promise<void> => {
  const firestore = getDb();

  try {
    const reportRef = doc(firestore, collectionName, reportId);
    await updateDoc(reportRef, {
      status,
      reviewedBy,
      reviewedAt: serverTimestamp(),
      action: action || null,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error("Error updating report status:", error);
    throw new Error(error.message || "Failed to update report status");
  }
};
