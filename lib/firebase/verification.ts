import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  orderBy,
  Firestore
} from "firebase/firestore";
import { db } from "./config";
import { uploadToImgBB } from "@/lib/upload/imgbb";
import { VerificationRequest, VerificationStatus, UserRole } from "@/types";

// Helper function to ensure db is initialized
const getDb = (): Firestore => {
  if (!db) {
    throw new Error("Firestore is not initialized. Please check your Firebase configuration.");
  }
  return db;
};

interface SubmitVerificationRequestParams {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  verificationType: "id_card" | "phone_otp";
  file?: File;
  additionalInfo?: string;
  phoneNumber?: string;
  otp?: string;
}

export const submitVerificationRequest = async (params: SubmitVerificationRequestParams): Promise<string> => {
  const firestore = getDb();

  try {
    let idCardUrl: string | undefined;

    // Upload ID card if provided (using ImgBB - FREE & Unlimited!)
    if (params.file) {
      idCardUrl = await uploadToImgBB(params.file);
    }

    // Verify OTP if provided (mock for now)
    if (params.otp && params.phoneNumber) {
      // TODO: Implement actual OTP verification with Firebase Phone Auth
      // For now, accept any 6-digit OTP as valid
      if (params.otp.length !== 6) {
        throw new Error("Invalid OTP");
      }
    }

    // Create verification request
    const verificationData: any = {
      userId: params.userId,
      userName: params.userName,
      userEmail: params.userEmail,
      userRole: params.userRole,
      verificationType: params.verificationType,
      status: "pending" as VerificationStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (idCardUrl) {
      verificationData.idCardUrl = idCardUrl;
    }

    if (params.phoneNumber) {
      verificationData.phoneNumber = params.phoneNumber;
    }

    if (params.additionalInfo) {
      verificationData.additionalInfo = params.additionalInfo;
    }

    const docRef = await addDoc(collection(firestore, "verificationRequests"), verificationData);

    // Update user's verification status and mark onboarding as complete
    const userRef = doc(firestore, "users", params.userId);
    await updateDoc(userRef, {
      // Persist the selected role so dashboard/guards use the new value right after onboarding
      role: params.userRole,
      verificationStatus: params.verificationType === "phone_otp" ? "approved" : "pending",
      phoneNumber: params.phoneNumber || null,
      phoneVerified: params.verificationType === "phone_otp",
      onboardingComplete: true,
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error: any) {
    console.error("Error submitting verification request:", error);
    throw new Error(error.message || "Failed to submit verification request");
  }
};

export const getVerificationRequests = async (status?: VerificationStatus): Promise<VerificationRequest[]> => {
  const firestore = getDb();

  try {
    let q;
    if (status) {
      // Query with status filter only (no orderBy to avoid index requirement)
      q = query(
        collection(firestore, "verificationRequests"),
        where("status", "==", status)
      );
    } else {
      // Get all verification requests without ordering
      q = query(collection(firestore, "verificationRequests"));
    }

    const snapshot = await getDocs(q);
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      reviewedAt: doc.data().reviewedAt?.toDate(),
    })) as VerificationRequest[];

    // Sort client-side by createdAt descending
    return requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error: any) {
    console.error("Error fetching verification requests:", error);
    throw new Error(error.message || "Failed to fetch verification requests");
  }
};

export const updateVerificationStatus = async (
  requestId: string,
  status: VerificationStatus,
  reviewedBy: string,
  rejectionReason?: string
): Promise<void> => {
  const firestore = getDb();

  try {
    const requestRef = doc(firestore, "verificationRequests", requestId);
    const requestDoc = await getDoc(requestRef);

    if (!requestDoc.exists()) {
      throw new Error("Verification request not found");
    }

    const requestData = requestDoc.data();

    // Update verification request
    await updateDoc(requestRef, {
      status,
      reviewedBy,
      reviewedAt: serverTimestamp(),
      rejectionReason: rejectionReason || null,
      updatedAt: serverTimestamp(),
    });

    // Update user's verification status
    const userRef = doc(firestore, "users", requestData.userId);
    await updateDoc(userRef, {
      verificationStatus: status,
      updatedAt: serverTimestamp(),
    });

    // Update profile verified status if profile exists
    try {
      const profileRef = doc(firestore, "profiles", requestData.userId);
      const profileDoc = await getDoc(profileRef);
      
      if (profileDoc.exists()) {
        await updateDoc(profileRef, {
          verified: status === "approved",
          updatedAt: serverTimestamp(),
        });
      }
    } catch (profileError) {
      console.warn("Profile document does not exist or could not be updated:", profileError);
      // Continue even if profile update fails - verification status is already updated
    }
  } catch (error: any) {
    console.error("Error updating verification status:", error);
    throw new Error(error.message || "Failed to update verification status");
  }
};

export const getUserVerificationStatus = async (userId: string): Promise<VerificationStatus> => {
  const firestore = getDb();

  try {
    const userRef = doc(firestore, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return "unverified";
    }

    return (userDoc.data().verificationStatus as VerificationStatus) || "unverified";
  } catch (error: any) {
    console.error("Error fetching verification status:", error);
    return "unverified";
  }
};
