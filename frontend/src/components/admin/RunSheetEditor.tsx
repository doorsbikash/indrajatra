import { useMemo, useRef, useState } from "react";
import {
  ClipboardPaste, Download, EyeOff, Plus, Star, Trash2, Undo2, Upload
} from "lucide-react";
import { DebouncedInput } from "./DebouncedInput";
import { liveStore, type DraftItem } from "../../lib/live/liveStore";
import { parseRunSheet, slugify, toIso, toTimeInput } from "../../lib/live/runSheet";
import { scheduleCategories } from "../../content/seed/data";
import type { Location, ScheduleItem } from "../../lib/types";

const EXAMPLE = `10:00 - 10:20 | Gates open | guest-entry | community
10:20 - 10:45 | Dhimey Baja welcome procession | guest-entry | procession, music
10:45 - 11:05 | Lamp lighting and official opening | main-stage | main-stage`;

const TAGS = scheduleCategories.filter((c) => c.id !== "all");

type Props = {
  schedule: ScheduleItem[];
  published: ScheduleItem[];
  locations: Location[];
  day: string;
  canManageBackups: boolean;
  toast: (message: string) => void;
};

export function RunSheetEditor({ schedule, published, locations, day, canManageBackups, toast }: Props) {
  const [paste, setPaste] = useState("");
  const [preview, setPreview] = useState<ReturnType<typeof parseRunSheet> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const live = liveStore.get();
  const locationIds = useMemo(() => locations.map((l) => l.id), [locations]);
  const removed = published.filter((item) => live.schedule[item.id]?.removed);
  const defaultLocation = locationIds.includes("main-stage") ? "main-stage" : locationIds[0];

  const edited = (id: string) => {
    const o = live.schedule[id];
    return Boolean(
      o && (o.title !== undefined || o.scheduledStart !== undefined ||
        o.scheduledEnd !== undefined || o.locationId !== undefined ||
        o.categoryIds !== undefined || o.summary !== undefined || o.revealOnStart !== undefined)
    );
  };
  const isAdded = (id: string) => (live.added ?? []).some((a) => a.id === id);

  function addItem() {
    const last = schedule[schedule.length - 1];
    const startsAt = last?.scheduledEnd ?? last?.scheduledStart ?? toIso(day, "10:00");
    const draft: Omit<DraftItem, "id"> = {
      title: "New item",
      summary: "",
      scheduledStart: startsAt,
      scheduledEnd: new Date(new Date(startsAt).getTime() + 20 * 60_000).toISOString(),
      locationId: defaultLocation,
      categoryIds: []
    };
    liveStore.addItem(draft);
    toast("Item added — give it a name and a time");
  }

  function runPreview() {
    setPreview(parseRunSheet(paste, {
      day,
      locationIds,
      defaultLocationId: defaultLocation,
      knownTags: TAGS.map((t) => t.id)
    }));
  }

  function applyPaste(mode: "replace" | "append") {
    if (!preview?.rows.length) return;
    if (mode === "replace") {
      if (!window.confirm(
        `Replace the whole programme with these ${preview.rows.length} items? The published run sheet stays in the code — you can undo this with "Discard run sheet changes".`
      )) return;
      liveStore.replaceSchedule(preview.rows, published.map((i) => i.id));
      toast(`Programme replaced — ${preview.rows.length} items`);
    } else {
      preview.rows.forEach((row) => liveStore.addItem(row));
      toast(`${preview.rows.length} items added`);
    }
    setPaste("");
    setPreview(null);
  }

  function download() {
    const blob = new Blob([liveStore.exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `indra-jatra-live-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "")}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Backup downloaded");
  }

  function restore(file: File) {
    if (!window.confirm("Restore this emergency backup? It will replace the current live run sheet, photos and announcements for every organiser and visitor.")) return;
    void file.text().then((raw) => {
      const result = liveStore.importJson(raw);
      toast(result.ok ? "Organiser state restored" : result.reason ?? "Could not read that file");
    });
  }

  return (
    <>
      <div className="card card--sunk">
        <p className="small muted" style={{ margin: 0 }}>
          Every change is live on the visitor screens the moment you make it, and it survives a
          refresh. To make today's run sheet permanent, use <em>Copy data.ts block</em> at the
          bottom of this tab.
        </p>
      </div>

      <section className="section">
        <h2>Paste the committee run sheet</h2>
        <p className="small muted">
          One item per line, starting with the time. Columns can be separated by tabs (paste
          straight from Excel or a Word table), pipes, or two or more spaces. Times may be
          written 10:00, 10.00, 1:15pm or as a range.
        </p>
        <label className="field" style={{ marginTop: "var(--s-3)" }}>
          <span>Run sheet</span>
          <textarea
            value={paste}
            onChange={(e) => { setPaste(e.target.value); setPreview(null); }}
            placeholder={EXAMPLE}
            rows={7}
            aria-label="Paste the run sheet"
          />
        </label>
        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" className="btn btn--sm" disabled={!paste.trim()} onClick={runPreview}>
            <ClipboardPaste size={14} />Check it
          </button>
        </div>

        {preview && (
          <div className="card card--sunk" style={{ marginTop: "var(--s-4)" }}>
            <h3>{preview.rows.length} item{preview.rows.length === 1 ? "" : "s"} read</h3>
            {preview.rows.length > 0 && (
              <ol className="small muted" style={{ margin: "var(--s-3) 0 0", paddingLeft: "1.2rem" }}>
                {preview.rows.slice(0, 40).map((row) => (
                  <li key={row.id}>
                    {toTimeInput(row.scheduledStart)}
                    {row.scheduledEnd ? `–${toTimeInput(row.scheduledEnd)}` : ""} · {row.title}
                    {row.categoryIds.length ? ` · ${row.categoryIds.join(", ")}` : ""}
                  </li>
                ))}
              </ol>
            )}
            {preview.skipped.length > 0 && (
              <>
                <h3 style={{ marginTop: "var(--s-4)" }}>{preview.skipped.length} line{preview.skipped.length === 1 ? "" : "s"} skipped</h3>
                <ul className="small muted" style={{ margin: "var(--s-2) 0 0", paddingLeft: "1.2rem" }}>
                  {preview.skipped.slice(0, 10).map((s, i) => (
                    <li key={i}><code>{s.line.slice(0, 60)}</code> — {s.why}</li>
                  ))}
                </ul>
              </>
            )}
            {preview.rows.length > 0 && (
              <div className="row" style={{ marginTop: "var(--s-4)" }}>
                <button type="button" className="btn btn--sm btn--primary" onClick={() => applyPaste("replace")}>
                  Replace the programme
                </button>
                <button type="button" className="btn btn--sm" onClick={() => applyPaste("append")}>
                  Add to the programme
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section__head">
          <h2>Programme ({schedule.length})</h2>
          <button type="button" className="section__link" style={{ background: "none", border: 0, cursor: "pointer" }} onClick={addItem}>
            <Plus size={14} />Add item
          </button>
        </div>

        <div className="stack">
          {schedule.map((item) => (
            <div className="admin-row admin-row--edit" key={item.id}>
              <div className="editor-times">
                <label className="field">
                  <span>Start</span>
                  <input
                    type="time"
                    value={toTimeInput(item.scheduledStart)}
                    onChange={(e) => e.target.value && liveStore.editItem(item.id, { scheduledStart: toIso(day, e.target.value) })}
                  />
                </label>
                <label className="field">
                  <span>End</span>
                  <input
                    type="time"
                    value={toTimeInput(item.scheduledEnd)}
                    onChange={(e) => e.target.value && liveStore.editItem(item.id, { scheduledEnd: toIso(day, e.target.value) })}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn--sm btn--danger editor-times__del"
                  aria-label={`Remove ${item.title.en}`}
                  onClick={() => {
                    if (!window.confirm(`Take "${item.title.en}" off the programme?`)) return;
                    liveStore.removeItem(item.id);
                    toast("Removed from the programme");
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <label className="field" style={{ marginTop: "var(--s-3)" }}>
                <span>Title {edited(item.id) && <em className="tag-edited">edited</em>}{isAdded(item.id) && <em className="tag-edited">added today</em>}</span>
                <DebouncedInput
                  aria-label="Item title"
                  value={item.title.en}
                  onCommit={(v) => liveStore.editItem(item.id, { title: v })}
                />
              </label>

              <details className="editor-more">
                <summary>Description, place and tags</summary>

              <label className="field" style={{ marginTop: "var(--s-3)" }}>
                <span>What visitors read</span>
                <DebouncedInput
                  multiline
                  aria-label="Item description"
                  placeholder="One or two sentences."
                  value={item.summary?.en ?? ""}
                  onCommit={(v) => liveStore.editItem(item.id, { summary: v })}
                />
              </label>

              <div className="field--row" style={{ marginTop: "var(--s-3)" }}>
                <label className="field">
                  <span>Where</span>
                  <select
                    value={item.locationId}
                    onChange={(e) => liveStore.editItem(item.id, { locationId: e.target.value })}
                  >
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name.en}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Tags</span>
                  <DebouncedInput
                    aria-label="Tags, comma separated"
                    placeholder="procession, music"
                    value={item.categoryIds.join(", ")}
                    onCommit={(v) =>
                      liveStore.editItem(item.id, {
                        categoryIds: v.split(",").map((t) => slugify(t)).filter(Boolean)
                      })
                    }
                  />
                </label>
              </div>

              <button
                type="button"
                className="chip"
                style={{ marginTop: "var(--s-3)" }}
                aria-pressed={Boolean(item.highlight)}
                onClick={() => liveStore.editItem(item.id, { highlight: !item.highlight })}
              >
                <Star size={14} />Highlight of the day
              </button>
              <button
                type="button"
                className="chip"
                style={{ marginTop: "var(--s-3)" }}
                aria-pressed={Boolean(item.revealOnStart)}
                onClick={() => liveStore.editItem(item.id, { revealOnStart: !item.revealOnStart })}
              >
                <EyeOff size={14} />Hide from visitors until Start
              </button>
              </details>
            </div>
          ))}
        </div>
      </section>

      {removed.length > 0 && (
        <section className="section">
          <h2>Taken off the programme</h2>
          <div className="stack">
            {removed.map((item) => (
              <div className="card row row--between" key={item.id} style={{ gap: 12 }}>
                <span className="small muted" style={{ textDecoration: "line-through" }}>{item.title.en}</span>
                <button type="button" className="btn btn--sm" onClick={() => { liveStore.restoreItem(item.id); toast("Put back"); }}>
                  <Undo2 size={14} />Put back
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {canManageBackups && (
        <section className="section">
          <h2>Emergency backup</h2>
          <div className="card">
            <h3>Protect today's live changes</h3>
            <p className="small muted">
              Download a recovery file containing the run sheet, photos and announcements. Restore
              it only if the live organiser state is lost or damaged.
            </p>
            <div className="row" style={{ marginTop: 12 }}>
              <button type="button" className="btn btn--sm" onClick={download}>
                <Download size={14} />Download emergency backup
              </button>
              <button type="button" className="btn btn--sm" onClick={() => fileInput.current?.click()}>
                <Upload size={14} />Restore emergency backup
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = ""; }}
              />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
