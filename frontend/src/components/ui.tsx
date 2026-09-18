import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

/* ---------- Status pill ---------- */

export function Pill({
  tone = "default",
  children,
  dot
}: {
  tone?: "default" | "live" | "next" | "delayed" | "cancelled" | "done" | "brand" | "outline";
  children: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <span className={`pill${tone === "default" ? "" : ` pill--${tone}`}`}>
      {dot && <i className="dot" aria-hidden />}
      {children}
    </span>
  );
}

/* ---------- Icon disc ---------- */

export function IconDisc({
  tone = "brand",
  size = "md",
  children
}: {
  tone?: "brand" | "gold" | "jade" | "dark";
  size?: "md" | "lg";
  children: React.ReactNode;
}) {
  const toneClass = tone === "brand" ? "" : ` icon-disc--${tone}`;
  return <span className={`icon-disc${toneClass}${size === "lg" ? " icon-disc--lg" : ""}`}>{children}</span>;
}

/* ---------- Section heading ---------- */

export function SectionHead({
  title,
  action
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section__head">
      <h2>{title}</h2>
      {action}
    </div>
  );
}

/* ---------- Empty state ---------- */

export function Empty({
  icon,
  title,
  children
}: {
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      {icon && <IconDisc tone="gold" size="lg">{icon}</IconDisc>}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}

/* ---------- Bottom sheet ---------- */

export function Sheet({
  onClose,
  labelledBy,
  children
}: {
  onClose: () => void;
  labelledBy?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("button, a, input")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="scrim"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="sheet" ref={ref}>
        <div className="sheet__grab" aria-hidden />
        {children}
      </div>
    </div>
  );
}

/* ---------- Dismiss button ---------- */

export function CloseButton({ onClick, label = "Close" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" className="btn btn--icon" onClick={onClick} aria-label={label}>
      <X size={18} />
    </button>
  );
}
