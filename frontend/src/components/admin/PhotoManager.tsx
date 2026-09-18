import { useRef, useState } from "react";
import { ImageUp, Link2, Undo2 } from "lucide-react";
import { liveStore } from "../../lib/live/liveStore";
import { fileToDataUrl, formatBytes } from "../../lib/live/image";
import type { FestivalData, ScheduleItem } from "../../lib/types";

type RowProps = {
  label: string;
  sub: string;
  mediaKey: string;
  src?: string;
  overridden: boolean;
  toast: (message: string) => void;
};

function PhotoRow({ label, sub, mediaKey, src, overridden, toast }: RowProps) {
  const input = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);

  async function choose(file: File) {
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const result = liveStore.setMedia(mediaKey, dataUrl);
      toast(result.ok ? `${label} photo updated (${formatBytes(dataUrl.length)})` : result.reason ?? "Could not save");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not read that photo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="photo-row">
      <span className="photo-row__thumb">
        {src ? <img src={src} alt="" loading="lazy" /> : <span className="photo-row__blank" aria-hidden />}
      </span>
      <div className="photo-row__body">
        <strong>{label}{overridden && <em className="tag-edited">changed today</em>}</strong>
        <span className="tiny muted">{sub}</span>
        <div className="row" style={{ marginTop: 10 }}>
          <button type="button" className="btn btn--sm" disabled={busy} onClick={() => input.current?.click()}>
            <ImageUp size={14} />{busy ? "Working…" : "Choose photo"}
          </button>
          <button type="button" className="btn btn--sm btn--quiet" onClick={() => setLinkOpen((v) => !v)}>
            <Link2 size={14} />Link
          </button>
          {overridden && (
            <button
              type="button"
              className="btn btn--sm btn--danger"
              onClick={() => { liveStore.clearMedia(mediaKey); toast("Original photo restored"); }}
            >
              <Undo2 size={14} />Revert
            </button>
          )}
        </div>
        {linkOpen && (
          <div className="row" style={{ marginTop: 10, flexWrap: "nowrap" }}>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/images/trail/lakhey.jpg"
              aria-label={`Image link for ${label}`}
              style={{ flex: 1, minWidth: 0 }}
            />
            <button
              type="button"
              className="btn btn--sm btn--primary"
              onClick={() => {
                if (!link.trim()) return;
                const result = liveStore.setMedia(mediaKey, link.trim());
                toast(result.ok ? "Photo updated" : result.reason ?? "Could not save");
                setLink("");
                setLinkOpen(false);
              }}
            >
              Use
            </button>
          </div>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void choose(f); e.target.value = ""; }}
      />
    </div>
  );
}

type Props = {
  data: FestivalData;
  schedule: ScheduleItem[];
  toast: (message: string) => void;
};

export function PhotoManager({ data, schedule, toast }: Props) {
  const [showProgramme, setShowProgramme] = useState(false);
  const live = liveStore.get();
  const media = live.media ?? {};
  const { used, budget } = liveStore.size();
  const pct = Math.min(100, Math.round((used / budget) * 100));

  return (
    <>
      <div className="card card--sunk">
        <p className="small muted" style={{ margin: 0 }}>
          Photos are resized on this phone and kept in this browser — nothing is uploaded
          anywhere. To ship a photo for good, drop the file into
          <code> frontend/public/images/</code> and point the content at it.
        </p>
      </div>

      <section className="section">
        <div className="meter" role="img" aria-label={`Storage used: ${pct} percent`}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="tiny muted" style={{ marginTop: 6 }}>
          {formatBytes(used)} of {formatBytes(budget)} used · {Object.keys(media).length} photo
          {Object.keys(media).length === 1 ? "" : "s"} changed today
        </p>
      </section>

      <section className="section">
        <h2>Festival hero</h2>
        <PhotoRow
          label="Home screen hero"
          sub="The full-width photo at the top of the home screen."
          mediaKey="hero"
          src={data.event.heroMedia.src}
          overridden={Boolean(media.hero)}
          toast={toast}
        />
      </section>

      <section className="section">
        <h2>Trail stops ({data.trailPoints.length})</h2>
        <p className="small muted">
          Two stops ship without a photo on purpose — we would rather show nothing than the
          wrong thing. Add the real ones here as they are taken.
        </p>
        <div className="stack" style={{ marginTop: "var(--s-4)" }}>
          {data.trailPoints.map((point) => (
            <PhotoRow
              key={point.id}
              label={`${point.number}. ${point.title.en}`}
              sub={point.heroMedia ? "Has a photo" : "No photo yet"}
              mediaKey={`trail:${point.id}`}
              src={point.heroMedia?.src}
              overridden={Boolean(media[`trail:${point.id}`])}
              toast={toast}
            />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>Programme items</h2>
          <button
            type="button"
            className="section__link"
            style={{ background: "none", border: 0, cursor: "pointer" }}
            onClick={() => setShowProgramme((v) => !v)}
          >
            {showProgramme ? "Hide" : `Show all ${schedule.length}`}
          </button>
        </div>
        {showProgramme ? (
          <div className="stack">
            {schedule.map((item) => (
              <PhotoRow
                key={item.id}
                label={item.title.en}
                sub="Shown on the programme card."
                mediaKey={`sched:${item.id}`}
                src={item.image?.src}
                overridden={Boolean(media[`sched:${item.id}`])}
                toast={toast}
              />
            ))}
          </div>
        ) : (
          <p className="small muted">
            Programme cards read well without photos. Open this only if you want to put a picture
            on a specific item.
          </p>
        )}
      </section>
    </>
  );
}
