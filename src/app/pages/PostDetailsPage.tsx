import { PageSkeleton } from "@/app/components/PageSkeleton";
import { useVerifiedUser } from "@/app/components/AuthGuard";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/app/components/ui/alert-dialog";
import { toast } from "sonner";
import { authenticatedFetch } from "@/app/lib/api";
import { useState, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Textarea } from "@/app/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import {
  ArrowLeft,
  Clock,
  MessageCircle,
  Send,
  Loader2,
  Trash2,
} from "lucide-react";
import { API_BASE_URL } from "@/config";

export default function PostDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState<any>(null);
  const currentUser = useVerifiedUser();
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const requestVersion = useRef(0);

  useEffect(() => {
    setPost(null);
    setIsLoading(true);
    fetchPostDetails();
    return () => { requestVersion.current++; };
  }, [id]);

  const fetchPostDetails = async () => {
    const version = ++requestVersion.current;
    setError("");
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/forum/posts/${id}`, {
        headers: { "bypass-tunnel-reminder": "true" },
      });
      if (response.ok) {
        const data = await response.json();
        if (version === requestVersion.current) setPost(data);
      } else throw new Error((await response.json()).error || "Unable to load this discussion.");
    } catch (error) {
      if (version === requestVersion.current) setError(error instanceof Error ? error.message : "Unable to load this discussion.");
    } finally {
      if (version === requestVersion.current) setIsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || isSubmitting) return;
    setError("");
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("knoxite_token");
      const response = await authenticatedFetch(`${API_BASE_URL}/forum/posts/${id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newComment }),
      });

      if (response.ok) {
        setNewComment("");
        fetchPostDetails();
      } else throw new Error((await response.json()).error || "Unable to add your reply.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to add your reply.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (isDeleting) return;
    setError("");
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("knoxite_token");
      const response = await authenticatedFetch(`${API_BASE_URL}/forum/posts/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success("Post deleted.");
        navigate("/community-forum");
      } else {
        const data = await response.json();
        setError(data.error || "Failed to delete post.");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to delete this post. Please retry.");
    } finally {
      setIsDeleting(false);
    }
  };


  // Check if current authenticated user is the author
  const isAuthor = !!currentUser && currentUser.id === (post?.authorId || post?.author?.id);
  const canDelete = isAuthor || currentUser?.role === "ADMIN";
    
  if (isLoading) return <PageSkeleton layout="list" label="Loading discussion..." />;


  if (!post) {
    return (
      <div className="flex flex-col h-screen items-center justify-center knoxite-surface space-y-3">
        <p className="text-slate-900 dark:text-white font-black text-xl">
          {error || "Post not found."}
        </p>
        <Button
          variant="outline"
          onClick={() => navigate("/community-forum")}
          className="rounded-xl text-xs font-bold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Return to Forum
        </Button>
        {error&&<Button variant="outline" onClick={()=>{setIsLoading(true);void fetchPostDetails();}}>Retry discussion</Button>}
      </div>
    );
  }

  return (
    <div className="min-h-screen knoxite-surface text-slate-900 dark:text-slate-100 flex flex-col font-sans relative overflow-x-hidden transition-colors duration-200 pb-20">

      {/* 1. FLOATING GLASS HEADER */}
      <div className="sticky top-4 z-30 px-4 sm:px-6">
        <header className="max-w-4xl mx-auto flex items-center justify-between px-4 sm:px-5 py-3.5 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/community-forum")}
              className="size-9 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-700 transition-colors shrink-0"
              title="Return to Community Forum"
            >
              <ArrowLeft className="size-5" />
            </Button>

            <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-0.5 hidden sm:block" />

            <Link
              to="/dashboard"
              aria-label="Knoxite dashboard"
              className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-300"
            >
              <div className="size-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-600/25">
                K
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Thread Details
                </span>
              </div>
            </Link>
          </div>
        </header>
      </div>

      {/* 2. MAIN THREAD CONTENT */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 pt-8 space-y-6 relative z-10">
        {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}
        {/* Main Post (Original Poster) */}
        <Card className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 md:p-8 shadow-xs border-t-4 border-t-blue-600 space-y-6">
          <CardContent className="p-0 space-y-5">
            {/* Author Row + Delete Button */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <Avatar className="size-12 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 shrink-0">
                  <AvatarImage
                    src={
                      post.author.avatarUrl ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author.name}`
                    }
                  />
                  <AvatarFallback className="bg-blue-600 text-white font-black text-xs rounded-xl">
                    {post.author.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">
                    {post.author.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 text-[10px] font-bold uppercase tracking-wider rounded-md">
                      {post.category}
                    </Badge>
                    <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 font-medium">
                      <Clock className="size-3" />
                      {new Date(post.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delete Button (Owner Only) */}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isDeleting}
                  onClick={()=>{setError("");setDeleteOpen(true);}}
                  ref={deleteTriggerRef}
                  className="size-9 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50/70 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors shrink-0"
                  title="Delete Thread"
                  aria-label="Delete Post"
                >
                  {isDeleting ? (
                    <Loader2 className="size-4 animate-spin text-rose-600" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {post.title}
              </h1>
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                {post.content}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 text-xs ml-2">
            <MessageCircle className="size-4 text-blue-600 dark:text-blue-400" />
            {post.comments?.length || 0} Replies
          </h3>

          {/* Comment Input */}
          <Card className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
            <CardContent className="p-4 flex gap-3 items-end">
              <Textarea
                placeholder="Drop a reply..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="resize-none border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-slate-900 dark:text-white text-sm min-h-[60px] rounded-2xl focus-visible:ring-blue-600"
              />
              <Button
                onClick={handleAddComment}
                disabled={isSubmitting || !newComment.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-5 shadow-sm shadow-blue-600/20 shrink-0"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Comment List */}
          <div className="space-y-3">
            {post.comments?.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No replies yet. Start the discussion!
                </p>
              </div>
            ) : (
              post.comments?.map((comment: any) => (
                <Card
                  key={comment.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs"
                >
                  <CardContent className="p-0 flex gap-3.5">
                    <Avatar className="size-9 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 shrink-0 mt-0.5">
                      <AvatarImage
                        src={
                          comment.author?.avatarUrl ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author?.name}`
                        }
                      />
                      <AvatarFallback className="bg-blue-600 text-white text-xs font-bold rounded-xl">
                        {comment.author?.name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm truncate">
                          {comment.author?.name}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                        {comment.content}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
      <AlertDialog open={deleteOpen} onOpenChange={open=>{if(!isDeleting)setDeleteOpen(open);}}><AlertDialogContent onCloseAutoFocus={event=>{event.preventDefault();deleteTriggerRef.current?.focus();}}><AlertDialogHeader><AlertDialogTitle>Delete this post?</AlertDialogTitle><AlertDialogDescription>The post and its replies will be removed. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>{error&&<p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}<AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Keep Post</AlertDialogCancel><AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" disabled={isDeleting} onClick={event=>{event.preventDefault();void handleDeletePost();}}>{isDeleting?"Deleting...":"Delete Post"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
