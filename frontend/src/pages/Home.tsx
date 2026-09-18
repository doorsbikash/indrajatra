import { Link } from "react-router-dom";
import {
  CalendarDays, Clock, Compass, HeartHandshake, LifeBuoy,
  MapPin, MapPinned, Ticket, Utensils
} from "lucide-react";
import { useApp } from "../app/AppContext";
import { EventCard } from "../components/EventCard";
import { Passport } from "../components/Passport";
import { Announcements } from "../components/Announcements";
import { SponsorWall } from "../components/SponsorWall";
import { SectionHead } from "../components/ui";
import { t } from "../lib/text";
import {
  countdownParts, eventStatus, formatLongDate, formatTime, getNowNextLater
} from "../lib/dates/schedule";

export function HomePage() {
  const { data, schedule, locale, now, profile } = useApp();
  const event = data.event;
  const status = eventStatus(event, now);
  const { nowItems, nextItem, later } = getNowNextLater(schedule, now);
  const countdown = countdownParts(event.startAt, now);

  return (
    <main className="page page--flush">
      <section className="hero">
        <img className="hero__img" src={event.heroMedia.src} alt="" fetchPriority="high" />

        <div className="hero__top">
          <span className={`hero__badge${status === "live" ? " hero__badge--live" : ""}`}>
            {status === "live" && <i className="dot" aria-hidden />}
            {status === "live" ? "Happening now" : status === "finished" ? "Until next year" : "Free entry"}
          </span>
        </div>

        <div>
          <p className="eyebrow eyebrow--light">
            {profile ? `Namaste, ${profile.firstName}` : "Yenya Punhi · Melbourne"}
          </p>
          <h1 className="display">
            Indra<br />Jatra
          </h1>
          <p className="lead" style={{ maxWidth: "30ch" }}>{t(event.intro, locale)}</p>

          <div className="hero__facts">
            <div><CalendarDays size={15} />{formatLongDate(event.startAt)} · {formatTime(event.startAt)}–{formatTime(event.endAt)}</div>
            <div><MapPin size={15} />{event.venueName}, {event.venueAddress.split(",")[1]?.trim() ?? ""}</div>
            <div><Ticket size={15} />{t(event.entryCost, locale)}</div>
          </div>

          {status === "upcoming" && !countdown.isPast && (
            <div className="countdown" aria-label="Time until the festival opens">
              <span className="countdown__unit"><b className="countdown__num">{countdown.days}</b><span className="countdown__lbl">Days</span></span>
              <span className="countdown__unit"><b className="countdown__num">{countdown.hours}</b><span className="countdown__lbl">Hours</span></span>
              <span className="countdown__unit"><b className="countdown__num">{countdown.minutes}</b><span className="countdown__lbl">Mins</span></span>
            </div>
          )}

          <div className="hero__actions">
            <Link className="btn btn--light" to="/schedule"><CalendarDays size={17} />Full programme</Link>
            <Link className="btn btn--ghost" to="/map"><MapPinned size={17} />Site map</Link>
          </div>
        </div>
      </section>

      <div style={{ marginTop: "var(--s-5)" }}>
        <Announcements />
      </div>

      {(nowItems.length > 0 || nextItem) && (
        <section className="section">
          <SectionHead
            title={nowItems.length ? "On right now" : "Up next"}
            action={<Link className="section__link" to="/schedule">Full programme →</Link>}
          />
          <div className="live-rail">
            {nowItems.map((item) => <EventCard key={item.id} item={item} />)}
            {!nowItems.length && nextItem && <EventCard item={nextItem} showCountdown />}
          </div>

          {nowItems.length > 0 && nextItem && (
            <>
              <p className="eyebrow eyebrow--muted" style={{ marginTop: "var(--s-4)" }}>Then</p>
              <EventCard item={nextItem} compact showCountdown />
            </>
          )}

          {later.length > 0 && (
            <ul className="stack" style={{ listStyle: "none", padding: 0, marginTop: "var(--s-4)" }}>
              {later.map((item) => (
                <li key={item.id}>
                  <Link className="card card--sunk card-link row row--between" to="/schedule" style={{ gap: 12 }}>
                    <span className="event-card__time">{formatTime(item.effectiveStart || item.scheduledStart)}</span>
                    <span style={{ flex: 1, fontWeight: 700, fontSize: "var(--step--1)" }}>{t(item.title, locale)}</span>
                    <Clock size={15} style={{ color: "var(--faint)" }} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="section">
        <SectionHead title="Find your way" />
        <nav className="quick">
          <Link to="/schedule">
            <span className="icon-disc"><CalendarDays size={19} /></span>
            <span>What's on<small>Live programme, save your picks</small></span>
          </Link>
          <Link to="/map">
            <span className="icon-disc icon-disc--jade"><MapPinned size={19} /></span>
            <span>Toilets, food, first aid<small>Every marker on the site map</small></span>
          </Link>
          <Link to="/explore">
            <span className="icon-disc icon-disc--gold"><Compass size={19} /></span>
            <span>Cultural trail<small>12 stops, 12 stamps</small></span>
          </Link>
          <Link to="/directory">
            <span className="icon-disc"><Utensils size={19} /></span>
            <span>Food &amp; stalls<small>Who's here and what they serve</small></span>
          </Link>
          <Link to="/info">
            <span className="icon-disc icon-disc--jade"><LifeBuoy size={19} /></span>
            <span>Help &amp; safety<small>First aid, lost children, access</small></span>
          </Link>
          <Link to="/membership">
            <span className="icon-disc icon-disc--gold"><HeartHandshake size={19} /></span>
            <span>Join the Guthi<small>Membership, classes, volunteering</small></span>
          </Link>
        </nav>
      </section>

      <section className="section">
        <Passport compact />
        <Link className="btn btn--dark btn--block" to="/explore" style={{ marginTop: 12 }}>
          <Compass size={17} />Start the cultural trail
        </Link>
      </section>

      <section className="section">
        <div className="card card--pad-lg">
          <p className="eyebrow">Presented by</p>
          <img
            src="/brand/ngv-logo.png"
            alt={event.organiser}
            className="org-logo"
            width={464}
            height={516}
          />
          <p className="small muted">
            Established in 2024 to preserve, promote and share Newa culture and heritage
            across Australia — through festivals, weekly classes and community programs.
          </p>
          <div className="row" style={{ marginTop: 12 }}>
            <Link className="btn btn--sm" to="/membership">Become a member</Link>
            {event.organiserUrl && (
              <a className="btn btn--sm" href={event.organiserUrl} target="_blank" rel="noreferrer">
                newaguthi.org.au
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <p className="eyebrow eyebrow--gold">Supported by</p>
        <h2>Today is free because of them</h2>
        <p className="small muted" style={{ marginBottom: "var(--s-5)" }}>
          Every business below put money behind this festival so nobody had to buy a ticket.
          They are thanked from the stage at 3:30pm — and they are worth your business in return.
        </p>
        <SponsorWall compact />
        <Link className="btn btn--block" to="/directory" style={{ marginTop: "var(--s-5)" }}>
          See who else is here
        </Link>
      </section>
    </main>
  );
}
