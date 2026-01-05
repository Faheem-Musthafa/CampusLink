import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
  onAuthStateChanged,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config";
import { User, UserRole, UserProfile } from "@/types";

export const signUp = async (
  email: string,
  password: string,
  displayName: string,
  role: UserRole
): Promise<FirebaseUser> => {
  if (!auth) {
    throw new Error("Firebase is not initialized. Please check your environment variables.");
  }

  // Validate inputs
  if (!email || !email.includes("@")) {
    throw new Error("Please enter a valid email address");
  }
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }
  if (!displayName || displayName.trim().length === 0) {
    throw new Error("Please enter your full name");
  }

  let userCredential;
  try {
    userCredential = await createUserWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    // Handle Firebase auth errors with user-friendly messages
    let errorMessage = "Failed to create account. ";
    if (error.code === "auth/email-already-in-use") {
      errorMessage += "This email is already registered. Please sign in instead.";
    } else if (error.code === "auth/invalid-email") {
      errorMessage += "Please enter a valid email address.";
    } else if (error.code === "auth/operation-not-allowed") {
      errorMessage += "Email/password accounts are not enabled. Please enable it in Firebase Console → Authentication → Sign-in method.";
    } else if (error.code === "auth/weak-password") {
      errorMessage += "Password is too weak. Please use a stronger password.";
    } else if (error.code === "auth/invalid-api-key") {
      errorMessage += "Firebase API key is invalid. Please check your configuration.";
    } else if (error.code === "auth/configuration-not-found") {
      errorMessage += "Firebase Authentication is not configured properly. Please enable Email/Password authentication in Firebase Console (Authentication → Sign-in method) and verify your .env.local configuration.";
    } else if (error.code === "auth/network-request-failed") {
      errorMessage += "Network error. Please check your internet connection.";
    } else {
      errorMessage += error.message || "An unknown error occurred.";
      console.error("Firebase Auth Error:", error.code, error.message);
    }
    throw new Error(errorMessage);
  }
  const user = userCredential.user;

  if (!db) {
    throw new Error("Firestore is not initialized. Please check your Firebase configuration.");
  }

  await updateProfile(user, { displayName });

  // Create user document in Firestore
  // Remove undefined values as Firestore doesn't accept them
  const userData: any = {
    email: user.email!,
    displayName,
    role,
    emailVerified: false,
    onboardingComplete: false,
    onboardingStep: 1, // Start at role selection
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Only add photoURL if it exists
  if (user.photoURL) {
    userData.photoURL = user.photoURL;
  }

  await setDoc(doc(db, "users", user.uid), userData);

  // Create initial profile document
  const profileData = {
    verified: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, "profiles", user.uid), profileData);

  await sendEmailVerification(user);

  return user;
};

export const signIn = async (email: string, password: string): Promise<FirebaseUser> => {
  if (!auth) {
    throw new Error("Firebase is not initialized. Please check your environment variables.");
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    // Handle Firebase auth errors with user-friendly messages
    let errorMessage = "Failed to sign in. ";
    if (error.code === "auth/user-not-found") {
      errorMessage += "No account found with this email. Please sign up first.";
    } else if (error.code === "auth/wrong-password") {
      errorMessage += "Incorrect password. Please try again.";
    } else if (error.code === "auth/invalid-email") {
      errorMessage += "Please enter a valid email address.";
    } else if (error.code === "auth/user-disabled") {
      errorMessage += "This account has been disabled. Please contact support.";
    } else if (error.code === "auth/invalid-credential") {
      errorMessage += "Invalid email or password. Please try again.";
    } else if (error.code === "auth/invalid-api-key") {
      errorMessage += "Firebase API key is invalid. Please check your configuration.";
    } else if (error.code === "auth/network-request-failed") {
      errorMessage += "Network error. Please check your internet connection.";
    } else {
      errorMessage += error.message || "An unknown error occurred.";
    }
    throw new Error(errorMessage);
  }
};

export const sendPasswordReset = async (email: string): Promise<void> => {
  if (!auth) {
    throw new Error("Firebase is not initialized. Please check your environment variables.");
  }

  if (!email || !email.includes("@")) {
    throw new Error("Please enter a valid email address");
  }

  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    let errorMessage = "Failed to send reset email. ";
    if (error.code === "auth/user-not-found") {
      errorMessage += "No account found with this email.";
    } else if (error.code === "auth/invalid-email") {
      errorMessage += "Please enter a valid email address.";
    } else if (error.code === "auth/network-request-failed") {
      errorMessage += "Network error. Please try again.";
    } else {
      errorMessage += error.message || "An unknown error occurred.";
    }
    throw new Error(errorMessage);
  }
};

export const signOut = async (): Promise<void> => {
  if (!auth) {
    throw new Error("Firebase is not initialized. Please check your environment variables.");
  }
  await firebaseSignOut(auth);
};

export const getCurrentUser = (): FirebaseUser | null => {
  if (!auth) return null;
  return auth.currentUser;
};

export const onAuthStateChange = (callback: (user: FirebaseUser | null) => void) => {
  if (!auth) {
    console.error("Firebase Auth is not initialized");
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

export const getUserData = async (userId: string): Promise<User | null> => {
  if (!db) {
    throw new Error("Firestore is not initialized. Please check your Firebase configuration.");
  }
  
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return null;

    const data = userDoc.data();
    return {
      id: userDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as User;
  } catch (error: any) {
    console.error("Error fetching user data:", error);
    // If Firestore isn't set up yet, return null instead of crashing
    if (error.code === "permission-denied" || error.code === "unavailable") {
      console.warn("Firestore access denied or unavailable. Please check your Firestore setup and security rules.");
      return null;
    }
    throw error;
  }
};

// Handle redirect result after OAuth redirect
export const handleAuthRedirect = async (): Promise<{ user: FirebaseUser; isNewUser: boolean } | null> => {
  if (!auth) return null;
  
  // Quick check - only process if there's a pending redirect
  // This prevents unnecessary network calls on every page load
  const pendingRole = typeof window !== 'undefined' ? sessionStorage.getItem('pendingAuthRole') : null;
  if (!pendingRole) {
    // No pending redirect, return early
    return null;
  }
  
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      // Clear the pending role
      sessionStorage.removeItem('pendingAuthRole');
      
      // Check if this is a new user
      let isNewUser = false;
      if (db) {
        const userDoc = await getDoc(doc(db, "users", result.user.uid));
        isNewUser = !userDoc.exists();
      }
      return { user: result.user, isNewUser };
    }
    return null;
  } catch (error: any) {
    // Silently handle redirect errors - don't throw
    if (process.env.NODE_ENV === 'development') {
      console.error("Redirect auth error:", error);
    }
    return null;
  }
};

// Google Sign In (with fallback to redirect on popup failure)
export const signInWithGoogle = async (role?: UserRole, useRedirect: boolean = false): Promise<{ user: FirebaseUser; isNewUser: boolean } | null> => {
  if (!auth) {
    throw new Error("Firebase is not initialized. Please check your environment variables.");
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account'
  });

  // If redirect mode is requested, use redirect
  if (useRedirect) {
    // Store role in sessionStorage for after redirect
    if (role) {
      sessionStorage.setItem('pendingAuthRole', role);
    }
    await signInWithRedirect(auth, provider);
    return null; // Will redirect, so won't return
  }

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user document exists
    let isNewUser = false;
    if (db) {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      isNewUser = !userDoc.exists();
      
      // If new user, create profile with default role (will be updated in onboarding)
      if (isNewUser) {
        const userData: any = {
          email: user.email!,
          displayName: user.displayName || user.email!.split('@')[0],
          role: role || "student", // Default to student, will be updated in onboarding
          emailVerified: user.emailVerified,
          onboardingComplete: false,
          onboardingStep: 1, // Start at role selection
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (user.photoURL) {
          userData.photoURL = user.photoURL;
        }

        await setDoc(doc(db, "users", user.uid), userData);

        // Create initial profile document
        const profileData = {
          verified: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(doc(db, "profiles", user.uid), profileData);
      }
    }

    return { user, isNewUser };
  } catch (error: any) {
    // If popup fails due to COOP/CORS, try redirect as fallback
    if (error.code === "auth/popup-blocked" || error.code === "auth/popup-closed-by-user") {
      console.log("Popup blocked, falling back to redirect...");
      if (role) {
        sessionStorage.setItem('pendingAuthRole', role);
      }
      await signInWithRedirect(auth, provider);
      return null; // Will redirect
    }
    
    let errorMessage = "Failed to sign in with Google. ";
    if (error.code === "auth/popup-closed-by-user") {
      errorMessage += "Sign-in popup was closed. Please try again.";
    } else if (error.code === "auth/popup-blocked") {
      errorMessage += "Sign-in popup was blocked. Please allow popups for this site.";
    } else if (error.code === "auth/unauthorized-domain") {
      errorMessage += "This domain is not authorized. Please add it to Firebase Console → Authentication → Settings → Authorized domains.";
    } else if (error.code === "auth/cancelled-popup-request") {
      errorMessage += "Sign-in was cancelled.";
    } else {
      errorMessage += error.message || "An unknown error occurred.";
    }
    throw new Error(errorMessage);
  }
};

// GitHub Sign In (with fallback to redirect on popup failure)
export const signInWithGithub = async (role?: UserRole, useRedirect: boolean = false): Promise<{ user: FirebaseUser; isNewUser: boolean } | null> => {
  if (!auth) {
    throw new Error("Firebase is not initialized. Please check your environment variables.");
  }

  const provider = new GithubAuthProvider();
  provider.setCustomParameters({
    allow_signup: 'true'
  });

  // If redirect mode is requested, use redirect
  if (useRedirect) {
    // Store role in sessionStorage for after redirect
    if (role) {
      sessionStorage.setItem('pendingAuthRole', role);
    }
    await signInWithRedirect(auth, provider);
    return null; // Will redirect, so won't return
  }

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user document exists
    let isNewUser = false;
    if (db) {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      isNewUser = !userDoc.exists();
      
      // If new user, create profile with default role (will be updated in onboarding)
      if (isNewUser) {
        const userData: any = {
          email: user.email!,
          displayName: user.displayName || user.email!.split('@')[0],
          role: role || "student", // Default to student, will be updated in onboarding
          emailVerified: user.emailVerified,
          onboardingComplete: false,
          onboardingStep: 1, // Start at role selection
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (user.photoURL) {
          userData.photoURL = user.photoURL;
        }

        await setDoc(doc(db, "users", user.uid), userData);

        // Create initial profile document
        const profileData = {
          verified: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(doc(db, "profiles", user.uid), profileData);
      }
    }

    return { user, isNewUser };
  } catch (error: any) {
    // If popup fails due to COOP/CORS, try redirect as fallback
    if (error.code === "auth/popup-blocked" || error.code === "auth/popup-closed-by-user") {
      console.log("Popup blocked, falling back to redirect...");
      if (role) {
        sessionStorage.setItem('pendingAuthRole', role);
      }
      await signInWithRedirect(auth, provider);
      return null; // Will redirect
    }

    let errorMessage = "Failed to sign in with GitHub. ";
    if (error.code === "auth/popup-closed-by-user") {
      errorMessage += "Sign-in popup was closed. Please try again.";
    } else if (error.code === "auth/popup-blocked") {
      errorMessage += "Sign-in popup was blocked. Please allow popups for this site.";
    } else if (error.code === "auth/unauthorized-domain") {
      errorMessage += "This domain is not authorized. Please add it to Firebase Console → Authentication → Settings → Authorized domains.";
    } else if (error.code === "auth/account-exists-with-different-credential") {
      errorMessage += "An account already exists with the same email. Please sign in with your original provider.";
    } else if (error.code === "auth/cancelled-popup-request") {
      errorMessage += "Sign-in was cancelled.";
    } else {
      errorMessage += error.message || "An unknown error occurred.";
    }
    throw new Error(errorMessage);
  }
};

