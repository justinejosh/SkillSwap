import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { ArrowLeft, Trash2, Loader2 } from "lucide-react";
import { api } from "@/app/lib/api";
import {
  AssessmentBadge,
  AssessmentLegend,
} from "@/app/components/AssessmentBadge";
import { AssessmentPrompt } from "@/app/components/AssessmentPrompt";
import { SkillPresetInput } from "@/app/components/SkillPresetInput";

export default function MySkillsPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [prompt, setPrompt] = useState<{ offeringId: string } | null>(null);
  const [isAddSkillOpen, setIsAddSkillOpen] = useState(false);
  const [skillType, setSkillType] = useState<"offer" | "want">("offer");
  const [offeredSkills, setOfferedSkills] = useState<any[]>([]);
  const [wantedSkills, setWantedSkills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState("technology");
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>();
  const [activeTab, setActiveTab] = useState<"offered" | "wanted">("offered");

  useEffect(() => {
    fetchMySkills();
  }, []);
  useEffect(() => { if (isAddSkillOpen) setSelectedPresetKey(undefined); }, [isAddSkillOpen]);

  const fetchMySkills = async () => {
    try {
      const data = await api("/profile");
      setOfferedSkills(data.offeredSkills);
      setWantedSkills(data.wantedSkills);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };
  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!selectedPresetKey) { setError("Choose a predefined skill before saving."); return; }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const saved = await api(`/profile/skills/${skillType}`, {
        method: "POST",
        body: JSON.stringify({ presetKey: selectedPresetKey }),
      });
      setIsAddSkillOpen(false);
      setNewSkillName("");
      setSelectedPresetKey(undefined);
      await fetchMySkills();
      if (
        skillType === "offer" &&
        saved.offering?.tier === "NOT_ASSESSED" &&
        saved.offering.basicAvailable &&
        !saved.offering.basicPromptDismissed
      )
        setPrompt({ offeringId: saved.offering.id });
      else if (skillType === "offer" && !saved.offering?.basicAvailable)
        setNotice(
          "Teaching skill saved. Assessment is unavailable for this skill. You can still teach and participate in swaps.",
        );
      else setNotice("Skill saved.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const handleDeleteSkill = async (id: string, type: "offer" | "want") => {
    if (
      !confirm(
        "Remove this skill? Earned tiers and assessment history will be retained.",
      )
    )
      return;
    setError("");
    try {
      await api(`/profile/skills/${type}/${id}`, { method: "DELETE" });
      await fetchMySkills();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const categories = [
    { value: "technology", label: "Technology" },
    { value: "creative", label: "Creative" },
    { value: "music", label: "Music" },
    { value: "language", label: "Language" },
    { value: "lifestyle", label: "Lifestyle" },
    { value: "business", label: "Business" },
    { value: "academic", label: "Academic" },
    { value: "other", label: "Other" },
  ];

  const renderEmptyState = (message: string, defaultType: "offer" | "want") => (
    <div className="col-span-full py-16 px-6 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 space-y-3">
      <p className="text-base font-black text-slate-900 dark:text-white">
        {message}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
        Add skills to your matrix so KnoxHub can pair you with compatible peers.
      </p>
      <Button
        onClick={() => {
          setSkillType(defaultType);
          setIsAddSkillOpen(true);
        }}
        variant="outline"
        size="sm"
        className="mt-2 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800"
      >
        Add Your First Skill
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-[#F8FAFC] dark:bg-slate-950">
        <Loader2 className="animate-spin size-8 text-blue-600 mb-3" />
        <span className="text-slate-900 dark:text-slate-200 font-bold text-xs uppercase tracking-widest">
          Loading Skill Matrix...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E5F2FA] via-[#E5F2FA] via-70% to-[#F8FAFC] dark:bg-none dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col relative overflow-x-hidden transition-colors duration-200">
      {/* SUBTLE ARCHITECTURAL GRID */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f080_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f080_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b50_1px,transparent_1px),linear-gradient(to_bottom,#1e293b50_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none" />

      {/* 1. FLOATING GLASS HEADER */}
      <div className="sticky top-4 z-30 px-4 sm:px-6">
        <header className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-5 py-3.5 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs">
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
                  My Skills
                </span>
              </div>
            </div>
          </div>

          <Dialog open={isAddSkillOpen} onOpenChange={setIsAddSkillOpen}>
            <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-xl font-black text-slate-900 dark:text-white">
                  Add New Skill
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Add a skill you can teach or want to learn.
                </DialogDescription>
              </DialogHeader>

              <form className="space-y-4 mt-2" onSubmit={handleAddSkill}>
                <div className="space-y-1.5">
                  <Label htmlFor="skill-direction" className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Exchange Direction
                  </Label>
                  <Select
                    value={skillType}
                    onValueChange={(val: any) => setSkillType(val)}
                  >
                    <SelectTrigger id="skill-direction" className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 h-11 rounded-xl text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                      <SelectItem value="offer">
                        Teaches (Offer a skill)
                      </SelectItem>
                      <SelectItem value="want">
                        Wants to Learn (Request a skill)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="skill-category" className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Domain Category
                  </Label>
                  <Select
                    value={newSkillCategory}
                    onValueChange={(category) => {
                      setNewSkillCategory(category);
                      if (selectedPresetKey) setNewSkillName("");
                      setSelectedPresetKey(undefined);
                    }}
                  >
                    <SelectTrigger id="skill-category" className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 h-11 rounded-xl text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <SkillPresetInput value={newSkillName} category={newSkillCategory}
                  onChange={(name, category, key) => { setNewSkillName(name); setNewSkillCategory(category); setSelectedPresetKey(key); }} />

                {error && (
                  <p role="alert" className="text-sm text-red-700">
                    {error}
                  </p>
                )}
                <Button
                  disabled={saving || !selectedPresetKey}
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 h-11 font-bold text-xs text-white rounded-xl shadow-md shadow-blue-600/20 mt-2"
                >
                  {saving ? "Saving..." : "Save Skill"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </header>
      </div>

      {prompt && (
        <AssessmentPrompt
          offeringId={prompt.offeringId}
          level="BASIC"
          onClose={() => {
            setPrompt(null);
            void fetchMySkills();
          }}
        />
      )}
      {/* 2. MAIN CONTENT */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 pt-8 pb-20 space-y-6 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              My Skills
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage the topics you can mentor others in and the subjects you
              want to learn in return.
            </p>
          </div>

          <Button
            onClick={() => setIsAddSkillOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-10 px-5 self-start sm:self-auto shrink-0 shadow-md shadow-blue-600/20 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-600/30 active:translate-y-0 active:scale-95"
          >
            + Add Skill
          </Button>
        </div>

        {/* BOUND TABS STATE */}
        {error && (
          <p role="alert" className="text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-xl border bg-white p-4 dark:bg-slate-900"
          >
            {notice}
          </p>
        )}
        <AssessmentLegend />
        <Tabs
          value={activeTab}
          onValueChange={(val: any) => setActiveTab(val)}
          className="space-y-6"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 h-12 p-1 rounded-2xl shadow-xs">
            <TabsTrigger
              value="offered"
              style={{
                backgroundColor:
                  activeTab === "offered" ? "#2563EB" : "transparent",
                color: activeTab === "offered" ? "#ffffff" : undefined,
              }}
              className={`rounded-xl font-bold text-xs sm:text-sm transition-all border-0 ring-0 outline-none ${
                activeTab === "offered"
                  ? "text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Teaches ({offeredSkills.length})
            </TabsTrigger>

            <TabsTrigger
              value="wanted"
              style={{
                backgroundColor:
                  activeTab === "wanted" ? "#059669" : "transparent",
                color: activeTab === "wanted" ? "#ffffff" : undefined,
              }}
              className={`rounded-xl font-bold text-xs sm:text-sm transition-all border-0 ring-0 outline-none ${
                activeTab === "wanted"
                  ? "text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Wants to Learn ({wantedSkills.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="offered" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {offeredSkills.length === 0
                ? renderEmptyState(
                    "You haven't added any skills to teach yet.",
                    "offer",
                  )
                : offeredSkills.map((skill) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      variant="blue"
                      onDelete={() => handleDeleteSkill(skill.id, "offer")}
                    />
                  ))}
            </div>
          </TabsContent>

          <TabsContent value="wanted" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {wantedSkills.length === 0
                ? renderEmptyState(
                    "What skill would you like to learn next?",
                    "want",
                  )
                : wantedSkills.map((skill) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      variant="emerald"
                      onDelete={() => handleDeleteSkill(skill.id, "want")}
                    />
                  ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function SkillCard({
  skill,
  onDelete,
  variant = "blue",
}: {
  skill: any;
  onDelete: () => void;
  variant?: "blue" | "emerald";
}) {
  const isBlue = variant === "blue";
  const navigate = useNavigate();
  const activeAttemptId = skill.tier === "AMATEUR" ? skill.activeAdvancedAttemptId : skill.activeBasicAttemptId;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <span
            className={`size-2 rounded-full ${
              isBlue ? "bg-blue-600" : "bg-emerald-500"
            }`}
          />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
            {isBlue ? "Teaches" : "Wants to Learn"}
          </span>
        </div>

        <h3 className="text-lg font-black text-slate-900 dark:text-white capitalize truncate">
          {skill.name}
        </h3>

        <span
          className={`inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-lg border ${
            isBlue
              ? "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200/60 dark:border-blue-800/60"
              : "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/60 dark:border-emerald-800/60"
          }`}
        >
          {skill.category}
        </span>
      </div>

      {isBlue && (
        <div className="flex min-w-0 flex-col items-start gap-2">
          <AssessmentBadge tier={skill.tier} />
          {skill.tier !== "VERIFIED" &&
          (activeAttemptId || (skill.tier === "AMATEUR"
            ? skill.advancedAvailable
            : skill.basicAvailable)) ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                navigate(activeAttemptId ? `/assessments/${activeAttemptId}` : `/assessments/offerings/${skill.offeringId}`)
              }
            >
              {activeAttemptId ? "Resume Assessment" : skill.tier === "AMATEUR"
                ? "Upgrade to Verified"
                : "Take Assessment"}
            </Button>
          ) : (
            skill.tier !== "VERIFIED" && (
              <p className="text-xs text-slate-500 dark:text-slate-300">
                {skill.tier === "AMATEUR"
                  ? "Advanced assessment unavailable"
                  : "Assessment Unavailable"}
              </p>
            )
          )}
          <button
            className="text-xs text-blue-700 underline dark:text-blue-300"
            onClick={() =>
              navigate(`/assessments/offerings/${skill.offeringId}`)
            }
          >
            Assessment history
          </button>
        </div>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors rounded-xl shrink-0"
        title="Remove Skill"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
