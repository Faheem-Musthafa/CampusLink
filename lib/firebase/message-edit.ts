import {
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

// Edit time limit in milliseconds (15 minutes)
export const EDIT_TIME_LIMIT = 15 * 60 * 1000;

// Check if a message can be edited
export function canEditMessage(
  messageTimestamp: Date,
  senderId: string,
  currentUserId: string
): { canEdit: boolean; reason?: string } {
  // Only sender can edit their own messages
  if (senderId !== currentUserId) {
    return { canEdit: false, reason: "You can only edit your own messages" };
  }

  // Check if message is within edit time limit
  const timeDiff = Date.now() - messageTimestamp.getTime();
  if (timeDiff > EDIT_TIME_LIMIT) {
    return { canEdit: false, reason: "Edit time limit exceeded (15 minutes)" };
  }

  return { canEdit: true };
}

// Get remaining edit time in seconds
export function getRemainingEditTime(messageTimestamp: Date): number {
  const timeDiff = Date.now() - messageTimestamp.getTime();
  const remaining = EDIT_TIME_LIMIT - timeDiff;
  return Math.max(0, Math.floor(remaining / 1000));
}

// Format remaining time as human-readable string
export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return "Edit time expired";
  
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${secs}s remaining to edit`;
  }
  return `${secs}s remaining to edit`;
}

// Edit a message
export async function editMessage(
  messageId: string,
  newContent: string,
  userId: string
): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized");

  try {
    // Get the message directly from messages collection
    const messageRef = doc(db, "messages", messageId);
    const messageSnap = await getDoc(messageRef);

    if (!messageSnap.exists()) {
      throw new Error("Message not found");
    }

    const messageData = messageSnap.data();

    // Verify user can edit
    const { canEdit, reason } = canEditMessage(
      messageData.createdAt?.toDate() || messageData.timestamp?.toDate() || new Date(),
      messageData.senderId,
      userId
    );

    if (!canEdit) {
      throw new Error(reason || "Cannot edit this message");
    }

    // Don't allow editing if content is the same
    if (messageData.content?.trim() === newContent.trim()) {
      throw new Error("No changes made to message");
    }

    // Update the message
    await updateDoc(messageRef, {
      content: newContent.trim(),
      edited: true,
      editedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error editing message:", error);
    throw error;
  }
}

// Get edit history (for future feature)
export async function getEditHistory(
  messageId: string
): Promise<Array<{ content: string; editedAt: Date }>> {
  // Placeholder for future edit history feature
  // Would require storing edit history in a subcollection
  return [];
}

// Delete message content (soft delete)
export async function deleteMessageContent(
  messageId: string,
  userId: string
): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized");

  try {
    // Get the message directly from messages collection
    const messageRef = doc(db, "messages", messageId);
    const messageSnap = await getDoc(messageRef);

    if (!messageSnap.exists()) {
      throw new Error("Message not found");
    }

    const messageData = messageSnap.data();

    // Verify user owns the message
    if (messageData.senderId !== userId) {
      throw new Error("You can only delete your own messages");
    }

    // Soft delete
    await updateDoc(messageRef, {
      content: "This message was deleted",
      deleted: true,
      deletedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    throw error;
  }
}
