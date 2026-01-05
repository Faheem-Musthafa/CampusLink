"use client";

import "./chat.css";
import { MainLayout } from "@/components/layout/main-layout";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useVerificationGuard } from "@/hooks/use-verification-guard";
import { useEffect, useState, useRef, useCallback } from "react";
import { Conversation, ChatMessage } from "@/types";
import {
  getUserConversations,
  subscribeToMessages,
  sendMessage,
  togglePinConversation,
  toggleArchiveConversation,
  toggleMuteConversation,
  deleteMessage,
  blockUser,
  reportConversation,
  clearConversationHistory,
  markConversationMessagesRead,
} from "@/lib/firebase/chat";
import { getUserData } from "@/lib/firebase/auth";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Send,
  Search,
  MoreVertical,
  Pin,
  Archive,
  Bell,
  Trash2,
  BellOff,
  Flag,
  Ban,
  PinOff,
  ArchiveX,
  ArrowLeft,
  CheckCheck,
  Check,
  Inbox,
} from "lucide-react";

// User cache
const userCache: Record<string, { displayName: string; photoURL?: string }> = {};

export default function ChatPage() {
  const { user, loading: authLoading } = useVerificationGuard();
  const { toast } = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<"inbox" | "archived">("inbox");

  // Core state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Loading states
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // User data
  const [conversationUsers, setConversationUsers] = useState<Record<string, { displayName: string; photoURL?: string }>>({});

  // Dialog states
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load conversations
  useEffect(() => {
    if (!user || authLoading) return;

    let isMounted = true;

    const loadConversations = async () => {
      try {
        setLoadingConversations(true);
        const convs = await getUserConversations(user.uid);
        if (isMounted) {
          setConversations(convs);

          const userIds = new Set<string>();
          convs.forEach((conv) => {
            conv.participants.forEach((id) => {
              if (id !== user.uid && !userCache[id]) userIds.add(id);
            });
          });

          const userData: Record<string, { displayName: string; photoURL?: string }> = { ...userCache };
          await Promise.all(
            Array.from(userIds).map(async (id) => {
              try {
                const data = await getUserData(id);
                if (data) {
                  userData[id] = { displayName: data.displayName, photoURL: data.photoURL };
                  userCache[id] = userData[id];
                }
              } catch {
                console.error("Failed to fetch user:", id);
              }
            })
          );
          if (isMounted) setConversationUsers(userData);
        }
      } catch (error) {
        console.error("Failed to load conversations:", error);
        toast({ title: "Error", description: "Failed to load conversations", variant: "destructive" });
      } finally {
        if (isMounted) setLoadingConversations(false);
      }
    };

    loadConversations();
    return () => { isMounted = false; };
  }, [user, authLoading, toast]);

  // Subscribe to messages
  useEffect(() => {
    if (!selectedConversation || !user) return;

    setLoadingMessages(true);
    const unsubscribe = subscribeToMessages(
      selectedConversation.id,
      (msgs) => {
        // Filter messages based on clearedBy timestamp
        const clearedAt = selectedConversation.clearedBy?.[user.uid];
        let filteredMsgs = msgs;
        if (clearedAt) {
          const clearTime = clearedAt.toDate ? clearedAt.toDate() : new Date(clearedAt);
          filteredMsgs = msgs.filter((m) => m.timestamp > clearTime);
        }
        setMessages(filteredMsgs);
        setLoadingMessages(false);
        setTimeout(scrollToBottom, 100);
      },
      (error) => {
        console.error("Message subscription error:", error);
        setLoadingMessages(false);
      }
    );

    markConversationMessagesRead(selectedConversation.id, user.uid).catch(console.error);
    return () => unsubscribe();
  }, [selectedConversation, user, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const getOtherUser = (conv: Conversation) => {
    const otherId = conv.participants.find((p) => p !== user?.uid);
    return otherId ? conversationUsers[otherId] : null;
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user || sendingMessage) return;

    const content = newMessage.trim();
    setNewMessage("");
    setSendingMessage(true);

    try {
      const receiverId = selectedConversation.participants.find((p) => p !== user.uid);
      if (!receiverId) throw new Error("Receiver not found");

      await sendMessage(selectedConversation.id, user.uid, receiverId, content);
      const convs = await getUserConversations(user.uid);
      setConversations(convs);
    } catch (error) {
      console.error("Failed to send message:", error);
      setNewMessage(content);
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    } finally {
      setSendingMessage(false);
      inputRef.current?.focus();
    }
  };

  const reloadConversations = async () => {
    if (!user) return;
    try {
      const convs = await getUserConversations(user.uid);
      setConversations(convs);
      if (selectedConversation) {
        const updated = convs.find((c) => c.id === selectedConversation.id);
        if (updated) setSelectedConversation(updated);
      }
    } catch (error) {
      console.error("Failed to reload:", error);
    }
  };

  // Action handlers
  const handlePinConversation = async () => {
    if (!selectedConversation || !user) return;
    try {
      const isPinned = selectedConversation.pinnedBy?.includes(user.uid) || false;
      await togglePinConversation(selectedConversation.id, user.uid, !isPinned);
      toast({ title: isPinned ? "Unpinned" : "Pinned" });
      await reloadConversations();
    } catch (error) {
      console.error("Pin error:", error);
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
  };

  const handleMuteConversation = async () => {
    if (!selectedConversation || !user) return;
    try {
      const isMuted = selectedConversation.mutedBy?.includes(user.uid) || false;
      await toggleMuteConversation(selectedConversation.id, user.uid, !isMuted);
      toast({ title: isMuted ? "Unmuted" : "Muted" });
      await reloadConversations();
    } catch (error) {
      console.error("Mute error:", error);
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
  };

  const handleArchiveConversation = async () => {
    if (!selectedConversation || !user) return;
    try {
      const isArchived = selectedConversation.archivedBy?.includes(user.uid) || false;
      await toggleArchiveConversation(selectedConversation.id, user.uid, !isArchived);
      toast({ title: isArchived ? "Unarchived" : "Archived" });
      await reloadConversations();
      if (!isArchived) setSelectedConversation(null);
    } catch (error) {
      console.error("Archive error:", error);
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
  };

  const handleClearHistory = async () => {
    if (!selectedConversation || !user) return;
    setSubmittingAction(true);
    try {
      await clearConversationHistory(selectedConversation.id, user.uid);
      toast({ title: "Cleared", description: "Chat history cleared" });
      setShowClearDialog(false);
      // Update selected conversation to trigger message filter
      await reloadConversations();
      setMessages([]);
    } catch (error) {
      console.error("Clear error:", error);
      toast({ title: "Error", description: "Failed to clear", variant: "destructive" });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleBlockUser = async () => {
    if (!selectedConversation || !user) return;
    const otherUserId = selectedConversation.participants.find((p) => p !== user.uid);
    if (!otherUserId) return;

    setSubmittingAction(true);
    try {
      await blockUser(user.uid, otherUserId);
      toast({ title: "Blocked", description: "User has been blocked" });
      setShowBlockDialog(false);
      setSelectedConversation(null);
      await reloadConversations();
    } catch (error) {
      console.error("Block error:", error);
      toast({ title: "Error", description: "Failed to block", variant: "destructive" });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReportConversation = async () => {
    if (!selectedConversation || !user || !reportReason) return;
    const otherUserId = selectedConversation.participants.find((p) => p !== user.uid);
    if (!otherUserId) return;

    setSubmittingAction(true);
    try {
      await reportConversation(selectedConversation.id, user.uid, otherUserId, reportReason, reportDescription);
      toast({ title: "Reported", description: "Report submitted" });
      setShowReportDialog(false);
      setReportReason("");
      setReportDescription("");
    } catch (error) {
      console.error("Report error:", error);
      toast({ title: "Error", description: "Failed to report", variant: "destructive" });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return;
    try {
      await deleteMessage(messageId, user.uid);
      toast({ title: "Deleted" });
    } catch (error) {
      console.error("Delete error:", error);
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const otherUser = getOtherUser(conv);
    return otherUser?.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const inboxConversations = filteredConversations.filter(
    (conv) => !conv.archivedBy?.includes(user?.uid || "")
  );

  const archivedConversations = filteredConversations.filter(
    (conv) => conv.archivedBy?.includes(user?.uid || "")
  );

  const displayedConversations = activeTab === "inbox" ? inboxConversations : archivedConversations;

  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)]">
          <MessageSquare className="h-16 w-16 text-gray-400 mb-4" />
          <p className="text-gray-600">Please sign in to access messages</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="h-[calc(100vh-80px)] flex bg-white rounded-xl shadow-sm border overflow-hidden">
        {/* Sidebar */}
        <div className={`w-full md:w-80 lg:w-96 border-r flex flex-col bg-gray-50 ${selectedConversation ? "hidden md:flex" : "flex"}`}>
          {/* Header */}
          <div className="p-4 bg-white border-b">
            <h1 className="text-xl font-bold text-gray-900 mb-3">Messages</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b bg-white">
            <button
              onClick={() => setActiveTab("inbox")}
              className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === "inbox"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Inbox className="h-4 w-4" />
              Inbox
              {inboxConversations.length > 0 && (
                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">
                  {inboxConversations.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("archived")}
              className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === "archived"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Archive className="h-4 w-4" />
              Archived
              {archivedConversations.length > 0 && (
                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                  {archivedConversations.length}
                </span>
              )}
            </button>
          </div>

          {/* Conversation List */}
          <ScrollArea className="flex-1">
            {loadingConversations ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : displayedConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  {activeTab === "inbox" ? (
                    <MessageSquare className="h-8 w-8 text-gray-400" />
                  ) : (
                    <Archive className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <p className="text-gray-600 font-medium">
                  {activeTab === "inbox" ? "No conversations yet" : "No archived chats"}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {activeTab === "inbox"
                    ? "Start a conversation from a user profile"
                    : "Archived conversations will appear here"}
                </p>
              </div>
            ) : (
              <div>
                {displayedConversations.map((conv) => {
                  const otherUser = getOtherUser(conv);
                  const isPinned = conv.pinnedBy?.includes(user.uid);
                  const isMuted = conv.mutedBy?.includes(user.uid);
                  const isSelected = selectedConversation?.id === conv.id;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`p-4 cursor-pointer transition-all border-b border-gray-100 ${
                        isSelected
                          ? "bg-blue-50 border-l-4 border-l-blue-500"
                          : "hover:bg-white border-l-4 border-l-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={otherUser?.photoURL}
                          name={otherUser?.displayName || "User"}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-semibold text-gray-900 truncate text-sm">
                              {otherUser?.displayName || "Unknown User"}
                            </span>
                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                              {isPinned && <Pin className="h-3.5 w-3.5 text-blue-500" />}
                              {isMuted && <BellOff className="h-3.5 w-3.5 text-gray-400" />}
                            </div>
                          </div>
                          {conv.lastMessage && (
                            <p className="text-sm text-gray-500 truncate">
                              {conv.lastMessage.content}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {conv.lastMessage?.timestamp
                              ? new Date(conv.lastMessage.timestamp).toLocaleDateString()
                              : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col bg-white ${selectedConversation ? "flex" : "hidden md:flex"}`}>
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="h-16 px-4 border-b flex items-center justify-between bg-white flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-full"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <UserAvatar
                    src={getOtherUser(selectedConversation)?.photoURL}
                    name={getOtherUser(selectedConversation)?.displayName || "User"}
                    size="md"
                  />
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {getOtherUser(selectedConversation)?.displayName || "Unknown User"}
                    </h2>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                      <MoreVertical className="h-5 w-5 text-gray-600" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handlePinConversation(); }} className="cursor-pointer">
                      {selectedConversation.pinnedBy?.includes(user.uid) ? (
                        <><PinOff className="h-4 w-4 mr-2" />Unpin</>
                      ) : (
                        <><Pin className="h-4 w-4 mr-2" />Pin conversation</>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleMuteConversation(); }} className="cursor-pointer">
                      {selectedConversation.mutedBy?.includes(user.uid) ? (
                        <><Bell className="h-4 w-4 mr-2" />Unmute</>
                      ) : (
                        <><BellOff className="h-4 w-4 mr-2" />Mute</>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleArchiveConversation(); }} className="cursor-pointer">
                      {selectedConversation.archivedBy?.includes(user.uid) ? (
                        <><ArchiveX className="h-4 w-4 mr-2" />Unarchive</>
                      ) : (
                        <><Archive className="h-4 w-4 mr-2" />Archive</>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setShowClearDialog(true)} className="cursor-pointer">
                      <Trash2 className="h-4 w-4 mr-2" />Clear history
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setShowReportDialog(true)} className="cursor-pointer text-orange-600">
                      <Flag className="h-4 w-4 mr-2" />Report
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setShowBlockDialog(true)} className="cursor-pointer text-red-600">
                      <Ban className="h-4 w-4 mr-2" />Block user
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-white">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <LoadingSpinner />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                      <MessageSquare className="h-10 w-10 text-blue-400" />
                    </div>
                    <p className="text-gray-600 font-medium">No messages yet</p>
                    <p className="text-sm text-gray-400 mt-1">Send a message to start chatting</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-w-2xl mx-auto">
                    {messages.map((message) => {
                      const isOwn = message.senderId === user.uid;
                      return (
                        <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`group relative max-w-[70%] px-4 py-2.5 rounded-2xl shadow-sm ${
                              isOwn
                                ? "bg-blue-500 text-white rounded-br-sm"
                                : "bg-white text-gray-900 border border-gray-100 rounded-bl-sm"
                            } ${message.deleted ? "opacity-60 italic" : ""}`}
                          >
                            <p className="whitespace-pre-wrap break-words text-[15px]">{message.content}</p>
                            <div className={`flex items-center justify-end gap-1.5 mt-1 text-xs ${isOwn ? "text-blue-100" : "text-gray-400"}`}>
                              <span>{message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                              {isOwn && !message.deleted && (
                                message.status === "read" ? <CheckCheck className="h-3.5 w-3.5" /> :
                                message.status === "delivered" ? <CheckCheck className="h-3.5 w-3.5 opacity-70" /> :
                                <Check className="h-3.5 w-3.5 opacity-70" />
                              )}
                            </div>
                            {isOwn && !message.deleted && (
                              <button
                                onClick={() => handleDeleteMessage(message.id)}
                                className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t bg-white flex-shrink-0">
                <div className="flex items-end gap-3 max-w-2xl mx-auto">
                  <Textarea
                    ref={inputRef}
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1 min-h-[48px] max-h-32 resize-none rounded-xl border-gray-200 focus:border-blue-400"
                    rows={1}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                    size="lg"
                    className="h-12 w-12 rounded-xl p-0"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-b from-gray-50 to-white">
              <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mb-6">
                <MessageSquare className="h-12 w-12 text-blue-400" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Select a conversation</h2>
              <p className="text-gray-500 max-w-sm">Choose from your existing conversations or start a new one from a user profile</p>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear chat history?</DialogTitle>
            <DialogDescription>Messages will be hidden from your view. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleClearHistory} disabled={submittingAction}>
              {submittingAction ? <LoadingSpinner size="sm" /> : "Clear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block this user?</DialogTitle>
            <DialogDescription>You will not receive messages from this user anymore.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBlockUser} disabled={submittingAction}>
              {submittingAction ? <LoadingSpinner size="sm" /> : "Block"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report conversation</DialogTitle>
            <DialogDescription>Help us understand what is wrong.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Reason</label>
              <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="w-full mt-1 border rounded-lg p-2.5">
                <option value="">Select a reason</option>
                <option value="spam">Spam</option>
                <option value="harassment">Harassment</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="scam">Scam or fraud</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Details (optional)</label>
              <Textarea value={reportDescription} onChange={(e) => setReportDescription(e.target.value)} placeholder="Provide more details..." className="mt-1" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>Cancel</Button>
            <Button onClick={handleReportConversation} disabled={!reportReason || submittingAction}>
              {submittingAction ? <LoadingSpinner size="sm" /> : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

