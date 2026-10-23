"use client";

// Feature: ayasib-frontend-redesign
// Checklist landing (Pangandam tab). Shows the last-opened service's checklist directly; if none
// has been opened yet, prompts the user to pick a service. A checklist always belongs to a service.
import { useEffect, useState } from "react";
import Link from "next/link";
import { kb } from "@/lib/kb";
import { t } from "@/lib/strings";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";
import { ReadinessChecklist } from "@/components/ReadinessChecklist";
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
            <Link href="/services" className="btn secondary btn-block">
              <Icon name="grid" size={18} /> {t.checklistLanding.changeService}
            </Link>
          </>
        ) : (
          <>
            <span className="muted-kicker">{t.readinessUi.kicker}</span>
            <h1 className="page-title">{t.checklistLanding.title}</h1>
            <div className="guide-note">
              <Icon name="checklist" size={24} className="g-icon" />
              <span>
                <span>{t.checklistLanding.empty}</span>
              </span>
            </div>
            <Link href="/services" className="btn btn-block">
              <Icon name="grid" size={18} /> {t.checklistLanding.pick}
            </Link>
          </>
        )}
        <FooterNote />
      </main>
    </Shell>
  );
}
