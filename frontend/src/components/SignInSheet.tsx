import { useState, type FormEvent } from "react";
import { Mail, ShieldCheck, Sparkles } from "lucide-react";
import { auth, type AuthChallenge, type VisitorProfile } from "../lib/auth/auth";
import { Sheet } from "./ui";

export function SignInSheet({
  reason,
  onClose,
  onSignedIn
}: {
  reason: string;
  onClose: () => void;
  onSignedIn: (profile: VisitorProfile) => void;
}) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [draft, setDraft] = useState<VisitorProfile>({ firstName: "", lastName: "", email: "", phone: "", marketingConsent: false });
  const [challenge, setChallenge] = useState<AuthChallenge | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submitIdentity = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      setChallenge(
        mode === "register" ? await auth.requestRegistration(draft) : await auth.requestLogin(draft.email)
      );
    } catch (reasonError) {
      setError(reasonError instanceof Error ? reasonError.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!challenge) return;
    setError("");
    setBusy(true);
    try {
      onSignedIn(await auth.verify(challenge, code.trim()));
    } catch (reasonError) {
      setError(reasonError instanceof Error ? reasonError.message : "We could not check that code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet onClose={onClose} labelledBy="signin-title">
      {!challenge ? (
        <>
          <div className="row" style={{ gap: 12, marginBottom: 16, flexWrap: "nowrap" }}>
            <span className="icon-disc"><Sparkles size={19} /></span>
            <div>
              <p className="eyebrow" style={{ marginBottom: 2 }}>Free festival pass</p>
              <h2 id="signin-title" style={{ margin: 0, fontSize: "var(--step-2)" }}>{reason}</h2>
            </div>
          </div>

          <div className="segmented" role="group" aria-label="Register or log in">
            <button type="button" aria-pressed={mode === "register"} onClick={() => { setMode("register"); setError(""); }}>
              I'm new
            </button>
            <button type="button" aria-pressed={mode === "login"} onClick={() => { setMode("login"); setError(""); }}>
              I have a pass
            </button>
          </div>

          <form className="stack" onSubmit={submitIdentity}>
            {mode === "register" && (
              <div className="field--row">
                <label className="field">
                  <span>First name</span>
                  <input required autoComplete="given-name" value={draft.firstName}
                    onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} />
                </label>
                <label className="field">
                  <span>Last name</span>
                  <input required autoComplete="family-name" value={draft.lastName}
                    onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} />
                </label>
              </div>
            )}
            <label className="field">
              <span>Email</span>
              <input required type="email" autoComplete="email" autoCapitalize="none" inputMode="email"
                value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            </label>
            {mode === "register" && (
              <>
                <label className="field">
                  <span>Mobile</span>
                  <input required type="tel" autoComplete="tel" inputMode="tel"
                    value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
                </label>
                <label className="check-row">
                  <input type="checkbox" checked={Boolean(draft.marketingConsent)}
                    onChange={(e) => setDraft({ ...draft, marketingConsent: e.target.checked })} />
                  <span>Send me occasional Newa Guthi festival and community updates.</span>
                </label>
              </>
            )}
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="btn btn--primary btn--block" disabled={busy}>
              {busy ? "Sending…" : <><Mail size={17} /> Send my code</>}
            </button>
            <button type="button" className="btn btn--quiet btn--block" onClick={onClose}>
              Not now — keep browsing
            </button>
          </form>

          <p className="privacy-note">
            <ShieldCheck size={15} />
            Your contact details are used to create and secure your festival pass. Saved events
            and trail stamps sync when you sign in. Marketing updates are optional, and you can
            clear local festival data any time from My Festival.
          </p>
        </>
      ) : (
        <>
          <div className="row" style={{ gap: 12, marginBottom: 16, flexWrap: "nowrap" }}>
            <span className="icon-disc icon-disc--jade"><Mail size={19} /></span>
            <div>
              <p className="eyebrow eyebrow--muted" style={{ marginBottom: 2 }}>Check your inbox</p>
              <h2 style={{ margin: 0, fontSize: "var(--step-2)" }}>Enter your code</h2>
            </div>
          </div>

          <p className="small muted">We sent a six-digit code to <strong>{challenge.email}</strong>.</p>

          {challenge.demoCode && (
            <p className="demo-code">
              Demo mode — use code <b>{challenge.demoCode}</b>
            </p>
          )}

          <form className="stack" onSubmit={submitCode} style={{ marginTop: 16 }}>
            <label className="field">
              <span className="sr-only">Six-digit code</span>
              <input className="code-input" required inputMode="numeric" autoComplete="one-time-code"
                pattern="[0-9]{6}" maxLength={6} value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="btn btn--primary btn--block" disabled={busy || code.length < 6}>
              {busy ? "Checking…" : "Confirm"}
            </button>
            <button type="button" className="btn btn--quiet btn--block" onClick={() => { setChallenge(null); setCode(""); setError(""); }}>
              Use a different email
            </button>
          </form>
        </>
      )}
    </Sheet>
  );
}
