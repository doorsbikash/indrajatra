import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { IScannerControls } from "@zxing/browser";
import { Camera, CameraOff, CheckCircle2, Clock3, Keyboard, QrCode, RefreshCw, ScanLine, TicketCheck, TriangleAlert } from "lucide-react";
import { checkInTicket, getCheckInSummary, type CheckedInAttendee, type CheckInSummary } from "../../lib/checkIn";

type ScanResult = { tone: "success" | "warning" | "error"; title: string; message: string; attendee?: CheckedInAttendee };

function confirmationBeep(tone: "success" | "warning") {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = tone === "success" ? 880 : 390;
  gain.gain.setValueAtTime(0.08, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.16);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.16);
  oscillator.addEventListener("ended", () => void context.close());
}

export function AttendeeCheckIn({ csrfToken }: { csrfToken: string }) {
  const [summary, setSummary] = useState<CheckInSummary>({ total: 0, checkedIn: 0, remaining: 0, recent: [] });
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const handlingRef = useRef(false);

  const refresh = useCallback(async () => {
    try { setSummary(await getCheckInSummary()); } catch { /* Keep the last usable totals. */ }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => () => controlsRef.current?.stop(), []);

  const processCode = useCallback(async (code: string) => {
    if (handlingRef.current || !code.trim()) return;
    handlingRef.current = true;
    setBusy(true);
    setResult(null);
    try {
      const response = await checkInTicket(code.trim(), csrfToken);
      const name = `${response.attendee.firstName} ${response.attendee.lastName}`.trim() || "Eventbrite attendee";
      if (response.status === "already_checked_in") {
        confirmationBeep("warning");
        setResult({ tone: "warning", title: "Already checked in", message: `${name} was checked in earlier.`, attendee: response.attendee });
      } else {
        confirmationBeep("success");
        setResult({ tone: "success", title: "Check-in complete", message: `Welcome, ${name}.`, attendee: response.attendee });
      }
      setManualCode("");
      await refresh();
    } catch (reason) {
      confirmationBeep("warning");
      setResult({ tone: "error", title: "Ticket not checked in", message: reason instanceof Error ? reason.message : "Could not read this ticket." });
    } finally {
      setBusy(false);
      handlingRef.current = false;
    }
  }, [csrfToken, refresh]);

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  }, []);

  const startScanner = async () => {
    if (!videoRef.current) return;
    setCameraError("");
    setResult(null);
    setScanning(true);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      controlsRef.current = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: "environment" } } },
        videoRef.current,
        (scanResult) => {
          if (!scanResult || handlingRef.current) return;
          stopScanner();
          void processCode(scanResult.getText());
        }
      );
    } catch {
      setScanning(false);
      setCameraError("Camera access is unavailable. Allow camera permission and try again, or enter the ticket code below.");
    }
  };

  const submitManual = (event: FormEvent) => {
    event.preventDefault();
    stopScanner();
    void processCode(manualCode);
  };

  return (
    <>
      <section className="checkin-stats">
        <div className="stat"><b>{summary.total}</b><span>Imported</span></div>
        <div className="stat"><b>{summary.checkedIn}</b><span>Checked in</span></div>
        <div className="stat"><b>{summary.remaining}</b><span>Remaining</span></div>
      </section>

      <section className="section checkin-workspace">
        <div className="section__head"><div><p className="eyebrow">Eventbrite tickets</p><h2>Scan to check in</h2></div><button type="button" className="btn btn--icon btn--sm" title="Refresh totals" aria-label="Refresh totals" onClick={() => void refresh()}><RefreshCw size={17} /></button></div>
        <div className={`ticket-scanner${scanning ? " ticket-scanner--active" : ""}`}>
          <video ref={videoRef} muted playsInline aria-label="Ticket scanner camera preview" />
          {!scanning && <div className="ticket-scanner__idle"><QrCode size={42} /><strong>Eventbrite QR or barcode</strong><span>Use the rear camera and hold the ticket inside the frame.</span></div>}
          <span className="ticket-scanner__frame" aria-hidden />
        </div>
        <button type="button" className={`btn btn--block${scanning ? " btn--danger" : " btn--primary"}`} disabled={busy} onClick={() => scanning ? stopScanner() : void startScanner()}>{scanning ? <><CameraOff size={18} />Stop scanner</> : <><Camera size={18} />Start scanner</>}</button>
        {cameraError && <p className="form-error" role="alert">{cameraError}</p>}

        {result && <div className={`checkin-result checkin-result--${result.tone}`} role="status">
          {result.tone === "success" ? <CheckCircle2 size={24} /> : <TriangleAlert size={24} />}
          <div><strong>{result.title}</strong><p>{result.message}</p>{result.attendee?.ticketType && <span>{result.attendee.ticketType}</span>}</div>
        </div>}

        <form className="manual-ticket" onSubmit={submitManual}>
          <label className="field"><span><Keyboard size={15} /> Manual ticket, attendee or order number</span><input required autoCapitalize="none" autoCorrect="off" value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder="Enter code when a ticket will not scan" /></label>
          <button className="btn" disabled={busy || !manualCode.trim()}><TicketCheck size={17} />Check in</button>
        </form>
      </section>

      <section className="section">
        <div className="section__head"><h2>Recent arrivals</h2><span className="tiny muted">Latest 20</span></div>
        <div className="checkin-recent">
          {summary.recent.map((attendee) => <div className="checkin-recent__row" key={attendee.id}><span className="icon-disc icon-disc--jade"><ScanLine size={17} /></span><div><strong>{attendee.firstName} {attendee.lastName}</strong><span>{attendee.ticketType || "Eventbrite attendee"}</span></div><time><Clock3 size={13} />{attendee.checkedInAt ? new Date(`${attendee.checkedInAt}Z`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}</time></div>)}
          {summary.recent.length === 0 && <div className="empty"><TicketCheck size={28} /><h3>No check-ins yet</h3><p>Imported Eventbrite attendees will appear here after their tickets are scanned.</p></div>}
        </div>
      </section>
    </>
  );
}
