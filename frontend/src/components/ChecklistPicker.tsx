"use client";

// Feature: ayasib-frontend-redesign
// Aya-guided, type-ahead checklist picker (Pangandam tab). A sage panel holds Aya + a speech
// bubble asking which document the user is working on. Below: a search field and an alphabetical
// list of KB services; typing filters them. Picking one opens that service's checklist.
// KB-only — suggests nothing that isn't a real service; shows no invented descriptions.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { kb } from "@/lib/kb";
import { serviceTitle, suggestServices } from "@/lib/servicesDirectory";
import { Icon } from "@/components/Icon";
import { t } from "@/lib/strings";

export function ChecklistPicker() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  // Always show the alphabetical list; empty query returns all (suggestServices handles both).
  const suggestions = useMemo(() => suggestServices(kb, query), [query]);

  return (
    <div className="chk-pick">
      {/* Aya + speech bubble inside the sage ask-panel */}
      <div className="aya-ask-panel">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="aya-ask-img" src="/aya.svg" alt="" aria-hidden="true" />
        <p className="aya-ask-bubble">{t.checklistLanding.ayaPrompt}</p>
      </div>

      {/* Search field with a clear button */}
      <div className="searchpill">
        <Icon name="search" size={22} className="search-icon" />
        <input
          type="search"
          value={query}
          placeholder={t.checklistLanding.searchPlaceholder}
          aria-label={t.checklistLanding.ayaPrompt}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && suggestions[0]) router.push(`/andam/${suggestions[0].id}/checklist`);
          }}
        />
        {query && (
          <button type="button" className="search-clear" aria-label="Clear" onClick={() => setQuery("")}>
            ×
          </button>
        )}
      </div>

      {/* Suggestions header */}
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 className="sec-title">{t.checklistLanding.suggestionsHeading}</h2>
        <span className="muted small">{t.checklistLanding.alphabetical}</span>
      </div>

      {suggestions.length === 0 ? (
        <p className="empty-state" role="status">
          {t.checklistLanding.noResults}
        </p>
      ) : (
        <ul className="chk-suggest" role="listbox" aria-label={t.checklistLanding.ayaPrompt}>
          {suggestions.map((entry) => (
            <li key={entry.id} role="option" aria-selected="false">
              <button type="button" className="chk-suggest-row" onClick={() => router.push(`/andam/${entry.id}/checklist`)}>
                <Icon name="checklist" size={20} className="chk-suggest-icon" />
                <span className="chk-suggest-text">
                  <strong>{serviceTitle(entry)}</strong>
                  <span className="muted small">{entry.locality}</span>
                </span>
                <Icon name="external" size={16} className="chk-suggest-go" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
