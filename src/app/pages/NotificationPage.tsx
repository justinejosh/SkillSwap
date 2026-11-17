import { authenticatedFetch } from "@/app/lib/api";
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import { ArrowLeft, Loader2, Repeat, Check, X, Trash2 } from "lucide-react";
import { API_BASE_URL } from "@/config";

export default function NotificationPage() {
  const navigate = useNavigate();
  const [error,setError] = useState("");
  const requestSequence = useRef(0);
  const [swaps, setSwaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const userString =
      localStorage.getItem("knoxite_user") || localStorage.getItem("user");
    if (userString) {
      setCurrentUserId(JSON.parse(userString).id);
    }
    void fetchSwaps();
    const sync=()=>{if(document.visibilityState!=="hidden")void fetchSwaps(true);};
    window.addEventListener("focus",sync);window.addEventListener("pageshow",sync);
    const timer=window.setInterval(sync,10000);
    return()=>{requestSequence.current++;window.removeEventListener("focus",sync);window.removeEventListener("pageshow",sync);window.clearInterval(timer);};
  }, []);

  const fetchSwaps = async (quiet = false) => {
    const sequence=++requestSequence.current;
    try {
      if(!quiet)setLoading(true);
      const token =
        localStorage.getItem("knoxite_token") || localStorage.getItem("token");

      const res = await authenticatedFetch(`${API_BASE_URL}/swap-requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "bypass-tunnel-reminder": "true",
        },
      });

      if (res.ok) {
        const data = await res.json();
        if(sequence===requestSequence.current){setSwaps(data);setError("");}
      } else {const data=await res.json();if(sequence===requestSequence.current)setError(data.error||"Unable to load swap requests.");}
    } catch (err) {
      if(sequence===requestSequence.current)setError("Unable to load swap requests. Please retry.");
    } finally {
      if(sequence===requestSequence.current)setLoading(false);
    }
  };

  const handleSwapAction = async (
    swapId: string,
    status: "ACCEPTED" | "REJECTED",
  ) => {
    setActionLoading(swapId);
    try {
      const token = localStorage.getItem("knoxite_token");
      const res = await authenticatedFetch(
        `${API_BASE_URL}/swap-requests/${swapId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ newStatus: status }),
        },
      );

      if (res.ok) {
        const data = await res.json();
        if (status === "ACCEPTED") {
          navigate(`/swap-agreement/${data.redirectId || data.id}`);
        } else {
          fetchSwaps();
        }
      } else {
        const data = await res.json();
        setError(data.error || "Request could not be updated.");
      }
    } catch (err) {
      setError("Unable to update this request. Please retry.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelRequest = async (
    id: string,
    type: "request" | "history",
  ) => {
    const confirmMsg =
      type === "request"
        ? "Are you sure you want to withdraw this pending request?"
        : "Are you sure you want to remove this from your history?";

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(id);
    try {
      const token =
        localStorage.getItem("knoxite_token") || localStorage.getItem("token");
      const res = await authenticatedFetch(`${API_BASE_URL}/swaps/cancel/request/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchSwaps();
      } else {
        setError("The request could not be withdrawn. Refresh and try again.");
      }
    } catch (err) {
      setError("Unable to withdraw this request. Please retry.");
    } finally {
      setActionLoading(null);
    }
  };

  const incomingPending = swaps.filter(
    (s) => s.receiverId === currentUserId && s.status === "PENDING",
  );
  const outgoingRequests = swaps.filter(
    (s) => s.requesterId === currentUserId && s.status === "PENDING",
  );
  const historicalSwaps = swaps.filter((s) => s.status !== "PENDING");

  const renderEmptyState = (message: string) => (
    <div className="py-16 px-6 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 space-y-3">
      <p className="text-base font-black text-slate-900 dark:text-white">
        {message}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
        Explore active student listings on KnoxHub to propose new skill swaps.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate("/knox-hub")}
        className="mt-2 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800"
      >
        Explore KnoxHub
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen knoxite-surface text-slate-900 dark:text-slate-100 font-sans flex flex-col relative overflow-x-hidden transition-colors duration-200">

      {/* FLOATING GLASS HEADER */}
      <div className="sticky top-4 z-30 px-4 sm:px-6">
        <header className="max-w-4xl mx-auto flex items-center justify-between px-4 sm:px-5 py-3.5 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs">
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

            <div
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="size-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-600/25">
                K
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Notifications
                </span>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 pt-8 space-y-6 relative z-10">
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 block">
            Exchange Inquiries
          </span>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Swap Requests
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Review incoming skill swap requests, check sent requests, and
            manage exchange history.
          </p>
        </div>

        {error && <p role="alert" className="rounded-xl border border-red-300 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
        <Tabs defaultValue="incoming" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 h-12 p-1 rounded-2xl shadow-2xs">
            <TabsTrigger
              value="incoming"
              className="rounded-xl font-bold text-xs sm:text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-600 dark:text-slate-300 transition-all"
            >
              Incoming ({incomingPending.length})
            </TabsTrigger>
            <TabsTrigger
              value="outgoing"
              className="rounded-xl font-bold text-xs sm:text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-600 dark:text-slate-300 transition-all"
            >
              Sent ({outgoingRequests.length})
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-xl font-bold text-xs sm:text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-600 dark:text-slate-300 transition-all"
            >
              History ({historicalSwaps.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="space-y-4 mt-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-blue-600 size-8 mb-2" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Loading requests...
                </span>
              </div>
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

          <TabsContent value="outgoing" className="space-y-4 mt-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-blue-600 size-8 mb-2" />
              </div>
            ) : outgoingRequests.length === 0 ? (
              renderEmptyState("You haven't sent any requests yet.")
            ) : (
              outgoingRequests.map((swap) => (
                <SwapRequestItem
                  key={swap.id}
                  swap={swap}
                  isReceiver={false}
                  onCancel={() => handleCancelRequest(swap.id, "request")}
                  isLoading={actionLoading === swap.id}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-blue-600 size-8 mb-2" />
              </div>
            ) : historicalSwaps.length === 0 ? (
              renderEmptyState("No historical records found.")
            ) : (
              historicalSwaps.map((swap) => (
                <SwapRequestItem
                  key={swap.id}
                  swap={swap}
                  isReceiver={swap.receiverId === currentUserId}

                  isLoading={actionLoading === swap.id}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function SwapRequestItem({
  swap,
  isReceiver,
  onAction,
  onCancel,
  isLoading,
}: any) {
  const isPending = swap.status === "PENDING";
  const partner = isReceiver ? swap.requester : swap.receiver;
  const exchangeStatus = swap.linkedSwap?.status || swap.status;
  const labels: Record<string,string> = {PENDING:"Pending",ACCEPTED:"Request accepted",PENDING_AGREEMENT:"Agreement pending",CONFIRMED:"In progress",COMPLETED:"Completed",CANCELLED:"Cancelled",REJECTED:"Declined",WITHDRAWN:"Withdrawn"};

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-3xl border p-5 sm:p-6 shadow-xs transition-all space-y-4 ${
        isPending && isReceiver
          ? "border-blue-300 dark:border-blue-500/50 ring-1 ring-blue-100 dark:ring-blue-900/30"
          : "border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <Avatar className="size-11 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 shrink-0">
            <AvatarImage
              src={
                partner?.avatarUrl ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${partner?.name}`
              }
            />
            <AvatarFallback className="bg-blue-600 text-white font-black rounded-xl text-xs">
              {partner?.name?.[0] || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-white text-base break-words">
              {partner?.name || "Member"}
            </h3>
            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              {isReceiver ? "Incoming Request" : "Outgoing Request"}
            </span>
          </div>
        </div>

        <span
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${
            isPending
              ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60"
              : swap.status === "ACCEPTED"
                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
          }`}
        >
          {labels[exchangeStatus] || exchangeStatus}
        </span>
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 block">
            {isReceiver ? "They Teach You" : "You Learn"}
          </span>
          <span className="font-bold text-blue-600 dark:text-blue-400 block mt-0.5">
            {(isReceiver ? swap.offeredSkill : swap.wantedSkill)?.name ||
              "Selected Skill"}
          </span>
        </div>

        <div className="hidden sm:flex bg-blue-600 text-white p-1 rounded-md shrink-0">
          <Repeat className="size-3" />
        </div>

        <div className="sm:text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 block">
            {isReceiver ? "In Return For" : "You Teach"}
          </span>
          <span className="font-bold text-emerald-700 dark:text-emerald-400 block mt-0.5">
            {(isReceiver ? swap.wantedSkill : swap.offeredSkill)?.name ||
              "Offered Skill"}
          </span>
        </div>
      </div>

      {swap.message && (
        <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50/60 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 italic">
          "{swap.message}"
        </p>
      )}

      {swap.status === "ACCEPTED" && swap.linkedSwap?.id && (
        <div className="flex flex-wrap gap-4"><Link
          className="text-sm text-blue-700 underline dark:text-blue-300"
          to={`/swap-agreement/${swap.linkedSwap.id}`}
        >
          {swap.linkedSwap.status === "PENDING_AGREEMENT" ? "Review Agreement" : "View Agreement"}
        </Link><Link className="text-sm text-blue-700 underline dark:text-blue-300" to={`/swap-details/${swap.linkedSwap.id}`}>View Exchange</Link></div>
      )}
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        {isPending && isReceiver && onAction && (
          <>
            <Button
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold h-10 px-5 shadow-xs"
              onClick={() => onAction(swap.id, "ACCEPTED")}
            >
              {isLoading ? (
                <Loader2 className="animate-spin size-4" />
              ) : (
                <>
                  <Check className="mr-1.5 size-4" /> Accept Proposal
                </>
              )}
            </Button>
            <Button
              disabled={isLoading}
              variant="ghost"
              className="text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-bold h-10 px-4"
              onClick={() => onAction(swap.id, "REJECTED")}
            >
              <X className="mr-1.5 size-4" /> Decline
            </Button>
          </>
        )}

        {onCancel && isPending && !isReceiver && (
          <Button
            variant="ghost"
            disabled={isLoading}
            className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-bold h-10 px-3 ml-auto"
            onClick={onCancel}
          >
            <Trash2 className="mr-1.5 size-4" />
            {isPending ? "Withdraw Request" : "Remove Record"}
          </Button>
        )}
      </div>
    </div>
  );
}
