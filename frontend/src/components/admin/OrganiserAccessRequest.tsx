import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Clock3, Send, ShieldCheck, XCircle } from "lucide-react";
import { getMyOrganiserRequest, submitOrganiserRequest, type OrganiserRequest } from "../../lib/organiserRequests";

export function OrganiserAccessRequest({ csrfToken }: { csrfToken: string }) {
  const [request, setRequest] = useState<OrganiserRequest | null>(null);
  const [area, setArea] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void getMyOrganiserRequest().then(({ request: current }) => {
      setRequest(current);
      if (current) { setArea(current.assistanceArea); setMessage(current.message); }
    }).catch(() => setError("Could not check your access request."));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await submitOrganiserRequest(csrfToken, { assistanceArea: area.trim(), message: message.trim() });
      setRequest(result.request);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not submit your request.");
    } finally {
      setBusy(false);
    }
  };

  if (request?.status === "pending") return <div className="access-state"><Clock3 size={30} /><h2>Request awaiting approval</h2><p>An organiser will review your request. Refresh this page after they approve you.</p><span className="pill">{request.assistanceArea}</span></div>;
  if (request?.status === "approved") return <div className="access-state access-state--approved"><CheckCircle2 size={30} /><h2>Access approved</h2><p>Refresh this page to open the organiser console.</p><button className="btn btn--primary" type="button" onClick={() => window.location.reload()}>Open organiser console</button></div>;

  return <section className="section organiser-request-form">
    <div className="row" style={{ gap: 12, alignItems: "flex-start" }}><span className="icon-disc"><ShieldCheck size={19} /></span><div><p className="eyebrow">Organiser console</p><h1>Request organiser access</h1></div></div>
    <p className="lead">Tell the festival team where you will be helping. An existing organiser must approve your request before you can manage live information.</p>
    {request?.status === "rejected" && <div className="card card--notice"><p className="small"><XCircle size={16} />Your previous request was not approved. You can update the details and submit again.</p></div>}
    <form className="stack" onSubmit={submit}>
      <label className="field"><span>Role or area of assistance</span><input required maxLength={160} placeholder="e.g. Stage manager, information desk" value={area} onChange={(event) => setArea(event.target.value)} /></label>
      <label className="field"><span>Message for the organisers <small>(optional)</small></span><textarea maxLength={500} rows={4} placeholder="Why do you need organiser access?" value={message} onChange={(event) => setMessage(event.target.value)} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="btn btn--primary btn--block" disabled={busy || !area.trim()}>{busy ? "Submitting…" : <><Send size={17} />Submit access request</>}</button>
    </form>
  </section>;
}
