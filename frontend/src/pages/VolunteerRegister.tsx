import { useState, type FormEvent } from "react";
import { CheckCircle2, ClipboardCheck, ShieldCheck } from "lucide-react";
import { registerVolunteer } from "../lib/volunteers";

const AREAS = [
  "Guest welcome", "Cultural programme", "Stage & backstage", "Food & stalls",
  "Chariot & procession", "Parking & traffic", "Safety & crowd support",
  "Media & photography", "Setup & pack-down", "General support", "Other"
];

export function VolunteerRegisterPage() {
  const [draft, setDraft] = useState({ firstName: "", lastName: "", email: "", phone: "", area: "", otherArea: "" });
  const [reference, setReference] = useState("");
  const [existing, setExisting] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await registerVolunteer({
        firstName: draft.firstName,
        lastName: draft.lastName,
        email: draft.email,
        phone: draft.phone,
        assistanceArea: draft.area === "Other" ? draft.otherArea : draft.area
      });
      setReference(result.reference);
      setExisting(Boolean(result.existing));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not register you. Please ask an organiser for help.");
    } finally {
      setBusy(false);
    }
  };

  if (reference) {
    return (
      <main className="page volunteer-register">
        <div className="volunteer-success">
          <CheckCircle2 size={44} aria-hidden="true" />
          <p className="eyebrow">Volunteer desk</p>
          <h1>{existing ? "You are already registered" : "Registration received"}</h1>
          <p className="lead">Please show this screen to an organiser. They will confirm your role and check you in before issuing any equipment.</p>
          <p className="volunteer-reference"><span>Reference</span><strong>{reference.slice(0, 8).toUpperCase()}</strong></p>
        </div>
      </main>
    );
  }

  return (
    <main className="page volunteer-register">
      <p className="eyebrow">Indra Jatra team</p>
      <h1>Volunteer check-in</h1>
      <p className="lead">Tell the volunteer desk where you are helping today. An organiser will approve and check you in.</p>

      <form className="volunteer-form" onSubmit={submit}>
        <div className="field--row">
          <label className="field"><span>First name</span><input required autoComplete="given-name" value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} /></label>
          <label className="field"><span>Last name</span><input required autoComplete="family-name" value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} /></label>
        </div>
        <label className="field"><span>Mobile</span><input required type="tel" inputMode="tel" autoComplete="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></label>
        <label className="field"><span>Email</span><input required type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></label>
        <label className="field"><span>Area of assistance</span><select required value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })}><option value="">Choose an area</option>{AREAS.map((area) => <option key={area}>{area}</option>)}</select></label>
        {draft.area === "Other" && <label className="field"><span>Describe your area</span><input required value={draft.otherArea} onChange={(e) => setDraft({ ...draft, otherArea: e.target.value })} /></label>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn--primary btn--block" disabled={busy}><ClipboardCheck size={18} />{busy ? "Sending…" : "Register for today"}</button>
      </form>

      <p className="privacy-note"><ShieldCheck size={16} />Your details are visible only to authorised festival organisers and are used for volunteer coordination, safety, and equipment return follow-up.</p>
    </main>
  );
}
