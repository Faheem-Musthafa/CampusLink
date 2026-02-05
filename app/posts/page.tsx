"use client";

import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionButton } from "@/components/ui/action-button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { PostCard } from "@/components/ui/post-card";
import { CreatePostModal } from "@/components/posts/CreatePostModal";
import { PostComments } from "@/components/posts/PostComments";
import { useVerificationGuard } from "@/hooks/use-verification-guard";
import { subscribeToFeed, deletePost, PostType } from "@/lib/firebase/posts";
import { getUserData } from "@/lib/firebase/auth";
import { getUserProfile } from "@/lib/firebase/profiles";
import { handleError } from "@/lib/utils/error-handling";
import { Post, User, UserProfile } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Plus,
  Sparkles,
  Trophy,
  Target,
  Megaphone,
  FileText,
  TrendingUp,
  ImageIcon,
  RefreshCw,
} from "lucide-react";

const POST_TYPE_FILTERS: { type: PostType | "all"; label: string; icon: React.ElementType }[] = [
  { type: "all", label: "All Posts", icon: Sparkles },
  { type: "achievement", label: "Achievements", icon: Trophy },
  { type: "milestone", label: "Milestones", icon: Target },
  { type: "announcement", label: "Announcements", icon: Megaphone },
  { type: "article", label: "Articles", icon: FileText },
];

export default function PostsPage() {
  const { user, loading: authLoading } = useVerificationGuard();
  const [userData, setUserData] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<PostType | "all">("all");
  const [activeComments, setActiveComments] = useState<string | null>(null);
  const { toast } = useToast();

  // Load user data
  useEffect(() => {
    if (user) {
      Promise.all([
        getUserData(user.uid),
        getUserProfile(user.uid),
      ])
        .then(([data, profile]) => {
          setUserData(data);
          setUserProfile(profile);
        })
        .catch((error) => {
          handleError(error, "Failed to load user data");
        });
    }
  }, [user]);

  // Subscribe to posts feed
  useEffect(() => {
    const options: { college?: string; limitCount?: number } = {
      limitCount: 20,
    };

    // If user has a college and wants to see college-specific posts
    if (userProfile?.college) {
      // You could add a toggle for college-only view
    }

    const unsubscribe = subscribeToFeed((newPosts) => {
      setPosts(newPosts);
      setLoading(false);
      setRefreshing(false);
    }, options);

    return () => unsubscribe();
  }, [userProfile?.college]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // The subscription will update the posts automatically
    // Just trigger a visual refresh
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      await deletePost(postId);
      toast({
        title: "Post deleted",
        description: "Your post has been removed",
      });
    } catch (error) {
      handleError(error, "Failed to delete post");
      toast({
        title: "Failed to delete",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const filteredPosts = selectedFilter === "all"
    ? posts
    : posts.filter((post) => post.postType === selectedFilter);

  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="xl" message="Loading your feed..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Community Feed</h1>
            <p className="text-muted-foreground mt-1">
              Share achievements and connect with your network
            </p>
          </div>
          <ActionButton
            className="bg-primary text-white"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Post
          </ActionButton>
        </div>

        {/* Create Post Card */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowCreateModal(true)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <UserAvatar
                src={user?.photoURL}
                name={user?.displayName}
                size="lg"
                verified={userData?.role === "alumni" || userData?.role === "mentor"}
              />
              <div className="flex-1">
                <div className="w-full px-4 py-3 bg-muted hover:bg-muted/80 rounded-lg text-muted-foreground text-left transition-colors">
                  Share your achievement or thoughts...
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t gap-2">
              <div className="flex items-center gap-2">
                <ActionButton
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCreateModal(true);
                  }}
                >
                  <ImageIcon className="h-4 w-4 mr-2 text-green-600" />
                  <span className="hidden sm:inline">Photo</span>
                </ActionButton>
                <ActionButton
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCreateModal(true);
                  }}
                >
                  <Trophy className="h-4 w-4 mr-2 text-amber-600" />
                  <span className="hidden sm:inline">Achievement</span>
                </ActionButton>
                <ActionButton
                  variant="ghost"
                  size="sm"
                  className="hidden md:flex"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCreateModal(true);
                  }}
                >
                  <Megaphone className="h-4 w-4 mr-2 text-primary" />
                  <span className="hidden sm:inline">Announce</span>
                </ActionButton>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters and Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide flex-1">
            {POST_TYPE_FILTERS.map((filter) => (
              <button
                key={filter.type}
                onClick={() => setSelectedFilter(filter.type)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  selectedFilter === filter.type
                    ? "bg-primary text-white"
                    : "bg-card text-muted-foreground hover:bg-muted border"
                )}
              >
                <filter.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{filter.label}</span>
              </button>
            ))}
          </div>

          <ActionButton
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </ActionButton>
        </div>

        {/* Posts Feed */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" message="Loading posts..." />
            </div>
          ) : filteredPosts.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={Sparkles}
                  title={selectedFilter === "all" ? "No Posts Yet" : `No ${selectedFilter} Posts`}
                  description={
                    selectedFilter === "all"
                      ? "Be the first to share something with your community!"
                      : `No ${selectedFilter} posts have been shared yet`
                  }
                  action={
                    <ActionButton onClick={() => setShowCreateModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Post
                    </ActionButton>
                  }
                  iconClassName="text-primary"
                />
              </CardContent>
            </Card>
          ) : (
            filteredPosts.map((post) => (
              <div key={post.id}>
                <PostCard
                  post={post}
                  currentUserId={user?.uid}
                  currentUserName={user?.displayName || undefined}
                  currentUserPhoto={user?.photoURL || undefined}
                  onCommentClick={() => setActiveComments(activeComments === post.id ? null : post.id)}
                  onDeleteClick={() => handleDeletePost(post.id)}
                />
                <PostComments
                  postId={post.id}
                  currentUserId={user?.uid}
                  currentUserName={user?.displayName || undefined}
                  currentUserPhoto={user?.photoURL || undefined}
                  currentUserRole={userData?.role}
                  isOpen={activeComments === post.id}
                />
              </div>
            ))
          )}
        </div>

        {/* Trending Section */}
        {posts.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                Trending Topics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {["#Achievement", "#NewJob", "#Promotion", "#Graduation", "#Internship", "#CollegeLife"].map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary/10"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Post Modal */}
        <CreatePostModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            // Posts will automatically update via subscription
          }}
          user={{
            id: user?.uid || "",
            name: user?.displayName || "User",
            photoURL: user?.photoURL || undefined,
            role: userData?.role,
            jobTitle: userProfile?.jobTitle,
            company: userProfile?.currentCompany,
            college: userProfile?.college,
          }}
        />
      </div>
    </MainLayout>
  );
}
