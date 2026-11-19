import { useAccountTheme } from "@/app/lib/theme";
import { authenticatedFetch } from "@/app/lib/api";
import { MatchResults } from "@/app/components/MatchResults";
import { logoutSession } from "@/app/lib/api";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { useOnboardingTour } from "../utils/useOnboardingTour";
import {
  Bell,
  Loader2,
  MessageSquare,
  Repeat,
  ChevronDown,
  Settings,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { API_BASE_URL } from "@/config";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [dashboardError, setDashboardError] = useState("");
  const [swaps, setSwaps] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const { startTour } = useOnboardingTour();

  const [isDarkMode, toggleDarkMode] = useAccountTheme();

  // Modal State
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [swapMessage, setSwapMessage] = useState(
    "Hi! I saw we have matching skills. Would you be interested in swapping?",
  );
  const [isRequesting, setIsRequesting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");



  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("knoxite_user") || "{}");

    // Redirect admins to their dedicated dashboard
    if (user.role === "ADMIN") {
      navigate("/admin-dashboard", { replace: true });
      return;
    }

    setCurrentUserId(user.id);
    setCurrentUserName(user.name || "Student");
    setCurrentUserEmail(user.email || "");
    setCurrentUserAvatar(
      user.avatarUrl ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name || "User"}`,
    );
    fetchDashboardData();
  }, [navigate]);

  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(() => {
      startTour();
    }, 150);

    return () => clearTimeout(timer);
  }, [isLoading, startTour]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchDashboardData = async () => {
    setDashboardError("");
    try {
      const token = localStorage.getItem("knoxite_token");
      const headers = {
        Authorization: `Bearer ${token}`,
        "bypass-tunnel-reminder": "true",
      };

      const [sRes, mRes, reqRes] = await Promise.all([
        authenticatedFetch(`${API_BASE_URL}/swaps`, { headers }),
        authenticatedFetch(`${API_BASE_URL}/matches`, { headers }),
        authenticatedFetch(`${API_BASE_URL}/swap-requests`, { headers }),
      ]);

      if (sRes.ok) setSwaps(await sRes.json());
      if (mRes.ok) setMatches(await mRes.json());
      else {
        const data = await mRes.json();
        throw new Error(data.error || "Unable to load matches.");
      }

      if (reqRes.ok) {
        const requests = await reqRes.json();
        const user = JSON.parse(localStorage.getItem("knoxite_user") || "{}");
        const hasPending = requests.some(
          (req: any) => req.receiverId === user.id && req.status === "PENDING",
        );
        setHasNewNotifications(hasPending);
      }
    } catch (error) {
      setDashboardError(
        error instanceof Error
          ? error.message
          : "Unable to load dashboard data.",
      );
      console.error("Dashboard Sync Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      try {
        await logoutSession();
      } catch (error) {
        setDashboardError(error instanceof Error ? error.message : "Sign out was not confirmed. Please retry.");
        return;
      }
      localStorage.removeItem("knoxite_token");
      localStorage.removeItem("knoxite_user");
      navigate("/");
    }
  };

  const handleSubmitSwapRequest = async () => {
    if (!selectedMatch) return;
    setIsRequesting(true);
    try {
      const token = localStorage.getItem("knoxite_token");
      const response = await authenticatedFetch(`${API_BASE_URL}/swaps/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "bypass-tunnel-reminder": "true",
        },
        body: JSON.stringify({
          receiverId: selectedMatch.id,
          offeredSkillId: selectedMatch.matchingWantedSkills?.[0]?.id,
          wantedSkillId: selectedMatch.matchingOfferedSkills?.[0]?.id,
          message: swapMessage,
        }),
      });

      if (response.ok) {
        setSuccessMessage(`Request sent to ${selectedMatch.name}!`);
        setTimeout(() => setSuccessMessage(""), 4000);
        setSelectedMatch(null);
        fetchDashboardData();
      } else {
        const data = await response.json();
        setDashboardError(data.error || "Unable to send this swap request.");
      }
    } catch (error: any) {
      setDashboardError(error instanceof Error ? error.message : "Unable to send this swap request. Please retry.");
    } finally {
      setIsRequesting(false);
    }
  };

  const activeRotations = swaps.filter(
    (s) =>
      s.status === "CONFIRMED" ||
      s.status === "PENDING_AGREEMENT" ||
      s.status === "ACCEPTED",
  );



  if (isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center knoxite-surface">
        <Loader2 className="animate-spin text-blue-600 size-8 mb-3" />
        <p className="text-slate-900 dark:text-slate-200 font-bold text-xs uppercase tracking-widest">
          Syncing Knoxite Workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen knoxite-surface text-slate-900 dark:text-slate-100 font-sans flex flex-col relative overflow-x-hidden transition-colors duration-200">
      {/* SUBTLE ARCHITECTURAL GRID */}

      {/* 1. FLOATING GLASS HEADER */}
      <div className="sticky top-4 z-30 px-4 sm:px-6">
        <header className="max-w-7xl mx-auto flex items-center justify-between px-5 py-3 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="size-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-600/25">
              K
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Knoxite
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {successMessage && (
              <Badge className="bg-emerald-600 text-white font-semibold px-3 py-1 rounded-lg mr-2">
                {successMessage}
              </Badge>
            )}

            <div>
              <Button
                id="tour-nav-messages"
                variant="ghost"
                size="icon"
                onClick={() => navigate("/chat")}
                className="size-9 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                title="Messages"
              >
                <MessageSquare className="size-5" />
              </Button>
            </div>

            <div>
              <Button
                id="tour-nav-notifications"
                variant="ghost"
                size="icon"
                onClick={() => navigate("/notification")}
                className="relative size-9 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                title="Notifications"
              >
                <Bell className="size-5" />
                {hasNewNotifications && (
                  <span className="absolute top-2 right-2 size-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                )}
              </Button>
            </div>

            {/* PROFILE TRIGGER & DROPDOWN */}
            <div
              ref={profileMenuRef}
              className="relative pl-1"
            >
              <button
                id="tour-nav-profile"
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className="relative flex items-center justify-center rounded-full transition-transform active:scale-95 focus:outline-none"
                title="Account Menu"
              >
                <Avatar className="size-9 rounded-full ring-2 ring-slate-200/80 dark:ring-slate-700 hover:ring-blue-500 transition-all">
                  <AvatarImage
                    src={currentUserAvatar}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
                    {currentUserName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 size-4 bg-slate-800 dark:bg-slate-700 text-white rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                  <ChevronDown className="size-2.5 stroke-[3]" />
                </span>
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-3 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl p-2.5 space-y-2 z-50 animate-in fade-in-50 zoom-in-95">
                  <div
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      navigate("/profile");
                    }}
                    className="p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer flex items-center gap-3 border-b border-slate-100 dark:border-slate-800"
                  >
                    <Avatar className="size-11 rounded-full ring-1 ring-slate-200 dark:ring-slate-700 shrink-0">
                      <AvatarImage
                        src={currentUserAvatar}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-blue-600 text-white font-bold">
                        {currentUserName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {currentUserName}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                        {currentUserEmail}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        navigate("/profile");
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-left group"
                    >
                      <div className="size-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-transparent group-hover:text-blue-600 flex items-center justify-center transition-colors">
                        <Settings className="size-4" />
                      </div>
                      <span>Account Settings</span>
                    </button>

                    <button
                      type="button"
                      onClick={toggleDarkMode}
                      aria-pressed={isDarkMode}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-transparent group-hover:text-blue-600 flex items-center justify-center transition-colors">
                          {isDarkMode ? (
                            <Sun className="size-4 text-amber-500" />
                          ) : (
                            <Moon className="size-4 text-slate-400" />
                          )}
                        </div>
                        <span>Dark Mode</span>
                      </div>
                      <div
                        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                          isDarkMode
                            ? "bg-blue-600"
                            : "bg-slate-200 dark:bg-slate-700"
                        }`}
                      >
                        <div
                          className={`bg-white size-4 rounded-full shadow-md transform transition-transform ${
                            isDarkMode ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        handleSignOut();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-red-500/25 rounded-xl transition-colors text-left border-t border-slate-100/80 dark:border-slate-800 pt-2.5 group"
                    >
                      <div className="size-7 rounded-lg bg-rose-50 dark:bg-red-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-transparent flex items-center justify-center shrink-0 transition-colors">
                        <LogOut className="size-4" />
                      </div>
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
      </div>

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 pt-8 pb-24 grid grid-cols-1 md:grid-cols-12 gap-8 relative z-10">
        {/* LEFT SIDEBAR NAVIGATION */}
        <aside className="md:col-span-3 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs">
            <nav className="flex flex-col gap-1.5">
              <div>
                <button
                  id="tour-knoxhub"
                  onClick={() => navigate("/knox-hub")}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800/70 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  KnoxHub
                </button>
              </div>

              <div>
                <button
                  id="tour-my-skills"
                  onClick={() => navigate("/my-skills")}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800/70 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  My Skills
                </button>
              </div>

              <div>
                <button
                  id="tour-community-forum"
                  onClick={() => navigate("/community-forum")}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800/70 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Community Forum
                </button>
              </div>

              <div>
                <button
                  id="tour-leaderboard"
                  onClick={() => navigate("/leaderboard")}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800/70 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Leaderboard
                </button>
              </div>
            </nav>
          </div>
        </aside>

        {/* MAIN FEED: ACTIVE SWAPS & COMPATIBLE MATCHES */}
        <main className="md:col-span-9 space-y-10">
          {/* SECTION 1: ACTIVE BILATERAL SWAPS */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Active Swaps
                </h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/notification")}
                className="rounded-xl text-xs font-bold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                View Pending Requests
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeRotations.length === 0 ? (
                <div className="col-span-full p-10 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 space-y-2">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    No active bilateral swaps yet
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Connect with a compatible peer below or explore the KnoxHub
                    board to start your first knowledge exchange.
                  </p>
                </div>
              ) : (
                activeRotations.map((swap) => (
                  <ActiveSwapCard
                    key={swap.id}
                    swap={swap}
                    currentUserId={currentUserId}
                  />
                ))
              )}
            </div>
          </section>

          {/* SECTION 2: COMPATIBLE PEER MATCHES (SKILL RADAR) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Compatible Peer Matches
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/knox-hub")}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl"
              >
                Browse All on KnoxHub
              </Button>
            </div>

            {dashboardError && (
              <p role="alert" className="text-red-700 dark:text-red-300">
                {dashboardError}
              </p>
            )}
            {matches.length === 0 && !dashboardError ? (
              <div className="p-10 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 space-y-3">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No direct matches found right now
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Update your offered and wanted skills inside your "My Skills"
                  tab so Knoxite can pair you with compatible users.
                </p>
                <Button
                  size="sm"
                  onClick={() => navigate("/my-skills")}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs"
                >
                  Update My Skills
                </Button>
              </div>
            ) : (
              <MatchResults
                matches={matches}
                onRequest={setSelectedMatch}
                idPrefix="dashboard-matches"
              />
            )}
          </section>
        </main>
      </div>

      {/* 3. CLEAN FOOTER */}
      <footer className="mt-auto bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 py-4 px-6 z-20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <div className="size-5 bg-blue-600 rounded-md flex items-center justify-center text-white font-black text-[10px]">
              K
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Knoxite
            </span>
          </div>
          {/*about us stuff*/}
        </div>
      </footer>

      {/* 4. REQUEST SWAP DIALOG */}
      <Dialog
        open={!!selectedMatch}
        onOpenChange={(open) => !open && setSelectedMatch(null)}
      >
        <DialogContent className="max-w-[90vw] md:max-w-md rounded-3xl p-6 border-slate-200 dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-black text-slate-900 dark:text-white">
              Send a Swap Request
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Send a skill swap request to{" "}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {selectedMatch?.name}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          {dashboardError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{dashboardError}</p>}

          {selectedMatch && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs my-1">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-400 block">
                  They Teach
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {selectedMatch.matchingOfferedSkills?.[0]?.name ||
                    "Selected Skill"}
                </span>
              </div>
              <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                <Repeat className="size-3.5" />
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-400 block">
                  You Teach
                </span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {selectedMatch.matchingWantedSkills?.[0]?.name ||
                    "Matching Skill"}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2 py-1">
            <Label
              htmlFor="message"
              className="text-[11px] text-slate-600 dark:text-slate-300 uppercase font-bold tracking-wider"
            >
              Introductory Note
            </Label>
            <Input
              id="message"
              value={swapMessage}
              onChange={(e) => setSwapMessage(e.target.value)}
              className="text-sm h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus-visible:ring-blue-600"
            />
          </div>

          <DialogFooter className="flex-row gap-2.5 pt-2">
            <Button
              variant="outline"
              onClick={() => setSelectedMatch(null)}
              className="flex-1 text-xs font-semibold rounded-xl h-11 border-slate-200 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitSwapRequest}
              disabled={isRequesting}
              className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl h-11 shadow-md shadow-blue-600/20"
            >
              {isRequesting ? "Sending Handshake..." : "Send Swap Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActiveSwapCard({ swap, currentUserId }: any) {
  const navigate = useNavigate();
  const isReq = swap.requesterId === currentUserId;
  const partner = isReq ? swap.receiver : swap.requester;
  const mySessions = isReq ? swap.requesterSessions : swap.receiverSessions;
  const totalSessions = swap.sessions || 1;

  const mySkill = isReq
    ? swap.requesterSkill?.name || swap.offeredSkill?.name || "My Skill"
    : swap.receiverSkill?.name || swap.wantedSkill?.name || "My Skill";

  const partnerSkill = isReq
    ? swap.receiverSkill?.name || swap.wantedSkill?.name || "Partner Skill"
    : swap.requesterSkill?.name || swap.offeredSkill?.name || "Partner Skill";

  return (
    <div
      onClick={() =>
        navigate(
          swap.status === "PENDING_AGREEMENT"
            ? `/swap-agreement/${swap.id}`
            : `/swap-details/${swap.id}`,
        )
      }
      className="relative mt-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 pt-6 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500/50 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
    >
      {/* PINNED RIM BADGE */}
      <div className="absolute -top-3.5 left-6 max-w-[calc(100%-3rem)] inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold shadow-2xs group-hover:border-blue-300 dark:group-hover:border-blue-500/50 transition-colors">
        <span className="text-blue-600 dark:text-blue-400 truncate">
          {mySkill}
        </span>
        <span className="text-slate-400 dark:text-slate-500 font-black shrink-0">
          ⇄
        </span>
        <span className="text-emerald-600 dark:text-emerald-400 truncate">
          {partnerSkill}
        </span>
      </div>

      {/* PARTNER ROW */}
      <div className="flex items-center gap-3.5 min-w-0">
        <Avatar className="size-11 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 shrink-0">
          <AvatarImage
            src={
              partner?.avatarUrl ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${partner?.name}`
            }
          />
          <AvatarFallback className="bg-slate-900 dark:bg-slate-800 text-white font-black rounded-xl text-xs">
            {partner?.name?.[0] || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors break-words">
            {partner?.name || "Partner"}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Open your exchange
          </p>
        </div>
      </div>

      {/* SEGMENTED PROGRESS SLICES */}
      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">
            Session Progress
          </span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {mySessions || 0} / {totalSessions} Confirmed by you
          </span>
        </div>

        <div className="flex items-center gap-1.5 w-full">
          {Array.from({ length: totalSessions }).map((_, index) => {
            const isCompleted = index < (mySessions || 0);
            return (
              <div
                key={index}
                className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                  isCompleted ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
