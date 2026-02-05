"use client";

import { useState, useEffect, useMemo } from "react";
import { FileText, Briefcase, MessageSquare, Trash2, Eye } from "lucide-react";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/config";
import { PageHeader, DataTable, SearchFilter, StatsCard, StatsGrid, ConfirmDialog } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { logAdminActivity } from "@/lib/firebase/adminLogs";
import { useAuth } from "@/hooks/use-auth";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  postedBy: string;
  postedByName?: string;
  createdAt: Date;
  applicationsCount?: number;
}

interface Post {
  id: string;
  content: string;
  authorId: string;
  authorName?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
  imageUrl?: string;
}

const jobTypeColors: Record<string, string> = {
  "full-time": "bg-green-500/20 text-green-400 border-green-500/30",
  "part-time": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  internship: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  contract: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

export default function ContentPage() {
  const { user: adminUser } = useAuth();
  const [activeTab, setActiveTab] = useState("jobs");
  
  // Jobs state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobSearch, setJobSearch] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState("all");
  const [jobPage, setJobPage] = useState(1);
  const [jobPageSize, setJobPageSize] = useState(10);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [deleteJob, setDeleteJob] = useState<Job | null>(null);

  // Posts state
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postSearch, setPostSearch] = useState("");
  const [postPage, setPostPage] = useState(1);
  const [postPageSize, setPostPageSize] = useState(10);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [deletePost, setDeletePost] = useState<Post | null>(null);

  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchJobs();
    fetchPosts();
  }, []);

  async function fetchJobs() {
    try {
      const db = getDb();
      const snapshot = await getDocs(collection(db, "jobPostings"));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      })) as Job[];
      setJobs(data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setJobsLoading(false);
    }
  }

  async function fetchPosts() {
    try {
      const db = getDb();
      const snapshot = await getDocs(collection(db, "posts"));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      })) as Post[];
      setPosts(data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setPostsLoading(false);
    }
  }

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch =
        !jobSearch ||
        job.title?.toLowerCase().includes(jobSearch.toLowerCase()) ||
        job.company?.toLowerCase().includes(jobSearch.toLowerCase());
      const matchesType = jobTypeFilter === "all" || job.type === jobTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [jobs, jobSearch, jobTypeFilter]);

  const paginatedJobs = useMemo(() => {
    const start = (jobPage - 1) * jobPageSize;
    return filteredJobs.slice(start, start + jobPageSize);
  }, [filteredJobs, jobPage, jobPageSize]);

  const jobTotalPages = Math.ceil(filteredJobs.length / jobPageSize) || 1;

  // Filter posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      return (
        !postSearch ||
        post.content?.toLowerCase().includes(postSearch.toLowerCase()) ||
        post.authorName?.toLowerCase().includes(postSearch.toLowerCase())
      );
    });
  }, [posts, postSearch]);

  const paginatedPosts = useMemo(() => {
    const start = (postPage - 1) * postPageSize;
    return filteredPosts.slice(start, start + postPageSize);
  }, [filteredPosts, postPage, postPageSize]);

  const postTotalPages = Math.ceil(filteredPosts.length / postPageSize) || 1;

  // Handle delete job
  async function handleDeleteJob() {
    if (!deleteJob) return;
    setDeleting(true);

    try {
      const db = getDb();
      await deleteDoc(doc(db, "jobPostings", deleteJob.id));

      await logAdminActivity({
        adminId: adminUser?.uid || "",
        adminEmail: adminUser?.email || "",
        action: "delete_job_post",
        targetType: "job",
        targetId: deleteJob.id,
        details: `Deleted job: ${deleteJob.title} at ${deleteJob.company}`,
      });

      setJobs((prev) => prev.filter((j) => j.id !== deleteJob.id));
      setDeleteJob(null);
    } catch (error) {
      console.error("Error deleting job:", error);
    } finally {
      setDeleting(false);
    }
  }

  // Handle delete post
  async function handleDeletePost() {
    if (!deletePost) return;
    setDeleting(true);

    try {
      const db = getDb();
      await deleteDoc(doc(db, "posts", deletePost.id));

      await logAdminActivity({
        adminId: adminUser?.uid || "",
        adminEmail: adminUser?.email || "",
        action: "bulk_action",
        targetType: "system",
        targetId: deletePost.id,
        details: `Deleted post by ${deletePost.authorName || deletePost.authorId}`,
      });

      setPosts((prev) => prev.filter((p) => p.id !== deletePost.id));
      setDeletePost(null);
    } catch (error) {
      console.error("Error deleting post:", error);
    } finally {
      setDeleting(false);
    }
  }

  const jobColumns = [
    {
      key: "title",
      label: "Job",
      render: (job: Job) => (
        <div>
          <p className="font-medium text-slate-200">{job.title}</p>
          <p className="text-xs text-slate-500">{job.company}</p>
        </div>
      ),
    },
    {
      key: "location",
      label: "Location",
      render: (job: Job) => (
        <span className="text-slate-300">{job.location || "-"}</span>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (job: Job) => (
        <Badge className={jobTypeColors[job.type] || jobTypeColors["full-time"]}>
          {job.type || "full-time"}
        </Badge>
      ),
    },
    {
      key: "postedByName",
      label: "Posted By",
      render: (job: Job) => (
        <span className="text-slate-400">{job.postedByName || "Unknown"}</span>
      ),
    },
    {
      key: "createdAt",
      label: "Posted",
      render: (job: Job) => (
        <span className="text-slate-400">
          {job.createdAt.toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (job: Job) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedJob(job);
            }}
            className="text-slate-400 hover:text-cyan-400"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteJob(job);
            }}
            className="text-slate-400 hover:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const postColumns = [
    {
      key: "content",
      label: "Content",
      render: (post: Post) => (
        <p className="text-slate-200 truncate max-w-xs">
          {post.content?.substring(0, 100) || "No content"}
        </p>
      ),
    },
    {
      key: "authorName",
      label: "Author",
      render: (post: Post) => (
        <span className="text-slate-300">{post.authorName || "Unknown"}</span>
      ),
    },
    {
      key: "likesCount",
      label: "Likes",
      render: (post: Post) => (
        <span className="text-slate-400">{post.likesCount || 0}</span>
      ),
    },
    {
      key: "commentsCount",
      label: "Comments",
      render: (post: Post) => (
        <span className="text-slate-400">{post.commentsCount || 0}</span>
      ),
    },
    {
      key: "createdAt",
      label: "Posted",
      render: (post: Post) => (
        <span className="text-slate-400">
          {post.createdAt.toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (post: Post) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPost(post);
            }}
            className="text-slate-400 hover:text-cyan-400"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setDeletePost(post);
            }}
            className="text-slate-400 hover:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title="Content"
        description="Manage jobs and posts"
        iconColor="cyan"
      />

      {/* Stats */}
      <StatsGrid columns={3}>
        <StatsCard title="Total Jobs" value={jobs.length} icon={Briefcase} color="purple" />
        <StatsCard title="Total Posts" value={posts.length} icon={MessageSquare} color="cyan" />
        <StatsCard
          title="Active This Week"
          value={
            jobs.filter((j) => j.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length +
            posts.filter((p) => p.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length
          }
          icon={FileText}
          color="green"
        />
      </StatsGrid>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800/50">
          <TabsTrigger value="jobs" className="data-[state=active]:bg-slate-700">
            <Briefcase className="w-4 h-4 mr-2" />
            Jobs ({jobs.length})
          </TabsTrigger>
          <TabsTrigger value="posts" className="data-[state=active]:bg-slate-700">
            <MessageSquare className="w-4 h-4 mr-2" />
            Posts ({posts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4 mt-4">
          <SearchFilter
            searchValue={jobSearch}
            onSearchChange={setJobSearch}
            searchPlaceholder="Search jobs..."
            filters={[
              {
                key: "type",
                label: "Type",
                value: jobTypeFilter,
                onChange: setJobTypeFilter,
                options: [
                  { value: "all", label: "All Types" },
                  { value: "full-time", label: "Full Time" },
                  { value: "part-time", label: "Part Time" },
                  { value: "internship", label: "Internship" },
                  { value: "contract", label: "Contract" },
                ],
              },
            ]}
            onClear={() => {
              setJobSearch("");
              setJobTypeFilter("all");
            }}
          />

          <DataTable
            columns={jobColumns}
            data={paginatedJobs}
            loading={jobsLoading}
            emptyMessage="No jobs found"
            currentPage={jobPage}
            totalPages={jobTotalPages}
            pageSize={jobPageSize}
            totalCount={filteredJobs.length}
            onPageChange={setJobPage}
            onPageSizeChange={(size) => {
              setJobPageSize(size);
              setJobPage(1);
            }}
          />
        </TabsContent>

        <TabsContent value="posts" className="space-y-4 mt-4">
          <SearchFilter
            searchValue={postSearch}
            onSearchChange={setPostSearch}
            searchPlaceholder="Search posts..."
            onClear={() => setPostSearch("")}
          />

          <DataTable
            columns={postColumns}
            data={paginatedPosts}
            loading={postsLoading}
            emptyMessage="No posts found"
            currentPage={postPage}
            totalPages={postTotalPages}
            pageSize={postPageSize}
            totalCount={filteredPosts.length}
            onPageChange={setPostPage}
            onPageSizeChange={(size) => {
              setPostPageSize(size);
              setPostPage(1);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* View Job Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Job Details</DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-4 pt-4">
              <div>
                <p className="text-sm text-slate-400">Title</p>
                <p className="text-slate-200 text-lg font-medium">{selectedJob.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Company</p>
                  <p className="text-slate-200">{selectedJob.company}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Location</p>
                  <p className="text-slate-200">{selectedJob.location || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Type</p>
                  <Badge className={jobTypeColors[selectedJob.type] || ""}>
                    {selectedJob.type}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Posted</p>
                  <p className="text-slate-200">{selectedJob.createdAt.toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Post Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Post Details</DialogTitle>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-4 pt-4">
              <div>
                <p className="text-sm text-slate-400">Author</p>
                <p className="text-slate-200">{selectedPost.authorName || selectedPost.authorId}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Content</p>
                <p className="text-slate-200 whitespace-pre-wrap">{selectedPost.content}</p>
              </div>
              {selectedPost.imageUrl && (
                <div>
                  <p className="text-sm text-slate-400 mb-2">Image</p>
                  <img
                    src={selectedPost.imageUrl}
                    alt=""
                    className="rounded-lg max-h-48 object-cover"
                  />
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Likes</p>
                  <p className="text-slate-200">{selectedPost.likesCount || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Comments</p>
                  <p className="text-slate-200">{selectedPost.commentsCount || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Posted</p>
                  <p className="text-slate-200">{selectedPost.createdAt.toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Job Confirmation */}
      <ConfirmDialog
        open={!!deleteJob}
        onOpenChange={() => setDeleteJob(null)}
        title="Delete Job"
        description={`Are you sure you want to delete "${deleteJob?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteJob}
        variant="destructive"
        loading={deleting}
      />

      {/* Delete Post Confirmation */}
      <ConfirmDialog
        open={!!deletePost}
        onOpenChange={() => setDeletePost(null)}
        title="Delete Post"
        description="Are you sure you want to delete this post? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeletePost}
        variant="destructive"
        loading={deleting}
      />
    </div>
  );
}
