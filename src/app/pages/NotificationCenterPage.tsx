import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { 
  ArrowLeft, Bell, Users, Check, X, Loader2, Search, Trash2 
} from "lucide-react";
import { API_BASE_URL } from "@/config";

export default function NotificationCenterPage() {
  const navigate = useNavigate();
  const [swaps, setSwaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const userString = localStorage.getItem("knoxite_user") || localStorage.getItem("user");
    if (userString) {
      setCurrentUserId(JSON.parse(userString).id);
    }
    fetchSwaps();
  }, []);

  const fetchSwaps = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("knoxite_token") || localStorage.getItem("token");
      
      const res = await fetch(`${API_BASE_URL}/swap-requests`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "bypass-tunnel-reminder": "true"
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setSwaps(data);
      }
    } catch (err) {
      console.error("Fetch Swaps Failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwapAction = async (swapId: string, status: "ACCEPTED" | "REJECTED") => {
  setActionLoading(swapId); 
  try {
    const token = localStorage.getItem("knoxite_token");
    const res = await fetch(`${API_BASE_URL}/swap-requests/${swapId}/status`, {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ newStatus: status })
    });

    if (res.ok) {
      const data = await res.json();
      if (status === "ACCEPTED") {
        // 🚀 Redirect using the redirectId (the actual Swap ID)
        navigate(`/swap-agreement/${data.redirectId || data.id}`);
      } else {
        fetchSwaps();
      }
    }
  } catch (err) {
    console.error("Action Error:", err);
  } finally {
    setActionLoading(null);
  }
};

  // 🚀 Universal Cancellation Handler
  const handleCancelRequest = async (id: string, type: "request" | "history") => {
    const confirmMsg = type === "request" 
      ? "Are you sure you want to withdraw this pending request?" 
      : "Are you sure you want to remove this from your history?";
      
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(id);
    try {
      const token = localStorage.getItem("knoxite_token") || localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/swaps/cancel/request/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        fetchSwaps();
      } else {
        alert("Failed to cancel request.");
      }
    } catch (err) {
      console.error("Cancellation Error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Logic Filters
  const incomingPending = swaps.filter(s => s.receiverId === currentUserId && s.status === "PENDING");
  const outgoingRequests = swaps.filter(s => s.requesterId === currentUserId && s.status === "PENDING");
  const historicalSwaps = swaps.filter(s => s.status !== "PENDING");

  const renderEmptyState = (message: string) => (
    <Card className="bg-white/90 backdrop-blur border-blue-100 shadow-sm py-16">
      <CardContent className="flex flex-col items-center justify-center text-center">
        <div className="p-4 bg-blue-50 rounded-full mb-4">
          <Bell className="size-10 text-blue-300" />
        </div>
        <span className="text-lg font-bold text-blue-900 block">{message}</span>
        <Button variant="outline" onClick={() => navigate("/knox-hub")} className="mt-6 border-blue-200 text-blue-600">
          <Search className="mr-2 size-4" /> Explore KnoxHub
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <header className="bg-white border-b border-blue-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-blue-600">
              <ArrowLeft className="size-6" />
            </Button>
            <h1 className="text-xl font-bold text-blue-900">Notification Center</h1>
          </div>
          <Bell className="size-6 text-blue-300" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <Tabs defaultValue="incoming" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full bg-white border border-blue-100 h-12 rounded-xl">
            <TabsTrigger value="incoming">Incoming</TabsTrigger>
            <TabsTrigger value="outgoing">Sent</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" /></div>
            ) : incomingPending.length === 0 ? (
              renderEmptyState("No new skill swap requests.")
            ) : (
              incomingPending.map((swap) => (
                <SwapRequestItem 
                  key={swap.id} 
                  swap={swap} 
                  isReceiver={true} 
                  onAction={handleSwapAction} 
                  isLoading={actionLoading === swap.id}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="space-y-4">
            {outgoingRequests.length === 0 ? renderEmptyState("You haven't sent any requests.") : 
              outgoingRequests.map((swap) => (
                <SwapRequestItem 
                  key={swap.id} 
                  swap={swap} 
                  isReceiver={false} 
                  onCancel={() => handleCancelRequest(swap.id, "request")}
                  isLoading={actionLoading === swap.id}
                />
              ))
            }
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {historicalSwaps.length === 0 ? renderEmptyState("No historical records.") :
              historicalSwaps.map((swap) => (
                <SwapRequestItem 
                  key={swap.id} 
                  swap={swap} 
                  isReceiver={swap.receiverId === currentUserId} 
                  onCancel={() => handleCancelRequest(swap.id, "history")}
                  isLoading={actionLoading === swap.id}
                />
              ))
            }
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SwapRequestItem({ swap, isReceiver, onAction, onCancel, isLoading }: any) {
  const isPending = swap.status === "PENDING";
  const partner = isReceiver ? swap.requester : swap.receiver;

  return (
    <Card className={`overflow-hidden border-blue-100 shadow-sm transition-all hover:border-blue-300 ${isPending && isReceiver ? "ring-1 ring-blue-400" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* 🚀 FIXED: Replaced generic Users icon with the actual Avatar component */}
          <Avatar className="size-12 shrink-0 border border-blue-100">
            <AvatarImage src={partner?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partner?.name}`} />
            <AvatarFallback className="bg-blue-600 text-white font-bold">{partner?.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-blue-900 text-lg">{partner?.name || "Member"}</span>
              <Badge variant={isPending ? "default" : "secondary"}>{swap.status}</Badge>
            </div>
            <p className="text-sm text-blue-800 mb-4">
              {isReceiver 
                ? `Wants to teach you ${swap.wantedSkill?.name} in exchange for ${swap.offeredSkill?.name}.`
                : `You sent a request to learn ${swap.wantedSkill?.name} from ${partner?.name}.`}
            </p>
            <div className="flex gap-3">
              {isPending && isReceiver && onAction && (
                <>
                  <Button 
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={() => onAction(swap.id, "ACCEPTED")}
                  >
                    {isLoading ? <Loader2 className="animate-spin size-4" /> : <><Check className="mr-2 size-4" /> Accept</>}
                  </Button>
                  <Button 
                    disabled={isLoading}
                    variant="ghost" 
                    className="flex-1 text-red-500 hover:bg-red-50"
                    onClick={() => onAction(swap.id, "REJECTED")}
                  >
                    <X className="mr-2 size-4" /> Decline
                  </Button>
                </>
              )}
              
              {onCancel && (
                <Button 
                  variant="ghost" 
                  disabled={isLoading}
                  className="text-red-500 hover:bg-red-50 text-xs"
                  onClick={onCancel}
                >
                  <Trash2 className="mr-2 size-4" /> 
                  {isPending ? "Withdraw Request" : "Remove from History"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}