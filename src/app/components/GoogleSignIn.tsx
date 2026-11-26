import { suspensionNotice, type SuspensionNotice } from "@/app/lib/suspensionNotice";
import { ApiError } from "@/app/lib/api";
import LegalNoticeDialog, { type LegalDocument } from "@/app/components/LegalNoticeDialog";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "@/app/lib/api";
import { saveSession } from "@/app/lib/session";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

type IdentitySdk = {
  initialize: (options: {
    client_id: string;
    nonce: string;
    auto_select: boolean;
    callback: (result: { credential: string }) => void;
  }) => void;
  renderButton: (
    element: HTMLElement,
    options: Record<string, unknown>,
  ) => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: IdentitySdk } };
  }
}
let loadingSdk: Promise<IdentitySdk> | undefined;
function loadSdk() {
  if (window.google) return Promise.resolve(window.google.accounts.id);
  if (!loadingSdk)
    loadingSdk = new Promise<IdentitySdk>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = () => {
        if (window.google) resolve(window.google.accounts.id);
        else {
          script.remove();
          loadingSdk = undefined;
          reject(
            new Error(
              "Google Sign-In could not load. Use email and password or try again.",
            ),
          );
        }
      };
      script.onerror = () => {
        script.remove();
        loadingSdk = undefined;
        reject(
          new Error(
            "Google Sign-In is unavailable. Use email and password or try again.",
          ),
        );
      };
      document.head.appendChild(script);
    });
  return loadingSdk;
}
function browserSecret() {
  return btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
async function proofHash(secret: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)),
    ),
  )
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}

export default function GoogleSignIn({
  linking = false,
  onLinked,
  onSuspended,
  onOnboardingChange,
  signup = false,
}: {
  linking?: boolean;
  onLinked?: () => void;
  onSuspended?: (notice: SuspensionNotice) => void;
  onOnboardingChange?: (active: boolean) => void;
  signup?: boolean;
}) {
  const navigate = useNavigate();
  const formId = useId();
  const [legalDocument, setLegalDocument] = useState<LegalDocument | null>(null);
  // Reuse the regular signup's field treatment, with readable dark surfaces.
  const fieldLabel = "text-xs uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400 ml-1";
  const fieldControl = "h-12 border-blue-100 bg-blue-50/30 focus:ring-blue-600 rounded-xl dark:border-blue-900 dark:bg-slate-900 dark:text-slate-100";
  const [clientId, setClientId] = useState("");
  const [providerState, setProviderState] = useState<"loading" | "ready" | "disabled" | "error">("loading");
  const providerRequest = useRef<AbortController | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [retry, setRetry] = useState(0);
  const [onboarding, setOnboarding] = useState<{
    id: string;
    proof: string;
    email: string;
    name: string;
  } | null>(null);
  const [options, setOptions] = useState<{
    programs: any[];
    yearLevels: any[];
    registrationPolicy?: {available:boolean;noticeVersion:string|null;approved:boolean};
  }>({ programs: [], yearLevels: [] });
  const [programId, setProgramId] = useState("");
  const [yearLevelId, setYearLevelId] = useState("");
  const [terms, setTerms] = useState(false);
  const [academicLoading, setAcademicLoading] = useState(false);
  const [academicError, setAcademicError] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  const current = useRef(0);
  const loadProvider = useCallback(async () => {
    providerRequest.current?.abort();
    const controller = new AbortController();
    providerRequest.current = controller;
    setProviderState("loading");
    try {
      const result = await api<{ google?: { enabled: boolean; clientId?: string } }>("/auth/providers", { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (result.google?.enabled === true) {
        if (typeof result.google.clientId !== "string" || !result.google.clientId.trim()) throw new Error("Missing Google configuration");
        setClientId(result.google.clientId);
        setProviderState("ready");
      } else {
        setClientId("");
        setProviderState("disabled");
      }
    } catch {
      if (!controller.signal.aborted) {
        setClientId("");
        setProviderState("error");
      }
    }
  }, []);
  useEffect(() => {
    void loadProvider();
    return () => {
      providerRequest.current?.abort();
      current.current++;
    };
  }, [loadProvider]);

  async function loadOnboardingOptions(generation = current.current) {
    setAcademicLoading(true);
    setAcademicError("");
    try {
      const result = await api<typeof options>("/auth/academic-options");
      if (!Array.isArray(result.programs) || !result.programs.length || !Array.isArray(result.yearLevels) || !result.yearLevels.length) throw new Error("College programs and year levels are not available yet.");
      if (generation === current.current) setOptions(result);
    } catch (e) {
      if (generation === current.current) setAcademicError(e instanceof Error ? e.message : "Unable to load college options.");
    } finally {
      if (generation === current.current) setAcademicLoading(false);
    }
  }

  async function prepare(password?: string) {
    const generation = ++current.current;
    setError("");
    setReady(false);
    setBusy(true);
    try {
      const proof = browserSecret();
      const challenge = await api<{ challengeId: string; nonce: string }>(
        linking ? "/auth/google/link/challenge" : "/auth/google/challenge",
        {
          method: "POST",
          body: JSON.stringify({
            browserProofHash: await proofHash(proof),
            ...(linking ? { currentPassword: password } : {}),
          }),
        },
      );
      if (generation !== current.current) return;
      setCurrentPassword("");
      const sdk = await loadSdk();
      if (generation !== current.current || !container.current) return;
      sdk.initialize({
        client_id: clientId,
        nonce: challenge.nonce,
        auto_select: false,
        callback: (result) => {
          if (generation !== current.current || pending.current) return;
          pending.current = true;
          setBusy(true);
          setError("");
          void api<any>(linking ? "/auth/google/link" : "/auth/google/login", {
            method: "POST",
            body: JSON.stringify({
              challengeId: challenge.challengeId,
              browserProof: proof,
              credential: result.credential,
            }),
          })
            .then(async (response) => {
              if (generation !== current.current) return;
              if (linking) {
                setReady(false);
                onLinked?.();
              } else if (response.requiresOnboarding) {
                // A fresh Google identity/challenge needs fresh academic choices
                // and explicit consent; cancellation must not carry them over.
                setProgramId("");
                setYearLevelId("");
                setTerms(false);
                setLegalDocument(null);
                setOptions({ programs: [], yearLevels: [] });
                setOnboarding({
                  id: response.onboardingId,
                  proof,
                  email: response.email,
                  name: response.name,
                });
                onOnboardingChange?.(true);
                setReady(false);
                await loadOnboardingOptions(generation);
              } else navigate(saveSession(response));
            })
            .catch((e) => {
              if (generation === current.current) {
                const notice = e instanceof ApiError && e.status === 403 ? suspensionNotice(e.details) : null;
                if (notice && onSuspended) onSuspended(notice); else setError(e.message);
                setReady(false);
              }
            })
            .finally(() => {
              pending.current = false;
              if (generation === current.current) setBusy(false);
            });
        },
      });
      container.current.replaceChildren();
      sdk.renderButton(container.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: signup ? "continue_with" : "signin_with",
        width: Math.min(
          320,
          container.current.parentElement?.clientWidth || 240,
        ),
      });
      setReady(true);
    } catch (e: any) {
      if (generation === current.current) setError(e.message);
    } finally {
      if (generation === current.current) setBusy(false);
    }
  }
  useEffect(() => {
    if (clientId && !linking) void prepare();
    return () => {
      current.current++;
    };
  }, [clientId, retry]);
  async function onboard(event: React.FormEvent) {
    event.preventDefault();
    if (!onboarding || busy) return;
    if (!terms) { setError("Accept the Terms of Service and Privacy Policy before creating your profile."); return; }
    if (academicLoading || academicError || !programId || !yearLevelId || !options.registrationPolicy?.available) { setError("Load the college options and choose your program and year level before continuing."); return; }
    setBusy(true);
    setError("");
    try {
      const result = await api<any>("/auth/google/onboard", {
        method: "POST",
        body: JSON.stringify({
          onboardingId: onboarding.id,
          browserProof: onboarding.proof,
          name: onboarding.name,
          programId,
          yearLevelId,
          termsAccepted: terms,
          noticeVersion: options.registrationPolicy?.noticeVersion,
        }),
      });
      setOnboarding(null);
      navigate(saveSession(result));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!clientId) return linking ? null : (
    <section aria-label="Google Sign-In" className="space-y-2 mb-5">
      <Button type="button" variant="outline" disabled className="w-full h-12 rounded-xl">
        {providerState === "loading" ? "Checking Google availability..." : signup ? "Continue with Google" : "Sign in with Google"}
      </Button>
      {providerState === "loading" ? (
        <p role="status" className="text-xs text-slate-600 dark:text-slate-300">Connecting to Knoxite. You can still use email and password.</p>
      ) : providerState === "error" ? (
        <>
          <p role="alert" className="text-xs text-slate-600 dark:text-slate-300">Google Sign-In is temporarily unavailable. Retry or use email and password.</p>
          <Button type="button" variant="outline" className="w-full min-h-11 rounded-xl" onClick={() => void loadProvider()}>Retry Google availability</Button>
        </>
      ) : (
        <p className="text-xs text-slate-600 dark:text-slate-300">Google Sign-In is unavailable in this environment. Use email and password.</p>
      )}
    </section>
  );
  const years =
    options.programs.find((p) => p.id === programId)?.yearLevels || [];
  return (
    <section
      aria-label={linking ? "Link Google account" : "Google Sign-In"}
      className="space-y-3 mb-5"
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {linking
          ? "Link your institutional Google account to this Knoxite account. Confirm your current Knoxite password first."
          : "Sign in with your eligible institutional Google Workspace account."}
      </p>
      {!linking && <p className="text-xs text-slate-600 dark:text-slate-300">If Google reports access blocked, contact OLFU IT about third-party application access. A personal Google account is not eligible.</p>}
      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {linking && !ready && (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void prepare(currentPassword);
          }}
        >
          <label className="block text-sm">
            Current Knoxite password
            <input
              aria-label="Current Knoxite password"
              className="mt-1 w-full rounded border p-2"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <p className="text-xs text-slate-600 dark:text-slate-300">{options.registrationPolicy?.available ? `Notice: ${options.registrationPolicy.noticeVersion}${options.registrationPolicy.approved ? "" : " — development draft; not approved for real student registration"}` : "New registration is unavailable until consent storage and a reviewed notice are configured."}</p>
          <Button type="submit" disabled={busy}>
            Confirm password to link Google
          </Button>
        </form>
      )}
      <div
        ref={container}
        className={ready ? "flex justify-center" : "hidden"}
      />
      {busy && (
        <p role="status" className="text-sm">
          Checking Google sign-in...
        </p>
      )}
      {error && !linking && (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => {
            setOnboarding(null);
            onOnboardingChange?.(false);
            setRetry((n) => n + 1);
          }}
        >
          Try Google again
        </Button>
      )}
      {onboarding && (
        <form onSubmit={onboard} aria-labelledby={`${formId}-heading`} className="min-w-0 w-full space-y-4 rounded-2xl dark:bg-slate-950 dark:p-4">
          <h2 id={`${formId}-heading`} className="text-xl font-bold text-blue-900 dark:text-blue-100">Complete your college profile</h2>
          {academicLoading&&<p role="status" className="text-sm text-slate-600 dark:text-slate-300">Loading college programs and year levels...</p>}
          {academicError&&<div role="alert" className="space-y-2 text-sm text-red-700 dark:text-red-300"><p>{academicError}</p><Button type="button" variant="outline" disabled={academicLoading||busy} onClick={()=>void loadOnboardingOptions()}>Retry college options</Button></div>}
          <div className="min-w-0 space-y-1.5">
            <p className={fieldLabel}>Institutional email</p>
            <p className="rounded-xl border border-blue-100 bg-blue-50/30 px-3 py-3 text-sm text-blue-900 [overflow-wrap:anywhere] dark:border-blue-900 dark:bg-slate-900 dark:text-slate-100">{onboarding.email}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-name`} className={fieldLabel}>Display name</Label>
            <Input
              id={`${formId}-name`}
              className={fieldControl}
              required
              maxLength={100}
              value={onboarding.name}
              onChange={(e) =>
                setOnboarding({ ...onboarding, name: e.target.value })
              }
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor={`${formId}-program`} className={fieldLabel}>College program</Label>
            <select
              id={`${formId}-program`}
              className="w-full min-w-0 rounded-xl border border-blue-100 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-blue-900 dark:bg-slate-900 dark:text-slate-100"
              required
              value={programId}
              onChange={(e) => {
                setProgramId(e.target.value);
                setYearLevelId("");
              }}
            >
              <option value="">Choose your program</option>
              {options.programs.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor={`${formId}-year`} className={fieldLabel}>Year level</Label>
            <select
              id={`${formId}-year`}
              className="w-full min-w-0 rounded-xl border border-blue-100 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-blue-900 dark:bg-slate-900 dark:text-slate-100"
              required
              value={yearLevelId}
              onChange={(e) => setYearLevelId(e.target.value)}
            >
              <option value="">Choose your year level</option>
              {years.map((y: any) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-start gap-2.5 pt-1">
            <input
              id={`${formId}-terms`}
              type="checkbox"
              required
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-1 size-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
            />
            <label htmlFor={`${formId}-terms`} className="min-w-0 text-xs text-blue-900/80 dark:text-blue-100/80 leading-snug cursor-pointer select-none">
              I agree to the{" "}
              <button type="button" className="text-blue-600 dark:text-blue-400 font-semibold underline hover:text-blue-700 dark:hover:text-blue-300" onClick={() => setLegalDocument("summary")}>Terms of Service</button>{" "}
              and{" "}
              <button type="button" className="text-blue-600 dark:text-blue-400 font-semibold underline hover:text-blue-700 dark:hover:text-blue-300" onClick={() => setLegalDocument("account")}>Privacy Policy</button>.
            </label>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 [overflow-wrap:anywhere]">{options.registrationPolicy?.available ? `Notice: ${options.registrationPolicy.noticeVersion}${options.registrationPolicy.approved ? "" : " — development draft; not approved for real student registration"}` : "New registration is unavailable until consent storage and a reviewed notice are configured."}</p>
          <Button type="submit" disabled={busy || academicLoading || !!academicError || !options.programs.length || !options.registrationPolicy?.available}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl shadow-lg shadow-blue-100 dark:shadow-none mt-2 text-base font-bold transition-all active:scale-[0.98]">
            Create college profile
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 rounded-xl border-blue-100 text-blue-600 hover:bg-blue-50 dark:border-blue-900 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800"
            disabled={busy}
            onClick={() => {
              setOnboarding(null);
              onOnboardingChange?.(false);
              setRetry((n) => n + 1);
            }}
          >
            Cancel Google sign-up
          </Button>
        </form>
      )}
      <LegalNoticeDialog document={legalDocument} onClose={() => setLegalDocument(null)} />
      {!linking && !onboarding && (
        <p className="text-center text-sm text-slate-500">
          Or continue with email and password
        </p>
      )}
    </section>
  );
}
