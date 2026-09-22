import { useCallback, useEffect, useState } from "react";
import { Check, RefreshCw, ShieldCheck, UserCheck, X } from "lucide-react";
import { getOrganiserRequests, reviewOrganiserRequest, type OrganiserRequest } from "../../lib/organiserRequests";

export function OrganiserRequestManager({ csrfToken, toast }: { csrfToken: string; toast: (message: string) => void }) {
  const [requests, setRequests] = useState<OrganiserRequest[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try { setRequests((await getOrganiserRequests()).requests); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load access requests."); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const review = async (request: OrganiserRequest, action: "approve" | "reject") => {
    setBusy(request.id);
    setError("");
    try {
      const result = await reviewOrganiserRequest(request.id, csrfToken, action);
      setRequests((current) => current.map((item) => item.id === request.id ? result.request : item));
      toast(action === "approve" ? `${request.firstName || request.email} approved` : "Access request rejected");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not review this request.");
    } finally { setBusy(null); }
  };

  const pending = requests.filter((request) => request.status === "pending");
  const reviewed = requests.filter((request) => request.status !== "pending");
  return <section className="section">
    <div className="section__head"><div><p className="eyebrow">Permissions</p><h2>Organiser access requests</h2></div><button type="button" className="btn btn--icon btn--sm" title="Refresh requests" aria-label="Refresh requests" onClick={() => void load()}><RefreshCw size={17} /></button></div>
    <div className="stat-row"><div className="stat"><b>{pending.length}</b><span>Awaiting review</span></div><div className="stat"><b>{requests.filter((request) => request.status === "approved").length}</b><span>Approved</span></div></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="stack organiser-request-list">
      {pending.map((request) => <article className="admin-row organiser-request-row" key={request.id}>
        <div><span className="pill">Pending</span><h3>{request.firstName} {request.lastName}</h3><p className="small muted">{request.assistanceArea}</p></div>
        <div className="organiser-request-contact"><a href={`mailto:${request.email}`}>{request.email}</a>{request.phone && <a href={`tel:${request.phone}`}>{request.phone}</a>}</div>
        {request.message && <p className="small organiser-request-message">{request.message}</p>}
        <div className="row"><button className="btn btn--primary" disabled={busy === request.id} onClick={() => void review(request, "approve")}><UserCheck size={17} />Approve</button><button className="btn" disabled={busy === request.id} onClick={() => void review(request, "reject")}><X size={17} />Reject</button></div>
      </article>)}
      {pending.length === 0 && <div className="empty"><ShieldCheck size={28} /><h3>No requests awaiting review</h3><p>New organiser applications will appear here.</p></div>}
    </div>
    {reviewed.length > 0 && <details className="organiser-reviewed"><summary>Reviewed requests ({reviewed.length})</summary><div className="stack">{reviewed.map((request) => <div className="admin-row" key={request.id}><div><strong>{request.firstName} {request.lastName}</strong><p className="small muted">{request.email} · {request.assistanceArea}</p></div><span className={`pill${request.status === "approved" ? " pill--jade" : ""}`}>{request.status === "approved" ? <><Check size={13} />Approved</> : "Rejected"}</span></div>)}</div></details>}
  </section>;
}
