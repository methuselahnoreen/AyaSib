"use client";

// Feature: ayasib-frontend-redesign
// Aya-guided, type-ahead checklist picker (Pangandam tab). Aya asks which document the user is
// working on; as they type, matching KB services appear in alphabetical order. Picking one opens
// that service's checklist. KB-only; suggests nothing that isn't a real service.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { kb } from "@/lib/kb";
import { serviceTitle, suggestServices } from "@/lib/servicesDirectory";
import { Icon } from "@/components/Icon";
import { t } from "@/lib/strings";

export function ChecklistPicker() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  // Only start suggesting once the user has typed something, so the list "guesses" as they type.
  const suggestions = useMemo(() => (query.trim() ? suggestServices(kb, query) : []), [query]);

  return (
    <div className="chk-pick">
      {/* Aya asks the question */}
      <div className="aya-ask">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="aya-ask-img" src="/aya.svg" alt="" aria-hidden="true" />
        <p className="aya-ask-bubble">{t.checklistLanding.ayaPrompt}</p>
      </div>

      <div className="searchpill">
        <Icon name="search" size={22} className="search-icon" />
        <input
          type="search"
          autoFocus
          value={query}
          placeholder={t.checklistLanding.searchPlaceholder}
          aria-label={t.checklistLanding.ayaPrompt}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Enter picks the top suggestion, like a type-ahead.
            if (e.key === "Enter" && suggestions[0]) router.push(`/andam/${suggestions[0].id}/checklist`);
          }}
        />
      </div>

      {!query.trim() ? (
        <p className="muted small" style={{ margin: 0 }}>
          {t.checklistLanding.hint}
        </p>
      ) : suggestions.length === 0 ? (
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
