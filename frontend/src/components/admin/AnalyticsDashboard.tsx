import { useCallback, useEffect, useState } from "react";
import { BarChart3, MonitorSmartphone, RefreshCw } from "lucide-react";
import { getAnalyticsReport, type AnalyticsCount, type AnalyticsReport } from "../../lib/analytics/report";

function CountList({ title, rows }: { title: string; rows: AnalyticsCount[] }) {
  return <section className="card analytics-panel">
    <h3>{title}</h3>
    {rows.length ? <div className="analytics-counts">{rows.map((row) => <div className="row row--between" key={row.label}>
      <span>{row.label.replaceAll("_", " ")}</span><strong>{row.count.toLocaleString()}</strong>
    </div>)}</div> : <p className="small muted">No activity recorded yet.</p>}
  </section>;
}

function localTime(value: string) {
  return new Date(`${value.replace(" ", "T")}Z`).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
}

export function AnalyticsDashboard() {
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setReport(await getAnalyticsReport()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Visitor reporting is unavailable."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return <section className="section analytics-dashboard">
    <div className="section__head">
      <div><p className="eyebrow">Private reporting</p><h2>Visitor reports</h2></div>
      <button className="btn btn--icon btn--sm" type="button" title="Refresh reports" aria-label="Refresh visitor reports" onClick={() => void load()} disabled={loading}>
        <RefreshCw size={17} />
      </button>
    </div>
    <p className="small muted">Anonymous app activity only. No visitor names, email addresses, IP addresses or device fingerprints are collected here.</p>
    {error && <div className="card card--notice"><p className="small" style={{ margin: 0 }}>{error}</p></div>}
    {loading && !report && <div className="empty"><BarChart3 size={28} /><h3>Loading reports</h3></div>}
    {report && <>
      <div className="analytics-summary">
        <div className="stat"><b>{report.totals.devices.toLocaleString()}</b><span>Devices</span></div>
        <div className="stat"><b>{report.totals.visits.toLocaleString()}</b><span>Visits</span></div>
        <div className="stat"><b>{report.totals.pageViews.toLocaleString()}</b><span>Page views</span></div>
        <div className="stat"><b>{report.totals.visitsToday.toLocaleString()}</b><span>Visits today</span></div>
      </div>
      <div className="analytics-grid">
        <CountList title="Device types" rows={report.deviceTypes} />
        <CountList title="App use" rows={report.displayModes} />
        <CountList title="Popular pages" rows={report.topPages} />
        <CountList title="Popular actions" rows={report.topEvents} />
      </div>
      <section className="card analytics-panel">
        <div className="row" style={{ gap: 10 }}><MonitorSmartphone size={18} /><h3 style={{ margin: 0 }}>Recent visits</h3></div>
        <div className="analytics-table-wrap"><table className="analytics-table">
          <thead><tr><th>First seen</th><th>Device</th><th>Mode</th><th>Landing page</th><th>Views</th></tr></thead>
          <tbody>{report.recentVisits.map((visit) => <tr key={visit.id}>
            <td>{localTime(visit.firstSeenAt)}</td><td>{visit.deviceType}</td><td>{visit.displayMode}</td><td>{visit.landingPath}</td><td>{visit.pageViews}</td>
          </tr>)}</tbody>
        </table></div>
      </section>
      <p className="tiny muted">Updated {new Date(report.generatedAt).toLocaleString("en-AU")}</p>
    </>}
  </section>;
}
