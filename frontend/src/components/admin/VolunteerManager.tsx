import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ClipboardCheck, ExternalLink, PackageCheck, Printer, QrCode, RefreshCw, Search, Volume2, VolumeX } from "lucide-react";
import QRCode from "qrcode";
import { getVolunteers, outstandingItems, updateVolunteer, type Volunteer, type VolunteerStatus } from "../../lib/volunteers";

type Filter = "active" | VolunteerStatus;
type IssueDraft = { sashIssued: boolean; badgeIssued: boolean; radioIssued: boolean; otherItems: string };

const STATUS_LABEL: Record<VolunteerStatus, string> = {
  pending: "Pending approval", approved: "Ready to check in", checked_in: "On duty", signed_off: "Signed off"
};

function beep() {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 760;
  gain.gain.setValueAtTime(0.08, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.12);
  oscillator.addEventListener("ended", () => void context.close());
}

function ReturnCheck({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="equipment-check"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span><Check size={15} />{label}</span></label>;
}

export function VolunteerManager({ csrfToken, toast }: { csrfToken: string; toast: (message: string) => void }) {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [qr, setQr] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("active");
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [sound, setSound] = useState(() => localStorage.getItem("ij26-organiser-sound") !== "off");
  const [issues, setIssues] = useState<Record<number, IssueDraft>>({});
  const registrationUrl = `${window.location.origin}/volunteer`;

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setError("");
    try {
      const result = await getVolunteers();
      setVolunteers(result.volunteers);
    } catch (reason) {
      if (!quiet) setError(reason instanceof Error ? reason.message : "Could not load volunteers.");
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 10_000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    void QRCode.toDataURL(registrationUrl, { width: 480, margin: 2, color: { dark: "#48151d", light: "#ffffff" }, errorCorrectionLevel: "M" }).then(setQr);
  }, [registrationUrl]);

  const counts = useMemo(() => ({
    pending: volunteers.filter((v) => v.status === "pending").length,
    approved: volunteers.filter((v) => v.status === "approved").length,
    checkedIn: volunteers.filter((v) => v.status === "checked_in").length,
    outstanding: volunteers.filter((v) => v.status === "checked_in" && outstandingItems(v).length > 0).length,
    signedOff: volunteers.filter((v) => v.status === "signed_off").length
  }), [volunteers]);

  const visible = volunteers.filter((volunteer) => {
    const matchesStatus = filter === "active" ? volunteer.status !== "signed_off" : volunteer.status === filter;
    const needle = query.trim().toLowerCase();
    return matchesStatus && (!needle || `${volunteer.firstName} ${volunteer.lastName} ${volunteer.email} ${volunteer.phone} ${volunteer.assistanceArea}`.toLowerCase().includes(needle));
  });

  const save = async (volunteer: Volunteer, input: Record<string, unknown>, message: string) => {
    setBusy(volunteer.id);
    setError("");
    try {
      const result = await updateVolunteer(volunteer.id, csrfToken, input);
      setVolunteers((current) => current.map((item) => item.id === volunteer.id ? result.volunteer : item));
      if (sound) beep();
      toast(message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update this volunteer.");
    } finally {
      setBusy(null);
    }
  };

  const issueDraft = (volunteer: Volunteer): IssueDraft => issues[volunteer.id] || {
    sashIssued: true, badgeIssued: true, radioIssued: false, otherItems: ""
  };
  const setIssue = (volunteer: Volunteer, next: Partial<IssueDraft>) => setIssues((current) => ({
    ...current, [volunteer.id]: { ...issueDraft(volunteer), ...next }
  }));

  return (
    <>
      <section className="volunteer-dashboard">
        <div className="volunteer-qr" id="volunteer-qr-sheet">
          <div>
            <p className="eyebrow">Volunteer registration</p>
            <h2>Scan to check in</h2>
            <p className="small muted">Display this at the organiser desk. New registrations appear below automatically.</p>
            <p className="volunteer-qr__url">{registrationUrl}</p>
            <div className="row volunteer-qr__actions">
              <a className="btn btn--sm" href={registrationUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} />Open form</a>
              <button className="btn btn--sm" type="button" onClick={() => window.print()}><Printer size={15} />Print QR</button>
            </div>
          </div>
          <div className="volunteer-qr__image">{qr ? <img src={qr} alt="QR code for volunteer registration" /> : <QrCode size={96} aria-label="Generating QR code" />}</div>
        </div>

        <div className="volunteer-stats">
          <div className="stat"><b>{counts.pending}</b><span>Pending</span></div>
          <div className="stat"><b>{counts.checkedIn}</b><span>On duty</span></div>
          <div className={`stat${counts.outstanding ? " stat--alert" : ""}`}><b>{counts.outstanding}</b><span>With gear</span></div>
          <div className="stat"><b>{counts.signedOff}</b><span>Signed off</span></div>
        </div>
      </section>

      <section className="section">
        <div className="section__head"><h2>Volunteer log</h2><div className="row">
          <button type="button" className="btn btn--icon btn--sm" title={sound ? "Turn confirmation sound off" : "Turn confirmation sound on"} aria-label={sound ? "Turn confirmation sound off" : "Turn confirmation sound on"} onClick={() => { const next = !sound; setSound(next); localStorage.setItem("ij26-organiser-sound", next ? "on" : "off"); }}>{sound ? <Volume2 size={17} /> : <VolumeX size={17} />}</button>
          <button type="button" className="btn btn--icon btn--sm" title="Refresh volunteers" aria-label="Refresh volunteers" onClick={() => void load()}><RefreshCw size={17} /></button>
        </div></div>

        <div className="volunteer-toolbar">
          <label className="volunteer-search"><Search size={17} /><span className="sr-only">Search volunteers</span><input type="search" placeholder="Search name, phone or area" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <div className="chips volunteer-filters" role="group" aria-label="Filter volunteers">
            {(["active", "pending", "approved", "checked_in", "signed_off"] as Filter[]).map((value) => <button key={value} type="button" className="chip" aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === "active" ? "Active" : STATUS_LABEL[value]}</button>)}
          </div>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="stack volunteer-list">
          {visible.map((volunteer) => {
            const outstanding = outstandingItems(volunteer);
            const draft = issueDraft(volunteer);
            return <article className={`admin-row volunteer-row volunteer-row--${volunteer.status}`} key={volunteer.id}>
              <div className="volunteer-row__head">
                <div><span className={`pill volunteer-status volunteer-status--${volunteer.status}`}>{STATUS_LABEL[volunteer.status]}</span><h3>{volunteer.firstName} {volunteer.lastName}</h3><p className="small muted">{volunteer.assistanceArea}</p></div>
                <span className="tiny muted">#{volunteer.reference.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="volunteer-contact"><a href={`tel:${volunteer.phone}`}>{volunteer.phone}</a><a href={`mailto:${volunteer.email}`}>{volunteer.email}</a></div>

              {volunteer.status === "pending" && <button type="button" className="btn btn--primary btn--block" disabled={busy === volunteer.id} onClick={() => void save(volunteer, { action: "approve" }, `${volunteer.firstName} approved`)}><ClipboardCheck size={17} />Approve volunteer</button>}

              {volunteer.status === "approved" && <div className="equipment-panel"><strong>Issue at check-in</strong><div className="equipment-grid">
                <ReturnCheck label="Sash" checked={draft.sashIssued} onChange={(checked) => setIssue(volunteer, { sashIssued: checked })} />
                <ReturnCheck label="Badge" checked={draft.badgeIssued} onChange={(checked) => setIssue(volunteer, { badgeIssued: checked })} />
                <ReturnCheck label="Walkie-talkie" checked={draft.radioIssued} onChange={(checked) => setIssue(volunteer, { radioIssued: checked })} />
              </div><label className="field"><span>Other issued items</span><input placeholder="e.g. radio #4, keys, hi-vis vest" value={draft.otherItems} onChange={(event) => setIssue(volunteer, { otherItems: event.target.value })} /></label><button type="button" className="btn btn--jade btn--block" disabled={busy === volunteer.id} onClick={() => void save(volunteer, { action: "checkIn", ...draft }, `${volunteer.firstName} checked in`)}><Check size={17} />Check in & issue items</button></div>}

              {volunteer.status === "checked_in" && <div className="equipment-panel"><strong>{outstanding.length ? "Mark items as returned" : "Everything has been returned"}</strong><div className="equipment-grid">
                {volunteer.sashIssued && <ReturnCheck label="Sash returned" checked={volunteer.sashReturned} onChange={(checked) => void save(volunteer, { action: "returns", sashReturned: checked, badgeReturned: volunteer.badgeReturned, radioReturned: volunteer.radioReturned, otherItemsReturned: volunteer.otherItemsReturned }, checked ? "Sash returned" : "Sash marked outstanding")} />}
                {volunteer.badgeIssued && <ReturnCheck label="Badge returned" checked={volunteer.badgeReturned} onChange={(checked) => void save(volunteer, { action: "returns", sashReturned: volunteer.sashReturned, badgeReturned: checked, radioReturned: volunteer.radioReturned, otherItemsReturned: volunteer.otherItemsReturned }, checked ? "Badge returned" : "Badge marked outstanding")} />}
                {volunteer.radioIssued && <ReturnCheck label="Walkie-talkie returned" checked={volunteer.radioReturned} onChange={(checked) => void save(volunteer, { action: "returns", sashReturned: volunteer.sashReturned, badgeReturned: volunteer.badgeReturned, radioReturned: checked, otherItemsReturned: volunteer.otherItemsReturned }, checked ? "Walkie-talkie returned" : "Walkie-talkie marked outstanding")} />}
                {volunteer.otherItems && <ReturnCheck label={`${volunteer.otherItems} returned`} checked={volunteer.otherItemsReturned} onChange={(checked) => void save(volunteer, { action: "returns", sashReturned: volunteer.sashReturned, badgeReturned: volunteer.badgeReturned, radioReturned: volunteer.radioReturned, otherItemsReturned: checked }, checked ? "Other items returned" : "Other items marked outstanding")} />}
              </div>{outstanding.length > 0 && <p className="equipment-outstanding"><PackageCheck size={17} />Outstanding: {outstanding.join(", ")}</p>}<button type="button" className="btn btn--primary btn--block" disabled={busy === volunteer.id || outstanding.length > 0} onClick={() => void save(volunteer, { action: "signOff" }, `${volunteer.firstName} signed off`)}><Check size={17} />Sign off volunteer</button></div>}

              {volunteer.status === "signed_off" && <p className="volunteer-complete"><Check size={17} />Shift complete. All recorded items returned.</p>}
            </article>;
          })}
          {visible.length === 0 && <div className="empty"><ClipboardCheck size={28} /><h3>No volunteers here</h3><p>New QR registrations will appear automatically.</p></div>}
        </div>
      </section>
    </>
  );
}
