import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Textarea } from "@/app/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { ArrowLeft, Clock, MessageCircle, Send, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/config";

export default function PostDetailsPage() {
  const { id } = useParams(); // Grabs the post ID from the URL
  const navigate = useNavigate();
  
  const [post, setPost] = useState<any>(null);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPostDetails();
  }, [id]);

  const fetchPostDetails = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/forum/posts/${id}`, {
        headers: { "bypass-tunnel-reminder": "true" }
      });
      if (response.ok) {
        setPost(await response.json());
      }
    } catch (error) {
      console.error("Error fetching post:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem("knoxite_token");
      const response = await fetch(`${API_BASE_URL}/forum/posts/${id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ content: newComment })
      });

      if (response.ok) {
        setNewComment("");
        fetchPostDetails(); // Refresh to show the new comment instantly
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-blue-50">
        <Loader2 className="animate-spin text-blue-600 size-10 mb-4" />
        <p className="text-blue-900 font-black italic tracking-tighter uppercase">Loading Thread...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-blue-50">
        <p className="text-blue-900 font-black text-xl">Post not found.</p>
        <Button variant="link" onClick={() => navigate("/community-forum")}>Go back to Forum</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-blue-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/community-forum")} className="text-blue-600 hover:bg-blue-50">
            <ArrowLeft className="size-6" />
          </Button>
          <h1 className="text-xl font-bold text-blue-900">Thread Details</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-6 mt-4">
        {/* Main Post (Original Poster) */}
        <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden border-t-4 border-t-blue-600">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <Avatar className="size-12 shadow-sm ring-2 ring-blue-50">
                <AvatarImage src={post.author.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author.name}`} />
                <AvatarFallback className="bg-blue-900 text-white font-bold">{post.author.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-black text-blue-900 text-lg leading-none">{post.author.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px] uppercase">{post.category}</Badge>
                  <span className="text-xs text-blue-400 flex items-center gap-1">
                    <Clock className="size-3" />
                    {new Date(post.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <h1 className="text-2xl font-black text-blue-950 mb-4">{post.title}</h1>
            <p className="text-blue-800 whitespace-pre-wrap leading-relaxed text-sm md:text-base">
              {post.content}
            </p>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <div className="space-y-4">
          <h3 className="font-black text-blue-900 uppercase tracking-widest flex items-center gap-2 text-sm ml-2">
            <MessageCircle className="size-5 text-blue-500" /> 
            {post.comments.length} Replies
          </h3>

          {/* Comment Input */}
          <Card className="border-blue-100 shadow-sm bg-white/80 backdrop-blur rounded-2xl">
            <CardContent className="p-4 flex gap-3">
              <Textarea 
                placeholder="Drop a reply..." 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="resize-none border-blue-100 focus:border-blue-400 min-h-[60px]"
              />
              <Button 
                onClick={handleAddComment} 
                disabled={isSubmitting || !newComment.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white h-auto rounded-xl px-6"
              >
                {isSubmitting ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
              </Button>
            </CardContent>
          </Card>

          {/* Comment List */}
          <div className="space-y-3">
            {post.comments.map((comment: any) => (
              <Card key={comment.id} className="border-blue-50 shadow-sm rounded-2xl bg-white hover:border-blue-100 transition-colors">
                <CardContent className="p-5 flex gap-4">
                  <Avatar className="size-8 shadow-sm mt-1">
                    {/* 🚀 FIXED: Swapped post.author with comment.author */}
                    <AvatarImage src={comment.author.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author.name}`} />
                    <AvatarFallback className="bg-blue-600 text-white text-xs">{comment.author.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="font-bold text-blue-900 text-sm">{comment.author.name}</span>
                      <span className="text-[10px] text-blue-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-blue-800 text-sm whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}