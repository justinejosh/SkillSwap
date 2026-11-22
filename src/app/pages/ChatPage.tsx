import { LoadingContent } from "@/app/components/PageSkeleton";
import { authenticatedFetch } from "@/app/lib/api";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import {
  ArrowLeft,
  Send,
  Loader2,
  FileCheck,
  MessageSquare,
} from "lucide-react";
import { API_BASE_URL } from "@/config";

export default function ChatPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentUser = JSON.parse(localStorage.getItem("knoxite_user") || "{}");
  const urlPartnerId = searchParams.get("partnerId");
  const urlSwapId = searchParams.get("swapId");

  const handleBackClick = () => {
    if (window.innerWidth < 768 && selectedPartner) {
      setSelectedPartner(null);
    } else {
      navigate("/dashboard");
    }
  };

  useEffect(() => {
    let live = true;
    setLoading(true);
    setLoadError("");
    const fetchConversations = async () => {
      try {
        const token = localStorage.getItem("knoxite_token");
        const res = await authenticatedFetch(`${API_BASE_URL}/swaps`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "bypass-tunnel-reminder": "true",
          },
        });

        if (!res.ok) {
          const problem = await res.json().catch(() => null);
          throw new Error(problem?.error || "Unable to load conversations. Please try again.");
        }
        if (live) {
          const data = await res.json();
          if (!live) return;
          const activeStatuses = ["ACCEPTED", "CONFIRMED", "PENDING_AGREEMENT"];
          const activeSwaps = data.filter((s: any) =>
            activeStatuses.includes(s.status),
          );

          const formatted = activeSwaps.map((s: any) => {
            const partner =
              s.requesterId === currentUser.id ? s.receiver : s.requester;
            return {
              id: partner.id,
              swapId: s.id,
              user: partner.name,
              swapInfo: `${s.offeredSkill.name} ↔ ${s.wantedSkill.name}`,
              avatarFallback: partner.name.charAt(0),
              avatarUrl: partner.avatarUrl,
            };
          });

          setConversations(formatted);

          if (urlPartnerId) {
            const target = formatted.find(
              (c: any) =>
                c.id === urlPartnerId && (!urlSwapId || c.swapId === urlSwapId),
            );
            if (target) setSelectedPartner(target);
          } else if (formatted.length > 0 && !selectedPartner) {
            setSelectedPartner(formatted[0]);
          }
        }
      } catch (err) {
        if (live) setLoadError(err instanceof Error ? err.message : "Unable to load conversations. Please try again.");
      } finally {
        if (live) setLoading(false);
      }
    };
    fetchConversations();
    return () => { live = false; };
  }, [urlPartnerId, urlSwapId, loadAttempt]);

  useEffect(() => {
    if (!selectedPartner) return;

    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem("knoxite_token");
        const res = await authenticatedFetch(
          `${API_BASE_URL}/chat/conversation/${selectedPartner.id}?swapId=${selectedPartner.swapId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "bypass-tunnel-reminder": "true",
            },
          },
        );
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
  }, [selectedPartner?.id, selectedPartner?.swapId]);

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
      const res = await authenticatedFetch(`${API_BASE_URL}/chat/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "bypass-tunnel-reminder": "true",
        },
        body: JSON.stringify({
          receiverId: selectedPartner.id,
          content: messageInput,
          swapId: selectedPartner.swapId,
        }),
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

  const header = <>
      {/* FLOATING GLASS HEADER */}
      <div className="flex-none pt-4 px-4 sm:px-6 z-30">
        <header className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-5 py-3 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackClick}
              className="size-9 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-700 transition-colors shrink-0"
              title="Return"
            >
              <ArrowLeft className="size-5" />
            </Button>

            <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-0.5 hidden sm:block" />

            <div
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="size-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-600/25">
                K
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Chat
                </span>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* CHAT CONTAINER */}
  </>;

  if (loading && conversations.length === 0) return (
    <div className="min-h-dvh knoxite-surface flex flex-col">
      {header}
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6"><LoadingContent layout="messages" label="Loading conversations..." /></main>
    </div>
  );

  if (loadError || conversations.length === 0) {
    return (
      <div className="relative min-h-dvh flex items-center justify-center p-6 text-center knoxite-surface">

        <div className="relative z-10 w-full max-w-sm space-y-4">
          <div className="size-16 rounded-3xl bg-blue-50 dark:bg-slate-900 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-xs border border-blue-100 dark:border-slate-800">
            <MessageSquare aria-hidden="true" className="size-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {loadError ? "Unable to load conversations" : "No Active Swaps Yet"}
            </h2>
            <p role={loadError ? "alert" : undefined} className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {loadError || "Start or accept a skill swap to chat with your partner."}
            </p>
          </div>
          {loadError && <Button variant="outline" className="mr-2" onClick={() => setLoadAttempt(n => n + 1)}>Try again</Button>}
          <Button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 h-11 text-xs font-bold shadow-md shadow-blue-600/20"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen knoxite-surface text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden font-sans relative transition-colors duration-200">

      {header}

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 overflow-hidden min-h-0 relative z-10">
        <div className="grid grid-cols-12 gap-4 h-full min-h-0">
          {/* INBOX SIDEBAR */}
          <Card
            className={`${
              selectedPartner ? "hidden md:flex" : "flex"
            } col-span-12 md:col-span-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-slate-200/90 dark:border-slate-800 flex-col overflow-hidden h-full rounded-3xl shadow-xs`}
          >
            <CardHeader className="flex-none border-b border-slate-100 dark:border-slate-800 px-5 py-4">
              <CardTitle className="text-slate-900 dark:text-white text-xs font-bold uppercase tracking-widest">
                <span>Conversations</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full">
                <div className="space-y-1.5 p-3">
                  {conversations.map((conv) => {
                    const isSelected = selectedPartner?.swapId === conv.swapId;
                    return (
                      <div
                        key={`${conv.id}-${conv.swapId}`}
                        onClick={() => setSelectedPartner(conv)}
                        className={`p-3 rounded-2xl cursor-pointer transition-all border ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/70 border-transparent text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10 rounded-xl ring-1 ring-slate-200/50 dark:ring-slate-700 shrink-0">
                            <AvatarImage
                              src={
                                conv.avatarUrl ||
                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.user}`
                              }
                            />
                            <AvatarFallback
                              className={`font-black rounded-xl text-xs ${
                                isSelected
                                  ? "bg-blue-800 text-white"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                              }`}
                            >
                              {conv.avatarFallback}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3
                              className={`font-bold text-sm truncate ${
                                isSelected
                                  ? "text-white"
                                  : "text-slate-900 dark:text-white"
                              }`}
                            >
                              {conv.user}
                            </h3>
                            <p
                              className={`text-[10px] truncate uppercase font-bold tracking-wider mt-0.5 ${
                                isSelected
                                  ? "text-blue-100"
                                  : "text-slate-400 dark:text-slate-500"
                              }`}
                            >
                              {conv.swapInfo}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* ACTIVE CHAT WORKSPACE */}
          <Card
            className={`${
              !selectedPartner ? "hidden md:flex" : "flex"
            } col-span-12 md:col-span-8 bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 flex flex-col overflow-hidden h-full rounded-3xl shadow-xs`}
          >
            {selectedPartner ? (
              <>
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex-none px-5 py-3.5 bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="size-10 shrink-0 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700">
                        <AvatarImage
                          src={
                            selectedPartner.avatarUrl ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedPartner.user}`
                          }
                        />
                        <AvatarFallback className="bg-blue-600 text-white font-black rounded-xl text-xs">
                          {selectedPartner.avatarFallback}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <CardTitle className="text-sm md:text-base text-slate-900 dark:text-white font-bold truncate">
                          {selectedPartner.user}
                        </CardTitle>
                        <p className="text-[10px] md:text-xs text-blue-600 dark:text-blue-400 font-semibold truncate">
                          {selectedPartner.swapInfo}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate(`/swap-agreement/${selectedPartner.swapId}`)
                      }
                      className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-[10px] md:text-xs gap-1.5 rounded-xl h-8 px-3.5 shrink-0 font-bold"
                    >
                      <FileCheck className="size-3.5 text-blue-600 dark:text-blue-400" />
                      View Exchange
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-hidden p-0 flex flex-col min-h-0 bg-slate-50/40 dark:bg-slate-950/40">
                  <ScrollArea className="flex-1 w-full h-full">
                    <div className="p-4 sm:p-5 space-y-2.5">
                      {messages.map((m) => {
                        const isOwn = m.senderId === currentUser.id;
                        return (
                          <div
                            key={m.id}
                            className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[80%] md:max-w-[65%] px-4 py-2.5 shadow-2xs ${
                                isOwn
                                  ? "bg-blue-600 text-white rounded-2xl rounded-br-sm"
                                  : "bg-slate-200/90 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl rounded-bl-sm"
                              }`}
                            >
                              <p className="text-sm font-normal leading-relaxed whitespace-pre-wrap">
                                {m.content}
                              </p>
                              <span
                                className={`text-[10px] mt-1 block font-medium ${
                                  isOwn
                                    ? "text-blue-200 text-right"
                                    : "text-slate-500 dark:text-slate-400 text-left"
                                }`}
                              >
                                {new Date(m.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={scrollRef} className="h-2" />
                    </div>
                  </ScrollArea>

                  <div className="border-t border-slate-200/80 dark:border-slate-800 p-3 md:p-4 bg-white dark:bg-slate-900 flex-none">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 border-slate-200 dark:border-slate-700 focus-visible:ring-blue-600 bg-slate-50/60 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl h-11 text-xs sm:text-sm font-medium"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 rounded-xl h-11 w-11 shadow-sm shadow-blue-600/20"
                      >
                        <Send className="size-4" />
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-4 text-center text-xs">
                Select an active exchange thread from the left to start
                messaging.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
