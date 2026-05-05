import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { 
  MessageSquare, 
  Plus, 
  Search, 
  MessageCircle, 
  Clock, 
  ArrowLeft,
  Loader2
} from "lucide-react";
import { API_BASE_URL } from "@/config";

export default function CommunityForumPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  // New Post State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("GENERAL");

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/forum/posts`);
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("knoxite_token");

    try {
      const response = await fetch(`${API_BASE_URL}/forum/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ title, content, category })
      });

      if (response.ok) {
        setTitle("");
        setContent("");
        setIsCreating(false);
        fetchPosts(); // Refresh the feed
      }
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-blue-50">
        <Loader2 className="animate-spin text-blue-600 size-10 mb-4" />
        <p className="text-blue-900 font-black italic tracking-tighter uppercase">Loading Discussions...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-blue-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-blue-600">
              <ArrowLeft className="size-6" />
            </Button>
            <h1 className="text-2xl font-bold text-blue-900">Community Forum</h1>
          </div>
          <Button 
            onClick={() => setIsCreating(!isCreating)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6"
          >
            {isCreating ? "Cancel" : "Start a Thread"}
            {!isCreating && <Plus className="ml-2 size-4" />}
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {/* Create Post Section */}
        {isCreating && (
          <Card className="border-blue-200 shadow-md animate-in fade-in slide-in-from-top-4">
            <CardHeader>
              <CardTitle className="text-blue-900">What are you thinking about??</CardTitle>
              <CardDescription>Share your thoughts or ask for skill advice.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePost} className="space-y-4">
                
                {/* 🚀 ADDED THE DROPDOWN HERE */}
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-blue-100 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                >
                  <option value="GENERAL">General Discussion</option>
                  <option value="TECH">Tech & Coding</option>
                  <option value="DESIGN">Arts & Design</option>
                  <option value="ADVICE">Skill Advice</option>
                  <option value="OFF-TOPIC">Off-Topic</option>
                </select>

                <Input 
                  placeholder="Thread Title (e.g., Best way to learn React?)" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-blue-100 focus:border-blue-400"
                  required
                />
                <Textarea 
                  placeholder="Explain more details here..." 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[120px] border-blue-100 focus:border-blue-400"
                  required
                />
                <div className="flex justify-end">
                  <Button type="submit" className="bg-blue-600 text-white px-8">Post Thread</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Forum Feed */}
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="text-center py-20">
              <MessageSquare className="size-12 text-blue-200 mx-auto mb-4" />
              <p className="text-blue-400 font-medium italic">Be the first to start a thread!</p>
            </div>
          ) : (
            posts.map((post) => (
              <Card 
                key={post.id} 
                className="hover:border-blue-300 transition-all cursor-pointer group shadow-sm"
                onClick={() => navigate(`/community-forum/${post.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="size-10 border-2 border-white shadow-sm">
                      <AvatarImage src={post.author.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author.name}`} />
                      <AvatarFallback className="bg-blue-600 text-white">{post.author.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-blue-500 border-blue-100">
                          {post.category}
                        </Badge>
                        <span className="text-xs text-blue-400 flex items-center gap-1">
                          <Clock className="size-3" />
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-blue-900 group-hover:text-blue-600 transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-blue-700 line-clamp-2 text-sm">
                        {post.content}
                      </p>
                      <div className="flex items-center gap-4 pt-3 mt-3 border-t border-blue-50">
                        <div className="flex items-center gap-1 text-blue-500 text-xs font-bold uppercase">
                          <MessageCircle className="size-4" />
                          {post._count.comments} Replies
                        </div>
                        <span className="text-xs text-blue-300">Posted by {post.author.name}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}