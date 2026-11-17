import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router";
import { api } from "@/app/lib/api";
import { saveSession } from "@/app/lib/session";
import { Button } from "@/app/components/ui/button";

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
  onOnboardingChange,
  signup = false,
}: {
  linking?: boolean;
  onLinked?: () => void;
  onOnboardingChange?: (active: boolean) => void;
  signup?: boolean;
}) {
  const navigate = useNavigate();
  const [clientId, setClientId] = useState("");
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
  const container = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  const current = useRef(0);
  useEffect(() => {
    let active = true;
    api<{ google?: { enabled: boolean; clientId?: string } }>("/auth/providers")
      .then((r) => {
        if (active && r.google?.enabled && r.google.clientId)
          setClientId(r.google.clientId);
      })
      .catch(() => {
        /* Password authentication remains available on older/offline APIs. */
      });
    return () => {
      active = false;
      current.current++;
    };
  }, []);

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
                setOnboarding({
                  id: response.onboardingId,
                  proof,
                  email: response.email,
                  name: response.name,
                });
                onOnboardingChange?.(true);
                setReady(false);
                setOptions(await api("/auth/academic-options"));
              } else navigate(saveSession(response));
            })
            .catch((e) => {
              if (generation === current.current) {
                setError(e.message);
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
    if (!onboarding) return;
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
      <Button type="button" variant="outline" disabled className="w-full">
        {signup ? "Continue with Google" : "Sign in with Google"}
      </Button>
      <p className="text-xs text-slate-600">Google Sign-In is unavailable in this environment. Use email and password.</p>
    </section>
  );
  const years =
    options.programs.find((p) => p.id === programId)?.yearLevels || [];
  return (
    <section
      aria-label={linking ? "Link Google account" : "Google Sign-In"}
      className="space-y-3 mb-5"
    >
      <p className="text-sm text-slate-600">
        {linking
          ? "Link your institutional Google account to this Knoxite account. Confirm your current Knoxite password first."
          : "Sign in with your eligible institutional Google Workspace account."}
      </p>
      {!linking && <p className="text-xs text-slate-600">If Google reports access blocked, contact OLFU IT about third-party application access. A personal Google account is not eligible.</p>}
      {error && (
        <p role="alert" className="text-sm text-red-700">
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
        <form onSubmit={onboard} className="space-y-3 rounded border p-3">
          <h2 className="font-semibold">Complete your college profile</h2>
          <p className="text-sm break-all">{onboarding.email}</p>
          <label className="block text-sm">
            Display name
            <input
              className="mt-1 w-full rounded border p-2"
              required
              maxLength={100}
              value={onboarding.name}
              onChange={(e) =>
                setOnboarding({ ...onboarding, name: e.target.value })
              }
            />
          </label>
          <label className="block text-sm">
            College program
            <select
              aria-label="College program"
              className="mt-1 w-full rounded border p-2"
              required
              value={programId}
              onChange={(e) => {
                setProgramId(e.target.value);
                setYearLevelId("");
              }}
            >
              <option value="">Choose your program</option>
              {options.programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Year level
            <select
              aria-label="Year level"
              className="mt-1 w-full rounded border p-2"
              required
              value={yearLevelId}
              onChange={(e) => setYearLevelId(e.target.value)}
            >
              <option value="">Choose your year level</option>
              {years.map((y: any) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              required
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
            />
            I agree to the Terms of Service and Privacy Policy.
          </label>
          <Link className="text-sm text-blue-700 underline" to="/privacy">
            Read terms and privacy policy
          </Link>
          <p className="text-xs text-slate-600 dark:text-slate-300">{options.registrationPolicy?.available ? `Notice: ${options.registrationPolicy.noticeVersion}${options.registrationPolicy.approved ? "" : " — development draft; not approved for real student registration"}` : "New registration is unavailable until consent storage and a reviewed notice are configured."}</p>
          <Button type="submit" disabled={busy || !options.programs.length || !options.registrationPolicy?.available}>
            Create college profile
          </Button>
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
            Cancel Google sign-up
          </Button>
        </form>
      )}
      {!linking && !onboarding && (
        <p className="text-center text-sm text-slate-500">
          Or continue with email and password
        </p>
      )}
    </section>
  );
}
