import { Link } from "react-router-dom";
import { Mail, Phone } from "lucide-react";
import { useApp } from "../app/AppContext";
import { formatLongDate } from "../lib/dates/schedule";

export function SiteFooter() {
  const { data } = useApp();
  const event = data.event;
  const year = new Date(event.startAt).getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <img className="site-footer__mark" src="/brand/ngv-mark.png" alt="" width={52} height={52} />

        <p className="site-footer__org">{event.brandName}</p>
        <p className="site-footer__event">
          Indra Jatra — Yenya Punhi {year}
          <span>
            {formatLongDate(event.startAt)} · {event.venueName}, Diggers Rest
          </span>
        </p>

        <nav className="site-footer__links" aria-label="Footer">
          <Link to="/info">Help &amp; safety</Link>
          <Link to="/membership">Membership</Link>
          <Link to="/directory">Stalls &amp; sponsors</Link>
          {event.organiserUrl && (
            <a href={event.organiserUrl} target="_blank" rel="noreferrer">newaguthi.org.au</a>
          )}
        </nav>

        <div className="site-footer__contact">
          {event.contactEmail && (
            <a href={`mailto:${event.contactEmail}`}><Mail size={14} />{event.contactEmail}</a>
          )}
          {event.contactPhone && (
            <a href={`tel:${event.contactPhone}`}><Phone size={14} />0402 556 696</a>
          )}
        </div>

        <p className="site-footer__copy">
          © {year} {event.brandName}. Preserving heritage, building community.
        </p>
      </div>
    </footer>
  );
}
