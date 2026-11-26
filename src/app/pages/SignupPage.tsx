import { AccountSuspensionNotice } from "@/app/components/AccountSuspensionNotice";
import { type SuspensionNotice } from "@/app/lib/suspensionNotice";
import { api } from "@/app/lib/api";
import LegalNoticeDialog, { type LegalDocument } from "@/app/components/LegalNoticeDialog";
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
import { Loader2, Eye, EyeOff, UserPlus } from "lucide-react";

// 1. IMPORT YOUR CONFIG
import { API_BASE_URL } from "@/config";

export default function SignupPage() {
  const [suspension, setSuspension] = useState<SuspensionNotice | null>(null);
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
  const [legalDocument, setLegalDocument] = useState<LegalDocument | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [createdMessage, setCreatedMessage] = useState("");
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
    if (isLoading) return;
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

      setCreatedMessage(data.message || "Your account was created. Sign in to request an institutional email verification link.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (createdMessage) return <main className="min-h-dvh knoxite-surface flex items-center justify-center p-4 text-slate-900 dark:text-slate-100"><Card className="w-full max-w-md rounded-3xl"><CardHeader><CardTitle>Account created</CardTitle></CardHeader><CardContent className="space-y-5"><p role="status" className="text-sm leading-relaxed">{createdMessage}</p><p className="text-sm text-slate-600 dark:text-slate-300">Email ownership must be verified before you can sign in. If you need another link, request it on the sign-in page.</p><Button className="h-12 w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700" onClick={()=>navigate("/login")}>Continue to Sign In</Button></CardContent></Card></main>;

  if (suspension) return <AccountSuspensionNotice notice={suspension} onBack={()=>{setSuspension(null);navigate("/login");}}/>;
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 p-6 relative">
      <div className="w-full max-w-md sm:max-w-xl">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200">
            <UserPlus className="text-white size-8" />
          </div>
        </div>

        <Card className="shadow-2xl border-blue-50 bg-white/95 dark:border-slate-800 dark:bg-slate-900/95 backdrop-blur-sm rounded-3xl overflow-hidden">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold text-center text-blue-900 dark:text-blue-100">
              Join Knoxite
            </CardTitle>
            <CardDescription className="text-center text-blue-500 font-medium">
              For OLFU Santa Rosa college students
            </CardDescription>
          </CardHeader>
          <CardContent className="sm:px-8 sm:pb-8">
            <GoogleSignIn onSuspended={notice=>{setPassword("");setConfirmPassword("");setSuspension(notice);}} signup onOnboardingChange={setGoogleOnboarding} />
            {!googleOnboarding && (
              <form noValidate onSubmit={handleSubmit} className="min-w-0 w-full space-y-4 rounded-2xl dark:bg-slate-950 dark:p-4">
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
                  <div role="alert" className="p-3 text-xs font-bold text-red-700 bg-red-50 border border-red-100 rounded-xl text-center dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label
                    htmlFor="name"
                    className="text-xs uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400 ml-1"
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
                    className="h-12 border-blue-100 bg-blue-50/30 focus:ring-blue-600 rounded-xl dark:border-blue-900 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="email"
                    className="text-xs uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400 ml-1"
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
                    className="h-12 border-blue-100 bg-blue-50/30 focus:ring-blue-600 rounded-xl dark:border-blue-900 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="password"
                    className="text-xs uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400 ml-1"
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
                      className="h-12 border-blue-100 bg-blue-50/30 focus:ring-blue-600 rounded-xl dark:border-blue-900 dark:bg-slate-900 dark:text-slate-100 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide passwords" : "Show passwords"}
                      aria-pressed={showPassword}
                      className="absolute right-1 top-1/2 -translate-y-1/2 flex size-11 items-center justify-center rounded-xl text-blue-500 hover:text-blue-700 dark:text-blue-400 focus-visible:outline-2 focus-visible:outline-blue-600 transition-colors"
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
                    className="text-xs uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400 ml-1"
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
                    className="h-12 border-blue-100 bg-blue-50/30 focus:ring-blue-600 rounded-xl dark:border-blue-900 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-program" className="text-xs uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400 ml-1">College program</Label>
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
                    className="w-full min-w-0 rounded-xl border border-blue-100 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-blue-900 dark:bg-slate-900 dark:text-slate-100"
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
                  <Label htmlFor="signup-year" className="text-xs uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400 ml-1">Year level</Label>
                  <select
                    required
                    id="signup-year"
                    disabled={optionsLoading || !!optionsError || !programId}
                    value={yearLevelId}
                    onChange={(e) => setYearLevelId(e.target.value)}
                    className="w-full min-w-0 rounded-xl border border-blue-100 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-blue-900 dark:bg-slate-900 dark:text-slate-100"
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
                <p className="text-xs text-slate-600 dark:text-slate-300">
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
                    className="mt-1 size-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                  />
                  <label
                    htmlFor="terms"
                    className="text-xs text-blue-900/80 dark:text-blue-100/80 leading-snug cursor-pointer select-none"
                  >
                    I agree to the{" "}
                    <button
                      type="button"
                      onClick={() => setLegalDocument("summary")}
                      className="text-blue-600 dark:text-blue-400 font-semibold underline hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      Terms of Service
                    </button>{" "}
                    and{" "}
                    <button
                      type="button"
                      onClick={() => setLegalDocument("account")}
                      className="text-blue-600 dark:text-blue-400 font-semibold underline hover:text-blue-700 dark:hover:text-blue-300"
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
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl shadow-lg shadow-blue-100 dark:shadow-none mt-2 text-base font-bold transition-all active:scale-[0.98]"
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

      <LegalNoticeDialog document={legalDocument} onClose={() => setLegalDocument(null)} />

      {/* Website Version Display */}
      <div className="fixed bottom-3 right-4 z-40 pointer-events-none select-none text-[11px] font-mono tracking-wider text-slate-400   dark:text-slate-500">
        Knoxite v1.0
      </div>
    </div>
  );
}
