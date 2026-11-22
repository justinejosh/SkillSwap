import { LoadingContent } from "@/app/components/PageSkeleton";
import { authenticatedFetch } from "@/app/lib/api";
import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { ArrowLeft, Loader2, Plus, X, Search, Filter } from "lucide-react";
import { API_BASE_URL } from "@/config";

export default function CommunityForumPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [postError, setPostError] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // New Post State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("GENERAL");

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoadError("");
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/forum/posts`);
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      } else throw new Error((await response.json()).error || "Unable to load discussions.");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load discussions.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPosting) return;
    setPostError("");
    setIsPosting(true);
    const token = localStorage.getItem("knoxite_token");

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/forum/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, content, category }),
      });

      if (response.ok) {
        setTitle("");
        setContent("");
        setIsCreating(false);
        fetchPosts();
      } else throw new Error((await response.json()).error || "Unable to create your post.");
    } catch (error) {
      setPostError(error instanceof Error ? error.message : "Unable to create your post.");
    } finally {
      setIsPosting(false);
    }
  };

  // Filter posts based on category and title prefix / username
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      // 1. Category Filter
      const matchesCategory =
        selectedCategory === "ALL" || post.category === selectedCategory;

      // 2. Search Query (Author username or startsWith title)
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesCategory;

      const authorName = (post.author?.name || "").toLowerCase();
      const postTitle = (post.title || "").toLowerCase();

      // Check if title starts with the query word OR if author username includes query
      const matchesTitleStart = postTitle.startsWith(q);
      const matchesAuthor = authorName.includes(q);

      return matchesCategory && (matchesTitleStart || matchesAuthor);
    });
  }, [posts, searchQuery, selectedCategory]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("ALL");
  };



  return (
    <div className="min-h-screen knoxite-surface text-slate-900 dark:text-slate-100 font-sans flex flex-col relative overflow-x-hidden transition-colors duration-200">

      {/* 1. FLOATING GLASS HEADER */}
      <div className="sticky top-4 z-30 px-4 sm:px-6">
        <header className="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-5 py-3.5 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="size-9 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-700 transition-colors shrink-0"
              title="Back to Dashboard"
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
                  Community Forum
                </span>
              </div>
            </Link>
          </div>
        </header>
      </div>

      {/* 2. MAIN FORUM CONTAINER */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 pt-8 pb-20 space-y-6 relative z-10">
        {loadError&&posts.length>0&&<div role="alert" className="text-sm text-red-700 dark:text-red-300">{loadError}<Button variant="outline" onClick={()=>void fetchPosts()}>Retry discussions</Button></div>}
        {postError&&<p role="alert" className="text-sm text-red-700 dark:text-red-300">{postError}</p>}
        {/* TOP INTRO & START THREAD BUTTON */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Discussions
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ask technical questions, share study resources, or seek advice from peers.
            </p>
          </div>

          <Button
            onClick={() => setIsCreating(!isCreating)}
            className={`h-11 px-5 rounded-xl font-bold text-xs shrink-0 hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center gap-2 group ${
              isCreating
                ? "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-rose-50/60 dark:hover:bg-rose-950/30 hover:border-rose-200 dark:hover:border-rose-900/50 hover:text-rose-600 dark:hover:text-rose-400 shadow-2xs"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
            }`}
          >
            {isCreating ? (
              <>
                <X className="size-4 text-slate-500 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="size-4" />
                Start a Thread
              </>
            )}
          </Button>
        </div>

        {/* SEARCH & CATEGORY FILTER TOOLBAR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search by Title Start or Username */}
          <div className="relative flex-1">
            <Search className="size-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              aria-label="Search discussions"
              placeholder="Search by title start or author username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 pl-10 pr-9 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm shadow-2xs focus-visible:ring-blue-600"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear discussion search"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="relative sm:w-52 shrink-0">
            <select
              aria-label="Filter discussions by category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs focus:border-blue-600 outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="GENERAL">General Discussion</option>
              <option value="TECH">Tech & Coding</option>
              <option value="DESIGN">Arts & Design</option>
              <option value="ADVICE">Skill Advice</option>
              <option value="OFF-TOPIC">Off-Topic</option>
            </select>
          </div>

          {/* Reset Action (Visible when filtering is active) */}
          {(searchQuery || selectedCategory !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-11 px-3.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl shrink-0"
            >
              Reset
            </Button>
          )}
        </div>

        {/* Create Post Section */}
        {isCreating && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-md space-y-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Start a New Thread
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Share your thoughts or ask for skill advice from the community.
              </p>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                  Topic Category
                </label>
                <select
                  aria-label="Topic Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm font-medium text-slate-900 dark:text-white focus:border-blue-600 outline-none"
                >
                  <option value="GENERAL">General Discussion</option>
                  <option value="TECH">Tech & Coding</option>
                  <option value="DESIGN">Arts & Design</option>
                  <option value="ADVICE">Skill Advice</option>
                  <option value="OFF-TOPIC">Off-Topic</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                  Thread Title
                </label>
                <Input
                  aria-label="Thread Title"
                  placeholder="e.g., Best way to structure Prisma schemas?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus-visible:ring-blue-600"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                  Details
                </label>
                <Textarea
                aria-label="Post content"
                  placeholder="Explain your question or topic in detail..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[120px] rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus-visible:ring-blue-600"
                  required
                />
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  disabled={isPosting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl px-6 h-10 shadow-sm shadow-blue-600/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
                >
                  {isPosting?"Posting...":"Post Thread"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Forum Feed */}
        <div className="space-y-4">
          {isLoading ? <LoadingContent layout="list" label="Loading discussions..." /> : loadError&&posts.length===0 ? <div role="alert" className="space-y-3 rounded-2xl border border-red-200 p-5 text-red-700 dark:border-red-800 dark:text-red-300"><p>{loadError}</p><Button variant="outline" onClick={()=>{setIsLoading(true);void fetchPosts();}}>Retry discussions</Button></div> : posts.length === 0 ? (
            <div className="py-16 px-6 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 space-y-3">
              <p className="text-base font-black text-slate-900 dark:text-white">
                No active discussions yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Be the first to start a thread and spark a conversation with peers on campus.
              </p>
              {!isCreating && (
                <Button
                  onClick={() => setIsCreating(true)}
                  variant="outline"
                  size="sm"
                  className="mt-2 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
                >
                  Create First Thread
                </Button>
              )}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="py-16 px-6 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 space-y-3">
              <p className="text-base font-black text-slate-900 dark:text-white">
                No discussions match your filter
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Try searching for a different keyword or category.
              </p>
              <Button
                onClick={handleResetFilters}
                variant="outline"
                size="sm"
                className="mt-2 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
              >
                Clear Search & Filter
              </Button>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <Link
                key={post.id}
                to={`/community-forum/${post.id}`}
                aria-labelledby={`post-title-${post.id}`}
                className="block bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500/50 transition-colors motion-safe:transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-300 group"
              >
                <div className="flex items-start gap-4">
                  <Avatar className="size-11 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 shrink-0">
                    <AvatarImage
                      src={
                        post.author?.avatarUrl ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author?.name}`
                      }
                    />
                    <AvatarFallback className="bg-blue-600 text-white font-black rounded-xl text-xs">
                      {post.author?.name?.[0]}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                        {post.category}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 id={`post-title-${post.id}`} className="text-lg font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors [overflow-wrap:anywhere]">
                      {post.title}
                    </h3>

                    <p className="text-slate-600 dark:text-slate-300 line-clamp-2 text-sm leading-relaxed [overflow-wrap:anywhere]">
                      {post.content}
                    </p>

                    <div className="flex flex-wrap items-start justify-between gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <span className="min-w-0 flex-1 text-slate-500 dark:text-slate-400 font-medium [overflow-wrap:anywhere]">
                        Posted by{" "}
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {post.author?.name}
                        </span>
                      </span>
                      <span className="shrink-0 font-bold text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/50 px-2.5 py-0.5 rounded-lg border border-transparent dark:border-blue-900/40">
                        {post._count?.comments || 0} Replies
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
