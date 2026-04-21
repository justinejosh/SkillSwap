import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router"; // 🚀 Added useSearchParams
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { ArrowLeft, Send, Loader2, FileCheck, MessageSquare } from "lucide-react";
import { API_BASE_URL } from "@/config";

export default function ChatPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); // 🚀 Grab ?partnerId= from URL
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentUser = JSON.parse(localStorage.getItem("knoxite_user") || "{}");
  const urlPartnerId = searchParams.get("partnerId");

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const token = localStorage.getItem("knoxite_token");
        const res = await fetch(`${API_BASE_URL}/swaps`, {
          headers: { 
            "Authorization": `Bearer ${token}`,
            "bypass-tunnel-reminder": "true" 
          }
        });

        if (res.ok) {
          const data = await res.json();
          
          // 🚀 FIX: Allow all active statuses, not just "ACCEPTED"
          const activeStatuses = ["ACCEPTED", "CONFIRMED", "PENDING_AGREEMENT"];
          const activeSwaps = data.filter((s: any) => activeStatuses.includes(s.status));
          
          const formatted = activeSwaps.map((s: any) => {
            const partner = s.requesterId === currentUser.id ? s.receiver : s.requester;
            return {
              id: partner.id,
              swapId: s.id,
              user: partner.name,
              swapInfo: `${s.offeredSkill.name} ↔ ${s.wantedSkill.name}`,
              avatar: partner.name.charAt(0)
            };
          });

          setConversations(formatted);

          // 🚀 AUTO-SELECT logic:
          // 1. If there's an ID in the URL, find that person.
          // 2. Otherwise, pick the first person in the list.
          if (urlPartnerId) {
            const target = formatted.find(c => c.id === urlPartnerId);
            if (target) setSelectedPartner(target);
          } else if (formatted.length > 0 && !selectedPartner) {
            setSelectedPartner(formatted[0]);
          }
        }
      } catch (err) {
        console.error("Error fetching conversations", err);
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, [urlPartnerId]); // Re-run if the URL partner changes

  // ... (Keep your existing fetchMessages and handleSendMessage logic)

  useEffect(() => {
    if (!selectedPartner) return;

    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem("knoxite_token");
        const res = await fetch(`${API_BASE_URL}/chat/conversation/${selectedPartner.id}`, {
          headers: { 
            "Authorization": `Bearer ${token}`,
            "bypass-tunnel-reminder": "true"
          }
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.error("Fetch messages failed", err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [selectedPartner?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedPartner) return;

    try {
      const token = localStorage.getItem("knoxite_token");
      const res = await fetch(`${API_BASE_URL}/chat/send`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "bypass-tunnel-reminder": "true"
        },
        body: JSON.stringify({ 
          receiverId: selectedPartner.id, 
          content: messageInput 
        })
      });

      if (res.ok) {
        const sentMsg = await res.json();
        setMessages((prev) => [...prev, sentMsg]);
        setMessageInput("");
      }
    } catch (err) {
      console.error("Send failed", err);
    }
  };

  // Rendering logic below...
  if (loading) {
    return (
      <div className="h-screen bg-blue-50 flex flex-col items-center justify-center">
        <Loader2 className="size-10 text-blue-600 animate-spin mb-4" />
        <p className="text-blue-900 font-medium">Syncing Encryption...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="h-screen bg-blue-50 flex flex-col items-center justify-center p-6 text-center">
        <MessageSquare className="size-16 text-blue-200 mb-4" />
        <h2 className="text-2xl font-black text-blue-900 mb-2 italic">NO ACTIVE CHATS</h2>
        <p className="text-blue-600 mb-6 text-sm">Start a rotation to begin messaging your peers.</p>
        <Button onClick={() => navigate("/dashboard")} className="bg-blue-600 hover:bg-blue-700 rounded-xl px-8 font-bold">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex flex-col overflow-hidden font-sans">
      <header className="bg-white border-b border-blue-100 shadow-sm flex-none">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-blue-600">
              <ArrowLeft className="size-6" />
            </Button>
            <h1 className="text-xl font-black text-blue-900 italic tracking-tighter uppercase">Messages</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto p-2 md:p-4 overflow-hidden min-h-0">
        <div className="grid grid-cols-12 gap-4 h-full min-h-0">
          
          <Card className="hidden md:flex col-span-4 bg-white/90 backdrop-blur border-blue-100 flex-col overflow-hidden h-full rounded-2xl">
            <CardHeader className="flex-none border-b"><CardTitle className="text-blue-900 text-sm font-black uppercase tracking-widest">Inbox</CardTitle></CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full">
                <div className="space-y-1 p-2">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedPartner(conv)}
                      className={`p-3 rounded-xl cursor-pointer transition-all border ${
                        selectedPartner?.id === conv.id ? "bg-blue-600 text-white border-blue-700 shadow-md" : "hover:bg-blue-50 border-transparent text-blue-900"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10 border border-white/20">
                          <AvatarFallback className="bg-blue-900 text-white font-bold">{conv.avatar}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-bold text-sm truncate ${selectedPartner?.id === conv.id ? "text-white" : "text-blue-900"}`}>{conv.user}</h3>
                          <p className={`text-[10px] truncate uppercase font-bold tracking-tighter ${selectedPartner?.id === conv.id ? "text-blue-100" : "text-blue-400"}`}>{conv.swapInfo}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="col-span-12 md:col-span-8 bg-white shadow-xl border-blue-100 flex flex-col overflow-hidden h-full rounded-2xl">
            {selectedPartner ? (
              <>
                <CardHeader className="border-b border-blue-100 flex-none p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="size-10 shrink-0 ring-2 ring-blue-50">
                        <AvatarFallback className="bg-blue-600 text-white font-black">{selectedPartner.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <CardTitle className="text-sm md:text-base text-blue-900 font-bold truncate">{selectedPartner.user}</CardTitle>
                        <p className="text-[10px] md:text-xs text-blue-500 font-medium truncate">{selectedPartner.swapInfo}</p>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate(`/swap-agreement/${selectedPartner.swapId}`)}
                      className="border-blue-200 text-blue-600 hover:bg-blue-50 text-[10px] md:text-xs gap-1.5 rounded-xl h-8 px-3 shrink-0 font-bold"
                    >
                      <FileCheck className="size-3.5" />
                      View Deal
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-hidden p-0 flex flex-col min-h-0 bg-blue-50/10">
                  <ScrollArea className="flex-1 w-full h-full">
                    <div className="p-4 space-y-4">
                      {messages.map((m) => {
                        const isOwn = m.senderId === currentUser.id;
                        return (
                          <div key={m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-3 shadow-sm ${isOwn ? "bg-blue-600 text-white rounded-tr-none" : "bg-white text-blue-900 rounded-tl-none border border-blue-50"}`}>
                              <p className="text-sm leading-relaxed">{m.content}</p>
                              <span className={`text-[9px] mt-1 block opacity-70 font-bold ${isOwn ? "text-right" : "text-left"}`}>
                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={scrollRef} className="h-2" />
                    </div>
                  </ScrollArea>

                  <div className="border-t border-blue-100 p-3 md:p-4 bg-white flex-none">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="Message peer..."
                        className="flex-1 border-blue-100 focus-visible:ring-blue-600 bg-blue-50/20 rounded-xl h-10 md:h-12 font-medium"
                      />
                      <Button type="submit" size="icon" className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 rounded-xl h-10 w-10 md:h-12 md:w-12 shadow-md shadow-blue-100">
                        <Send className="size-5" />
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-blue-300 p-4 text-center italic">
                Select a rotation to start messaging.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}