import { useState } from "react";
import { Plus } from "lucide-react";
import { liveStore } from "../../lib/live/liveStore";
import type { Announcement } from "../../lib/types";

const SEVERITIES: { id: Announcement["severity"]; label: string; hint: string }[] = [
  { id: "info", label: "Info", hint: "Everyday notice. Visitors can dismiss it." },
  { id: "update", label: "Update", hint: "Something has changed — a time, a place." },
  { id: "important", label: "Important", hint: "Visitors should read this before moving on." },
  { id: "emergency", label: "Emergency", hint: "Red, full width, cannot be dismissed. Genuine emergencies only." }
];

type Props = {
  /** The app's current time, so a notice written in rehearsal still shows. */
  now: Date;
  disabled?: boolean;
  toast: (message: string) => void;
};

export function AnnouncementComposer({ now, disabled = false, toast }: Props) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<Announcement["severity"]>("update");

  const ready = title.trim().length > 2 && message.trim().length > 2;
  const chosen = SEVERITIES.find((s) => s.id === severity);

  function add() {
    if (!ready) return;
    liveStore.addAnnouncement({
      title: title.trim(),
      message: message.trim(),
      severity,
      // Whichever clock is behind, so the notice is never "in the future".
      startsAt: new Date(Math.min(Date.now(), now.getTime())).toISOString()
    });
    setTitle("");
    setMessage("");
    setSeverity("update");
    toast("Written — press Publish when you want visitors to see it");
  }

  return (
    <div className="card card--pad-lg">
      <h3>Write a new announcement</h3>
      <p className="small muted">
        It is saved unpublished. Nothing reaches a visitor screen until you press Publish on
        it in the list above.
      </p>

      <label className="field" style={{ marginTop: "var(--s-4)" }}>
        <span>Heading</span>
        <input
          type="text"
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Kumari Rath is running late"
          aria-label="Announcement heading"
        />
      </label>

      <label className="field" style={{ marginTop: "var(--s-3)" }}>
        <span>Message</span>
        <textarea
          value={message}
          maxLength={280}
          rows={3}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="The chariot will now leave at 12:05. Stay behind the rope line until the marshals open it."
          aria-label="Announcement message"
        />
        <span className="tiny muted">{message.length}/280</span>
      </label>

      <label className="field" style={{ marginTop: "var(--s-3)" }}>
        <span>How loud</span>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as Announcement["severity"])}
          aria-label="Severity"
        >
          {SEVERITIES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        {chosen && <span className="tiny muted">{chosen.hint}</span>}
      </label>

      <button
        type="button"
        className="btn btn--primary btn--block"
        style={{ marginTop: "var(--s-4)" }}
        disabled={disabled || !ready}
        onClick={add}
      >
        <Plus size={16} />Add announcement
      </button>
    </div>
  );
}
