import { api } from "@/app/lib/api";
import GoogleSignIn from "@/app/components/GoogleSignIn";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Loader2, Eye, EyeOff, UserPlus, X } from "lucide-react";

// 1. IMPORT YOUR CONFIG
import { API_BASE_URL } from "@/config";

export default function SignupPage() {
  const navigate = useNavigate();
  const [programId, setProgramId] = useState("");
  const [yearLevelId, setYearLevelId] = useState("");
  const [options, setOptions] = useState<{
    programs: any[];
    yearLevels: any[];
    registrationPolicy?: {available:boolean;noticeVersion:string|null;approved:boolean};
  }>({ programs: [], yearLevels: [] });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Terms and UI States
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [googleOnboarding, setGoogleOnboarding] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const optionsRequest = useRef<AbortController | null>(null);
  const loadAcademicOptions = useCallback(async () => {
    optionsRequest.current?.abort();
    const controller = new AbortController();
    optionsRequest.current = controller;
    setOptionsLoading(true);
    setOptionsError("");
    try {
      const result = await api<{ programs: any[]; yearLevels: any[]; registrationPolicy?: {available:boolean;noticeVersion:string|null;approved:boolean} }>(
        "/auth/academic-options",
        { signal: controller.signal },
      );
      if (
        !Array.isArray(result.programs) ||
        !Array.isArray(result.yearLevels) ||
        !result.programs.length ||
        !result.yearLevels.length
      )
        throw new Error(
          "College programs and year levels have not been configured yet. Please contact the Knoxite administrator.",
        );
      if (!controller.signal.aborted) setOptions(result);
    } catch (e: any) {
      if (!controller.signal.aborted) {
        setOptions({ programs: [], yearLevels: [] });
        setProgramId("");
        setYearLevelId("");
        setOptionsError(
          e instanceof TypeError
            ? "Unable to load college programs and year levels. Check your connection and try again."
            : e.message,
        );
      }
    } finally {
      if (!controller.signal.aborted) setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAcademicOptions();
    return () => optionsRequest.current?.abort();
  }, [loadAcademicOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (optionsLoading || optionsError || !options.programs.length) return;

    if (!agreedToTerms) {
      setError(
        "To continue, you must agree to the Terms of Service & Privacy Policy.",
      );
      const termsEl = document.getElementById(
        "terms",
      ) as HTMLInputElement | null;
      termsEl?.reportValidity();
      return;
    }

    if (!programId || !yearLevelId) {
      setError("Choose your college program and year level.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    if (password.length < 12) {
      setError("Password must be at least 12 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      // 2. USE API_BASE_URL AND BYPASS TUNNEL
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "bypass-tunnel-reminder": "true",
        },
        body: JSON.stringify({ name, email, password, programId, yearLevelId, termsAccepted: agreedToTerms, noticeVersion: options.registrationPolicy?.noticeVersion }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      alert(data.message);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 p-6 relative">
      <div className="w-full max-w-md sm:max-w-xl">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200">
            <UserPlus className="text-white size-8" />
          </div>
        </div>

        <Card className="shadow-2xl border-blue-50 bg-white/95 backdrop-blur-sm rounded-3xl overflow-hidden">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold text-center text-blue-900">
              Join Knoxite
            </CardTitle>
            <CardDescription className="text-center text-blue-500 font-medium">
              For OLFU Santa Rosa college students
            </CardDescription>
          </CardHeader>
          <CardContent className="sm:px-8 sm:pb-8">
            <GoogleSignIn signup onOnboardingChange={setGoogleOnboarding} />
            {!googleOnboarding && (
              <form noValidate onSubmit={handleSubmit} className="space-y-4">
                {optionsLoading && (
                  <p role="status" className="text-sm text-slate-600">
                    Loading college programs and year levels...
                  </p>
                )}
                {optionsError && (
                  <div
                    role="alert"
                    className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    <p>{optionsError}</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void loadAcademicOptions()}
                    >
                      Retry Academic Options
                    </Button>
                  </div>
                )}
                {error && (
                  <div className="p-3 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl text-center animate-in fade-in zoom-in duration-300">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label
                    htmlFor="name"
                    className="text-xs uppercase tracking-wider font-bold text-blue-600 ml-1"
                  >
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g. Steven Rivera"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-12 border-blue-100 bg-blue-50/30 focus:ring-blue-600 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="email"
                    className="text-xs uppercase tracking-wider font-bold text-blue-600 ml-1"
                  >
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Your institutional email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 border-blue-100 bg-blue-50/30 focus:ring-blue-600 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="password"
                    className="text-xs uppercase tracking-wider font-bold text-blue-600 ml-1"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 12 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 border-blue-100 bg-blue-50/30 focus:ring-blue-600 rounded-xl pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300 hover:text-blue-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="size-5" />
                      ) : (
                        <Eye className="size-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-xs uppercase tracking-wider font-bold text-blue-600 ml-1"
                  >
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-12 border-blue-100 bg-blue-50/30 focus:ring-blue-600 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-program">College program</Label>
                  <select
                    required
                    id="signup-program"
                    disabled={
                      optionsLoading ||
                    !options.registrationPolicy?.available ||
                      !!optionsError ||
                      !options.programs.length
                    }
                    value={programId}
                    onChange={(e) => {
                      setProgramId(e.target.value);
                      setYearLevelId("");
                    }}
                    className="w-full rounded-xl border border-blue-100 p-3 text-sm"
                  >
                    <option value="">Choose your program</option>
                    {options.programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-year">Year level</Label>
                  <select
                    required
                    id="signup-year"
                    disabled={optionsLoading || !!optionsError || !programId}
                    value={yearLevelId}
                    onChange={(e) => setYearLevelId(e.target.value)}
                    className="w-full rounded-xl border border-blue-100 p-3 text-sm"
                  >
                    <option value="">Choose your year level</option>
                    {(
                      options.programs.find((p) => p.id === programId)
                        ?.yearLevels || []
                    ).map((year: any) => (
                      <option key={year.id} value={year.id}>
                        {year.name}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-slate-600">
                  Use your institutional email. Campus eligibility follows the
                  configured Santa Rosa email rule and email ownership
                  verification.
                </p>
                {/* Terms of Service & Privacy Policy Checkbox */}
                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreedToTerms}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setAgreedToTerms(isChecked);
                      if (isChecked) setError("");
                    }}
                    required
                    className="mt-1 size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                  />
                  <label
                    htmlFor="terms"
                    className="text-xs text-blue-900/80 leading-snug cursor-pointer select-none"
                  >
                    I agree to the{" "}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-blue-600 font-semibold underline hover:text-blue-700"
                    >
                      Terms of Service
                    </button>{" "}
                    and{" "}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-blue-600 font-semibold underline hover:text-blue-700"
                    >
                      Privacy Policy
                    </button>
                  </label>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300">{options.registrationPolicy?.available ? `Notice: ${options.registrationPolicy.noticeVersion}${options.registrationPolicy.approved ? "" : " — development draft; not approved for real student registration"}` : "New registration is unavailable until the reviewed notice and consent storage are configured. Existing accounts can still sign in."}</p>
                <Button
                  type="submit"
                  disabled={
                    isLoading ||
                    optionsLoading ||
                    !options.registrationPolicy?.available ||
                    !!optionsError ||
                    !options.programs.length
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl shadow-lg shadow-blue-100 mt-2 text-base font-bold transition-all active:scale-[0.98]"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="animate-spin size-5" />
                      <span>Creating account...</span>
                    </div>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-blue-400">
                Already part of the community?{" "}
                <button
                  onClick={() => navigate("/login")}
                  className="text-blue-600 font-bold hover:underline"
                >
                  Sign in
                </button>
              </p>

              <p className="text-xs">
                <button
                  onClick={() => navigate("/")}
                  className="text-blue-600 font-bold hover:underline"
                >
                  Back to Home
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Terms of Service & Privacy Policy Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">
                Terms of Service & Privacy Policy
              </h3>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-600 leading-relaxed">
              <section>
                <h4 className="font-bold text-slate-800 text-sm mb-1">
                  1. Platform Purpose & Campus Exclusivity
                </h4>
                <p>
                  Knoxite is a campus-exclusive peer-to-peer knowledge and skill
                  exchange platform. Its purpose is to connect student mentors
                  and apprentices for collaborative, academic, and
                  skill-building pursuits.
                </p>
              </section>

              <section>
                <h4 className="font-bold text-slate-800 text-sm mb-1">
                  2. User Conduct & Safe Exchanges
                </h4>
                <p>
                  All members must treat each other with respect. Harassment,
                  dishonest skill representation, hate speech, unauthorized
                  commercial solicitations, and academic integrity breaches are
                  strictly prohibited.
                </p>
              </section>

              <section>
                <h4 className="font-bold text-slate-800 text-sm mb-1">
                  3. Privacy & Data Handling
                </h4>
                <p>
                  We collect your registered name, email address, and declared
                  skills to facilitate matching, community forum participation,
                  and the leaderboard. Your information is never sold or shared
                  with outside commercial entities.
                </p>
              </section>

              <section>
                <h4 className="font-bold text-slate-800 text-sm mb-1">
                  4. Account Suspension
                </h4>
                <p>
                  Platform administrators reserve the right to review flagged
                  accounts and suspend or terminate access for violations of
                  these community guidelines.
                </p>
              </section>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
              <Button
                type="button"
                onClick={() => {
                  setAgreedToTerms(true);
                  setShowTermsModal(false);
                  setError("");
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs px-4 py-2 font-semibold"
              >
                I Understand & Agree
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Website Version Display */}
      <div className="fixed bottom-3 right-4 z-40 pointer-events-none select-none text-[11px] font-mono tracking-wider text-slate-400   dark:text-slate-500">
        Knoxite v1.0
      </div>
    </div>
  );
}
