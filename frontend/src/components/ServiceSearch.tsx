"use client";

// Feature: ayasib-frontend-redesign (v2, mockup-matched)
// Icon-led services directory: search pill, Tanan/Lokal/Nasyonal chips, icon-card grid, guide note.
import { useMemo, useState } from "react";
import Link from "next/link";
import { kb } from "@/lib/kb";
import { filterServices, serviceTitle } from "@/lib/servicesDirectory";
import { Icon, type IconName } from "@/components/Icon";
import { t } from "@/lib/strings";
import type { KbEntry } from "@/lib/types";

// "National"-flavored localities vs. local; derived from the existing `locality` text, not invented.
function isNational(entry: KbEntry): boolean {
  return /national|nbi|dfa|psa/i.test(entry.locality) || /national|nbi/i.test(entry.id);
}

// Pick a line icon from existing id/name keywords (presentation only; no new data).
function iconFor(entry: KbEntry): IconName {
  const s = `${entry.id} ${entry.name_en}`.toLowerCase();
  if (s.includes("nbi") || s.includes("clearance")) return "shield";
  if (s.includes("birth")) return "baby";
  if (s.includes("marriage")) return "heart";
  if (s.includes("business") || s.includes("permit")) return "store";
  if (s.includes("cedula") || s.includes("id")) return "id";
  if (s.includes("death")) return "doc";
  return "doc";
}

type Filter = "all" | "local" | "national";

// Where a card should lead. "detail" -> /andam/[id] (Serbisyo); "checklist" -> /andam/[id]/checklist (Pangandam).
type Destination = "detail" | "checklist";

export function ServiceSearch({ destination = "detail" }: { destination?: Destination }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const results = useMemo(() => {
    const base = filterServices(kb, query);
    if (filter === "all") return base;
    return base.filter((e) => (filter === "national" ? isNational(e) : !isNational(e)));
  }, [query, filter]);

  const chips: { key: Filter; label: string }[] = [
    { key: "all", label: t.services.all },
    { key: "local", label: t.services.local },
    { key: "national", label: t.services.national },
  ];

  return (
    <>
      <div className="searchpill">
        <Icon name="search" size={22} className="search-icon" />
        <input
          type="search"
          value={query}
          placeholder={t.services.searchPlaceholder}
          aria-label={t.services.searchPlaceholder}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="filters" role="group" aria-label={t.services.searchPlaceholder}>
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            className="filter-chip"
            aria-pressed={filter === c.key}
            onClick={() => setFilter(c.key)}
          >
            {filter === c.key && <Icon name="check" size={16} />} {c.label}
          </button>
        ))}
      </div>

      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 className="sec-title">{t.services.startHeading}</h2>
        <span className="muted small">{t.services.count.replace("{n}", String(results.length))}</span>
      </div>

      {results.length === 0 ? (
        <p className="empty-state" role="status">
          {t.services.noResults}
        </p>
      ) : (
        <div className="svc-grid">
          {results.map((entry, i) => (
            <Link
              key={entry.id}
              href={destination === "checklist" ? `/andam/${entry.id}/checklist` : `/andam/${entry.id}`}
              className={`svc-card ${i === 0 ? "selected" : ""}`}
            >
              <div className="svc-top">
                <Icon name={iconFor(entry)} size={26} className="svc-ic" />
                <Icon name="external" size={18} className="arrow" />
              </div>
              <strong>{serviceTitle(entry)}</strong>
              <span className="svc-cat">{entry.locality}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="guide-note">
        <Icon name="bulb" size={24} className="g-icon" />
        <span>
          <strong>{t.services.guideStrong}</strong>
          <span>{t.services.guideBody}</span>
        </span>
      </div>
    </>
  );
}
