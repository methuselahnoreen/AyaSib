"use client";

// Feature: ayasib-frontend-redesign
// Checklist landing (Pangandam tab). Shows the last-opened service's checklist directly; if none
// has been opened yet, offers a search + service cards that open that service's CHECKLIST.
import { useEffect, useState } from "react";
import { kb } from "@/lib/kb";
import { t } from "@/lib/strings";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";
import { ReadinessChecklist } from "@/components/ReadinessChecklist";
import { ChecklistPicker } from "@/components/ChecklistPicker";
import { FooterNote } from "@/components/FooterNote";
import { getLastService } from "@/lib/readinessStore";
import type { KbEntry } from "@/lib/types";

export default function ChecklistLandingPage() {
  // Resolve on the client: localStorage (last service) is only available in the browser.
  const [entry, setEntry] = useState<KbEntry | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    const id = getLastService();
    setEntry(id ? kb.find((e) => e.id === id) ?? null : null);
    setResolved(true);
  }, []);

  return (
    <Shell title={t.checklistLanding.title}>
      <main>
        {!resolved ? null : entry ? (
          <>
            <ReadinessChecklist entry={entry} />
            <button type="button" className="btn secondary btn-block" onClick={() => setEntry(null)}>
              <Icon name="grid" size={18} /> {t.checklistLanding.changeService}
            </button>
          </>
        ) : (
          <>
            <span className="muted-kicker">{t.checklistLanding.kicker}</span>
            <h1 className="page-title">{t.checklistLanding.title}</h1>
            <p className="muted" style={{ margin: "0 0 4px" }}>
              {t.checklistLanding.lead}
            </p>
            {/* Distinct checklist picker (not the Serbisyo card grid). */}
            <ChecklistPicker />
          </>
        )}
        <FooterNote />
      </main>
    </Shell>
  );
}
