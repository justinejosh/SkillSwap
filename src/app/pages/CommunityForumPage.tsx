import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import { ArrowLeft, MessageCircle, Plus, Search, ThumbsUp, MessageSquare, Lightbulb, BookOpen, Clock, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/config";

// Interface for type safety - 🚀 Added avatarUrl here
interface ForumPost {
  id: number;
  author: string;
  avatarUrl?: string; 
  title: string;
  content: string;
  category: string;
  replies: number;
  likes: number;
  timeAgo: string;
}

export default function CommunityForumPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newPost, setNewPost] = useState({ title: "", content: "", category: "discussion" });
  
  // Single state for all forum data
  const [posts, setPosts] = useState<ForumPost[]>([]);

  // --- 1. DYNAMIC FETCH LOGIC ---
  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE_URL}/board`, { // 🚀 Note: usually this is /api/board depending on your routing setup
        headers: { "bypass-tunnel-reminder": "true" }
      });
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error("Failed to fetch forum posts", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // --- 2. DYNAMIC SEARCH & FILTER ---
  const getFilteredPosts = (category: string) => {
    return posts.filter(post => {
      const matchesCategory = post.category.toLowerCase() === category.toLowerCase();
      const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            post.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  };

  const handleCreatePost = async () => {
    if (!newPost.title || !newPost.content) {
      alert("Please fill in all fields");
      return;
    }

    try {
      const token = localStorage.getItem("knoxite_token");
      const res = await fetch(`${API_BASE_URL}/board/post`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "bypass-tunnel-reminder": "true"
        },
        body: JSON.stringify(newPost)
      });

      if (res.ok) {
        setNewPost({ title: "", content: "", category: "discussion" });
        setIsDialogOpen(false);
        fetchPosts(); // Refresh the list automatically
      }
    } catch (err) {
      console.error("Post creation failed", err);
      alert("Error creating post. Please try again.");
    }
  };

  const renderPostCard = (post: ForumPost) => (
    <Card key={post.id} className="bg-white/90 backdrop-blur border-blue-100 hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Avatar>
              {/* 🚀 FIXED: Added actual AvatarImage for Forum posts */}
              <AvatarImage src={post.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author}`} />
              <AvatarFallback className="bg-blue-200 text-blue-900">
                {post.author.split(" ").map((n: string) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-blue-900 truncate">{post.title}</h3>
                <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 uppercase text-[10px]">
                  {post.category}
                </Badge>
              </div>
              <p className="text-sm text-blue-600">{post.author}</p>
              <p className="text-[10px] text-blue-400 flex items-center gap-1 mt-1">
                <Clock className="size-3" />
                {post.timeAgo}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-blue-800 whitespace-pre-line text-sm md:text-base line-clamp-3">{post.content}</p>
        
        <div className="flex items-center gap-4 pt-3 border-t border-blue-100">
          <Button variant="ghost" size="sm" className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-8">
            <ThumbsUp className="mr-2 size-4" />
            {post.likes}
          </Button>
          <Button variant="ghost" size="sm" className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-8">
            <MessageSquare className="mr-2 size-4" />
            {post.replies}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <header className="bg-white border-b border-blue-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-blue-600">
              <ArrowLeft className="size-6" />
            </Button>
            <div className="flex items-center gap-2">
              <MessageCircle className="size-6 text-blue-600" />
              <h1 className="text-xl font-bold text-blue-900">Community Forum</h1>
            </div>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200">
                <Plus className="md:mr-2 size-4" />
                <span className="hidden md:inline">New Post</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md w-[95vw] rounded-xl">
              <DialogHeader>
                <DialogTitle className="text-blue-900">Start a Discussion</DialogTitle>
                <DialogDescription>Ask a question or share a resource with other Knoxite members.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={newPost.title} onChange={(e) => setNewPost({ ...newPost, title: e.target.value })} className="border-blue-100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select 
                    id="category"
                    className="w-full p-2 rounded-md border border-blue-100 text-sm"
                    value={newPost.category}
                    onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                  >
                    <option value="discussion">Discussion</option>
                    <option value="tips">Tips</option>
                    <option value="resources">Resources</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea id="content" value={newPost.content} onChange={(e) => setNewPost({ ...newPost, content: e.target.value })} className="min-h-32 border-blue-100" />
                </div>
                <Button onClick={handleCreatePost} className="w-full bg-blue-600">Post to Forum</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 space-y-6">
        <Card className="bg-white/90 backdrop-blur border-blue-100 shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 size-5" />
              <Input
                type="search"
                placeholder="Search by title or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-blue-100 focus:ring-blue-500"
              />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="discussion" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-white border border-blue-100">
            <TabsTrigger value="discussion" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <MessageCircle className="mr-2 size-4" /> Discussions
            </TabsTrigger>
            <TabsTrigger value="tips" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Lightbulb className="mr-2 size-4" /> Tips
            </TabsTrigger>
            <TabsTrigger value="resources" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <BookOpen className="mr-2 size-4" /> Resources
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-blue-400">
              <Loader2 className="animate-spin size-10 mb-2" />
              <p>Fetching community posts...</p>
            </div>
          ) : (
            <>
              <TabsContent value="discussion" className="space-y-4">
                {getFilteredPosts("discussion").length > 0 ? getFilteredPosts("discussion").map(renderPostCard) : <p className="text-center py-10 text-blue-400">No discussions found.</p>}
              </TabsContent>
              <TabsContent value="tips" className="space-y-4">
                {getFilteredPosts("tips").length > 0 ? getFilteredPosts("tips").map(renderPostCard) : <p className="text-center py-10 text-blue-400">No tips found.</p>}
              </TabsContent>
              <TabsContent value="resources" className="space-y-4">
                {getFilteredPosts("resources").length > 0 ? getFilteredPosts("resources").map(renderPostCard) : <p className="text-center py-10 text-blue-400">No resources found.</p>}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
}