import { useState, type FormEvent } from "react";
import { Plus, RotateCcw, X } from "lucide-react";
import { liveStore } from "../../lib/live/liveStore";
import type { Listing } from "../../lib/types";

type Props = {
  listings: Listing[];
  toast: (message: string) => void;
};

type RowProps = {
  listing: Listing;
  edited: boolean;
  toast: (message: string) => void;
};

function StallRow({ listing, edited, toast }: RowProps) {
  const [tag, setTag] = useState("");

  function removeTag(value: string) {
    liveStore.setListingCategories(
      listing.id,
      listing.categories.filter((category) => category !== value)
    );
    toast(`Removed ${value}`);
  }

  function addTag(event: FormEvent) {
    event.preventDefault();
    const value = tag.trim();
    if (!value) return;
    if (listing.categories.some((category) => category.toLowerCase() === value.toLowerCase())) {
      toast("That tag is already present");
      return;
    }
    liveStore.setListingCategories(listing.id, [...listing.categories, value]);
    setTag("");
    toast(`Added ${value}`);
  }

  return (
    <article className="admin-row admin-row--edit">
      <div className="row row--between" style={{ alignItems: "flex-start" }}>
        <div>
          <h3 style={{ margin: 0 }}>{listing.name}</h3>
          <p className="tiny muted" style={{ margin: "3px 0 0" }}>
            {listing.listingType === "food" ? "Food & drink" : listing.listingType === "market" ? "Market & crafts" : "Community"}
            {edited && <em className="tag-edited">edited</em>}
          </p>
        </div>
        {edited && (
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => { liveStore.clearListingCategories(listing.id); toast("Published tags restored"); }}
          >
            <RotateCcw size={14} />Reset
          </button>
        )}
      </div>

      <div>
        <span className="field-label">Visitor tags</span>
        <div className="editable-tags">
          {listing.categories.map((category) => (
            <span className="tag editable-tag" key={category}>
              {category}
              <button type="button" onClick={() => removeTag(category)} aria-label={`Remove ${category}`}>
                <X size={13} />
              </button>
            </span>
          ))}
          {listing.categories.length === 0 && <span className="small muted">No public tags</span>}
        </div>
      </div>

      <form className="stall-tag-form" onSubmit={addTag}>
        <label className="field">
          <span>Add a visitor tag</span>
          <input
            value={tag}
            onChange={(event) => setTag(event.target.value)}
            placeholder="e.g. Momo, Vegetarian, Desserts"
          />
        </label>
        <button type="submit" className="btn btn--sm btn--primary" disabled={!tag.trim()}>
          <Plus size={14} />Add
        </button>
      </form>

      {listing.organiserNotes?.length ? (
        <div className="organiser-note">
          <strong>Organiser only</strong>
          <span>{listing.organiserNotes.join(" · ")}</span>
        </div>
      ) : null}
    </article>
  );
}

export function StallEditor({ listings, toast }: Props) {
  const stalls = listings.filter((listing) =>
    listing.published && (listing.listingType === "food" || listing.listingType === "market")
  );
  const overrides = liveStore.get().listingCategories ?? {};

  return (
    <>
      <div className="card card--sunk">
        <p className="small muted" style={{ margin: 0 }}>
          Add or remove the tags visitors see under each stall. Operational notes stay here and
          are never shown in the public directory. Changes are saved in this browser in demo mode.
        </p>
      </div>
      <section className="section">
        <h2>Stalls ({stalls.length})</h2>
        <div className="stack" style={{ marginTop: "var(--s-3)" }}>
          {stalls.map((listing) => (
            <StallRow
              key={listing.id}
              listing={listing}
              edited={Object.prototype.hasOwnProperty.call(overrides, listing.id)}
              toast={toast}
            />
          ))}
        </div>
      </section>
    </>
  );
}
