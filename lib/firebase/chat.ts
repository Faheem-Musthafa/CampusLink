import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  limit,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  DocumentData,
} from "firebase/firestore";
import { db } from "./config";
import { ChatMessage, Conversation } from "@/types";

// ============================================
// CONVERSATION FUNCTIONS
// ============================================

/**
 * Create a new conversation between participants
 */
export const createConversation = async (participantIds: string[]): Promise<string> => {
  if (!db) throw new Error("Firestore is not initialized");

  const docRef = await addDoc(collection(db, "conversations"), {
    participants: participantIds,
    pinnedBy: [],
    archivedBy: [],
    mutedBy: [],
    clearedBy: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

/**
 * Get a single conversation by ID
 */
export const getConversation = async (conversationId: string): Promise<Conversation | null> => {
  if (!db) throw new Error("Firestore is not initialized");

  const conversationDoc = await getDoc(doc(db, "conversations", conversationId));
  if (!conversationDoc.exists()) return null;

  return parseConversation(conversationDoc.id, conversationDoc.data());
};

/**
 * Get conversation between two users
 */
export const getConversationBetweenUsers = async (
  userId1: string,
  userId2: string
): Promise<Conversation | null> => {
  if (!db) throw new Error("Firestore is not initialized");

  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", userId1)
  );

  const snapshot = await getDocs(q);
  const conversation = snapshot.docs.find(
    (doc) => doc.data().participants.includes(userId2) && doc.data().participants.length === 2
  );

  if (!conversation) return null;
  return parseConversation(conversation.id, conversation.data());
};

/**
 * Get all conversations for a user
 */
export const getUserConversations = async (userId: string): Promise<Conversation[]> => {
  if (!db) throw new Error("Firestore is not initialized");

  try {
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", userId),
      orderBy("updatedAt", "desc")
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => parseConversation(doc.id, doc.data()));
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "failed-precondition" || err.message?.includes("index")) {
      console.error("Firestore index required for conversations query");
      return [];
    }
    throw error;
  }
};

/**
 * Pin or unpin a conversation for a user
 */
export const togglePinConversation = async (
  conversationId: string,
  userId: string,
  pin: boolean
): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized");

  const conversationRef = doc(db, "conversations", conversationId);
  
  await updateDoc(conversationRef, {
    pinnedBy: pin ? arrayUnion(userId) : arrayRemove(userId),
  });
};

/**
 * Archive or unarchive a conversation for a user
 */
export const toggleArchiveConversation = async (
  conversationId: string,
  userId: string,
  archive: boolean
): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized");

  const conversationRef = doc(db, "conversations", conversationId);
  
  await updateDoc(conversationRef, {
    archivedBy: archive ? arrayUnion(userId) : arrayRemove(userId),
  });
};

/**
 * Mute or unmute a conversation for a user
 */
export const toggleMuteConversation = async (
  conversationId: string,
  userId: string,
  mute: boolean
): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized");

  const conversationRef = doc(db, "conversations", conversationId);
  
  await updateDoc(conversationRef, {
    mutedBy: mute ? arrayUnion(userId) : arrayRemove(userId),
  });
};

/**
 * Clear conversation history for a user (marks timestamp)
 */
export const clearConversationHistory = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized");

  const conversationRef = doc(db, "conversations", conversationId);
  
  await updateDoc(conversationRef, {
    [`clearedBy.${userId}`]: serverTimestamp(),
  });
};

// ============================================
// MESSAGE FUNCTIONS
// ============================================

/**
 * Send a new message
 */
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  receiverId: string,
  content: string,
  messageType: "text" | "file" | "system" | "image" | "voice" | "video" | "document" = "text",
  mediaData?: {
    mediaUrl?: string;
    mediaType?: string;
    mediaSize?: number;
    thumbnailUrl?: string;
    duration?: number;
  },
  linkPreview?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
    favicon?: string;
  },
  replyTo?: string
): Promise<string> => {
  if (!db) throw new Error("Firestore is not initialized");

  const messageData: Record<string, unknown> = {
    conversationId,
    senderId,
    receiverId,
    content,
    read: false,
    messageType,
    status: "sent",
    timestamp: serverTimestamp(),
    ...mediaData,
  };

  if (linkPreview) messageData.linkPreview = linkPreview;
  if (replyTo) messageData.replyTo = replyTo;

  const docRef = await addDoc(collection(db, "messages"), messageData);

  // Update conversation last message
  await updateDoc(doc(db, "conversations", conversationId), {
    lastMessage: {
      content,
      timestamp: serverTimestamp(),
      senderId,
    },
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

/**
 * Get messages for a conversation
 */
export const getMessages = async (
  conversationId: string,
  limitCount: number = 50
): Promise<ChatMessage[]> => {
  if (!db) throw new Error("Firestore is not initialized");

  const q = query(
    collection(db, "messages"),
    where("conversationId", "==", conversationId),
    orderBy("timestamp", "desc"),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((doc) => parseMessage(doc.id, doc.data()))
    .reverse();
};

/**
 * Subscribe to messages in real-time
 */
export const subscribeToMessages = (
  conversationId: string,
  callback: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  if (!db) {
    onError?.(new Error("Firestore is not initialized"));
    return () => {};
  }

  const q = query(
    collection(db, "messages"),
    where("conversationId", "==", conversationId),
    orderBy("timestamp", "desc"),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs
        .map((doc) => parseMessage(doc.id, doc.data()))
        .reverse();
      callback(messages);
    },
    (error) => {
      console.error("Message subscription error:", error);
      onError?.(error);
    }
  );
};

/**
 * Mark a single message as read
 */
export const markMessageAsRead = async (messageId: string): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized");

  await updateDoc(doc(db, "messages", messageId), {
    read: true,
    status: "read",
    readAt: serverTimestamp(),
  });
};

/**
 * Mark all unread messages in conversation as delivered
 */
export const markConversationMessagesDelivered = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized");

  const q = query(
    collection(db, "messages"),
    where("conversationId", "==", conversationId),
    where("receiverId", "==", userId),
    where("status", "==", "sent")
  );

  const snapshot = await getDocs(q);
  await Promise.all(
    snapshot.docs.map((docSnap) =>
      updateDoc(doc(db!, "messages", docSnap.id), {
        status: "delivered",
        deliveredAt: serverTimestamp(),
      })
    )
  );
};

/**
 * Mark all unread messages in conversation as read
 */
export const markConversationMessagesRead = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized");

  const q = query(
    collection(db, "messages"),
    where("conversationId", "==", conversationId),
    where("receiverId", "==", userId),
    where("read", "==", false)
  );

  const snapshot = await getDocs(q);
  await Promise.all(
    snapshot.docs.map((docSnap) =>
      updateDoc(doc(db!, "messages", docSnap.id), {
        read: true,
        status: "read",
        readAt: serverTimestamp(),
      })
    )
  );
};

/**
 * Delete a message (soft delete)
 */
export const deleteMessage = async (messageId: string, userId: string): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized");

  const messageRef = doc(db, "messages", messageId);
  const messageSnap = await getDoc(messageRef);
  
  if (!messageSnap.exists()) {
    throw new Error("Message not found");
  }
  
  const messageData = messageSnap.data();
  if (messageData.senderId !== userId) {
    throw new Error("You can only delete your own messages");
  }

  await updateDoc(messageRef, {
    deleted: true,
    content: "This message was deleted",
    deletedAt: serverTimestamp(),
  });
};

// ============================================
// BLOCK USER FUNCTIONS
// ============================================

/**
 * Block a user
 */
export const blockUser = async (blockerId: string, blockedUserId: string): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized");

  // Check if already blocked
  const existing = await isUserBlocked(blockerId, blockedUserId);
  if (existing) return;

  await addDoc(collection(db, "blockedUsers"), {
    blockerId,
    blockedUserId,
    blockedAt: serverTimestamp(),
  });
};

/**
 * Unblock a user
 */
export const unblockUser = async (blockerId: string, blockedUserId: string): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized");

  const q = query(
    collection(db, "blockedUsers"),
    where("blockerId", "==", blockerId),
    where("blockedUserId", "==", blockedUserId)
  );

  const snapshot = await getDocs(q);
  await Promise.all(
    snapshot.docs.map((docSnap) => deleteDoc(doc(db!, "blockedUsers", docSnap.id)))
  );
};

/**
 * Check if a user is blocked
 */
export const isUserBlocked = async (blockerId: string, blockedUserId: string): Promise<boolean> => {
  if (!db) throw new Error("Firestore is not initialized");

  const q = query(
    collection(db, "blockedUsers"),
    where("blockerId", "==", blockerId),
    where("blockedUserId", "==", blockedUserId)
  );

  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

// ============================================
// REPORT FUNCTIONS
// ============================================

/**
 * Report a conversation/user
 */
export const reportConversation = async (
  conversationId: string,
  reporterId: string,
  reportedUserId: string,
  reason: string,
  description?: string
): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized");

  await addDoc(collection(db, "chatReports"), {
    conversationId,
    reporterId,
    reportedUserId,
    reason,
    description: description || "",
    status: "pending",
    createdAt: serverTimestamp(),
  });
};

// ============================================
// UNREAD COUNT FUNCTIONS
// ============================================

/**
 * Get unread message count for a user
 */
export const getUnreadMessageCount = async (userId: string): Promise<number> => {
  if (!db) throw new Error("Firestore is not initialized");

  try {
    const q = query(
      collection(db, "messages"),
      where("receiverId", "==", userId),
      where("read", "==", false)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }
};

/**
 * Subscribe to unread count changes
 */
export const subscribeToUnreadCount = (
  userId: string,
  callback: (count: number) => void
): (() => void) => {
  if (!db) {
    callback(0);
    return () => {};
  }

  const q = query(
    collection(db, "messages"),
    where("receiverId", "==", userId),
    where("read", "==", false)
  );

  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.size),
    (error) => {
      console.error("Error subscribing to unread count:", error);
      callback(0);
    }
  );
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function parseConversation(id: string, data: DocumentData): Conversation {
  return {
    id,
    participants: data.participants || [],
    pinnedBy: data.pinnedBy || [],
    archivedBy: data.archivedBy || [],
    mutedBy: data.mutedBy || [],
    clearedBy: data.clearedBy || {},
    lastMessage: data.lastMessage
      ? {
          ...data.lastMessage,
          timestamp: data.lastMessage.timestamp?.toDate() || new Date(),
        }
      : undefined,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

function parseMessage(id: string, data: DocumentData): ChatMessage {
  return {
    id,
    conversationId: data.conversationId,
    senderId: data.senderId,
    receiverId: data.receiverId,
    content: data.content,
    read: data.read || false,
    messageType: data.messageType || "text",
    status: data.status,
    timestamp: data.timestamp?.toDate() || new Date(),
    deliveredAt: data.deliveredAt?.toDate(),
    readAt: data.readAt?.toDate(),
    mediaUrl: data.mediaUrl,
    mediaType: data.mediaType,
    mediaSize: data.mediaSize,
    thumbnailUrl: data.thumbnailUrl,
    duration: data.duration,
    linkPreview: data.linkPreview,
    reactions: data.reactions,
    replyTo: data.replyTo,
    forwarded: data.forwarded,
    forwardedFrom: data.forwardedFrom,
    originalMessageId: data.originalMessageId,
    edited: data.edited,
    editedAt: data.editedAt?.toDate(),
    deleted: data.deleted,
    starred: data.starred,
    lastStarredAt: data.lastStarredAt?.toDate(),
  };
}

