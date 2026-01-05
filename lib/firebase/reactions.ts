import {
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "./config";

export interface Reaction {
  emoji: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

// Popular reaction emojis
export const POPULAR_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

// Add reaction to a message
export async function addReaction(
  messageId: string,
  emoji: string,
  userId: string,
  userName: string
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
    const reactions = messageData.reactions || {};

    // Check if user already reacted with this emoji
    if (reactions[emoji]) {
      const users = reactions[emoji].users || [];
      if (users.some((u: any) => u.userId === userId)) {
        // User already reacted with this emoji, don't add again
        return;
      }
    }

    // Add reaction
    const updatedReactions = {
      ...reactions,
      [emoji]: {
        count: (reactions[emoji]?.count || 0) + 1,
        users: [
          ...(reactions[emoji]?.users || []),
          { userId, userName, timestamp: new Date() },
        ],
      },
    };

    await updateDoc(messageRef, {
      reactions: updatedReactions,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error adding reaction:", error);
    throw error;
  }
}

// Remove reaction from a message
export async function removeReaction(
  messageId: string,
  emoji: string,
  userId: string
): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized");

  try {
    const messageRef = doc(db, "messages", messageId);
    const messageSnap = await getDoc(messageRef);

    if (!messageSnap.exists()) {
      throw new Error("Message not found");
    }

    const messageData = messageSnap.data();
    const reactions = { ...(messageData.reactions || {}) };

    if (!reactions[emoji]) {
      return; // No reaction to remove
    }

    const users = reactions[emoji].users || [];
    const updatedUsers = users.filter((u: any) => u.userId !== userId);

    if (updatedUsers.length === 0) {
      // Remove emoji completely if no users left
      delete reactions[emoji];
    } else {
      reactions[emoji] = {
        count: updatedUsers.length,
        users: updatedUsers,
      };
    }

    await updateDoc(messageRef, {
      reactions: Object.keys(reactions).length > 0 ? reactions : {},
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error removing reaction:", error);
    throw error;
  }
}

// Toggle reaction (add if not exists, remove if exists)
export async function toggleReaction(
  messageId: string,
  emoji: string,
  userId: string,
  userName: string
): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized");

  try {
    const messageRef = doc(db, "messages", messageId);
    const messageSnap = await getDoc(messageRef);

    if (!messageSnap.exists()) {
      throw new Error("Message not found");
    }

    const messageData = messageSnap.data();
    const reactions = messageData.reactions || {};

    // Check if user already reacted with this emoji
    if (reactions[emoji]?.users?.some((u: any) => u.userId === userId)) {
      // Remove reaction
      await removeReaction(messageId, emoji, userId);
    } else {
      // Add reaction
      await addReaction(messageId, emoji, userId, userName);
    }
  } catch (error) {
    console.error("Error toggling reaction:", error);
    throw error;
  }
}

// Get all reactions for a message
export async function getMessageReactions(
  messageId: string
): Promise<Record<string, { count: number; users: any[] }>> {
  if (!db) throw new Error("Firestore is not initialized");

  try {
    const messageRef = doc(db, "messages", messageId);
    const messageSnap = await getDoc(messageRef);

    if (!messageSnap.exists()) {
      return {};
    }

    return messageSnap.data().reactions || {};
  } catch (error) {
    console.error("Error getting reactions:", error);
    return {};
  }
}
