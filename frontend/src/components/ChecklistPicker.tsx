"use client";

// Feature: ayasib-frontend-redesign
// Distinct picker for the Pangandam (Checklist) empty state — a search + vertical "start a
// checklist" list, intentionally different from the Serbisyo card grid. Each row opens that
// service's checklist directly. KB-only; invents nothing.
import { useMemo, useState } from "react";
import Link from "next/link";
import { kb } from "@/lib/kb";
import { filterServices, serviceTitle } from "@/lib/servicesDirectory";
import { Icon } from "@/components/Icon";
import { t } from "@/lib/strings";

export function ChecklistPicker() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => filterServices(kb, query), [query]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="searchpill">
        <Icon name="search" size={22} className="search-icon" />
        <input
          type="search"
          value={query}
          placeholder={t.checklistLanding.searchPlaceholder}
          aria-label={t.checklistLanding.searchPlaceholder}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {results.length === 0 ? (
        <p className="empty-state" role="status">
          {t.checklistLanding.noResults}
        </p>
      ) : (
        <ul className="chk-pick-list">
          {results.map((entry) => (
            <li key={entry.id}>
              <Link href={`/andam/${entry.id}/checklist`} className="chk-pick-row">
                <span className="chk-pick-icon">
                  <Icon name="checklist" size={22} />
                </span>
                <span className="chk-pick-text">
                  <strong>{serviceTitle(entry)}</strong>
                  <span className="muted small">{t.checklistLanding.startFor}</span>
                </span>
                <Icon name="external" size={18} className="chk-pick-go" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
